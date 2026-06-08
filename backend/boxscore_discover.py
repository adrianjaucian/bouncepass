import io
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import List, Optional, Tuple

import pandas as pd

from boxscore_normalize import clean_dataframe, count_player_rows, score_boxscore_table

USER_AGENT = "Mozilla/5.0 (compatible; BouncePass/1.0)"
MIN_BOX_SCORE_SCORE = 6.0


def fetch_page_text(url: str) -> str:
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
        raise ValueError(f"Could not load page ({exc.code})") from exc
    except urllib.error.URLError as exc:
        raise ValueError("Could not reach website") from exc


def normalize_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        raise ValueError("Game URL is required")
    parsed = urllib.parse.urlparse(raw if "://" in raw else f"https://{raw}")
    if not parsed.netloc:
        raise ValueError("Invalid URL")
    return urllib.parse.urlunparse(
        (
            parsed.scheme or "https",
            parsed.netloc,
            parsed.path or "/",
            "",
            parsed.query,
            "",
        )
    )


def extract_iframe_urls(html: str, base_url: str) -> List[str]:
    urls: List[str] = []
    for match in re.finditer(r"<iframe[^>]+src=[\"']([^\"']+)[\"']", html, re.I):
        src = match.group(1).strip()
        if not src or src.startswith("javascript:"):
            continue
        absolute = urllib.parse.urljoin(base_url, src)
        if absolute not in urls:
            urls.append(absolute)
    return urls


def read_html_tables(html: str) -> List[pd.DataFrame]:
    try:
        tables = pd.read_html(io.StringIO(html))
    except ValueError:
        return []
    except Exception:
        return []
    return [table for table in tables if isinstance(table, pd.DataFrame) and not table.empty]


def discover_boxscore_tables(html: str) -> List[Tuple[float, pd.DataFrame]]:
    candidates: List[Tuple[float, pd.DataFrame]] = []
    for raw_table in read_html_tables(html):
        score = score_boxscore_table(raw_table)
        if score < MIN_BOX_SCORE_SCORE:
            continue
        cleaned = clean_dataframe(raw_table)
        if count_player_rows(cleaned) < 3:
            continue
        candidates.append((score, cleaned))

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates


def discover_boxscores_from_pages(urls: List[str]) -> List[Tuple[float, pd.DataFrame, str]]:
    discovered: List[Tuple[float, pd.DataFrame, str]] = []
    for page_url in urls:
        try:
            html = fetch_page_text(page_url)
        except ValueError:
            continue
        for score, table in discover_boxscore_tables(html):
            discovered.append((score, table, page_url))
    discovered.sort(key=lambda item: item[0], reverse=True)
    return discovered


def pick_home_away_tables(
    candidates: List[Tuple[float, pd.DataFrame, str]],
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    if len(candidates) < 2:
        raise ValueError("No box score tables detected on this page")

    deduped: List[Tuple[float, pd.DataFrame, str]] = []
    seen_signatures = set()
    for score, table, source in candidates:
        signature = (
            tuple(table.columns),
            count_player_rows(table),
            round(float(table["PTS"].fillna(0).sum()), 1) if "PTS" in table.columns else 0.0,
        )
        if signature in seen_signatures:
            continue
        seen_signatures.add(signature)
        deduped.append((score, table, source))

    if len(deduped) < 2:
        raise ValueError("Could not find both home and away box score tables")

    home_df = deduped[0][1].copy()
    away_df = deduped[1][1].copy()
    return home_df, away_df
