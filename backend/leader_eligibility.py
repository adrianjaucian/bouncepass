import json
import math
from typing import Any, Dict, List, Optional, Set, Tuple

from boxscore_normalize import get_player_name, is_totals_row_name
from gender_utils import filter_games_by_gender, normalize_gender
from region_utils import filter_games_by_region, normalize_region
from stats_engine import parse_mp_to_minutes

LEADER_MIN_TEAM_GAME_SHARE = 0.5

TeamKey = Tuple[str, str, str]
PlayerTeamKey = Tuple[str, TeamKey]


def _filter_player_rows(rows: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
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


def _get_row_number(row: Dict[str, Any], keys: List[str]) -> float:
    for key in keys:
        if key in row and row[key] is not None and str(row[key]).strip() != "":
            try:
                return float(row[key])
            except (TypeError, ValueError):
                continue
    return 0.0


def minimum_team_games_for_eligibility(team_games: int) -> int:
    if team_games <= 0:
        return 0
    return math.ceil(team_games * LEADER_MIN_TEAM_GAME_SHARE)


def player_meets_team_eligibility(player_games: int, team_games: int) -> bool:
    if team_games <= 0 or player_games <= 0:
        return False
    return player_games >= minimum_team_games_for_eligibility(team_games)


def team_key_from_game(game: Any, team_name: str) -> TeamKey:
    return (
        str(team_name or "").strip().lower(),
        normalize_gender(getattr(game, "gender", None)) or "",
        normalize_region(getattr(game, "region", None)) or "",
    )


def _player_played_game(row: Dict[str, Any]) -> bool:
    mp_mins = parse_mp_to_minutes(row.get("MP"))
    if mp_mins <= 0 and row.get("MP_mins") is not None:
        mp_mins = _get_row_number(row, ["MP_mins"])
    return mp_mins > 0


def build_team_game_counts(
    games: List[Any],
    gender: Optional[str] = None,
    region: Optional[str] = None,
) -> Dict[TeamKey, int]:
    filtered = filter_games_by_region(filter_games_by_gender(games, gender), region)
    counts: Dict[TeamKey, int] = {}

    for game in filtered:
        for team_name in (game.home_team_name, game.away_team_name):
            if not team_name:
                continue
            key = team_key_from_game(game, str(team_name))
            counts[key] = counts.get(key, 0) + 1

    return counts


def build_player_team_game_counts(
    games: List[Any],
    gender: Optional[str] = None,
    region: Optional[str] = None,
) -> Dict[PlayerTeamKey, int]:
    filtered = filter_games_by_region(filter_games_by_gender(games, gender), region)
    counts: Dict[PlayerTeamKey, int] = {}

    for game in filtered:
        results = json.loads(game.results_json)
        sides = [
            ("home", game.home_team_name),
            ("away", game.away_team_name),
        ]

        for side, team_name in sides:
            if not team_name:
                continue
            team_key = team_key_from_game(game, str(team_name))
            rows = _filter_player_rows(results.get(side))
            seen_players: Set[str] = set()

            for index, row in enumerate(rows):
                if not _player_played_game(row):
                    continue
                player_name = get_player_name(row, index)
                player_norm = player_name.strip().lower()
                if player_norm in seen_players:
                    continue
                seen_players.add(player_norm)
                player_team_key = (player_norm, team_key)
                counts[player_team_key] = counts.get(player_team_key, 0) + 1

    return counts


def eligible_player_names(
    games: List[Any],
    gender: Optional[str] = None,
    region: Optional[str] = None,
) -> Set[str]:
    team_totals = build_team_game_counts(games, gender=gender, region=region)
    player_team_totals = build_player_team_game_counts(games, gender=gender, region=region)
    eligible: Set[str] = set()

    for (player_norm, team_key), player_games in player_team_totals.items():
        team_games = team_totals.get(team_key, 0)
        if player_meets_team_eligibility(player_games, team_games):
            eligible.add(player_norm)

    return eligible


def filter_leader_eligible_players(
    players: List[Dict[str, Any]],
    games: List[Any],
    gender: Optional[str] = None,
    region: Optional[str] = None,
) -> List[Dict[str, Any]]:
    eligible = eligible_player_names(games, gender=gender, region=region)
    if not eligible:
        return []

    return [
        player
        for player in players
        if str(player.get("player", "")).strip().lower() in eligible
    ]
