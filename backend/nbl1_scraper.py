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


from embed_fixture import fetch_fixture_payload, iso_duration_to_mp, team_boxscore_to_rows


def scrape_nbl1_fixture(fixture_id: str) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, str]]:
    fixture_id = (fixture_id or "").strip()
    if not re.fullmatch(r"[0-9a-f-]{36}", fixture_id, re.I):
        raise Nbl1ScrapeError("Invalid NBL1 fixture ID")

    fixture_payload = fetch_fixture_payload(fixture_id, WEBSITE_ID)
    home_df = pd.DataFrame(fixture_payload["home_rows"])
    away_df = pd.DataFrame(fixture_payload["away_rows"])
    if home_df.empty or away_df.empty:
        raise Nbl1ScrapeError("No player stats found for this game")

    source_url = f"https://www.nbl1.com.au/games/{fixture_id}"
    meta = {
        "fixture_id": fixture_id,
        "home_team_name": fixture_payload["home_team_name"],
        "away_team_name": fixture_payload["away_team_name"],
        "game_date": fixture_payload["game_date"],
        "source_url": source_url,
        "provider": "nbl1",
    }
    return home_df, away_df, meta


def scrape_nbl1_game(url: str) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, str]]:
    normalized_url = normalize_nbl1_url(url)
    html = _fetch_text(normalized_url)
    page_meta = extract_page_metadata(normalized_url, html)
    home_df, away_df, meta = scrape_nbl1_fixture(page_meta["fixture_id"])
    meta["home_team_name"] = page_meta["home_team_name"] or meta["home_team_name"]
    meta["away_team_name"] = page_meta["away_team_name"] or meta["away_team_name"]
    meta["game_date"] = page_meta["game_date"] or meta["game_date"]
    meta["source_url"] = normalized_url
    return home_df, away_df, meta
