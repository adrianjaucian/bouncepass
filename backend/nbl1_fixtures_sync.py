import time
import urllib.error
import urllib.parse
import urllib.request
import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd
from sqlalchemy.orm import Session

from game_scores import scores_from_results
from gender_utils import extract_gender_from_match, normalize_gender
from region_utils import extract_region_from_match, normalize_region
from models import SavedGame
from nbl1_scraper import Nbl1ScrapeError, scrape_nbl1_fixture
from stats_engine import generate_advanced_stats
from boxscore_normalize import get_player_name

ROSETTA_BASE = "https://prod.rosetta.nbl.com.au/get/nbl1"
NBL1_CONFERENCES = ("north", "south", "east", "west", "central")
USER_AGENT = "Mozilla/5.0 (compatible; BouncePass/1.0)"
COMPLETED_STATUSES = {"complete", "completed", "final"}


class Nbl1SyncError(Exception):
    pass


def _fetch_rosetta(path: str, params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    query = urllib.parse.urlencode(params or {})
    url = f"{ROSETTA_BASE}/{path.lstrip('/')}"
    if query:
        url = f"{url}?{query}"

    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
            "Origin": "https://www.nbl1.com.au",
            "Referer": "https://www.nbl1.com.au/fixtures",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        raise Nbl1SyncError(f"NBL1 fixtures request failed ({exc.code})") from exc
    except urllib.error.URLError as exc:
        raise Nbl1SyncError("Could not reach NBL1 fixtures service") from exc
    except json.JSONDecodeError as exc:
        raise Nbl1SyncError("Invalid response from NBL1 fixtures service") from exc

    if isinstance(payload, dict) and "data" in payload:
        return payload
    if isinstance(payload, list):
        return {"data": payload, "count": len(payload)}
    return {"data": [], "count": 0}


def get_current_season_year() -> str:
    payload = _fetch_rosetta("seasons/current")
    seasons = payload.get("data") or []
    years = [str(season.get("year")).strip() for season in seasons if season.get("year")]
    if not years:
        return str(datetime.utcnow().year)
    return max(years)


def _match_fixture_id(match: Dict[str, Any]) -> Optional[str]:
    fixture_id = match.get("external_id") or match.get("id")
    if not fixture_id:
        return None
    return str(fixture_id)


def _is_completed_match(match: Dict[str, Any]) -> bool:
    status = str(match.get("match_status") or "").strip().lower()
    return status in COMPLETED_STATUSES


def _parse_game_date(match: Dict[str, Any]) -> str:
    raw = match.get("start_time_datetime") or match.get("start_time") or ""
    if not raw:
        return ""
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except ValueError:
        return str(raw)[:10]


def discover_nbl1_fixtures(season_year: Optional[str] = None) -> Tuple[str, List[Dict[str, Any]]]:
    year = str(season_year or get_current_season_year())
    merged: Dict[str, Dict[str, Any]] = {}

    for conference in NBL1_CONFERENCES:
        payload = _fetch_rosetta(
            f"matches/in/season/{year}/regular/{conference}",
            {"limit": "2000"},
        )
        for match in payload.get("data") or []:
            fixture_id = _match_fixture_id(match)
            if not fixture_id:
                continue
            merged[fixture_id] = match

    fixtures = list(merged.values())
    fixtures.sort(key=lambda match: match.get("start_time_datetime") or "")
    return year, fixtures


def build_fixture_game_url(fixture_id: str) -> str:
    return f"https://www.nbl1.com.au/games/{fixture_id}"


def load_saved_fixture_ids(db: Session) -> Set[str]:
    rows = db.query(SavedGame.fixture_id).filter(SavedGame.fixture_id.isnot(None)).all()
    return {row[0] for row in rows if row[0]}


def _fixture_lookup(fixtures: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    lookup: Dict[str, Dict[str, Any]] = {}
    for match in fixtures:
        fixture_id = _match_fixture_id(match)
        if fixture_id:
            lookup[fixture_id] = match
    return lookup


def backfill_nbl1_metadata_from_fixtures(
    db: Session,
    fixtures: List[Dict[str, Any]],
) -> int:
    """Update gender/region on already-saved NBL1 games from fixture API data."""
    lookup = _fixture_lookup(fixtures)
    if not lookup:
        return 0

    games = (
        db.query(SavedGame)
        .filter(SavedGame.fixture_id.isnot(None))
        .filter((SavedGame.gender.is_(None)) | (SavedGame.region.is_(None)))
        .all()
    )
    if not games:
        return 0

    updated = 0
    for game in games:
        match = lookup.get(str(game.fixture_id))
        if not match:
            continue

        gender = normalize_gender(extract_gender_from_match(match))
        region = normalize_region(extract_region_from_match(match))
        changed = False

        if game.gender is None and gender:
            game.gender = gender
            changed = True
        if game.region is None and region:
            game.region = region
            changed = True
        if not game.provider:
            game.provider = "nbl1"
            changed = True

        if changed:
            updated += 1

    if updated:
        db.commit()
    return updated


def save_synced_game(
    db: Session,
    *,
    game_date: str,
    home_team_name: str,
    away_team_name: str,
    results: Dict[str, Any],
    fixture_id: str,
    source_url: str,
    gender: Optional[str] = None,
    region: Optional[str] = None,
) -> SavedGame:
    record = SavedGame(
        game_date=game_date.strip(),
        home_team_name=home_team_name.strip(),
        away_team_name=away_team_name.strip() if away_team_name else None,
        results_json=json.dumps(results),
        fixture_id=fixture_id,
        source_url=source_url,
        provider="nbl1",
        gender=normalize_gender(gender),
        region=normalize_region(region),
    )
    record.home_score, record.away_score = scores_from_results(results)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _build_team_stats(df: pd.DataFrame) -> Dict[str, int]:
    return {
        "FGA": int(pd.to_numeric(df.get("FGA", 0), errors="coerce").sum()),
        "FTA": int(pd.to_numeric(df.get("FTA", 0), errors="coerce").sum()),
        "TOV": int(pd.to_numeric(df.get("TOV", 0), errors="coerce").sum()),
        "ORB": int(pd.to_numeric(df.get("ORB", 0), errors="coerce").sum()),
        "DRB": int(pd.to_numeric(df.get("DRB", 0), errors="coerce").sum()),
        "TRB": int(pd.to_numeric(df.get("TRB", 0), errors="coerce").sum()),
        "AST": int(pd.to_numeric(df.get("AST", 0), errors="coerce").sum()),
        "PTS": int(pd.to_numeric(df.get("PTS", 0), errors="coerce").sum()),
        "FG": int(pd.to_numeric(df.get("FG", 0), errors="coerce").sum()),
    }


def _clean_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    for row in rows:
        for key, value in row.items():
            if isinstance(value, float) and (pd.isna(value) or value in (float("inf"), float("-inf"))):
                row[key] = 0
    return rows


def _calculate_stats(df: pd.DataFrame, opponent_stats: Optional[Dict[str, int]] = None) -> List[Dict[str, Any]]:
    team_stats = _build_team_stats(df)
    rows = generate_advanced_stats(df, team_stats=team_stats, opponent_stats=opponent_stats)
    for index, row in enumerate(rows):
        row["Player"] = get_player_name(row, index)
    return _clean_rows(rows)


def scrape_fixture_to_results(fixture_id: str) -> Tuple[Dict[str, Any], Dict[str, str]]:
    home_df, away_df, meta = scrape_nbl1_fixture(fixture_id)
    home_stats = _calculate_stats(home_df)
    away_stats = _calculate_stats(away_df, opponent_stats=_build_team_stats(home_df))
    results = {"home": home_stats, "away": away_stats}
    return results, meta


def sync_nbl1_fixtures(
    db: Session,
    *,
    season_year: Optional[str] = None,
    delay_seconds: float = 0.05,
    max_imports: Optional[int] = None,
) -> Dict[str, Any]:
    year, fixtures = discover_nbl1_fixtures(season_year)
    updated_metadata_count = backfill_nbl1_metadata_from_fixtures(db, fixtures)
    saved_ids = load_saved_fixture_ids(db)

    completed = [match for match in fixtures if _is_completed_match(match)]
    pending = [match for match in completed if _match_fixture_id(match) not in saved_ids]
    batch = pending if max_imports is None else pending[:max_imports]

    imported: List[Dict[str, Any]] = []
    skipped_existing = len(completed) - len(pending)
    errors: List[Dict[str, str]] = []

    for index, match in enumerate(batch):
        fixture_id = _match_fixture_id(match)
        if not fixture_id:
            continue

        home_team = (match.get("home_team") or {}).get("name") or ""
        away_team = (match.get("away_team") or {}).get("name") or ""
        gender = normalize_gender(extract_gender_from_match(match))
        region = normalize_region(extract_region_from_match(match))
        label = f"{home_team} vs {away_team}".strip(" vs")

        try:
            results, meta = scrape_fixture_to_results(fixture_id)
            record = save_synced_game(
                db,
                game_date=meta.get("game_date") or _parse_game_date(match),
                home_team_name=home_team or meta.get("home_team_name") or "",
                away_team_name=away_team or meta.get("away_team_name") or "",
                results=results,
                fixture_id=fixture_id,
                source_url=meta.get("source_url") or build_fixture_game_url(fixture_id),
                gender=gender,
                region=region,
            )
            imported.append(
                {
                    "id": record.id,
                    "fixture_id": fixture_id,
                    "game_date": record.game_date,
                    "home_team_name": record.home_team_name,
                    "away_team_name": record.away_team_name,
                    "gender": record.gender,
                    "region": record.region,
                    "label": label,
                }
            )
            saved_ids.add(fixture_id)
        except Nbl1ScrapeError as exc:
            errors.append({"fixture_id": fixture_id, "label": label, "error": str(exc)})
        except Exception as exc:  # pragma: no cover - defensive guard for unexpected scrape failures
            errors.append({"fixture_id": fixture_id, "label": label, "error": str(exc)})

        if delay_seconds and index < len(batch) - 1:
            time.sleep(delay_seconds)

    remaining_pending = len(pending) - len(batch)
    return {
        "season_year": year,
        "discovered": len(fixtures),
        "completed": len(completed),
        "pending": len(pending),
        "skipped_existing": skipped_existing,
        "updated_metadata_count": updated_metadata_count,
        "imported_count": len(imported),
        "imported": imported,
        "failed_count": len(errors),
        "errors": errors,
        "has_more": remaining_pending > 0,
    }
