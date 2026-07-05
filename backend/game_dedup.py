"""Detect and remove duplicate saved games for a user."""

from __future__ import annotations

import json
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy.orm import Session

from game_scores import scores_from_results
from gender_utils import normalize_gender
from models import SavedGame
from region_utils import normalize_region

IdentityKey = Tuple[str, str, str]


def normalize_team_name(value: Optional[str]) -> str:
    return str(value or "").strip().lower()


def game_identity_key(
    game_date: str,
    home_team_name: str,
    away_team_name: Optional[str],
) -> IdentityKey:
    return (
        str(game_date or "").strip(),
        normalize_team_name(home_team_name),
        normalize_team_name(away_team_name),
    )


def identity_key_from_game(game: SavedGame) -> IdentityKey:
    return game_identity_key(game.game_date, game.home_team_name, game.away_team_name)


def game_quality_score(game: SavedGame) -> Tuple[int, int, int, int, int]:
    """Higher is better. Tuple comparison keeps the strongest saved record."""
    return (
        1 if (game.fixture_id or "").strip() else 0,
        1 if game.gender else 0,
        1 if game.region else 0,
        1 if (game.provider or "").strip() == "nbl1" else 0,
        game.id or 0,
    )


def _pick_keeper(games: List[SavedGame]) -> SavedGame:
    return max(games, key=game_quality_score)


def dedupe_user_saved_games(db: Session, user_id: int) -> Dict[str, int]:
    """Remove duplicate games, keeping sync-quality records when possible."""
    games = db.query(SavedGame).filter(SavedGame.user_id == user_id).all()
    if not games:
        return {"deleted": 0, "remaining": 0}

    delete_ids: Set[int] = set()

    by_fixture: Dict[str, List[SavedGame]] = defaultdict(list)
    for game in games:
        fixture_id = (game.fixture_id or "").strip()
        if fixture_id:
            by_fixture[fixture_id].append(game)

    for group in by_fixture.values():
        if len(group) <= 1:
            continue
        keeper = _pick_keeper(group)
        for game in group:
            if game.id != keeper.id:
                delete_ids.add(game.id)

    remaining = [game for game in games if game.id not in delete_ids]

    by_identity: Dict[IdentityKey, List[SavedGame]] = defaultdict(list)
    for game in remaining:
        by_identity[identity_key_from_game(game)].append(game)

    for group in by_identity.values():
        if len(group) <= 1:
            continue
        keeper = _pick_keeper(group)
        for game in group:
            if game.id != keeper.id:
                delete_ids.add(game.id)

    if delete_ids:
        db.query(SavedGame).filter(SavedGame.id.in_(delete_ids)).delete(synchronize_session=False)
        db.commit()

    remaining_count = len(games) - len(delete_ids)
    return {"deleted": len(delete_ids), "remaining": remaining_count}


def load_saved_game_keys(db: Session, user_id: int) -> Tuple[Set[str], Set[IdentityKey]]:
    fixture_ids: Set[str] = set()
    identity_keys: Set[IdentityKey] = set()

    games = db.query(SavedGame).filter(SavedGame.user_id == user_id).all()
    for game in games:
        fixture_id = (game.fixture_id or "").strip()
        if fixture_id:
            fixture_ids.add(fixture_id)
        identity_keys.add(identity_key_from_game(game))

    return fixture_ids, identity_keys


def find_game_by_identity(
    db: Session,
    user_id: int,
    game_date: str,
    home_team_name: str,
    away_team_name: Optional[str],
) -> Optional[SavedGame]:
    target = game_identity_key(game_date, home_team_name, away_team_name)
    candidates = (
        db.query(SavedGame)
        .filter(SavedGame.user_id == user_id, SavedGame.game_date == game_date.strip())
        .all()
    )
    for game in candidates:
        if identity_key_from_game(game) == target:
            return game
    return None


def upgrade_saved_game_from_sync(
    game: SavedGame,
    *,
    results: Dict[str, Any],
    fixture_id: str,
    source_url: str,
    gender: Optional[str],
    region: Optional[str],
    game_date: Optional[str] = None,
    home_team_name: Optional[str] = None,
    away_team_name: Optional[str] = None,
) -> SavedGame:
    if game_date:
        game.game_date = game_date.strip()
    if home_team_name:
        game.home_team_name = home_team_name.strip()
    if away_team_name is not None:
        game.away_team_name = away_team_name.strip() if away_team_name else None

    game.results_json = json.dumps(results)
    if fixture_id:
        game.fixture_id = fixture_id.strip()
    if source_url:
        game.source_url = source_url
    game.provider = "nbl1"
    game.gender = normalize_gender(gender)
    game.region = normalize_region(region)
    game.home_score, game.away_score = scores_from_results(results)
    return game
