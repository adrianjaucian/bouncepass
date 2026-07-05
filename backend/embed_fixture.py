import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any, Dict, List

from boxscore_url_scraper import UrlScrapeError

EMBED_API_BASE = "https://embed-api.eui.connect.sportradar.com/v1/embed/{website_id}/fixture_detail"
USER_AGENT = "Mozilla/5.0 (compatible; BouncePass/1.0)"


def _fetch_json(url: str) -> Dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        raise UrlScrapeError(f"Stats request failed ({exc.code})") from exc
    except urllib.error.URLError as exc:
        raise UrlScrapeError("Could not reach stats service") from exc
    except json.JSONDecodeError as exc:
        raise UrlScrapeError("Invalid response from stats service") from exc

    if "error" in payload:
        message = payload.get("error", {}).get("message", "Unknown error")
        raise UrlScrapeError(message)
    return payload


def iso_duration_to_mp(value: Any) -> str:
    import re

    if value is None:
        return "0:00"
    raw = str(value).strip()
    if not raw:
        return "0:00"

    match = re.match(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$", raw, re.I)
    if not match:
        return raw

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(float(match.group(3) or 0))
    total_minutes = hours * 60 + minutes + (1 if seconds >= 30 else 0)
    display_seconds = 0 if seconds >= 30 else seconds
    if seconds >= 30 and display_seconds == 0:
        return f"{total_minutes}:00"
    return f"{total_minutes}:{display_seconds:02d}"


def _row_to_player_record(row: Dict[str, Any]) -> Dict[str, Any]:
    stats = row.get("statistics") or {}
    fg_pct = stats.get("fieldGoalsPercentage")
    three_pct = stats.get("pointsThreePercentage")
    ft_pct = stats.get("freeThrowsPercentage")

    return {
        "Player": row.get("personName") or "",
        "MP": iso_duration_to_mp(stats.get("minutes")),
        "PTS": stats.get("points", 0) or 0,
        "FG": stats.get("fieldGoalsMade", 0) or 0,
        "FGA": stats.get("fieldGoalsAttempted", 0) or 0,
        "FG%": fg_pct if fg_pct is not None else 0,
        "3P": stats.get("pointsThreeMade", 0) or 0,
        "3PA": stats.get("pointsThreeAttempted", 0) or 0,
        "3P%": three_pct if three_pct is not None else 0,
        "FT": stats.get("freeThrowsMade", 0) or 0,
        "FTA": stats.get("freeThrowsAttempted", 0) or 0,
        "FT%": ft_pct if ft_pct is not None else 0,
        "ORB": stats.get("reboundsOffensive", 0) or 0,
        "DRB": stats.get("reboundsDefensive", 0) or 0,
        "TRB": stats.get("rebounds", 0) or 0,
        "AST": stats.get("assists", 0) or 0,
        "STL": stats.get("steals", 0) or 0,
        "BLK": stats.get("blocks", 0) or 0,
        "TOV": stats.get("turnovers", 0) or 0,
        "PF": stats.get("foulsTotal", 0) or 0,
        "+/-": stats.get("plusMinus", 0) or 0,
    }


def team_boxscore_to_rows(team_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for group in team_data.get("persons") or []:
        for row in group.get("rows") or []:
            if not row.get("participated"):
                continue
            if row.get("didNotPlayReason"):
                continue
            name = (row.get("personName") or "").strip()
            if not name:
                continue
            rows.append(_row_to_player_record(row))
    return rows


def fetch_fixture_payload(fixture_id: str, website_id: str) -> Dict[str, Any]:
    params = urllib.parse.urlencode(
        {
            "fixtureId": fixture_id,
            "locale": "en-EN",
            "sub": "statistics",
        }
    )
    url = f"{EMBED_API_BASE.format(website_id=website_id)}?{params}"
    payload = _fetch_json(url)
    data = payload.get("data") or {}
    statistics = (data.get("statistics") or {}).get("data") or {}
    base = statistics.get("base") or {}
    home = base.get("home")
    away = base.get("away")
    if not home or not away:
        raise UrlScrapeError("Box score is not available for this game yet")

    banner = data.get("banner") or {}
    fixture = banner.get("fixture") or {}
    competitors = fixture.get("competitors") or []
    home_name = ""
    away_name = ""
    for competitor in competitors:
        if competitor.get("isHome"):
            home_name = competitor.get("name") or home_name
        else:
            away_name = competitor.get("name") or away_name

    start_time = fixture.get("startTimeLocal") or fixture.get("startTime")
    game_date = ""
    if start_time:
        try:
            game_date = datetime.fromisoformat(str(start_time).replace("Z", "+00:00")).strftime("%Y-%m-%d")
        except ValueError:
            game_date = str(start_time)[:10]

    return {
        "home_rows": team_boxscore_to_rows(home),
        "away_rows": team_boxscore_to_rows(away),
        "home_team_name": home_name,
        "away_team_name": away_name,
        "game_date": game_date,
    }
