import re
import urllib.parse
from typing import Dict, Tuple

import pandas as pd

from boxscore_discover import fetch_page_text, normalize_url
from boxscore_url_scraper import UrlScrapeError
from embed_fixture import fetch_fixture_payload
from generic_scraper import _parse_date_from_text, _parse_title_teams

NBL_HOSTS = {"www.nbl.com.au", "nbl.com.au"}
NBL_WEBSITE_ID = "298"


def normalize_nbl_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        raise UrlScrapeError("Game URL is required")

    parsed = urllib.parse.urlparse(normalize_url(raw))
    host = (parsed.netloc or "").lower()
    if host not in NBL_HOSTS:
        raise UrlScrapeError("URL must be an NBL match link (nbl.com.au/matches/...)")

    if not parsed.path.startswith("/matches/"):
        raise UrlScrapeError("URL must point to an NBL match page")

    return urllib.parse.urlunparse(
        (
            parsed.scheme or "https",
            parsed.netloc,
            parsed.path,
            "",
            parsed.query,
            "",
        )
    )


def extract_fixture_id_from_html(html: str) -> str:
    match = re.search(r'data-fixture-id="([0-9a-f-]{36})"', html, re.I)
    if match:
        return match.group(1)
    match = re.search(r'data-match-id="([0-9a-f-]{36})"', html, re.I)
    if match:
        return match.group(1)
    raise UrlScrapeError("Could not find game ID on the NBL page")


def extract_page_metadata(html: str, page_url: str) -> Dict[str, str]:
    title_match = re.search(r"<title>([^<]+)</title>", html, re.I)
    title = title_match.group(1).strip() if title_match else ""
    home_team, away_team = _parse_title_teams(title.split("|")[0].strip())

    og_title = re.search(r'property="og:title"\s+content="([^"]+)"', html, re.I)
    if og_title and (not home_team or not away_team):
        home_team, away_team = _parse_title_teams(og_title.group(1))

    slug_match = re.search(r"/matches/([^\"'?]+)", page_url, re.I)
    game_date = ""
    if slug_match:
        slug = slug_match.group(1)
        date_match = re.search(r"(\d{1,2}-\d{1,2}-\d{4})$", slug)
        if date_match:
            day, month, year = date_match.group(1).split("-")
            game_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"

    if not game_date:
        game_date = _parse_date_from_text(html)

    return {
        "home_team_name": home_team,
        "away_team_name": away_team,
        "game_date": game_date,
        "source_url": page_url,
    }


def scrape_nbl_game(url: str) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, str]]:
    normalized_url = normalize_nbl_url(url)
    try:
        html = fetch_page_text(normalized_url)
    except ValueError as exc:
        raise UrlScrapeError(str(exc)) from exc

    fixture_id = extract_fixture_id_from_html(html)
    page_meta = extract_page_metadata(html, normalized_url)
    fixture_payload = fetch_fixture_payload(fixture_id, NBL_WEBSITE_ID)

    home_df = pd.DataFrame(fixture_payload["home_rows"])
    away_df = pd.DataFrame(fixture_payload["away_rows"])
    if home_df.empty or away_df.empty:
        raise UrlScrapeError("No player stats found for this game")

    meta = {
        "fixture_id": fixture_id,
        "home_team_name": page_meta["home_team_name"] or fixture_payload["home_team_name"],
        "away_team_name": page_meta["away_team_name"] or fixture_payload["away_team_name"],
        "game_date": page_meta["game_date"] or fixture_payload["game_date"],
        "source_url": normalized_url,
        "provider": "nbl",
    }
    return home_df, away_df, meta
