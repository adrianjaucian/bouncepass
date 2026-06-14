from typing import Any, Dict, List, Optional

TREND_WINDOWS = (5, 10)
TREND_METRIC_KEYS = ("pts", "trb", "ast", "ts_pct", "usg_pct", "ortg", "drtg")


def _short_label(game_date: str, opponent: Optional[str] = None) -> str:
    opponent_text = f" vs {opponent}" if opponent else ""
    if len(game_date) >= 10:
        return f"{game_date[5:10]}{opponent_text}"
    return f"{game_date}{opponent_text}"


def build_trend_point(
    *,
    game_date: str,
    opponent: Optional[str] = None,
    team_name: Optional[str] = None,
    pts: Optional[float] = None,
    trb: Optional[float] = None,
    ast: Optional[float] = None,
    ts_pct: Optional[float] = None,
    usg_pct: Optional[float] = None,
    net_rating: Optional[float] = None,
    ortg: Optional[float] = None,
    drtg: Optional[float] = None,
    bpm: Optional[float] = None,
    fg3par: Optional[float] = None,
    trb_pct: Optional[float] = None,
    blk_pct: Optional[float] = None,
) -> Dict[str, Any]:
    resolved_net_rating = net_rating
    if resolved_net_rating is None and ortg is not None and drtg is not None:
        resolved_net_rating = ortg - drtg

    return {
        "game_date": game_date,
        "label": _short_label(game_date, opponent),
        "opponent": opponent,
        "team_name": team_name,
        "pts": round(pts, 1) if pts is not None else None,
        "trb": round(trb, 1) if trb is not None else None,
        "ast": round(ast, 1) if ast is not None else None,
        "ts_pct": round(ts_pct, 4) if ts_pct is not None else None,
        "usg_pct": round(usg_pct, 1) if usg_pct is not None else None,
        "net_rating": round(resolved_net_rating, 1) if resolved_net_rating is not None else None,
        "ortg": round(ortg, 1) if ortg is not None else None,
        "drtg": round(drtg, 1) if drtg is not None else None,
        "bpm": round(bpm, 1) if bpm is not None else None,
        "fg3par": round(fg3par, 4) if fg3par is not None else None,
        "trb_pct": round(trb_pct, 1) if trb_pct is not None else None,
        "blk_pct": round(blk_pct, 1) if blk_pct is not None else None,
    }


def build_trend_charts(points: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    chronological = sorted(points, key=lambda item: item["game_date"])
    charts: Dict[str, List[Dict[str, Any]]] = {"season": chronological}
    for window in TREND_WINDOWS:
        charts[f"last_{window}"] = chronological[-window:] if chronological else []
    return charts
