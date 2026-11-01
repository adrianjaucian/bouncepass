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


def add_player_row(bucket: Dict[str, Any], row: Dict[str, Any], game: Any) -> None:
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
    bucket["game_log"].append(
        {
            "game_id": game.id,
            "game_date": game.game_date,
            "opponent": game.away_team_name,
            "pts": pts,
            "trb": number(row, "TRB", "REB"),
            "ast": number(row, "AST"),
            "mp_mins": mp_mins,
            "ts_pct": number(row, "TS%"),
            "usg_pct": number(row, "USG%"),
            "ortg": number(row, "ORtg"),
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


def collect_team_players_from_results(results: Dict[str, Any]) -> List[str]:
    names: List[str] = []
    seen = set()
    for index, row in enumerate(player_rows(results.get("home"))):
        name = get_player_name(row, index).strip()
        key = normalize_name(name)
        if not key or key in seen:
            continue
        seen.add(key)
        names.append(name)
    return names


def build_team_analytics(team, games: List[Any]) -> Dict[str, Any]:
    players: Dict[str, Dict[str, Any]] = {}
    game_rows: List[Dict[str, Any]] = []
    wins = 0
    losses = 0
    totals = {"pts": 0.0, "opp_pts": 0.0, "trb": 0.0, "ast": 0.0}

    for game in games:
        results = parse_results(game.results_json)
        home_rows = player_rows(results.get("home"))
        home_pts = game.home_score if game.home_score is not None else sum(number(row, "PTS") for row in home_rows)
        away_pts = game.away_score
        if home_pts is not None and away_pts is not None:
            if home_pts > away_pts:
                wins += 1
            elif home_pts < away_pts:
                losses += 1
        totals["pts"] += home_pts or 0
        totals["opp_pts"] += away_pts or 0
        for index, row in enumerate(home_rows):
            name = get_player_name(row, index)
            key = normalize_name(name)
            if key not in players:
                players[key] = empty_player(name)
            add_player_row(players[key], row, game)
            totals["trb"] += number(row, "TRB", "REB")
            totals["ast"] += number(row, "AST")
        game_rows.append(
            {
                "id": game.id,
                "game_date": game.game_date,
                "opponent": game.away_team_name,
                "team_score": home_pts,
                "opponent_score": away_pts,
            }
        )

    finalized = []
    for bucket in players.values():
        player = finalize_player(bucket)
        player.pop("game_log", None)
        finalized.append(player)
    finalized.sort(key=lambda item: (-item["pts"], item["player"]))
    game_rows.sort(key=lambda item: item["game_date"] or "", reverse=True)
    return {
        "team_id": team.id,
        "team_name": team.name,
        "games_played": len(games),
        "record": {"wins": wins, "losses": losses},
        "totals": totals,
        "players": finalized,
        "games": game_rows,
    }


def build_player_analytics(team, games: List[Any], player_name: str) -> Optional[Dict[str, Any]]:
    target = normalize_name(player_name)
    if not target:
        return None
    bucket = empty_player(player_name)
    matched = False
    for game in games:
        results = parse_results(game.results_json)
        for index, row in enumerate(player_rows(results.get("home"))):
            name = get_player_name(row, index)
            if normalize_name(name) != target:
                continue
            matched = True
            bucket["player"] = name
            add_player_row(bucket, row, game)
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
