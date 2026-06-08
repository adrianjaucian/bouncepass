import re
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

REQUIRED_BOX_SCORE_COLUMNS = {"PTS", "FG", "FGA", "FTA"}


def normalize_column_name(col: Any) -> str:
    name = str(col).strip().replace("\ufeff", "")
    if name == "":
        return name
    key = name.lower().replace("%", "pct").replace(" ", "").replace("-", "")
    if key in {"player", "players", "starters", "name"}:
        return "Player"
    if key in {"no", "num", "number", "jersey", "#"}:
        return "#"
    if key in {"mp", "min", "minutes", "mins"}:
        return "MP"
    if key in {"fg", "fgm", "fieldgoalmade"}:
        return "FG"
    if key == "fga":
        return "FGA"
    if key in {"fgpct", "fg_pct", "fgpercent", "fg%"}:
        return "FG%"
    if key in {"3p", "3pm", "3pointmade"}:
        return "3P"
    if key == "3pa":
        return "3PA"
    if key in {"3ppct", "3p_pct", "3ppercent", "3p%"}:
        return "3P%"
    if key in {"ft", "ftm", "freetthrowmade"}:
        return "FT"
    if key == "fta":
        return "FTA"
    if key in {"ftpct", "ft_pct", "ftpercent", "ft%"}:
        return "FT%"
    if key in {"orb", "or", "off", "offensivereb", "offensiverebounds"}:
        return "ORB"
    if key in {"drb", "dr", "def", "defensivereb", "defensiverebounds"}:
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
    if key in {"pf", "fouls", "foulstotal"}:
        return "PF"
    if key in {"teampts", "pts", "points"}:
        return "PTS"
    if key in {"gmsc", "gmscore"}:
        return "GmSc"
    if key in {"plusminus", "+/-", "plus_minus", "pm"}:
        return "+/-"
    return name


def header_key(value: Any) -> str:
    return str(value or "").strip().replace("\ufeff", "").lower().replace("%", "pct").replace(" ", "").replace("-", "")


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


def parse_fraction(value: Any) -> Tuple[int, int]:
    raw = str(value or "").strip()
    if not raw or raw in {".", "-", "nan", "None"}:
        return 0, 0
    if "-" in raw and not raw.startswith("-"):
        made, attempted = raw.split("-", 1)
        try:
            return int(float(made.strip() or 0)), int(float(attempted.strip() or 0))
        except ValueError:
            return 0, 0
    try:
        made = int(float(raw))
        return made, made
    except ValueError:
        return 0, 0


def parse_number(value: Any) -> float:
    raw = str(value or "").strip()
    if not raw or raw in {".", "-", "nan", "None"}:
        return 0.0
    try:
        return float(raw.replace("%", ""))
    except ValueError:
        return 0.0


def _column_keys(columns: List[Any]) -> List[str]:
    return [header_key(col) for col in columns]


def _row_looks_like_header(row: pd.Series) -> bool:
    keys = _column_keys(row.tolist())
    joined = "".join(keys)
    has_pts = "pts" in keys or "points" in joined
    has_fg = "fga" in keys or "fg" in keys or "fgm" in keys
    has_player = "player" in keys or "name" in keys
    return has_pts and has_fg and (has_player or len(keys) >= 6)


def promote_header_row(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    unnamed = all(str(col).startswith("Unnamed") or str(col).isdigit() for col in df.columns)
    if not unnamed and not _row_looks_like_header(pd.Series(df.columns)):
        return df

    scan_limit = min(8, len(df))
    for idx in range(scan_limit):
        if _row_looks_like_header(df.iloc[idx]):
            header = [str(value).strip() for value in df.iloc[idx].tolist()]
            body = df.iloc[idx + 1 :].copy()
            body.columns = header
            return body.reset_index(drop=True)
    return df


def expand_made_attempted_columns(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    pairs = [
        ("FG", "FGA", ["FG"]),
        ("3P", "3PA", ["3P"]),
        ("FT", "FTA", ["FT"]),
    ]
    for made_col, att_col, sources in pairs:
        if att_col in result.columns:
            continue
        source_col = next((col for col in sources if col in result.columns), None)
        if not source_col:
            continue
        sample = result[source_col].astype(str).head(12)
        if not sample.str.contains(r"^\d+\s*-\s*\d+", regex=True, na=False).any():
            continue
        made_values = []
        att_values = []
        for value in result[source_col]:
            made, attempted = parse_fraction(value)
            made_values.append(made)
            att_values.append(attempted)
        result[made_col] = made_values
        result[att_col] = att_values
        if made_col != source_col:
            result = result.drop(columns=[source_col])
    return result


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    working = promote_header_row(df.copy())
    working.columns = [normalize_column_name(c) for c in working.columns]
    working = working.dropna(axis=1, how="all")
    working = expand_made_attempted_columns(working)

    if "MP" in working.columns:
        working = working[~working["MP"].astype(str).str.contains("Did Not Play|DNP", na=False, case=False)]

    if working.shape[0] > 0:
        if "Player" in working.columns:
            player_col = working["Player"]
        else:
            player_col = working.iloc[:, 0]
        working = working[~player_col.apply(is_totals_row_name)]

    return working.reset_index(drop=True)


def count_player_rows(df: pd.DataFrame) -> int:
    if df.empty:
        return 0
    if "Player" in df.columns:
        return int((~df["Player"].apply(is_totals_row_name)).sum())
    first_col = df.iloc[:, 0]
    return int((~first_col.apply(is_totals_row_name)).sum())


def score_boxscore_table(df: pd.DataFrame) -> float:
    if df is None or df.empty:
        return 0.0

    preview = promote_header_row(df.copy())
    keys = _column_keys(list(preview.columns))
    if not keys or all(key.startswith("unnamed") or key.isdigit() for key in keys):
        for idx in range(min(5, len(preview))):
            if _row_looks_like_header(preview.iloc[idx]):
                keys = _column_keys(preview.iloc[idx].tolist())
                break

    key_set = set(keys)
    score = 0.0

    if "player" in key_set or "name" in key_set:
        score += 2.0
    elif preview.shape[1] >= 6:
        score += 0.75

    if "pts" in key_set or "points" in key_set:
        score += 3.0
    if "fga" in key_set:
        score += 2.0
    if "fg" in key_set or "fgm" in key_set:
        score += 2.0
    if any(key in key_set for key in {"reb", "trb", "totalreb"}):
        score += 1.0
    if "ast" in key_set:
        score += 1.0
    if any(key in key_set for key in {"mp", "min", "minutes", "mins"}):
        score += 1.0
    if any(key in key_set for key in {"ft", "ftm", "fta"}):
        score += 0.5

    cleaned = clean_dataframe(preview)
    player_count = count_player_rows(cleaned)
    if 5 <= player_count <= 20:
        score += 2.0
    elif 3 <= player_count <= 25:
        score += 1.0

    present = set(cleaned.columns)
    if REQUIRED_BOX_SCORE_COLUMNS.issubset(present):
        score += 2.0
    elif {"PTS", "FGA"}.issubset(present):
        score += 1.0

    return score


def normalize_boxscore_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    return clean_dataframe(df)


def get_player_name(row: Dict[str, Any], index: int) -> str:
    raw_value = row.get("Player")
    if raw_value is not None and str(raw_value).strip() != "":
        return str(raw_value).strip()
    for key, value in row.items():
        if key in {
            "MP", "PTS", "FGA", "FG", "FTA", "3P", "3PA", "FT", "ORB", "DRB", "TRB",
            "AST", "STL", "BLK", "TOV", "PF", "GmSc", "FG%", "3P%", "FT%", "+/-", "#",
        }:
            continue
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return f"Player {index + 1}"


def validate_required_columns(df: pd.DataFrame) -> Optional[List[str]]:
    missing = [column for column in REQUIRED_BOX_SCORE_COLUMNS if column not in df.columns]
    return missing if missing else None
