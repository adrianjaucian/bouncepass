import json
import re
from typing import Any, Dict, List, Optional, Tuple

from gender_utils import filter_games_by_gender, format_team_gender_short, normalize_gender
from region_utils import filter_games_by_region, normalize_region
from boxscore_normalize import get_player_name
from stats_engine import parse_mp_to_minutes
from team_dashboard import (
    filter_player_rows,
    get_pct_value,
    get_row_number,
    get_usage_rate,
    shooting_pct,
)
from leader_eligibility import filter_leader_eligible_players
from trend_series import build_trend_charts, build_trend_point

MIN_MP_FOR_RATE_RANKS = 40.0

RANK_CONFIG: List[Tuple[str, str, bool, Optional[float]]] = [
    ("pts", "pts", True, None),
    ("pts_pg", "pts_pg", True, None),
    ("trb", "trb", True, None),
    ("trb_pg", "trb_pg", True, None),
    ("ast", "ast", True, None),
    ("ast_pg", "ast_pg", True, None),
    ("stl", "stl", True, None),
    ("blk", "blk", True, None),
    ("mp_mins", "mp_mins", True, None),
    ("ts_pct", "ts_pct", True, MIN_MP_FOR_RATE_RANKS),
    ("efg_pct", "efg_pct", True, MIN_MP_FOR_RATE_RANKS),
    ("fg3_pct", "fg3_pct", True, MIN_MP_FOR_RATE_RANKS),
    ("fg3par", "fg3par", True, MIN_MP_FOR_RATE_RANKS),
    ("usg_pct", "usg_pct", True, MIN_MP_FOR_RATE_RANKS),
    ("ortg", "ortg", True, MIN_MP_FOR_RATE_RANKS),
    ("drtg", "drtg", False, MIN_MP_FOR_RATE_RANKS),
    ("bpm", "bpm", True, MIN_MP_FOR_RATE_RANKS),
]


def normalize_player_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def player_names_match(saved_name: str, query: str) -> bool:
    saved = normalize_player_name(saved_name)
    query_norm = normalize_player_name(query)
    if not saved or not query_norm:
        return False
    return saved == query_norm or query_norm in saved or saved in query_norm


def _new_player_bucket(player_name: str) -> Dict[str, Any]:
    return {
        "player": player_name,
        "teams": set(),
        "games": 0,
        "pts": 0.0,
        "trb": 0.0,
        "ast": 0.0,
        "stl": 0.0,
        "blk": 0.0,
        "tov": 0.0,
        "orb": 0.0,
        "drb": 0.0,
        "fg": 0.0,
        "fga": 0.0,
        "fg3": 0.0,
        "fg3a": 0.0,
        "ft": 0.0,
        "fta": 0.0,
        "mp_mins": 0.0,
        "ortg_weighted": 0.0,
        "drtg_weighted": 0.0,
        "usg_weighted": 0.0,
        "usg_sum": 0.0,
        "usg_readings": 0,
        "bpm_weighted": 0.0,
        "bpm_sum": 0.0,
        "bpm_readings": 0,
        "efg_sum": 0.0,
        "efg_readings": 0,
        "fg3_sum": 0.0,
        "fg3_readings": 0,
        "ast_pct_weighted": 0.0,
        "trb_pct_weighted": 0.0,
        "stl_pct_weighted": 0.0,
        "blk_pct_weighted": 0.0,
        "tov_pct_weighted": 0.0,
        "orb_pct_weighted": 0.0,
        "drb_pct_weighted": 0.0,
        "advanced_mp": 0.0,
        "game_log": [],
    }


def _get_weighted_pct(row: Dict[str, Any], keys: List[str]) -> float:
    value = get_row_number(row, keys)
    if value <= 0:
        return 0.0
    if value <= 1 and "%" in keys[0]:
        return value * 100.0
    return value


def _accumulate_player_row(
    bucket: Dict[str, Any],
    row: Dict[str, Any],
    index: int,
    *,
    game_id: int,
    game_date: str,
    team_name: str,
    opponent_name: Optional[str],
    gender: Optional[str] = None,
) -> None:
    mp_mins = parse_mp_to_minutes(row.get("MP"))
    if mp_mins <= 0 and row.get("MP_mins") is not None:
        mp_mins = get_row_number(row, ["MP_mins"])

    pts = get_row_number(row, ["PTS", "POINTS"])
    trb = get_row_number(row, ["TRB", "REB", "TOTAL_REB"])
    ast = get_row_number(row, ["AST"])
    stl = get_row_number(row, ["STL"])
    blk = get_row_number(row, ["BLK"])
    tov = get_row_number(row, ["TOV", "TO"])
    orb = get_row_number(row, ["ORB"])
    drb = get_row_number(row, ["DRB"])
    fg = get_row_number(row, ["FG", "FGM"])
    fga = get_row_number(row, ["FGA"])
    fg3 = get_row_number(row, ["3P", "3PM"])
    fg3a = get_row_number(row, ["3PA"])
    ft = get_row_number(row, ["FT", "FTM"])
    fta = get_row_number(row, ["FTA"])
    ortg = get_row_number(row, ["ORtg"])
    drtg = get_row_number(row, ["DRtg"])
    usg = get_usage_rate(row)
    bpm = get_row_number(row, ["BPM"])
    ts_pct = get_pct_value(row, ["TS%"])
    if ts_pct is None and fga > 0:
        ts_pct = pts / (2 * (fga + 0.44 * fta)) if (fga + 0.44 * fta) > 0 else None
    efg_pct = get_pct_value(row, ["eFG%"])
    if efg_pct is None and fga > 0:
        efg_pct = (fg + 0.5 * fg3) / fga
    game_fg3par = get_pct_value(row, ["3PAr"])
    if game_fg3par is None and fga > 0:
        game_fg3par = fg3a / fga
    game_fg3 = get_pct_value(row, ["3P%"])
    if game_fg3 is None and fg3a > 0:
        game_fg3 = fg3 / fg3a
    trb_pct = _get_weighted_pct(row, ["TRB%"]) if mp_mins > 0 else None
    blk_pct = _get_weighted_pct(row, ["BLK%"]) if mp_mins > 0 else None
    has_bpm = "BPM" in row and row.get("BPM") is not None and str(row.get("BPM")).strip() != ""

    bucket["teams"].add(format_team_gender_short(team_name, gender))
    if mp_mins > 0:
        bucket["games"] += 1
    bucket["pts"] += pts
    bucket["trb"] += trb
    bucket["ast"] += ast
    bucket["stl"] += stl
    bucket["blk"] += blk
    bucket["tov"] += tov
    bucket["orb"] += orb
    bucket["drb"] += drb
    bucket["fg"] += fg
    bucket["fga"] += fga
    bucket["fg3"] += fg3
    bucket["fg3a"] += fg3a
    bucket["ft"] += ft
    bucket["fta"] += fta
    bucket["mp_mins"] += mp_mins

    if mp_mins > 0:
        bucket["ortg_weighted"] += ortg * mp_mins
        bucket["drtg_weighted"] += drtg * mp_mins
        bucket["usg_weighted"] += usg * mp_mins
        if usg > 0:
            bucket["usg_sum"] += usg
            bucket["usg_readings"] += 1
        bucket["ast_pct_weighted"] += _get_weighted_pct(row, ["AST%"]) * mp_mins
        bucket["trb_pct_weighted"] += _get_weighted_pct(row, ["TRB%"]) * mp_mins
        bucket["stl_pct_weighted"] += _get_weighted_pct(row, ["STL%"]) * mp_mins
        bucket["blk_pct_weighted"] += _get_weighted_pct(row, ["BLK%"]) * mp_mins
        bucket["tov_pct_weighted"] += _get_weighted_pct(row, ["TOV%"]) * mp_mins
        bucket["orb_pct_weighted"] += _get_weighted_pct(row, ["ORB%"]) * mp_mins
        bucket["drb_pct_weighted"] += _get_weighted_pct(row, ["DRB%"]) * mp_mins
        bucket["advanced_mp"] += mp_mins
        if bpm != 0 or has_bpm:
            bucket["bpm_weighted"] += bpm * mp_mins
            bucket["bpm_sum"] += bpm
            bucket["bpm_readings"] += 1
        if fga > 0 and efg_pct is not None:
            bucket["efg_sum"] += efg_pct
            bucket["efg_readings"] += 1
        if fg3a > 0 and game_fg3 is not None:
            bucket["fg3_sum"] += game_fg3
            bucket["fg3_readings"] += 1

    bucket["game_log"].append(
        {
            "game_id": game_id,
            "game_date": game_date,
            "team_name": team_name,
            "team_label": format_team_gender_short(team_name, gender),
            "opponent": opponent_name,
            "mp_mins": round(mp_mins, 1),
            "pts": int(pts),
            "trb": int(trb),
            "ast": int(ast),
            "stl": int(stl),
            "blk": int(blk),
            "fg": int(fg),
            "fga": int(fga),
            "fg3": int(fg3),
            "fg3a": int(fg3a),
            "ft": int(ft),
            "fta": int(fta),
            "tov": int(tov),
            "ts_pct": round(ts_pct, 4) if ts_pct is not None else None,
            "efg_pct": round(efg_pct, 4) if efg_pct is not None else None,
            "usg_pct": round(usg, 1) if usg > 0 else None,
            "ortg": round(ortg, 1) if ortg > 0 else None,
            "drtg": round(drtg, 1) if drtg > 0 else None,
            "bpm": round(bpm, 1) if has_bpm else None,
            "fg3par": round(game_fg3par, 4) if game_fg3par is not None else None,
            "trb_pct": round(trb_pct, 1) if mp_mins > 0 else None,
            "blk_pct": round(blk_pct, 1) if mp_mins > 0 else None,
        }
    )


def _finalize_player_bucket(bucket: Dict[str, Any]) -> Dict[str, Any]:
    mp = bucket["mp_mins"]
    adv_mp = bucket["advanced_mp"]
    games = bucket["games"]
    fg = bucket["fg"]
    fga = bucket["fga"]
    fg3 = bucket["fg3"]
    fg3a = bucket["fg3a"]
    fta = bucket["fta"]
    pts = bucket["pts"]

    usg_readings = bucket["usg_readings"]
    efg_readings = bucket["efg_readings"]
    fg3_readings = bucket["fg3_readings"]
    bpm_readings = bucket["bpm_readings"]

    def per_game(total: float) -> Optional[float]:
        if not games:
            return None
        return round(total / games, 1)

    return {
        "player": bucket["player"],
        "teams": sorted(bucket["teams"], key=lambda value: value.lower()),
        "games": games,
        "mp_mins": round(mp, 1),
        "pts": int(pts),
        "trb": int(bucket["trb"]),
        "ast": int(bucket["ast"]),
        "stl": int(bucket["stl"]),
        "blk": int(bucket["blk"]),
        "tov": int(bucket["tov"]),
        "orb": int(bucket["orb"]),
        "drb": int(bucket["drb"]),
        "fg": int(fg),
        "fga": int(fga),
        "fg3": int(fg3),
        "fg3a": int(fg3a),
        "ft": int(bucket["ft"]),
        "fta": int(fta),
        "pts_pg": per_game(pts),
        "trb_pg": per_game(bucket["trb"]),
        "ast_pg": per_game(bucket["ast"]),
        "stl_pg": per_game(bucket["stl"]),
        "blk_pg": per_game(bucket["blk"]),
        "tov_pg": per_game(bucket["tov"]),
        "ts_pct": shooting_pct(pts, 2 * (fga + 0.44 * fta)),
        "efg_pct": shooting_pct(fg + 0.5 * fg3, fga),
        "fg3_pct": shooting_pct(fg3, fg3a),
        "fg3par": shooting_pct(fg3a, fga),
        "ft_pct": shooting_pct(bucket["ft"], fta),
        "ortg": round(bucket["ortg_weighted"] / mp, 1) if mp > 0 else None,
        "drtg": round(bucket["drtg_weighted"] / mp, 1) if mp > 0 else None,
        "usg_pct": round(bucket["usg_weighted"] / mp, 1) if mp > 0 and bucket["usg_weighted"] > 0 else None,
        "usg_avg": round(bucket["usg_sum"] / usg_readings, 1) if usg_readings > 0 else None,
        "bpm": round(bucket["bpm_weighted"] / mp, 1) if mp > 0 and bpm_readings > 0 else None,
        "bpm_avg": round(bucket["bpm_sum"] / bpm_readings, 1) if bpm_readings > 0 else None,
        "efg_avg": round(bucket["efg_sum"] / efg_readings, 4) if efg_readings > 0 else None,
        "fg3_avg": round(bucket["fg3_sum"] / fg3_readings, 4) if fg3_readings > 0 else None,
        "ast_pct": round(bucket["ast_pct_weighted"] / adv_mp, 1) if adv_mp > 0 else None,
        "trb_pct": round(bucket["trb_pct_weighted"] / adv_mp, 1) if adv_mp > 0 else None,
        "stl_pct": round(bucket["stl_pct_weighted"] / adv_mp, 1) if adv_mp > 0 else None,
        "blk_pct": round(bucket["blk_pct_weighted"] / adv_mp, 1) if adv_mp > 0 else None,
        "tov_pct": round(bucket["tov_pct_weighted"] / adv_mp, 1) if adv_mp > 0 else None,
        "orb_pct": round(bucket["orb_pct_weighted"] / adv_mp, 1) if adv_mp > 0 else None,
        "drb_pct": round(bucket["drb_pct_weighted"] / adv_mp, 1) if adv_mp > 0 else None,
        "game_log": sorted(bucket["game_log"], key=lambda item: item["game_date"], reverse=True),
        "ranks": {},
    }


def build_league_players(
    games: List[Any],
    gender: Optional[str] = None,
    region: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    games = filter_games_by_gender(games, gender)
    games = filter_games_by_region(games, region)
    players: Dict[str, Dict[str, Any]] = {}

    for game in games:
        results = json.loads(game.results_json)
        sides = [
            ("home", game.home_team_name, game.away_team_name),
            ("away", game.away_team_name, game.home_team_name),
        ]

        for side, team_name, opponent_name in sides:
            if not team_name:
                continue
            rows = filter_player_rows(results.get(side))
            if not rows:
                continue

            for index, row in enumerate(rows):
                player_name = get_player_name(row, index)
                if player_name not in players:
                    players[player_name] = _new_player_bucket(player_name)
                _accumulate_player_row(
                    players[player_name],
                    row,
                    index,
                    game_id=game.id,
                    game_date=game.game_date,
                    team_name=str(team_name).strip(),
                    opponent_name=str(opponent_name).strip() if opponent_name else None,
                    gender=normalize_gender(getattr(game, "gender", None)),
                )

    player_list = [_finalize_player_bucket(bucket) for bucket in players.values()]
    assign_league_ranks(player_list)
    return sorted(player_list, key=lambda item: (-item["pts"], item["player"].lower())), len(games)


def assign_league_ranks(players: List[Dict[str, Any]]) -> None:
    for rank_key, field, higher_is_better, min_mp in RANK_CONFIG:
        eligible = [player for player in players if player.get(field) is not None]
        if min_mp is not None:
            eligible = [player for player in eligible if player.get("mp_mins", 0) >= min_mp]

        sorted_players = sorted(
            eligible,
            key=lambda player: (
                -player[field] if higher_is_better else player[field],
                player["player"].lower(),
            ),
        )
        total = len(sorted_players)
        for rank, player in enumerate(sorted_players, 1):
            player["ranks"][rank_key] = {"rank": rank, "of": total}


def collect_player_names(games: List[Any]) -> List[str]:
    names = set()
    for game in games:
        results = json.loads(game.results_json)
        for side in ("home", "away"):
            rows = filter_player_rows(results.get(side))
            for index, row in enumerate(rows):
                names.add(get_player_name(row, index))
    return sorted(names, key=lambda value: value.lower())


def find_player_profile(players: List[Dict[str, Any]], query: str) -> Optional[Dict[str, Any]]:
    trimmed = query.strip()
    if not trimmed:
        return None

    for player in players:
        if player["player"] == trimmed:
            return player

    matches = [player for player in players if player_names_match(player["player"], trimmed)]
    if not matches:
        return None
    if len(matches) == 1:
        return matches[0]

    exact_insensitive = [
        player for player in matches if player["player"].lower() == trimmed.lower()
    ]
    if len(exact_insensitive) == 1:
        return exact_insensitive[0]

    return sorted(matches, key=lambda player: (-player["games"], -player["mp_mins"]))[0]


def build_league_leader_players(
    games: List[Any],
    gender: Optional[str] = None,
    region: Optional[str] = None,
) -> Dict[str, Any]:
    player_list, league_games = build_league_players(games, gender=gender, region=region)
    leader_players = filter_leader_eligible_players(
        player_list,
        games,
        gender=gender,
        region=region,
    )
    slim_players = []
    for player in leader_players:
        slim = {key: value for key, value in player.items() if key != "game_log"}
        slim_players.append(slim)
    return {
        "league_players": len(slim_players),
        "league_games": league_games,
        "players": slim_players,
    }


def build_player_dashboard(
    games: List[Any],
    player_query: str,
    gender: Optional[str] = None,
    region: Optional[str] = None,
) -> Dict[str, Any]:
    player_list, league_games = build_league_players(games, gender=gender, region=region)
    profile = find_player_profile(player_list, player_query)
    if not profile:
        return {
            "player_name": player_query.strip(),
            "query": player_query.strip(),
            "games_played": 0,
            "teams": [],
            "stats": None,
            "games": [],
            "trend_charts": {"last_5": [], "last_10": [], "season": []},
            "league_players": len(player_list),
            "league_games": league_games,
        }

    game_log = profile.pop("game_log")
    stats = profile
    trend_points = [
        build_trend_point(
            game_date=game["game_date"],
            opponent=game.get("opponent"),
            team_name=game.get("team_name"),
            pts=game.get("pts"),
            trb=game.get("trb"),
            ast=game.get("ast"),
            ts_pct=game.get("ts_pct"),
            usg_pct=game.get("usg_pct"),
            bpm=game.get("bpm"),
            fg3par=game.get("fg3par"),
            trb_pct=game.get("trb_pct"),
            blk_pct=game.get("blk_pct"),
        )
        for game in game_log
    ]

    return {
        "player_name": stats["player"],
        "query": player_query.strip(),
        "games_played": stats["games"],
        "teams": stats.pop("teams"),
        "stats": stats,
        "games": game_log,
        "trend_charts": build_trend_charts(trend_points),
        "league_players": len(player_list),
        "league_games": league_games,
    }
