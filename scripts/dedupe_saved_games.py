#!/usr/bin/env python3
"""Remove duplicate saved games for ADMIN_EMAIL (or all users with --all-users)."""

from __future__ import annotations

import argparse
import os
import sys

from dotenv import load_dotenv

load_dotenv()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from auth_utils import normalize_email  # noqa: E402
from database import SessionLocal  # noqa: E402
from game_dedup import dedupe_user_saved_games  # noqa: E402
from models import User  # noqa: E402
from nbl1_fixtures_sync import backfill_nbl1_metadata_from_fixtures, discover_nbl1_fixtures  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Deduplicate saved games in the database.")
    parser.add_argument(
        "--email",
        default=os.getenv("ADMIN_EMAIL", "demo@bouncepass.net"),
        help="User email to dedupe (default: ADMIN_EMAIL)",
    )
    parser.add_argument(
        "--all-users",
        action="store_true",
        help="Run dedupe for every user account",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.all_users:
            users = db.query(User).order_by(User.id).all()
        else:
            email = normalize_email(args.email)
            user = db.query(User).filter(User.email == email).first()
            if not user:
                print(f"No user found for {email}", file=sys.stderr)
                return 1
            users = [user]

        fixtures = []
        try:
            _, fixtures = discover_nbl1_fixtures()
        except Exception as exc:
            print(f"Warning: could not load NBL1 fixtures for metadata backfill: {exc}")

        total_deleted = 0
        for user in users:
            stats = dedupe_user_saved_games(db, user.id)
            updated = 0
            if fixtures:
                updated = backfill_nbl1_metadata_from_fixtures(db, fixtures, user_id=user.id)
            total_deleted += stats["deleted"]
            print(
                f"{user.email}: deleted {stats['deleted']} duplicate(s), "
                f"{stats['remaining']} remaining, updated metadata on {updated} game(s)"
            )

        print(f"Done. Removed {total_deleted} duplicate game(s) total.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
