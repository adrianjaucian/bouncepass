from typing import Any, Dict, List, Optional, Tuple


def _sum_pts(rows: Optional[List[Dict[str, Any]]]) -> Optional[int]:
    if not rows:
        return None
    total = 0
    found = False
    for row in rows:
        if not isinstance(row, dict):
            continue
        player = str(row.get("Player") or row.get("player") or "").strip().lower()
        if player in {"total", "totals", "team totals", "team total"}:
            continue
        pts = row.get("PTS", row.get("pts", row.get("Points")))
        if pts is None or str(pts).strip() == "":
            continue
        try:
            total += int(float(pts))
            found = True
        except (TypeError, ValueError):
            continue
    return total if found else None


def scores_from_results(results: Dict[str, Any]) -> Tuple[Optional[int], Optional[int]]:
    if not isinstance(results, dict):
        return None, None
    return _sum_pts(results.get("home")), _sum_pts(results.get("away"))


def scores_from_results_json(results_json: str) -> Tuple[Optional[int], Optional[int]]:
    import json

    try:
        results = json.loads(results_json)
    except json.JSONDecodeError:
        return None, None
    return scores_from_results(results)
