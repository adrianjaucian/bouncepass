import urllib.parse
from typing import Dict, Optional, Tuple

import pandas as pd


class UrlScrapeError(Exception):
    pass


def _detect_provider(url: str) -> Optional[str]:
    parsed = urllib.parse.urlparse(url if "://" in url else f"https://{url}")
    host = (parsed.netloc or "").lower()
    if host in {"www.nbl1.com.au", "nbl1.com.au"}:
        return "nbl1"
    if host in {"www.nbl.com.au", "nbl.com.au"}:
        return "nbl"
    if host.endswith("pba.ph"):
        return "pba"
    return None


def scrape_game_from_url(url: str) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, str]]:
    raw = (url or "").strip()
    if not raw:
        raise UrlScrapeError("Game URL is required")

    provider = _detect_provider(raw)
    if provider == "nbl1":
        from nbl1_scraper import scrape_nbl1_game

        return scrape_nbl1_game(raw)
    if provider == "nbl":
        from nbl_scraper import scrape_nbl_game

        return scrape_nbl_game(raw)
    if provider == "pba":
        from pba_scraper import scrape_pba_game

        return scrape_pba_game(raw)

    from generic_scraper import scrape_generic_game

    return scrape_generic_game(raw)
