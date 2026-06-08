import re
import urllib.parse
from datetime import datetime
from typing import Dict, List, Tuple

import pandas as pd

from boxscore_discover import (
    discover_boxscore_tables,
    discover_boxscores_from_pages,
    extract_iframe_urls,
    fetch_page_text,
    normalize_url,
    pick_home_away_tables,
)
from boxscore_url_scraper import UrlScrapeError


def _parse_title_teams(title: str) -> Tuple[str, str]:
    raw = re.sub(r"\s+", " ", (title or "").strip())
    if not raw:
        return "", ""

    vs_patterns = [
        r"^(?P<home>.+?)\s+vs\.?\s+(?P<away>.+?)(?:\s*[\|\-–].*)?$",
        r"^(?P<home>.+?)\s+v\s+(?P<away>.+?)(?:\s*[\|\-–].*)?$",
        r"^(?P<home>.+?)\s+@\s+(?P<away>.+?)(?:\s*[\|\-–].*)?$",
    ]
    for pattern in vs_patterns:
        match = re.match(pattern, raw, re.I)
        if match:
            return match.group("home").strip(), match.group("away").strip()
    return "", ""


def _parse_date_from_text(text: str) -> str:
    patterns = [
        (r"\b(\d{4}-\d{2}-\d{2})\b", "%Y-%m-%d"),
        (r"\b(\d{1,2}/\d{1,2}/\d{2,4})\b", None),
        (r"\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b", "%d %b %Y"),
    ]
    for pattern, fmt in patterns:
        match = re.search(pattern, text)
        if not match:
            continue
        value = match.group(1)
        if fmt:
            try:
                return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        for candidate_fmt in ("%m/%d/%y", "%m/%d/%Y", "%d/%m/%Y"):
            try:
                return datetime.strptime(value, candidate_fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
    return ""


def extract_page_metadata(html: str, page_url: str) -> Dict[str, str]:
    title_match = re.search(r"<title>([^<]+)</title>", html, re.I)
    title = title_match.group(1).strip() if title_match else ""
    home_team, away_team = _parse_title_teams(title)

    og_title = re.search(r'property="og:title"\s+content="([^"]+)"', html, re.I)
    if og_title and (not home_team or not away_team):
        home_team, away_team = _parse_title_teams(og_title.group(1))

    h1_match = re.search(r"<h1[^>]*>([^<]+)</h1>", html, re.I)
    if h1_match and (not home_team or not away_team):
        home_team, away_team = _parse_title_teams(h1_match.group(1))

    game_date = _parse_date_from_text(html)

    return {
        "home_team_name": home_team,
        "away_team_name": away_team,
        "game_date": game_date,
        "source_url": page_url,
        "fixture_id": "",
        "provider": "generic",
    }


def _candidate_page_urls(page_url: str, html: str) -> List[str]:
    urls = [page_url]
    for iframe_url in extract_iframe_urls(html, page_url):
        if iframe_url not in urls:
            urls.append(iframe_url)
    return urls


def scrape_generic_game(url: str) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, str]]:
    normalized_url = normalize_url(url)
    try:
        html = fetch_page_text(normalized_url)
    except ValueError as exc:
        raise UrlScrapeError(str(exc)) from exc

    page_urls = _candidate_page_urls(normalized_url, html)
    candidates = discover_boxscores_from_pages(page_urls)

    if len(candidates) < 2:
        inline_candidates = discover_boxscore_tables(html)
        for score, table in inline_candidates:
            candidates.append((score, table, normalized_url))
        candidates.sort(key=lambda item: item[0], reverse=True)

    try:
        home_df, away_df = pick_home_away_tables(candidates)
    except ValueError as exc:
        raise UrlScrapeError(str(exc)) from exc

    if home_df.empty or away_df.empty:
        raise UrlScrapeError("No player stats found for this game")

    meta = extract_page_metadata(html, normalized_url)
    parsed = urllib.parse.urlparse(normalized_url)
    if parsed.query:
        meta["fixture_id"] = parsed.query

    return home_df, away_df, meta
