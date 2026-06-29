import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./saved_games.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_saved_games_columns():
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "saved_games" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("saved_games")}
    additions = {
        "fixture_id": "VARCHAR",
        "source_url": "VARCHAR",
        "provider": "VARCHAR",
        "gender": "VARCHAR",
        "home_score": "INTEGER",
        "away_score": "INTEGER",
    }

    with engine.begin() as connection:
        for column_name, column_type in additions.items():
            if column_name not in existing:
                connection.execute(text(f"ALTER TABLE saved_games ADD COLUMN {column_name} {column_type}"))

        if DATABASE_URL.startswith("sqlite"):
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_saved_games_fixture_id "
                    "ON saved_games (fixture_id) WHERE fixture_id IS NOT NULL"
                )
            )


def init_db():
    from models import SavedGame  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_saved_games_columns()
    _backfill_cached_scores()


def _backfill_cached_scores():
    from game_scores import scores_from_results_json
    from models import SavedGame

    db = SessionLocal()
    try:
        games = db.query(SavedGame).filter(SavedGame.home_score.is_(None)).all()
        if not games:
            return
        for game in games:
            home_score, away_score = scores_from_results_json(game.results_json)
            game.home_score = home_score
            game.away_score = away_score
        db.commit()
    finally:
        db.close()
