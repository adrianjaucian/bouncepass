import json
import re
from typing import Any, Dict, List, Optional, Tuple

from boxscore_normalize import get_player_name, is_totals_row_name
from stats_engine import GAME_MINUTES, estimate_possessions, parse_mp_to_minutes

TREND_GAME_WINDOW = 5


def normalize_team_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def team_names_match(saved_name: str, query: str) -> bool:
    saved = normalize_team_name(saved_name)
    query_norm = normalize_team_name(query)
    if not saved or not query_norm:
        return False
    return saved == query_norm or query_norm in saved or saved in query_norm


def get_row_number(row: Dict[str, Any], keys: List[str]) -> float:
    for key in keys:
        if key in row and row[key] is not None and str(row[key]).strip() != "":
            try:
                return float(row[key])
            except (TypeError, ValueError):
                continue
    return 0.0


def get_usage_rate(row: Dict[str, Any]) -> float:
    value = get_row_number(row, ["USG%", "USG", "Usage%"])
    if value <= 0:
        return 0.0
    if value <= 1:
        return value * 100.0
    return value


def filter_player_rows(rows: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    if not rows:
        return []
    filtered: List[Dict[str, Any]] = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        name = get_player_name(row, index)
        if is_totals_row_name(name):
            continue
        filtered.append(row)
    return filtered


def team_side_for_game(
    home_team_name: str,
    away_team_name: Optional[str],
    results: Dict[str, Any],
    team_query: str,
) -> Optional[str]:
    home_match = team_names_match(home_team_name, team_query)
    away_match = bool(away_team_name) and team_names_match(away_team_name, team_query)

    if home_match and away_match:
        return "home"
    if home_match:
        return "home"
    if away_match:
        return "away"
    return None


def shooting_pct(numerator: float, denominator: float) -> Optional[float]:
    if denominator <= 0:
        return None
    return round(numerator / denominator, 4)


def collect_team_names(games: List[Any]) -> List[str]:
    names = set()
    for game in games:
        if game.home_team_name:
            names.add(str(game.home_team_name).strip())
        if game.away_team_name:
            names.add(str(game.away_team_name).strip())
    return sorted(names, key=lambda value: value.lower())


def _empty_aggregate() -> Dict[str, float]:
    return {
        "total_mp": 0.0,
        "weighted_ortg": 0.0,
        "weighted_drtg": 0.0,
        "total_pts": 0.0,
        "total_opp_pts": 0.0,
        "total_possessions": 0.0,
        "total_fg": 0.0,
        "total_fga": 0.0,
        "total_3p": 0.0,
        "total_fta": 0.0,
        "total_pace_poss": 0.0,
        "total_team_mp": 0.0,
        "wins": 0.0,
        "losses": 0.0,
    }


def _merge_aggregate(target: Dict[str, float], source: Dict[str, float]) -> None:
    for key in target:
        target[key] += source[key]


def _efficiency_from_aggregate(aggregate: Dict[str, float]) -> Dict[str, Optional[float]]:
    total_mp = aggregate["total_mp"]
    total_pts = aggregate["total_pts"]
    total_opp_pts = aggregate["total_opp_pts"]
    total_possessions = aggregate["total_possessions"]
    total_fg = aggregate["total_fg"]
    total_fga = aggregate["total_fga"]
    total_3p = aggregate["total_3p"]
    total_fta = aggregate["total_fta"]
    total_pace_poss = aggregate["total_pace_poss"]
    total_team_mp = aggregate["total_team_mp"]
    weighted_ortg = aggregate["weighted_ortg"]
    weighted_drtg = aggregate["weighted_drtg"]

    possession_ortg = round(100 * total_pts / total_possessions, 1) if total_possessions > 0 else None
    possession_drtg = round(100 * total_opp_pts / total_possessions, 1) if total_possessions > 0 else None
    possession_net = (
        round(100 * (total_pts - total_opp_pts) / total_possessions, 1) if total_possessions > 0 else None
    )

    return {
        "ortg": round(weighted_ortg / total_mp, 1) if total_mp > 0 else None,
        "drtg": round(weighted_drtg / total_mp, 1) if total_mp > 0 else None,
        "net_rating": round((weighted_ortg - weighted_drtg) / total_mp, 1) if total_mp > 0 else None,
        "possession_ortg": possession_ortg,
        "possession_drtg": possession_drtg,
        "possession_net_rating": possession_net,
        "ts_pct": shooting_pct(total_pts, 2 * (total_fga + 0.44 * total_fta)),
        "efg_pct": shooting_pct(total_fg + 0.5 * total_3p, total_fga),
        "pace": round(GAME_MINUTES * 5 * total_pace_poss / total_team_mp, 1) if total_team_mp > 0 else None,
    }


def _format_trend(recent: Optional[float], prior: Optional[float], is_percent: bool = False) -> Optional[str]:
    if recent is None or prior is None:
        return None

    delta = recent - prior
    if abs(delta) < (0.0005 if is_percent else 0.05):
        return "— flat over last 5 games"

    arrow = "^" if delta > 0 else "v"
    magnitude = abs(delta) * 100 if is_percent else abs(delta)
    suffix = "%" if is_percent else ""
    return f"{arrow} {magnitude:.1f}{suffix} over last 5 games"


def _efficiency_trends(
    recent: Dict[str, Optional[float]],
    prior: Dict[str, Optional[float]],
) -> Dict[str, Optional[str]]:
    percent_metrics = {"ts_pct", "efg_pct"}
    trends: Dict[str, Optional[str]] = {}
    for key in recent:
        trends[key] = _format_trend(
            recent.get(key),
            prior.get(key),
            is_percent=key in percent_metrics,
        )
    return trends


def _aggregate_snapshots(snapshots: List[Dict[str, float]]) -> Dict[str, float]:
    aggregate = _empty_aggregate()
    for snapshot in snapshots:
        _merge_aggregate(aggregate, snapshot)
    return aggregate


def build_team_dashboard(games: List[Any], team_query: str) -> Dict[str, Any]:
    players: Dict[str, Dict[str, Any]] = {}
    matched_games: List[Dict[str, Any]] = []
    game_snapshots: List[Dict[str, Any]] = []

    for game in games:
        results = json.loads(game.results_json)
        side = team_side_for_game(
            game.home_team_name,
            game.away_team_name,
            results,
            team_query,
        )
        if not side:
            continue

        rows = filter_player_rows(results.get(side))
        if not rows:
            continue

        opponent_name = game.away_team_name if side == "home" else game.home_team_name
        opponent_rows = filter_player_rows(results.get("away" if side == "home" else "home"))

        team_game_pts = sum(get_row_number(row, ["PTS", "POINTS"]) for row in rows)
        opp_game_pts = sum(get_row_number(row, ["PTS", "POINTS"]) for row in opponent_rows)

        team_fg = sum(get_row_number(row, ["FG", "FGM"]) for row in rows)
        team_fga = sum(get_row_number(row, ["FGA"]) for row in rows)
        team_3p = sum(get_row_number(row, ["3P", "3PM"]) for row in rows)
        team_fta = sum(get_row_number(row, ["FTA"]) for row in rows)
        team_tov = sum(get_row_number(row, ["TOV", "TO"]) for row in rows)
        game_possessions = estimate_possessions(team_fga, team_fta, team_tov)

        opp_fga = sum(get_row_number(row, ["FGA"]) for row in opponent_rows)
        opp_fta = sum(get_row_number(row, ["FTA"]) for row in opponent_rows)
        opp_tov = sum(get_row_number(row, ["TOV", "TO"]) for row in opponent_rows)
        opp_game_possessions = estimate_possessions(opp_fga, opp_fta, opp_tov)

        game_team_mp = 0.0
        game_weighted_ortg = 0.0
        game_weighted_drtg = 0.0
        game_player_mp = 0.0

        for index, row in enumerate(rows):
            player_name = get_player_name(row, index)
            if player_name not in players:
                players[player_name] = {
                    "player": player_name,
                    "games": 0,
                    "pts": 0.0,
                    "trb": 0.0,
                    "ast": 0.0,
                    "stl": 0.0,
                    "blk": 0.0,
                    "mp_mins": 0.0,
                    "ortg_weighted": 0.0,
                    "drtg_weighted": 0.0,
                    "usg_weighted": 0.0,
                    "usg_sum": 0.0,
                    "usg_readings": 0,
                }

            mp_mins = parse_mp_to_minutes(row.get("MP"))
            if mp_mins <= 0 and row.get("MP_mins") is not None:
                mp_mins = get_row_number(row, ["MP_mins"])

            pts = get_row_number(row, ["PTS", "POINTS"])
            trb = get_row_number(row, ["TRB", "REB", "TOTAL_REB"])
            ast = get_row_number(row, ["AST"])
            stl = get_row_number(row, ["STL"])
            blk = get_row_number(row, ["BLK"])
            ortg = get_row_number(row, ["ORtg"])
            drtg = get_row_number(row, ["DRtg"])
            usg = get_usage_rate(row)

            bucket = players[player_name]
            bucket["games"] += 1
            bucket["pts"] += pts
            bucket["trb"] += trb
            bucket["ast"] += ast
            bucket["stl"] += stl
            bucket["blk"] += blk
            bucket["mp_mins"] += mp_mins
            if mp_mins > 0:
                bucket["ortg_weighted"] += ortg * mp_mins
                bucket["drtg_weighted"] += drtg * mp_mins
                bucket["usg_weighted"] += usg * mp_mins
                game_weighted_ortg += ortg * mp_mins
                game_weighted_drtg += drtg * mp_mins
                game_player_mp += mp_mins
                if usg > 0:
                    bucket["usg_sum"] += usg
                    bucket["usg_readings"] += 1

            game_team_mp += mp_mins

        home_score, away_score = _scores_from_results(results)
        team_score = home_score if side == "home" else away_score
        opp_score = away_score if side == "home" else home_score

        wins = 0.0
        losses = 0.0
        if team_score is not None and opp_score is not None:
            if team_score > opp_score:
                wins = 1.0
            elif team_score < opp_score:
                losses = 1.0

        matched_games.append(
            {
                "id": game.id,
                "game_date": game.game_date,
                "opponent": opponent_name,
                "team_score": int(team_score) if team_score is not None else None,
                "opponent_score": int(opp_score) if opp_score is not None else None,
                "side": side,
            }
        )

        game_snapshots.append(
            {
                "game_date": game.game_date,
                "aggregate": {
                    "total_mp": game_player_mp,
                    "weighted_ortg": game_weighted_ortg,
                    "weighted_drtg": game_weighted_drtg,
                    "total_pts": team_game_pts,
                    "total_opp_pts": opp_game_pts,
                    "total_possessions": game_possessions,
                    "total_fg": team_fg,
                    "total_fga": team_fga,
                    "total_3p": team_3p,
                    "total_fta": team_fta,
                    "total_pace_poss": (game_possessions + opp_game_possessions) / 2,
                    "total_team_mp": game_team_mp,
                    "wins": wins,
                    "losses": losses,
                },
            }
        )

    player_list = []
    for bucket in players.values():
        mp = bucket["mp_mins"]
        usg_readings = bucket["usg_readings"]
        player_list.append(
            {
                "player": bucket["player"],
                "games": bucket["games"],
                "pts": int(bucket["pts"]),
                "trb": int(bucket["trb"]),
                "ast": int(bucket["ast"]),
                "stl": int(bucket["stl"]),
                "blk": int(bucket["blk"]),
                "mp_mins": round(mp, 1),
                "ortg": round(bucket["ortg_weighted"] / mp, 1) if mp > 0 else None,
                "drtg": round(bucket["drtg_weighted"] / mp, 1) if mp > 0 else None,
                "usg_pct": round(bucket["usg_weighted"] / mp, 1) if mp > 0 and bucket["usg_weighted"] > 0 else None,
                "usg_avg": round(bucket["usg_sum"] / usg_readings, 1) if usg_readings > 0 else None,
            }
        )

    resolved_team_name = team_query
    if matched_games:
        first_game = next(
            game
            for game in games
            if team_side_for_game(
                game.home_team_name,
                game.away_team_name,
                json.loads(game.results_json),
                team_query,
            )
        )
        side = team_side_for_game(
            first_game.home_team_name,
            first_game.away_team_name,
            json.loads(first_game.results_json),
            team_query,
        )
        resolved_team_name = (
            first_game.home_team_name if side == "home" else first_game.away_team_name
        )

    sorted_snapshots = sorted(game_snapshots, key=lambda item: item["game_date"], reverse=True)
    season_aggregate = _aggregate_snapshots([item["aggregate"] for item in sorted_snapshots])
    efficiency = _efficiency_from_aggregate(season_aggregate)

    recent_snapshots = sorted_snapshots[:TREND_GAME_WINDOW]
    prior_snapshots = sorted_snapshots[TREND_GAME_WINDOW:]
    efficiency_trends: Dict[str, Optional[str]] = {}
    if recent_snapshots and prior_snapshots:
        recent_efficiency = _efficiency_from_aggregate(
            _aggregate_snapshots([item["aggregate"] for item in recent_snapshots])
        )
        prior_efficiency = _efficiency_from_aggregate(
            _aggregate_snapshots([item["aggregate"] for item in prior_snapshots])
        )
        efficiency_trends = _efficiency_trends(recent_efficiency, prior_efficiency)

    return {
        "team_name": resolved_team_name,
        "query": team_query,
        "games_played": len(matched_games),
        "record": {
            "wins": int(season_aggregate["wins"]),
            "losses": int(season_aggregate["losses"]),
        },
        "efficiency": efficiency,
        "efficiency_trends": efficiency_trends,
        "totals": {
            "pts": int(season_aggregate["total_pts"]),
            "opp_pts": int(season_aggregate["total_opp_pts"]),
            "possessions": round(season_aggregate["total_possessions"], 1),
            "fg": int(season_aggregate["total_fg"]),
            "fga": int(season_aggregate["total_fga"]),
            "fta": int(season_aggregate["total_fta"]),
        },
        "leaders": {
            "scorers": _top_leaders(player_list, "pts"),
            "rebounders": _top_leaders(player_list, "trb"),
            "assists": _top_leaders(player_list, "ast"),
            "steals": _top_leaders(player_list, "stl"),
            "blocks": _top_leaders(player_list, "blk"),
            "usage": _top_usage_leaders(player_list),
        },
        "players": sorted(player_list, key=lambda item: (-item["pts"], item["player"].lower())),
        "games": sorted(matched_games, key=lambda item: item["game_date"], reverse=True),
    }


def _top_leaders(players: List[Dict[str, Any]], stat: str, limit: int = 5) -> List[Dict[str, Any]]:
    return sorted(players, key=lambda item: (-item[stat], item["player"].lower()))[:limit]


def _top_usage_leaders(players: List[Dict[str, Any]], limit: int = 5) -> List[Dict[str, Any]]:
    return sorted(
        players,
        key=lambda item: (-(item.get("usg_pct") or 0), item["player"].lower()),
    )[:limit]


def _scores_from_results(results: Dict[str, Any]) -> Tuple[Optional[float], Optional[float]]:
    home_rows = filter_player_rows(results.get("home"))
    away_rows = filter_player_rows(results.get("away"))
    home_score = sum(get_row_number(row, ["PTS", "POINTS"]) for row in home_rows) if home_rows else None
    away_score = sum(get_row_number(row, ["PTS", "POINTS"]) for row in away_rows) if away_rows else None
    return home_score, away_score
