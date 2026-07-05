"""Lightweight timing helpers for profiling slow dashboard routes."""

from __future__ import annotations

import json
import logging
import time
from contextlib import contextmanager
from typing import Any, Dict, List

logger = logging.getLogger("bouncepass.perf")


@contextmanager
def timed_step(label: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info("%s: %.1fms", label, elapsed_ms)


def parse_game_results(games: List[Any]) -> Dict[int, Dict[str, Any]]:
    """Parse each game's results_json once per request."""
    parsed: Dict[int, Dict[str, Any]] = {}
    for game in games:
        parsed[game.id] = json.loads(game.results_json)
    return parsed
