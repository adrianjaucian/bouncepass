#!/usr/bin/env python3
"""Upload saved games from local SQLite to the production Bounce PASS API."""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "backend" / "saved_games.db"
DEFAULT_API = "https://bouncepass-api.onrender.com"
BATCH_SIZE = 25


def load_games(db_path: Path) -> List[Dict[str, Any]]:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        "SELECT game_date, home_team_name, away_team_name, results_json, "
        "fixture_id, source_url, provider, gender, region "
        "FROM saved_games ORDER BY game_date, id"
    ).fetchall()
    connection.close()

    games: List[Dict[str, Any]] = []
    for row in rows:
        game_date = (row["game_date"] or "").strip()
        home_team_name = (row["home_team_name"] or "").strip()
        if not game_date or not home_team_name:
            continue
        games.append(
            {
                "game_date": game_date,
                "home_team_name": home_team_name,
                "away_team_name": row["away_team_name"],
                "results": json.loads(row["results_json"]),
                "fixture_id": row["fixture_id"],
                "source_url": row["source_url"],
                "provider": row["provider"],
                "gender": row["gender"],
                "region": row["region"],
            }
        )
    return games


def post_batch(api_url: str, token: str, games: List[Dict[str, Any]]) -> Dict[str, Any]:
    payload = json.dumps({"games": games}).encode("utf-8")
    request = urllib.request.Request(
        f"{api_url.rstrip('/')}/games/import-batch",
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.loads(response.read().decode("utf-8"))


def login(api_url: str, email: str, password: str) -> str:
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    request = urllib.request.Request(
        f"{api_url.rstrip('/')}/auth/login",
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.loads(response.read().decode("utf-8"))
        return data["access_token"]


def main() -> int:
    api_url = os.getenv("PRODUCTION_API_URL", DEFAULT_API)
    email = os.getenv("AUTH_EMAIL", "").strip()
    password = os.getenv("AUTH_PASSWORD", "").strip()
    db_path = Path(os.getenv("LOCAL_DB", str(DEFAULT_DB)))

    if not email or not password:
        print("Set AUTH_EMAIL and AUTH_PASSWORD in the environment.", file=sys.stderr)
        return 1
    if not db_path.exists():
        print(f"Database not found: {db_path}", file=sys.stderr)
        return 1

    games = load_games(db_path)
    total = len(games)
    print(f"Loaded {total} games from {db_path}")
    print(f"Logging in as {email}...")
    token = login(api_url, email, password)
    print(f"Uploading to {api_url} in batches of {BATCH_SIZE}...")

    imported_total = 0
    skipped_total = 0
    failed_total = 0

    for start in range(0, total, BATCH_SIZE):
        batch = games[start : start + BATCH_SIZE]
        batch_number = start // BATCH_SIZE + 1
        batch_count = (total + BATCH_SIZE - 1) // BATCH_SIZE

        for attempt in range(3):
            try:
                result = post_batch(api_url, token, batch)
                imported_total += int(result.get("imported", 0))
                skipped_total += int(result.get("skipped", 0))
                failed_total += int(result.get("failed", 0))
                print(
                    f"Batch {batch_number}/{batch_count}: "
                    f"+{result.get('imported', 0)} imported, "
                    f"{result.get('skipped', 0)} skipped, "
                    f"{result.get('failed', 0)} failed"
                )
                break
            except urllib.error.HTTPError as exc:
                body = exc.read().decode("utf-8", errors="replace")
                if exc.code == 404 and attempt < 2:
                    print("Endpoint not ready yet, waiting for deploy...")
                    time.sleep(20)
                    continue
                print(f"Batch {batch_number} failed ({exc.code}): {body}", file=sys.stderr)
                failed_total += len(batch)
                break
            except Exception as exc:
                if attempt < 2:
                    print(f"Retrying batch {batch_number} after error: {exc}")
                    time.sleep(10)
                    continue
                print(f"Batch {batch_number} failed: {exc}", file=sys.stderr)
                failed_total += len(batch)
                break

        time.sleep(0.5)

    print(
        f"Done. Imported {imported_total}, skipped {skipped_total}, failed {failed_total} "
        f"out of {total} local games."
    )
    return 0 if failed_total == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
