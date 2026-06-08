import re
import urllib.parse
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from boxscore_discover import fetch_page_text
from boxscore_normalize import parse_fraction, parse_number
from boxscore_url_scraper import UrlScrapeError

PBA_HOSTS = {"www.pba.ph", "pba.ph"}


def normalize_pba_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        raise UrlScrapeError("Game URL is required")

    parsed = urllib.parse.urlparse(raw if "://" in raw else f"https://{raw}")
    host = (parsed.netloc or "").lower()
    if not (host in PBA_HOSTS or host.endswith(".pba.ph")):
        raise UrlScrapeError("URL must be a PBA box score link (pba.ph)")

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


def _resolve_stats_url(url: str, html: str) -> str:
    parsed = urllib.parse.urlparse(url)
    host = (parsed.netloc or "").lower()

    if host.endswith(".pba.ph") and "stats-api" in host:
        return url

    iframe_match = re.search(
        r'<iframe[^>]+src=["\'](https?://stats-api[^"\']+)["\']',
        html,
        re.I,
    )
    if iframe_match:
        return iframe_match.group(1)

    raise UrlScrapeError("Could not find box score data on the PBA page")


def _parse_game_date(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    for fmt in ("%m/%d/%y %I:%M %p", "%m/%d/%Y %I:%M %p", "%m/%d/%y", "%m/%d/%Y"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return raw[:10] if len(raw) >= 10 else raw


def _extract_scoreboard_meta(html: str) -> Dict[str, str]:
    home_name = ""
    away_name = ""
    home_match = re.search(
        r'<div class="team team-0">.*?<div class="team_name">\s*<span>([^<]+)</span>',
        html,
        re.S | re.I,
    )
    away_match = re.search(
        r'<div class="team team-1">.*?<div class="team_name">\s*<span>([^<]+)</span>',
        html,
        re.S | re.I,
    )
    if home_match:
        home_name = home_match.group(1).strip()
    if away_match:
        away_name = away_match.group(1).strip()

    date_match = re.search(
        r'<h6>Game Details</h6>\s*<span>\s*([^<]+?)\s*</span>',
        html,
        re.I,
    )
    game_date = _parse_game_date(date_match.group(1)) if date_match else ""

    return {
        "home_team_name": home_name,
        "away_team_name": away_name,
        "game_date": game_date,
    }


def _parse_player_row(row_html: str) -> Optional[Dict[str, Any]]:
    if any(
        token in row_html
        for token in ("bsheader_type", "team-totals", "totals-title", "Team / Coach")
    ):
        return None

    name_match = re.search(r'class="player-name[^"]*"[^>]*><b>([^<]+)</b>', row_html, re.I)
    if not name_match:
        return None

    name = name_match.group(1).strip()
    if not name:
        return None

    spans = [match.group(1).strip() for match in re.finditer(r"<span>([^<]*)</span>", row_html)]
    if len(spans) < 20:
        return None

    # jersey, pos, mins, pts, fg, fg%, 2p, 2p%, 3p, 3p%, 4p, 4p%, ft, ft%, off, def, reb, ast, to, stl, blk, pf, fls, +/-
    _, _, mins, pts, fg_line, fg_pct, _, _, three_line, three_pct, _, _, ft_line, ft_pct, orb, drb, reb, ast, tov, stl, blk, pf, _, plus_minus = spans[:24]

    fg_made, fg_attempted = parse_fraction(fg_line)
    three_made, three_attempted = parse_fraction(three_line)
    ft_made, ft_attempted = parse_fraction(ft_line)

    return {
        "Player": name,
        "MP": mins or "0:00",
        "PTS": int(float(pts or 0)),
        "FG": fg_made,
        "FGA": fg_attempted,
        "FG%": parse_number(fg_pct),
        "3P": three_made,
        "3PA": three_attempted,
        "3P%": parse_number(three_pct),
        "FT": ft_made,
        "FTA": ft_attempted,
        "FT%": parse_number(ft_pct),
        "ORB": int(float(orb or 0)),
        "DRB": int(float(drb or 0)),
        "TRB": int(float(reb or 0)),
        "AST": int(float(ast or 0)),
        "STL": int(float(stl or 0)),
        "BLK": int(float(blk or 0)),
        "TOV": int(float(tov or 0)),
        "PF": int(float(pf or 0)),
        "+/-": int(float(plus_minus or 0)),
    }


def _parse_team_table(table_html: str) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for row_html in re.findall(r"<tr\b.*?</tr>", table_html, re.S | re.I):
        record = _parse_player_row(row_html)
        if record:
            rows.append(record)
    return rows


def _parse_box_score_wrap(html: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, str]]:
    wrap_match = re.search(
        r'<div id="box-score-wrap">(.*?)<input type="radio" class="tabs__radio" name="tabs" id="play-by-play-tab">',
        html,
        re.S | re.I,
    )
    if not wrap_match:
        raise UrlScrapeError("Box score tables were not found on this page")

    wrap_html = wrap_match.group(1)
    title_blocks = re.split(r'<div class="box-score_title">', wrap_html, flags=re.I)
    team_names: List[str] = []
    team_rows: List[List[Dict[str, Any]]] = []

    for block in title_blocks[1:]:
        name_match = re.search(r'<div class="team_name">\s*([^<]+?)\s*</div>', block, re.I)
        table_match = re.search(r'<table class="box-score">(.*?)</table>', block, re.S | re.I)
        if not table_match:
            continue
        rows = _parse_team_table(table_match.group(1))
        if not rows:
            continue
        team_names.append(name_match.group(1).strip() if name_match else "")
        team_rows.append(rows)
        if len(team_rows) == 2:
            break

    if len(team_rows) < 2:
        raise UrlScrapeError("Could not find both home and away box scores")

    meta = _extract_scoreboard_meta(html)
    if not meta["home_team_name"] and team_names:
        meta["home_team_name"] = team_names[0]
    if not meta["away_team_name"] and len(team_names) > 1:
        meta["away_team_name"] = team_names[1]

    return team_rows[0], team_rows[1], meta


def scrape_pba_game(url: str) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, str]]:
    normalized_url = normalize_pba_url(url)
    try:
        page_html = fetch_page_text(normalized_url)
    except ValueError as exc:
        raise UrlScrapeError(str(exc)) from exc
    stats_url = _resolve_stats_url(normalized_url, page_html)
    if stats_url == normalized_url:
        stats_html = page_html
    else:
        try:
            stats_html = fetch_page_text(stats_url)
        except ValueError as exc:
            raise UrlScrapeError(str(exc)) from exc

    home_rows, away_rows, meta = _parse_box_score_wrap(stats_html)
    home_df = pd.DataFrame(home_rows)
    away_df = pd.DataFrame(away_rows)
    if home_df.empty or away_df.empty:
        raise UrlScrapeError("No player stats found for this game")

    fixture_id = ""
    game_id_match = re.search(r"[?&]game_id=(\d+)", stats_url)
    match_id_match = re.search(r"[?&]match=(\d+)", normalized_url)
    if game_id_match:
        fixture_id = game_id_match.group(1)
    elif match_id_match:
        fixture_id = match_id_match.group(1)

    return home_df, away_df, {
        "fixture_id": fixture_id,
        "home_team_name": meta.get("home_team_name") or "Home",
        "away_team_name": meta.get("away_team_name") or "Away",
        "game_date": meta.get("game_date") or "",
        "source_url": normalized_url,
        "provider": "pba",
    }
