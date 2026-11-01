import json
import logging
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth_utils import (
    create_access_token,
    hash_password,
    is_allowed_login_email,
    is_valid_site_password,
    normalize_email,
    site_password,
    verify_password,
)
from database import get_db, init_db
from deps import get_current_user
from game_scores import scores_from_results
from models import SavedGame, Team, TeamPlayer, User
from schemas import (
    AccessRequest,
    AuthResponse,
    GameDetail,
    GameListResponse,
    GameSaveRequest,
    GameSummary,
    GameUpdateRequest,
    LoginRequest,
    PlayerDashboardResponse,
    PlayerListResponse,
    PlayerSummary,
    RegisterRequest,
    TeamCreateRequest,
    TeamDashboardResponse,
    TeamListResponse,
    TeamSummary,
    UserResponse,
)
from team_analytics import (
    build_player_analytics,
    build_team_analytics,
    collect_team_players_from_results,
    normalize_name,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)

app = FastAPI()


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    commit = (os.getenv("RENDER_GIT_COMMIT") or os.getenv("GIT_COMMIT") or "")[:12]
    payload = {"status": "ok"}
    if commit:
        payload["commit"] = commit
    return payload


DEFAULT_ORIGINS = "https://bouncepass.net,https://www.bouncepass.net,http://localhost:3000,http://localhost:3001"
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


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, email=user.email)


def _get_or_create_site_user(db: Session) -> User:
    email = normalize_email(os.getenv("ADMIN_EMAIL", "demo@bouncepass.net"))
    password = site_password()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    if not verify_password(password, user.password_hash):
        user.password_hash = hash_password(password)
        db.commit()
    return user


def _owned_team(db: Session, current_user: User, team_id: int) -> Team:
    team = db.query(Team).filter(Team.id == team_id, Team.user_id == current_user.id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


def _upsert_players(db: Session, team: Team, results: dict) -> None:
    existing = {normalize_name(player.name): player for player in team.players}
    for name in collect_team_players_from_results(results):
        key = normalize_name(name)
        if key in existing:
            continue
        db.add(TeamPlayer(team_id=team.id, name=name))
        existing[key] = True


def _game_to_summary(game: SavedGame) -> GameSummary:
    return GameSummary(
        id=game.id,
        team_id=game.team_id,
        game_date=game.game_date,
        home_team_name=game.home_team_name,
        away_team_name=game.away_team_name,
        home_score=game.home_score,
        away_score=game.away_score,
        created_at=game.created_at.isoformat(),
    )


def _game_to_detail(game: SavedGame) -> GameDetail:
    return GameDetail(
        **_game_to_summary(game).model_dump(),
        results=json.loads(game.results_json),
    )


def _team_summary(db: Session, team: Team) -> TeamSummary:
    game_count = db.query(SavedGame).filter(SavedGame.team_id == team.id).count()
    player_count = db.query(TeamPlayer).filter(TeamPlayer.team_id == team.id).count()
    return TeamSummary(
        id=team.id,
        name=team.name,
        game_count=game_count,
        player_count=player_count,
        created_at=team.created_at.isoformat(),
    )


@app.post("/auth/register", response_model=AuthResponse)
def register(_body: RegisterRequest) -> AuthResponse:
    raise HTTPException(status_code=403, detail="Registration is disabled")


@app.post("/auth/access", response_model=AuthResponse)
def site_access(body: AccessRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if not is_valid_site_password(body.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    user = _get_or_create_site_user(db)
    return AuthResponse(access_token=create_access_token(user.id), user=_user_to_response(user))


@app.post("/auth/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if is_valid_site_password(body.password) and (
        not body.email or is_allowed_login_email(body.email)
    ):
        user = _get_or_create_site_user(db)
        return AuthResponse(access_token=create_access_token(user.id), user=_user_to_response(user))
    email = normalize_email(body.email)
    if not is_allowed_login_email(email):
        raise HTTPException(status_code=403, detail="Use the site password to unlock Bounce PASS")
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    return AuthResponse(access_token=create_access_token(user.id), user=_user_to_response(user))


@app.get("/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return _user_to_response(current_user)


@app.get("/teams", response_model=TeamListResponse)
def list_teams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> TeamListResponse:
    teams = db.query(Team).filter(Team.user_id == current_user.id).order_by(Team.created_at.asc()).all()
    return TeamListResponse(teams=[_team_summary(db, team) for team in teams])


@app.post("/teams", response_model=TeamSummary)
def create_team(
    body: TeamCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamSummary:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Team name is required")
    existing = (
        db.query(Team)
        .filter(Team.user_id == current_user.id, func.lower(Team.name) == name.lower())
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="A team with that name already exists")
    team = Team(user_id=current_user.id, name=name)
    db.add(team)
    db.commit()
    db.refresh(team)
    return _team_summary(db, team)


@app.get("/teams/{team_id}/dashboard", response_model=TeamDashboardResponse)
def team_dashboard(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamDashboardResponse:
    team = _owned_team(db, current_user, team_id)
    games = (
        db.query(SavedGame)
        .filter(SavedGame.team_id == team.id, SavedGame.user_id == current_user.id)
        .order_by(SavedGame.game_date.desc(), SavedGame.created_at.desc())
        .all()
    )
    return TeamDashboardResponse(**build_team_analytics(team, games))


@app.get("/teams/{team_id}/players", response_model=PlayerListResponse)
def list_team_players(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlayerListResponse:
    team = _owned_team(db, current_user, team_id)
    analytics = build_team_analytics(
        team,
        db.query(SavedGame)
        .filter(SavedGame.team_id == team.id, SavedGame.user_id == current_user.id)
        .all(),
    )
    stats_by_name = {normalize_name(player["player"]): player for player in analytics["players"]}
    players = []
    for stored in team.players:
        stats = stats_by_name.get(normalize_name(stored.name), {})
        players.append(
            PlayerSummary(
                id=stored.id,
                name=stored.name,
                games=int(stats.get("games") or 0),
                pts=float(stats.get("pts") or 0),
                trb=float(stats.get("trb") or 0),
                ast=float(stats.get("ast") or 0),
            )
        )
    players.sort(key=lambda item: (-item.pts, item.name))
    return PlayerListResponse(players=players)


@app.get("/players/dashboard", response_model=PlayerDashboardResponse)
def player_dashboard(
    team_id: int,
    player_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlayerDashboardResponse:
    team = _owned_team(db, current_user, team_id)
    games = db.query(SavedGame).filter(SavedGame.team_id == team.id, SavedGame.user_id == current_user.id).all()
    payload = build_player_analytics(team, games, player_name)
    if not payload:
        raise HTTPException(status_code=404, detail="Player not found on this team")
    return PlayerDashboardResponse(**payload)


@app.post("/games", response_model=GameDetail)
def save_game(
    game_in: GameSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GameDetail:
    team = _owned_team(db, current_user, game_in.team_id)
    opponent = (game_in.opponent_name or "").strip() or None
    existing = (
        db.query(SavedGame)
        .filter(
            SavedGame.team_id == team.id,
            SavedGame.game_date == game_in.game_date.strip(),
            func.lower(func.coalesce(SavedGame.away_team_name, "")) == (opponent or "").lower(),
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="This game is already saved for the team")

    home_score, away_score = scores_from_results(game_in.results)
    record = SavedGame(
        user_id=current_user.id,
        team_id=team.id,
        game_date=game_in.game_date.strip(),
        home_team_name=team.name,
        away_team_name=opponent,
        results_json=json.dumps(game_in.results),
        home_score=home_score,
        away_score=away_score,
    )
    db.add(record)
    _upsert_players(db, team, game_in.results)
    db.commit()
    db.refresh(record)
    return _game_to_detail(record)


@app.get("/games", response_model=GameListResponse)
def list_games(
    team_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GameListResponse:
    safe_limit = max(1, min(limit, 200))
    safe_offset = max(0, offset)
    query = db.query(SavedGame).filter(SavedGame.user_id == current_user.id)
    if team_id:
        _owned_team(db, current_user, team_id)
        query = query.filter(SavedGame.team_id == team_id)
    total = query.count()
    games = (
        query.order_by(SavedGame.game_date.desc(), SavedGame.created_at.desc())
        .offset(safe_offset)
        .limit(safe_limit)
        .all()
    )
    return GameListResponse(
        games=[_game_to_summary(game) for game in games],
        total=total,
        limit=safe_limit,
        offset=safe_offset,
    )


@app.get("/games/{game_id}", response_model=GameDetail)
def get_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GameDetail:
    game = db.query(SavedGame).filter(SavedGame.id == game_id, SavedGame.user_id == current_user.id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return _game_to_detail(game)


@app.put("/games/{game_id}", response_model=GameDetail)
def update_game(
    game_id: int,
    body: GameUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GameDetail:
    game = db.query(SavedGame).filter(SavedGame.id == game_id, SavedGame.user_id == current_user.id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    game.game_date = body.game_date.strip()
    game.away_team_name = (body.opponent_name or "").strip() or None
    db.commit()
    db.refresh(game)
    return _game_to_detail(game)


@app.delete("/games/{game_id}")
def delete_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    game = db.query(SavedGame).filter(SavedGame.id == game_id, SavedGame.user_id == current_user.id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    db.delete(game)
    db.commit()
    return {"ok": True}
