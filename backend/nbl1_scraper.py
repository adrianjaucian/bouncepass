import base64
import json
import re
import urllib.error
import urllib.parse
import urllib.request
import zlib
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from boxscore_url_scraper import UrlScrapeError

NBL1_HOSTS = {"www.nbl1.com.au", "nbl1.com.au"}
EMBED_API_BASE = "https://embed-api.eui.connect.sportradar.com/v1/embed/3/fixture_detail"
WEBSITE_ID = "3"
USER_AGENT = "Mozilla/5.0 (compatible; BouncePass/1.0)"

Nbl1ScrapeError = UrlScrapeError


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
        raise Nbl1ScrapeError(f"NBL1 data request failed ({exc.code})") from exc
    except urllib.error.URLError as exc:
        raise Nbl1ScrapeError("Could not reach NBL1 stats service") from exc
    except json.JSONDecodeError as exc:
        raise Nbl1ScrapeError("Invalid response from NBL1 stats service") from exc

    if "error" in payload:
        message = payload.get("error", {}).get("message", "Unknown error")
        raise Nbl1ScrapeError(message)
    return payload


def _fetch_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        raise Nbl1ScrapeError(f"Could not load NBL1 page ({exc.code})") from exc
    except urllib.error.URLError as exc:
        raise Nbl1ScrapeError("Could not reach NBL1 website") from exc


def normalize_nbl1_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        raise Nbl1ScrapeError("Game URL is required")

    parsed = urllib.parse.urlparse(raw if "://" in raw else f"https://{raw}")
    host = (parsed.netloc or "").lower()
    if host not in NBL1_HOSTS:
        raise Nbl1ScrapeError("URL must be an NBL1 game link (nbl1.com.au/games/...)")

    path = parsed.path or ""
    if not re.search(r"/games/[0-9a-f-]{36}", path, re.I):
        raise Nbl1ScrapeError("URL must point to an NBL1 game page")

    return urllib.parse.urlunparse(
        (
            parsed.scheme or "https",
            parsed.netloc,
            path,
            "",
            parsed.query,
            "",
        )
    )


def _decode_widget_state(state: str) -> Optional[Dict[str, Any]]:
    if not state:
        return None
    padded = state.replace("-", "+").replace("_", "/")
    padded += "=" * (-len(padded) % 4)
    try:
        raw = base64.b64decode(padded)
        decoded = zlib.decompress(raw)
        return json.loads(decoded)
    except Exception:
        return None


def extract_fixture_id_from_url(url: str) -> Optional[str]:
    parsed = urllib.parse.urlparse(url)
    query = urllib.parse.parse_qs(parsed.query)
    widget_state = query.get("~w", [None])[0]
    if widget_state:
        page_type, _, state = widget_state.partition("~")
        if page_type == "f" and state:
            decoded = _decode_widget_state(state)
            fixture_id = decoded.get("f") if decoded else None
            if fixture_id:
                return str(fixture_id)

    return None


def _extract_json_field(html: str, field: str) -> Optional[str]:
    patterns = [
        rf'"{re.escape(field)}":"([^"]+)"',
        rf'\\"{re.escape(field)}\\":\\"([^"\\]+)\\"',
        rf'{re.escape(field)}\\":\\"([^"\\]+)\\"',
    ]
    for pattern in patterns:
        match = re.search(pattern, html)
        if match:
            return match.group(1)
    return None


def extract_page_metadata(url: str, html: str) -> Dict[str, str]:
    fixture_id = extract_fixture_id_from_url(url) or _extract_json_field(html, "externalId")
    if not fixture_id:
        match = re.search(r'matchExternalId\\":\\"([0-9a-f-]{36})\\"', html)
        if not match:
            match = re.search(r'"matchExternalId":"([0-9a-f-]{36})"', html)
        fixture_id = match.group(1) if match else None
    if not fixture_id:
        raise Nbl1ScrapeError("Could not find game ID on the NBL1 page")

    home_team = _extract_json_field(html, "homeTeamName") or ""
    away_team = _extract_json_field(html, "awayTeamName") or ""
    game_date_raw = _extract_json_field(html, "gameDate") or ""

    game_date = ""
    if game_date_raw:
        try:
            game_date = datetime.strptime(game_date_raw.strip(), "%d %b %Y").strftime("%Y-%m-%d")
        except ValueError:
            game_date = game_date_raw.strip()

    return {
        "fixture_id": fixture_id,
        "home_team_name": home_team,
        "away_team_name": away_team,
        "game_date": game_date,
    }


def iso_duration_to_mp(value: Any) -> str:
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


def fetch_fixture_payload(fixture_id: str) -> Dict[str, Any]:
    params = urllib.parse.urlencode(
        {
            "fixtureId": fixture_id,
            "locale": "en-EN",
            "sub": "statistics",
        }
    )
    url = f"{EMBED_API_BASE}?{params}"
    payload = _fetch_json(url)
    data = payload.get("data") or {}
    statistics = (data.get("statistics") or {}).get("data") or {}
    base = statistics.get("base") or {}
    home = base.get("home")
    away = base.get("away")
    if not home or not away:
        raise Nbl1ScrapeError("Box score is not available for this game yet")

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


def scrape_nbl1_game(url: str) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, str]]:
    normalized_url = normalize_nbl1_url(url)
    html = _fetch_text(normalized_url)
    page_meta = extract_page_metadata(normalized_url, html)
    fixture_payload = fetch_fixture_payload(page_meta["fixture_id"])

    home_df = pd.DataFrame(fixture_payload["home_rows"])
    away_df = pd.DataFrame(fixture_payload["away_rows"])
    if home_df.empty or away_df.empty:
        raise Nbl1ScrapeError("No player stats found for this game")

    meta = {
        "fixture_id": page_meta["fixture_id"],
        "home_team_name": page_meta["home_team_name"] or fixture_payload["home_team_name"],
        "away_team_name": page_meta["away_team_name"] or fixture_payload["away_team_name"],
        "game_date": page_meta["game_date"] or fixture_payload["game_date"],
        "source_url": normalized_url,
        "provider": "nbl1",
    }
    return home_df, away_df, meta
