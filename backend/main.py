import io
import json
import os
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from boxscore_normalize import (
    clean_dataframe,
    detect_header_row,
    get_player_name,
    is_totals_row_name,
    normalize_column_name,
    validate_required_columns,
)
from boxscore_url_scraper import UrlScrapeError, scrape_game_from_url
from database import get_db, init_db
from models import SavedGame
from schemas import (
    BoxScoreUrlMeta,
    BoxScoreUrlRequest,
    BoxScoreUrlResponse,
    GameDetail,
    GameListResponse,
    GameSaveRequest,
    GameSummary,
    GameUpdateRequest,
    Nbl1SyncRequest,
    Nbl1SyncResponse,
    Nbl1SyncStartResponse,
    Nbl1SyncStatusResponse,
    PlayerDashboardResponse,
    PlayerLeagueLeadersResponse,
    PlayerListResponse,
    TeamDashboardResponse,
    TeamLeagueLeadersResponse,
    TeamListResponse,
)
from game_scores import scores_from_results
from gender_utils import collect_team_options, filter_games_by_gender, normalize_gender
from region_utils import filter_games_by_region, normalize_region
from nbl1_sync_job import get_sync_status, start_sync_job
from player_dashboard import build_league_leader_players, build_player_dashboard, collect_player_names
from team_dashboard import build_team_dashboard, build_team_league_leaders
from stats_engine import generate_advanced_stats

load_dotenv()

app = FastAPI()


@app.on_event("startup")
def on_startup():
    init_db()

ACCESS_PASSWORD = os.getenv("ACCESS_PASSWORD", "")

DEFAULT_ORIGINS = "https://bouncepass.net,https://www.bouncepass.net,http://localhost:3000"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def access_password_middleware(request: Request, call_next):
    if not ACCESS_PASSWORD:
        return await call_next(request)

    if request.method == "OPTIONS":
        return await call_next(request)

    provided = request.headers.get("X-Access-Password", "")
    if provided != ACCESS_PASSWORD:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    return await call_next(request)


async def parse_uploaded_csv(file: UploadFile) -> Tuple[Optional[pd.DataFrame], Optional[Dict[str, Any]]]:
    contents = await file.read()
    try:
        text = contents.decode("utf-8")
    except UnicodeDecodeError:
        text = contents.decode("latin-1", errors="replace")
    lines = text.splitlines()
    lines = [
        line for line in lines
        if "Basic Box Score Stats" not in line
        and line.strip() != ""
    ]
    header_index = detect_header_row(lines)
    if header_index is None:
        return None, {"error": "Could not detect header row", "preview": lines[:10]}
    cleaned_csv = "\n".join(lines[header_index:])
    try:
        df = pd.read_csv(io.StringIO(cleaned_csv), skip_blank_lines=True)
    except Exception as e:
        return None, {"error": "Could not parse uploaded CSV", "details": str(e)}
    df = clean_dataframe(df)
    return df, None


def game_to_summary(game: SavedGame) -> GameSummary:
    home_score = game.home_score
    away_score = game.away_score
    if home_score is None and away_score is None:
        results = json.loads(game.results_json)
        home_score, away_score = scores_from_results(results)
    return GameSummary(
        id=game.id,
        game_date=game.game_date,
        home_team_name=game.home_team_name,
        away_team_name=game.away_team_name,
        home_score=home_score,
        away_score=away_score,
        gender=normalize_gender(game.gender),
        region=normalize_region(game.region),
        created_at=game.created_at.isoformat(),
    )


def game_to_detail(game: SavedGame) -> GameDetail:
    results = json.loads(game.results_json)
    home_score = game.home_score
    away_score = game.away_score
    if home_score is None and away_score is None:
        home_score, away_score = scores_from_results(results)
    return GameDetail(
        id=game.id,
        game_date=game.game_date,
        home_team_name=game.home_team_name,
        away_team_name=game.away_team_name,
        home_score=home_score,
        away_score=away_score,
        gender=normalize_gender(game.gender),
        region=normalize_region(game.region),
        created_at=game.created_at.isoformat(),
        results=results,
    )


def build_team_stats(df: pd.DataFrame) -> Dict[str, int]:
    return {
        "FGA": int(pd.to_numeric(df.get("FGA", 0), errors="coerce").sum()),
        "FTA": int(pd.to_numeric(df.get("FTA", 0), errors="coerce").sum()),
        "TOV": int(pd.to_numeric(df.get("TOV", 0), errors="coerce").sum()),
        "ORB": int(pd.to_numeric(df.get("ORB", 0), errors="coerce").sum()),
        "DRB": int(pd.to_numeric(df.get("DRB", 0), errors="coerce").sum()),
        "TRB": int(pd.to_numeric(df.get("TRB", 0), errors="coerce").sum()),
        "AST": int(pd.to_numeric(df.get("AST", 0), errors="coerce").sum()),
        "PTS": int(pd.to_numeric(df.get("PTS", 0), errors="coerce").sum()),
        "FG": int(pd.to_numeric(df.get("FG", 0), errors="coerce").sum()),
    }


def clean_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    for row in rows:
        for k, v in row.items():
            if isinstance(v, float) and (pd.isna(v) or v == float("inf") or v == float("-inf")):
                row[k] = 0
    return rows


def calculate_stats(df: pd.DataFrame, opponent_stats: Optional[Dict[str, int]] = None) -> List[Dict[str, Any]]:
    team_stats = build_team_stats(df)
    rows = generate_advanced_stats(df, team_stats=team_stats, opponent_stats=opponent_stats)
    for index, row in enumerate(rows):
        row["Player"] = get_player_name(row, index)
    return clean_rows(rows)


@app.post("/upload-boxscore")
async def upload_boxscore(file: UploadFile = File(...)) -> Any:
    df, error = await parse_uploaded_csv(file)
    if error:
        return JSONResponse(status_code=400, content=error)
    if df is None:
        return JSONResponse(status_code=400, content={"error": "Failed to process uploaded file"})

    missing = validate_required_columns(df)
    if missing:
        return JSONResponse(
            status_code=400,
            content={"error": f"Missing columns: {missing}", "columns_found": df.columns.tolist()},
        )

    try:
        return calculate_stats(df)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": "Could not calculate stats", "details": str(exc)})


@app.post("/upload-boxscores")
async def upload_boxscores(
    home: UploadFile = File(...),
    away: UploadFile = File(...),
) -> Any:
    home_df, home_error = await parse_uploaded_csv(home)
    if home_error:
        return JSONResponse(status_code=400, content={"which": "home", **home_error})
    away_df, away_error = await parse_uploaded_csv(away)
    if away_error:
        return JSONResponse(status_code=400, content={"which": "away", **away_error})

    if home_df is None or away_df is None:
        return JSONResponse(status_code=400, content={"error": "Upload parsing failed"})

    missing_home = validate_required_columns(home_df)
    missing_away = validate_required_columns(away_df)
    if missing_home or missing_away:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Missing columns",
                "missing_home": missing_home,
                "missing_away": missing_away,
                "home_columns": home_df.columns.tolist(),
                "away_columns": away_df.columns.tolist(),
            },
        )

    try:
        home_team_stats = build_team_stats(home_df)
        away_team_stats = build_team_stats(away_df)
        home_rows = calculate_stats(home_df, opponent_stats=away_team_stats)
        away_rows = calculate_stats(away_df, opponent_stats=home_team_stats)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": "Could not calculate stats", "details": str(exc)})

    return {"home": home_rows, "away": away_rows}


@app.post("/upload-boxscore-url", response_model=BoxScoreUrlResponse)
def upload_boxscore_url(body: BoxScoreUrlRequest) -> Any:
    try:
        home_df, away_df, meta = scrape_game_from_url(body.url)
    except UrlScrapeError as exc:
        return JSONResponse(status_code=400, content={"error": str(exc)})

    missing_home = validate_required_columns(home_df)
    missing_away = validate_required_columns(away_df)
    if missing_home or missing_away:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Scraped box score is missing required columns",
                "missing_home": missing_home,
                "missing_away": missing_away,
            },
        )

    try:
        home_team_stats = build_team_stats(home_df)
        away_team_stats = build_team_stats(away_df)
        home_rows = calculate_stats(home_df, opponent_stats=away_team_stats)
        away_rows = calculate_stats(away_df, opponent_stats=home_team_stats)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": "Could not calculate stats", "details": str(exc)})

    return BoxScoreUrlResponse(
        home=home_rows,
        away=away_rows,
        meta=BoxScoreUrlMeta(
            home_team_name=meta.get("home_team_name") or "Home",
            away_team_name=meta.get("away_team_name") or "Away",
            game_date=meta.get("game_date") or "",
            fixture_id=meta.get("fixture_id") or "",
            source_url=meta.get("source_url") or body.url.strip(),
            provider=meta.get("provider"),
        ),
    )


@app.post("/upload-nbl1-url", response_model=BoxScoreUrlResponse, include_in_schema=False)
def upload_nbl1_url_legacy(body: BoxScoreUrlRequest) -> Any:
    return upload_boxscore_url(body)


@app.post("/games", response_model=GameDetail)
def save_game(game_in: GameSaveRequest, db: Session = Depends(get_db)) -> GameDetail:
    fixture_id = (game_in.fixture_id or "").strip() or None
    if fixture_id:
        existing = db.query(SavedGame).filter(SavedGame.fixture_id == fixture_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="This game is already saved")

    record = SavedGame(
        game_date=game_in.game_date.strip(),
        home_team_name=game_in.home_team_name.strip(),
        away_team_name=game_in.away_team_name.strip() if game_in.away_team_name else None,
        results_json=json.dumps(game_in.results),
        fixture_id=fixture_id,
        source_url=(game_in.source_url or "").strip() or None,
        provider=(game_in.provider or "").strip() or None,
        gender=normalize_gender(game_in.gender),
        region=normalize_region(game_in.region),
    )
    home_score, away_score = scores_from_results(game_in.results)
    record.home_score = home_score
    record.away_score = away_score
    db.add(record)
    db.commit()
    db.refresh(record)
    return game_to_detail(record)


@app.post("/sync/nbl1-fixtures", response_model=Nbl1SyncStartResponse)
def sync_nbl1_fixtures_endpoint(body: Nbl1SyncRequest) -> Nbl1SyncStartResponse:
    payload = start_sync_job(
        season_year=body.season_year,
        max_imports=body.max_imports or 15,
    )
    return Nbl1SyncStartResponse(**payload)


@app.get("/sync/nbl1-fixtures/status", response_model=Nbl1SyncStatusResponse)
def sync_nbl1_fixtures_status() -> Nbl1SyncStatusResponse:
    status = get_sync_status()
    result = status.get("result")
    return Nbl1SyncStatusResponse(
        running=status["running"],
        progress=status.get("progress") or "",
        result=Nbl1SyncResponse(**result) if result else None,
        error=status.get("error"),
    )


@app.get("/games", response_model=GameListResponse)
def list_games(
    gender: Optional[str] = None,
    region: Optional[str] = None,
    team: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> GameListResponse:
    from sqlalchemy import func, or_

    safe_limit = max(1, min(limit, 200))
    safe_offset = max(0, offset)

    query = db.query(SavedGame)
    normalized_gender = normalize_gender(gender)
    if normalized_gender:
        query = query.filter(SavedGame.gender == normalized_gender)

    normalized_region = normalize_region(region)
    if normalized_region:
        query = query.filter(SavedGame.region == normalized_region)

    team_query = (team or "").strip().lower()
    if team_query:
        pattern = f"%{team_query}%"
        query = query.filter(
            or_(
                func.lower(SavedGame.home_team_name).like(pattern),
                func.lower(SavedGame.away_team_name).like(pattern),
            )
        )

    total = query.count()
    games = (
        query.order_by(SavedGame.game_date.desc(), SavedGame.created_at.desc())
        .offset(safe_offset)
        .limit(safe_limit)
        .all()
    )
    return GameListResponse(
        games=[game_to_summary(game) for game in games],
        total=total,
        limit=safe_limit,
        offset=safe_offset,
    )


@app.get("/teams", response_model=TeamListResponse)
def list_teams(
    gender: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
) -> TeamListResponse:
    games = db.query(SavedGame).all()
    filtered = filter_games_by_gender(games, gender)
    filtered = filter_games_by_region(filtered, region)
    options = collect_team_options(filtered, require_gender=True, require_region=True)
    return TeamListResponse(teams=[option["label"] for option in options], options=options)


@app.get("/teams/dashboard", response_model=TeamDashboardResponse)
def team_dashboard(
    team_name: str,
    gender: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
) -> TeamDashboardResponse:
    query = team_name.strip()
    if not query:
        raise HTTPException(status_code=400, detail="team_name is required")

    normalized_gender = normalize_gender(gender)
    if not normalized_gender:
        raise HTTPException(status_code=400, detail="gender is required (men or women)")

    normalized_region = normalize_region(region)
    if not normalized_region:
        raise HTTPException(
            status_code=400,
            detail="region is required (north, south, east, west, or central)",
        )

    games = db.query(SavedGame).order_by(SavedGame.game_date.desc(), SavedGame.created_at.desc()).all()
    dashboard = build_team_dashboard(
        games,
        query,
        gender=normalized_gender,
        region=normalized_region,
    )
    if dashboard["games_played"] == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No saved games found for {dashboard['team_label']}",
        )
    return TeamDashboardResponse(**dashboard)


@app.get("/teams/leaders", response_model=TeamLeagueLeadersResponse)
def team_leaders(
    gender: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
) -> TeamLeagueLeadersResponse:
    games = db.query(SavedGame).order_by(SavedGame.game_date.desc(), SavedGame.created_at.desc()).all()
    payload = build_team_league_leaders(
        games,
        gender=normalize_gender(gender),
        region=normalize_region(region),
    )
    return TeamLeagueLeadersResponse(**payload)


@app.get("/players", response_model=PlayerListResponse)
def list_players(
    gender: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
) -> PlayerListResponse:
    games = db.query(SavedGame).order_by(SavedGame.game_date.desc(), SavedGame.created_at.desc()).all()
    filtered = filter_games_by_gender(games, gender)
    filtered = filter_games_by_region(filtered, region)
    return PlayerListResponse(players=collect_player_names(filtered))


@app.get("/players/leaders", response_model=PlayerLeagueLeadersResponse)
def player_leaders(
    gender: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
) -> PlayerLeagueLeadersResponse:
    games = db.query(SavedGame).order_by(SavedGame.game_date.desc(), SavedGame.created_at.desc()).all()
    payload = build_league_leader_players(
        games,
        gender=normalize_gender(gender),
        region=normalize_region(region),
    )
    return PlayerLeagueLeadersResponse(**payload)


@app.get("/players/dashboard", response_model=PlayerDashboardResponse)
def player_dashboard(
    player_name: str,
    gender: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
) -> PlayerDashboardResponse:
    query = player_name.strip()
    if not query:
        raise HTTPException(status_code=400, detail="player_name is required")

    games = db.query(SavedGame).order_by(SavedGame.game_date.desc(), SavedGame.created_at.desc()).all()
    dashboard = build_player_dashboard(
        games,
        query,
        gender=normalize_gender(gender),
        region=normalize_region(region),
    )
    if dashboard["games_played"] == 0:
        raise HTTPException(status_code=404, detail=f"No saved games found for player '{query}'")
    return PlayerDashboardResponse(**dashboard)


@app.get("/games/{game_id}", response_model=GameDetail)
def get_game(game_id: int, db: Session = Depends(get_db)) -> GameDetail:
    game = db.query(SavedGame).filter(SavedGame.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game_to_detail(game)


@app.put("/games/{game_id}", response_model=GameDetail)
def update_game(game_id: int, game_in: GameUpdateRequest, db: Session = Depends(get_db)) -> GameDetail:
    game = db.query(SavedGame).filter(SavedGame.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    game.game_date = game_in.game_date.strip()
    game.home_team_name = game_in.home_team_name.strip()
    game.away_team_name = game_in.away_team_name.strip() if game_in.away_team_name else None
    if game_in.gender is not None:
        game.gender = normalize_gender(game_in.gender)
    if game_in.region is not None:
        game.region = normalize_region(game_in.region)
    db.commit()
    db.refresh(game)

    return game_to_detail(game)


@app.delete("/games/{game_id}")
def delete_game(game_id: int, db: Session = Depends(get_db)) -> Dict[str, bool]:
    game = db.query(SavedGame).filter(SavedGame.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    db.delete(game)
    db.commit()
    return {"ok": True}
