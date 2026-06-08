import pandas as pd
import numpy as np

# =========================
# SAFE DIVISION
# =========================
def safe_div(a, b):
    return np.where(b == 0, 0, a / b)


# =========================
# CLEAN OUTPUT (IMPORTANT)
# =========================
def clean_output(df):
    df = df.replace([np.inf, -np.inf], 0)
    df = df.fillna(0)
    return df


# =========================
# POSSESSIONS CALCULATION
# =========================
TEAM_MINUTES = 48.0

def estimate_possessions(tm_fga, tm_fta, tm_tov):
    """
    Estimate team possessions using total team FGA and turnovers.
    This uses the standard possession approximation: FGA + 0.44*FTA + TOV.
    """
    possessions = tm_fga + tm_tov + 0.44 * tm_fta
    return max(possessions, 1)  # Avoid division by zero


# =========================
# HELPERS
# =========================

def parse_mp_to_minutes(value):
    if pd.isna(value):
        return 0.0

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)

    text = str(value).strip()
    if text == "" or text.lower() in {"did not play", "dnp"}:
        return 0.0

    parts = [p for p in text.replace(" ", "").split(":") if p != ""]
    if len(parts) == 2:
        try:
            minutes = float(parts[0])
            seconds = float(parts[1])
            return minutes + seconds / 60.0
        except ValueError:
            return 0.0
    if len(parts) == 3:
        if parts[2] == "00":
            try:
                minutes = float(parts[0])
                seconds = float(parts[1])
                return minutes + seconds / 60.0
            except ValueError:
                return 0.0
        try:
            hours = float(parts[0])
            minutes = float(parts[1])
            seconds = float(parts[2])
            return hours * 60.0 + minutes + seconds / 60.0
        except ValueError:
            return 0.0

    try:
        return float(text)
    except ValueError:
        return 0.0


# =========================
# MAIN ENGINE
# =========================
def generate_advanced_stats(df, team_stats=None, opponent_stats=None):
    """
    Calculate comprehensive advanced basketball statistics
    """

    # =========================
    # BODY / TIME PREPROCESSING
    # =========================
    if "MP" in df.columns:
        df["MP"] = df["MP"].astype(str)
        df["MP_mins"] = df["MP"].apply(parse_mp_to_minutes)
    else:
        df["MP_mins"] = 0

    # =========================
    # CONVERT NUMERIC COLUMNS
    # =========================
    numeric_cols = [
        "PTS", "FGA", "FTA", "FG", "3PA", "3P", "FT",
        "ORB", "DRB", "TRB", "AST", "STL", "BLK", "TOV", "PF"
    ]

    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Convert percentages (already in decimal format from CSV)
    pct_cols = ["FG%", "3P%", "FT%"]
    for col in pct_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
            # Some box scores provide percentages as whole numbers (e.g. 58.33)
            # while our calculations expect decimals (e.g. 0.583). If the
            # column contains values > 1 we assume percent-format and
            # convert to decimal by dividing by 100.
            try:
                if df[col].max() > 1:
                    df[col] = df[col] / 100.0
            except Exception:
                # if something odd happens (non-numeric), leave as-is
                pass

    # =========================
    # EXTRACT TEAM STATS
    # =========================
    if team_stats is None:
        team_stats = {
            "FGA": df["FGA"].sum() if "FGA" in df.columns else 0,
            "FTA": df["FTA"].sum() if "FTA" in df.columns else 0,
            "TOV": df["TOV"].sum() if "TOV" in df.columns else 0,
            "ORB": df["ORB"].sum() if "ORB" in df.columns else 0,
            "DRB": df["DRB"].sum() if "DRB" in df.columns else 0,
            "TRB": df["TRB"].sum() if "TRB" in df.columns else 0,
            "AST": df["AST"].sum() if "AST" in df.columns else 0,
            "PTS": df["PTS"].sum() if "PTS" in df.columns else 0,
            "FG": df["FG"].sum() if "FG" in df.columns else 0,
            "MP_mins": df["MP_mins"].sum() if "MP_mins" in df.columns else 0,
        }

    tm_fga = pd.to_numeric(team_stats.get("FGA", 0), errors="coerce") or 0
    tm_fta = pd.to_numeric(team_stats.get("FTA", 0), errors="coerce") or 0
    tm_tov = pd.to_numeric(team_stats.get("TOV", 0), errors="coerce") or 0
    tm_drb = pd.to_numeric(team_stats.get("DRB", 0), errors="coerce") or 0
    tm_trb = pd.to_numeric(team_stats.get("TRB", 0), errors="coerce") or 0
    tm_fg = pd.to_numeric(team_stats.get("FG", 0), errors="coerce") or 0

    # opponent stats fallback
    if opponent_stats is None:
        opponent_stats = {
            "FGA": 0,
            "FTA": 0,
            "TOV": 0,
            "ORB": 0,
            "DRB": 0,
            "TRB": 0,
            "AST": 0,
            "PTS": 0,
            "FG": 0,
            "MP_mins": 0,
        }

    opp_orb = pd.to_numeric(opponent_stats.get("ORB", 0), errors="coerce") or 0
    opp_drb = pd.to_numeric(opponent_stats.get("DRB", 0), errors="coerce") or 0
    opp_trb = pd.to_numeric(opponent_stats.get("TRB", 0), errors="coerce") or 0

    # Calculate possessions using FGA, FTA, and TOV per standard possession math.
    possessions = estimate_possessions(tm_fga, tm_fta, tm_tov)

    # =========================
    # MUST HAVE STATS
    # =========================
    df["TS%"] = safe_div(df["PTS"], 2 * (df["FGA"] + 0.44 * df["FTA"]))
    df["eFG%"] = safe_div(df["FG"] + 0.5 * df.get("3P", 0), df["FGA"])
    df["3PAr"] = safe_div(df.get("3PA", 0), df["FGA"])
    df["FTr"] = safe_div(df["FTA"], df["FGA"])

    player_poss = df["FGA"] + 0.44 * df["FTA"] + df.get("TOV", 0)
    df["USG%"] = safe_div(
        100 * player_poss * TEAM_MINUTES,
        df["MP_mins"] * possessions
    )
    df["ORtg"] = safe_div(
        (df["PTS"] + 0.4 * df.get("AST", 0) + 0.44 * df["FTA"]) * 100,
        df["FGA"] + 0.44 * df["FTA"] + df.get("TOV", 0)
    )

    # =========================
    # SUPPORTED ADVANCED STATS
    # =========================
    df["AST%"] = safe_div(
        100 * df["AST"] * TEAM_MINUTES,
        df["MP_mins"] * (tm_fg - df["FG"])
    )

    df["TOV%"] = safe_div(
        100 * df["TOV"],
        df["FGA"] + 0.44 * df["FTA"] + df["TOV"]
    )

    # Rebound percentages should consider opponent rebounds available
    # Total rebound opportunities for team = team TRB + opponent TRB
    df["TRB%"] = safe_div(
        100 * df["TRB"] * TEAM_MINUTES,
        df["MP_mins"] * max(team_stats.get("TRB", 0) + opp_trb, 1)
    )

    # Offensive rebound percentage: team ORB opportunities = team ORB + opponent DRB
    df["ORB%"] = safe_div(
        100 * df["ORB"] * TEAM_MINUTES,
        df["MP_mins"] * max(team_stats.get("ORB", 0) + opp_drb, 1)
    )

    # Defensive rebound percentage: team DRB opportunities = team DRB + opponent ORB
    df["DRB%"] = safe_div(
        100 * df["DRB"] * TEAM_MINUTES,
        df["MP_mins"] * max(team_stats.get("DRB", 0) + opp_orb, 1)
    )

    df["STL%"] = safe_div(
        100 * df["STL"] * TEAM_MINUTES,
        df["MP_mins"] * max(possessions, 1)
    )

    df["BLK%"] = safe_div(
        100 * df["BLK"] * TEAM_MINUTES,
        df["MP_mins"] * max(possessions, 1)
    )

    # Defensive rating cannot be derived exactly from individual box score data alone.
    # This is an approximation based on defensive rebound, steal, and block rates.
    df["DRtg"] = 112 + 0.4 * (12 - df["DRB%"].fillna(0)) + 0.8 * (2 - df["STL%"].fillna(0)) + 0.6 * (2 - df["BLK%"].fillna(0))

    # Approximate Box Plus/Minus using box score impact metrics and usage efficiency.
    ts_pct = df["TS%"].fillna(0) * 100
    df["BPM"] = (
        0.15 * (ts_pct - 50)
        + 0.05 * (df["AST%"].fillna(0) - 10)
        + 0.04 * (df["TRB%"].fillna(0) - 10)
        + 0.25 * (df["STL%"].fillna(0) - 2)
        + 0.25 * (df["BLK%"].fillna(0) - 2)
        - 0.15 * (df["TOV%"].fillna(0) - 12)
        - 0.05 * (df["USG%"].fillna(0) - 20)
        + 0.03 * (df["ORB%"].fillna(0) - 5)
        + 0.02 * (df["DRB%"].fillna(0) - 15)
    )

    # FINAL CLEAN (CRITICAL)
    df = clean_output(df)
    if "MP" in df.columns:
        df["MP"] = df["MP"].astype(str)

    df = df.drop(columns=["MP_mins"], errors="ignore")
    return df.to_dict(orient="records")
