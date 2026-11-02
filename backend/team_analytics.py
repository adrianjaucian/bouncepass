import json
import re
from typing import Any, Dict, List, Optional

from boxscore_normalize import get_player_name, is_totals_row_name
from stats_engine import parse_mp_to_minutes


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def parse_results(results_json: str) -> Dict[str, Any]:
    try:
        data = json.loads(results_json)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def player_rows(rows: Optional[List[Any]]) -> List[Dict[str, Any]]:
    filtered: List[Dict[str, Any]] = []
    for index, row in enumerate(rows or []):
        if not isinstance(row, dict):
            continue
        name = get_player_name(row, index)
        if is_totals_row_name(name):
            continue
        filtered.append(row)
    return filtered


def number(row: Dict[str, Any], *keys: str) -> float:
    for key in keys:
        if key not in row or row[key] is None or str(row[key]).strip() == "":
            continue
        try:
            return float(row[key])
        except (TypeError, ValueError):
            continue
    return 0.0


def empty_player(name: str) -> Dict[str, Any]:
    return {
        "player": name,
        "games": 0,
        "pts": 0.0,
        "trb": 0.0,
        "ast": 0.0,
        "stl": 0.0,
        "blk": 0.0,
        "tov": 0.0,
        "fg": 0.0,
        "fga": 0.0,
        "fg3": 0.0,
        "fg3a": 0.0,
        "ft": 0.0,
        "fta": 0.0,
        "mp_mins": 0.0,
        "ts_weighted": 0.0,
        "efg_weighted": 0.0,
        "usg_weighted": 0.0,
        "ortg_weighted": 0.0,
        "drtg_weighted": 0.0,
        "bpm_weighted": 0.0,
        "game_log": [],
    }


def add_player_row(
    bucket: Dict[str, Any],
    row: Dict[str, Any],
    game: Any,
    opponent: Optional[str] = None,
    team_side: str = "home",
) -> None:
    mp_mins = parse_mp_to_minutes(row.get("MP") or row.get("MP_mins") or 0)
    pts = number(row, "PTS", "pts")
    bucket["games"] += 1
    bucket["pts"] += pts
    bucket["trb"] += number(row, "TRB", "REB", "trb")
    bucket["ast"] += number(row, "AST", "ast")
    bucket["stl"] += number(row, "STL", "stl")
    bucket["blk"] += number(row, "BLK", "blk")
    bucket["tov"] += number(row, "TOV", "TO", "tov")
    bucket["fg"] += number(row, "FG")
    bucket["fga"] += number(row, "FGA")
    bucket["fg3"] += number(row, "3P")
    bucket["fg3a"] += number(row, "3PA")
    bucket["ft"] += number(row, "FT")
    bucket["fta"] += number(row, "FTA")
    bucket["mp_mins"] += mp_mins
    weight = mp_mins or 1
    bucket["ts_weighted"] += number(row, "TS%") * weight
    bucket["efg_weighted"] += number(row, "eFG%") * weight
    bucket["usg_weighted"] += number(row, "USG%") * weight
    bucket["ortg_weighted"] += number(row, "ORtg") * weight
    bucket["drtg_weighted"] += number(row, "DRtg") * weight
    bucket["bpm_weighted"] += number(row, "BPM") * weight
    usg_pct = number(row, "USG%")
    if 0 < usg_pct <= 1:
        usg_pct *= 100
    bucket["game_log"].append(
        {
            "game_id": game.id,
            "game_date": game.game_date,
            "opponent": opponent,
            "team_side": team_side,
            "pts": pts,
            "trb": number(row, "TRB", "REB"),
            "ast": number(row, "AST"),
            "stl": number(row, "STL"),
            "blk": number(row, "BLK"),
            "mp_mins": mp_mins,
            "ts_pct": number(row, "TS%"),
            "efg_pct": number(row, "eFG%"),
            "usg_pct": usg_pct,
            "ortg": number(row, "ORtg"),
            "drtg": number(row, "DRtg"),
            "bpm": number(row, "BPM"),
        }
    )


def finalize_player(bucket: Dict[str, Any]) -> Dict[str, Any]:
    games = bucket["games"] or 1
    minutes = bucket["mp_mins"] or 1
    ts = bucket["ts_weighted"] / minutes
    efg = bucket["efg_weighted"] / minutes
    usg = bucket["usg_weighted"] / minutes
    if usg <= 1:
        usg *= 100
    return {
        "player": bucket["player"],
        "games": bucket["games"],
        "pts": bucket["pts"],
        "trb": bucket["trb"],
        "ast": bucket["ast"],
        "stl": bucket["stl"],
        "blk": bucket["blk"],
        "mp_mins": round(bucket["mp_mins"], 1),
        "pts_pg": round(bucket["pts"] / games, 1),
        "trb_pg": round(bucket["trb"] / games, 1),
        "ast_pg": round(bucket["ast"] / games, 1),
        "ts_pct": ts,
        "efg_pct": efg,
        "usg_pct": usg,
        "ortg": bucket["ortg_weighted"] / minutes,
        "drtg": bucket["drtg_weighted"] / minutes,
        "bpm": bucket["bpm_weighted"] / minutes,
        "game_log": bucket["game_log"],
    }


def team_side_from_results(results: Optional[Dict[str, Any]] = None, explicit: Optional[str] = None) -> str:
    raw = explicit or (results or {}).get("team_side") or "home"
    return "away" if str(raw).lower() == "away" else "home"


def opponent_from_game(game: Any, results: Optional[Dict[str, Any]] = None) -> Optional[str]:
    side = team_side_from_results(results, getattr(game, "team_side", None))
    if side == "away":
        return game.home_team_name
    return game.away_team_name


def collect_team_players_from_results(results: Dict[str, Any]) -> List[str]:
    names: List[str] = []
    seen = set()
    side = team_side_from_results(results)
    for index, row in enumerate(player_rows(results.get(side))):
        name = get_player_name(row, index).strip()
        key = normalize_name(name)
        if not key or key in seen:
            continue
        seen.add(key)
        names.append(name)
    return names


def team_game_snapshot(game: Any, results: Dict[str, Any]) -> Dict[str, Any]:
    side = team_side_from_results(results)
    team_list = player_rows(results.get(side))
    opp_list = player_rows(results.get("away" if side == "home" else "home"))
    team_pts = game.home_score if side == "home" else game.away_score
    opp_pts = game.away_score if side == "home" else game.home_score
    if team_pts is None:
        team_pts = sum(number(row, "PTS") for row in team_list)
    if opp_pts is None:
        opp_pts = sum(number(row, "PTS") for row in opp_list) or None
    fg = sum(number(row, "FG", "FGM") for row in team_list)
    fga = sum(number(row, "FGA") for row in team_list)
    fg3 = sum(number(row, "3P", "3PM") for row in team_list)
    fg3a = sum(number(row, "3PA") for row in team_list)
    ft = sum(number(row, "FT", "FTM") for row in team_list)
    fta = sum(number(row, "FTA") for row in team_list)
    trb = sum(number(row, "TRB", "REB") for row in team_list)
    ast = sum(number(row, "AST") for row in team_list)
    stl = sum(number(row, "STL") for row in team_list)
    blk = sum(number(row, "BLK") for row in team_list)
    tov = sum(number(row, "TOV", "TO") for row in team_list)
    weight = 0.0
    ts = efg = usg = ortg = drtg = bpm = 0.0
    mp_mins = 0.0
    for row in team_list:
        mins = parse_mp_to_minutes(row.get("MP") or row.get("MP_mins") or 0)
        game_weight = mins or 1
        mp_mins += mins
        weight += game_weight
        ts += number(row, "TS%") * game_weight
        efg += number(row, "eFG%") * game_weight
        usg += number(row, "USG%") * game_weight
        ortg += number(row, "ORtg") * game_weight
        drtg += number(row, "DRtg") * game_weight
        bpm += number(row, "BPM") * game_weight
    usg_value = (usg / weight) if weight else 0.0
    if usg_value <= 1:
        usg_value *= 100
    return {
        "id": game.id,
        "game_date": game.game_date,
        "opponent": opponent_from_game(game, results),
        "team_side": side,
        "pts": team_pts or 0,
        "opp_pts": opp_pts or 0,
        "trb": trb,
        "ast": ast,
        "stl": stl,
        "blk": blk,
        "tov": tov,
        "mp_mins": mp_mins,
        "fg": fg,
        "fga": fga,
        "fg3": fg3,
        "fg3a": fg3a,
        "ft": ft,
        "fta": fta,
        "fg_pct": (fg / fga) if fga else 0,
        "fg3_pct": (fg3 / fg3a) if fg3a else 0,
        "ft_pct": (ft / fta) if fta else 0,
        "ts_pct": (ts / weight) if weight else 0,
        "efg_pct": (efg / weight) if weight else 0,
        "usg_pct": usg_value,
        "ortg": (ortg / weight) if weight else 0,
        "drtg": (drtg / weight) if weight else 0,
        "bpm": (bpm / weight) if weight else 0,
    }


def build_team_analytics(team, games: List[Any]) -> Dict[str, Any]:
    players: Dict[str, Dict[str, Any]] = {}
    game_rows: List[Dict[str, Any]] = []
    metric_series: List[Dict[str, Any]] = []
    wins = 0
    losses = 0
    totals = {"pts": 0.0, "opp_pts": 0.0, "trb": 0.0, "ast": 0.0}

    for game in games:
        results = parse_results(game.results_json)
        snapshot = team_game_snapshot(game, results)
        side = snapshot["team_side"]
        team_list = player_rows(results.get(side))
        team_pts = snapshot["pts"]
        opp_pts = snapshot["opp_pts"]
        if team_pts is not None and opp_pts is not None:
            if team_pts > opp_pts:
                wins += 1
            elif team_pts < opp_pts:
                losses += 1
        totals["pts"] += team_pts or 0
        totals["opp_pts"] += opp_pts or 0
        for index, row in enumerate(team_list):
            name = get_player_name(row, index)
            key = normalize_name(name)
            if key not in players:
                players[key] = empty_player(name)
            add_player_row(players[key], row, game, snapshot["opponent"], side)
            totals["trb"] += number(row, "TRB", "REB")
            totals["ast"] += number(row, "AST")
        metric_series.append(snapshot)
        game_rows.append(
            {
                "id": game.id,
                "game_date": game.game_date,
                "opponent": snapshot["opponent"],
                "team_score": team_pts,
                "opponent_score": opp_pts,
                "team_side": side,
            }
        )

    finalized = []
    for bucket in players.values():
        player = finalize_player(bucket)
        player.pop("game_log", None)
        finalized.append(player)
    finalized.sort(key=lambda item: (-item["pts"], item["player"]))
    game_rows.sort(key=lambda item: item["game_date"] or "", reverse=True)
    metric_series.sort(key=lambda item: item["game_date"] or "")
    return {
        "team_id": team.id,
        "team_name": team.name,
        "games_played": len(games),
        "record": {"wins": wins, "losses": losses},
        "totals": totals,
        "players": finalized,
        "games": game_rows,
        "metric_series": metric_series,
    }


def build_player_analytics(team, games: List[Any], player_name: str) -> Optional[Dict[str, Any]]:
    target = normalize_name(player_name)
    if not target:
        return None
    bucket = empty_player(player_name)
    matched = False
    for game in games:
        results = parse_results(game.results_json)
        side = team_side_from_results(results)
        opponent = opponent_from_game(game, results)
        for index, row in enumerate(player_rows(results.get(side))):
            name = get_player_name(row, index)
            if normalize_name(name) != target:
                continue
            matched = True
            bucket["player"] = name
            add_player_row(bucket, row, game, opponent, side)
    if not matched:
        return None
    stats = finalize_player(bucket)
    return {
        "team_id": team.id,
        "team_name": team.name,
        "player_name": stats["player"],
        "games_played": stats["games"],
        "stats": stats,
        "games": stats["game_log"],
    }
