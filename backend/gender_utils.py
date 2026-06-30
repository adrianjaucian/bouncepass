import re
from typing import Any, Dict, List, Optional

from region_utils import format_team_competition_label, normalize_region

VALID_GENDERS = {"men", "women"}


def normalize_gender(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    raw = str(value).strip().lower()
    if not raw:
        return None
    if raw in {"men", "man", "male", "m", "mens"}:
        return "men"
    if raw in {"women", "woman", "female", "w", "womens", "ladies"}:
        return "women"
    return None


def format_team_label(name: str, gender: Optional[str], region: Optional[str] = None) -> str:
    return format_team_competition_label(name, gender=normalize_gender(gender), region=region)


def format_team_gender_short(name: str, gender: Optional[str] = None) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        return ""
    normalized = normalize_gender(gender)
    if normalized == "women":
        return f"{cleaned} (W)"
    if normalized == "men":
        return f"{cleaned} (M)"
    return cleaned


def extract_gender_from_match(match: Dict[str, Any]) -> str:
    for team_key in ("home_team", "away_team"):
        division_name = str((match.get(team_key) or {}).get("division", {}).get("name") or "")
        lowered = division_name.lower()
        if "women" in lowered or "female" in lowered or lowered.endswith(" w"):
            return "women"
        if " men" in lowered or lowered.endswith(" men") or "male" in lowered:
            return "men"

    slug = str(match.get("match_slug") or match.get("match_title") or "").lower()
    if re.search(r"\bwomen\b", slug):
        return "women"
    if re.search(r"\bmen\b", slug):
        return "men"
    return "men"


def filter_games_by_gender(games: List[Any], gender: Optional[str]) -> List[Any]:
    normalized = normalize_gender(gender)
    if not normalized:
        return games
    return [game for game in games if normalize_gender(getattr(game, "gender", None)) == normalized]


def collect_team_options(
    games: List[Any],
    require_gender: bool = False,
    require_region: bool = False,
) -> List[Dict[str, Optional[str]]]:
    seen = set()
    options: List[Dict[str, Optional[str]]] = []
    for game in games:
        gender = normalize_gender(getattr(game, "gender", None))
        region = normalize_region(getattr(game, "region", None))
        if require_gender and not gender:
            continue
        if require_region and not region:
            continue
        for name in (getattr(game, "home_team_name", None), getattr(game, "away_team_name", None)):
            if not name:
                continue
            cleaned = str(name).strip()
            key = (cleaned.lower(), gender or "", region or "")
            if key in seen:
                continue
            seen.add(key)
            options.append(
                {
                    "name": cleaned,
                    "gender": gender,
                    "region": region,
                    "label": format_team_label(cleaned, gender, region),
                }
            )
    return sorted(options, key=lambda item: item["label"].lower())
