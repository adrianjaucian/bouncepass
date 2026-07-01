#!/usr/bin/env python3
"""Assign saved games with no user_id to the account matching ADMIN_EMAIL."""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from auth_utils import normalize_email  # noqa: E402
from database import SessionLocal  # noqa: E402
from models import SavedGame, User  # noqa: E402


def main() -> int:
    admin_email = normalize_email(os.getenv("ADMIN_EMAIL", ""))
    if not admin_email:
        print("Set ADMIN_EMAIL in the environment.", file=sys.stderr)
        return 1

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == admin_email).first()
        if not user:
            print(f"No user found for {admin_email}. Register that account first.", file=sys.stderr)
            return 1

        orphans = db.query(SavedGame).filter(SavedGame.user_id.is_(None)).all()
        if not orphans:
            print("No orphan games to assign.")
            return 0

        for game in orphans:
            game.user_id = user.id
        db.commit()
        print(f"Assigned {len(orphans)} games to {admin_email} (user id {user.id}).")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
