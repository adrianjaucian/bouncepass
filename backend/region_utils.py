from typing import Any, Dict, List, Optional

NBL1_REGIONS = ("north", "south", "east", "west", "central")


def normalize_region(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    raw = str(value).strip().lower()
    if not raw:
        return None
    if raw in NBL1_REGIONS:
        return raw
    return None


def format_region_label(region: Optional[str]) -> str:
    normalized = normalize_region(region)
    if not normalized:
        return "Unspecified"
    return normalized.capitalize()


def extract_region_from_match(match: Dict[str, Any]) -> Optional[str]:
    for team_key in ("home_team", "away_team"):
        team = match.get(team_key) or {}
        conference = team.get("conference") or {}
        conf_name = normalize_region(conference.get("name"))
        if conf_name:
            return conf_name

        division_name = str((team.get("division") or {}).get("name") or "").strip().lower()
        for region in NBL1_REGIONS:
            if division_name.startswith(f"{region} ") or division_name == region:
                return region
    return None


def filter_games_by_region(games: List[Any], region: Optional[str]) -> List[Any]:
    normalized = normalize_region(region)
    if not normalized:
        return games
    return [game for game in games if normalize_region(getattr(game, "region", None)) == normalized]


def format_competition_suffix(gender: Optional[str], region: Optional[str]) -> str:
    parts: List[str] = []
    if gender == "men":
        parts.append("Men")
    elif gender == "women":
        parts.append("Women")
    region_label = format_region_label(region)
    if normalize_region(region):
        parts.append(region_label)
    return " · ".join(parts)


def format_team_competition_label(
    name: str,
    gender: Optional[str] = None,
    region: Optional[str] = None,
) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        return ""
    suffix = format_competition_suffix(gender, region)
    if suffix:
        return f"{cleaned} ({suffix})"
    return cleaned
