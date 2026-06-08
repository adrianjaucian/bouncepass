import io
import os
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from stats_engine import generate_advanced_stats

load_dotenv()

app = FastAPI()

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


def detect_header_row(lines: List[str]) -> Optional[int]:
    for i, line in enumerate(lines):
        clean = line.replace(" ", "").replace("\ufeff", "").lower()
        has_time = "mp" in clean or "min" in clean
        has_fga = "fga" in clean
        has_fg = "fg" in clean or "fgm" in clean
        has_pts = "pts" in clean or "points" in clean
        has_reb = "reb" in clean or "or" in clean or "dr" in clean or "trb" in clean
        if has_time and has_fga and has_fg and has_pts and has_reb:
            return i
    return None


def normalize_column_name(col: Any) -> str:
    name = str(col).strip().replace("\ufeff", "")
    if name == "":
        return name
    key = name.lower().replace("%", "pct").replace(" ", "").replace("-", "")
    if key in {"player", "players", "starters", "name"}:
        return "Player"
    if key in {"mp", "min", "minutes"}:
        return "MP"
    if key in {"fg", "fgm", "fieldgoalmade"}:
        return "FG"
    if key == "fga":
        return "FGA"
    if key in {"fgpct", "fg_pct", "fgpercent"}:
        return "FG%"
    if key in {"3p", "3pm", "3pointmade"}:
        return "3P"
    if key == "3pa":
        return "3PA"
    if key in {"3ppct", "3p_pct", "3ppercent"}:
        return "3P%"
    if key in {"ft", "ftm", "freetthrowmade"}:
        return "FT"
    if key == "fta":
        return "FTA"
    if key in {"ftpct", "ft_pct", "ftpercent"}:
        return "FT%"
    if key in {"orb", "or", "offensivereb", "offensiverebounds"}:
        return "ORB"
    if key in {"drb", "dr", "defensivereb", "defensiverebounds"}:
        return "DRB"
    if key in {"trb", "reb", "totalreb", "totalrebounds"}:
        return "TRB"
    if key == "ast":
        return "AST"
    if key == "stl":
        return "STL"
    if key == "blk":
        return "BLK"
    if key in {"tov", "to", "turnover", "turnovers"}:
        return "TOV"
    if key == "pf":
        return "PF"
    if key in {"teampts", "pts", "points"}:
        return "PTS"
    if key in {"gmsc", "gmscore"}:
        return "GmSc"
    if key == "plusminus":
        return "+/-"
    return name


def is_totals_row_name(name: Any) -> bool:
    if name is None or str(name).strip() == "":
        return True
    normalized = "".join(ch for ch in str(name).lower() if ch.isalnum())
    if normalized in {
        "total",
        "totals",
        "team",
        "teamtotals",
        "teamtotal",
        "starters",
        "bench",
        "teamcoach",
        "dnp",
        "didnotplay",
    }:
        return True
    if normalized.startswith("total"):
        return True
    if "teamtotal" in normalized:
        return True
    return False


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [normalize_column_name(c) for c in df.columns]
    df = df.dropna(axis=1, how="all")
    if "MP" in df.columns:
        df = df[~df["MP"].astype(str).str.contains("Did Not Play|DNP", na=False, case=False)]
    if df.shape[0] > 0:
        player_col = df["Player"] if "Player" in df.columns else df.iloc[:, 0]
        df = df[~player_col.apply(is_totals_row_name)]
    return df


def get_player_name(row: Dict[str, Any], index: int) -> str:
    raw_value = row.get("Player")
    if raw_value is not None and str(raw_value).strip() != "":
        return str(raw_value).strip()
    for key, value in row.items():
        if key in {
            "MP", "PTS", "FGA", "FG", "FTA", "3P", "3PA", "FT", "ORB", "DRB", "TRB",
            "AST", "STL", "BLK", "TOV", "PF", "GmSc", "FG%", "3P%", "FT%", "+/-",
        }:
            continue
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return f"Player {index + 1}"


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


def validate_required_columns(df: pd.DataFrame) -> Optional[List[str]]:
    required = ["PTS", "FG", "FGA", "FTA"]
    missing = [c for c in required if c not in df.columns]
    return missing if missing else None


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
