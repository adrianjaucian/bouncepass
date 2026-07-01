import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./saved_games.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

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
    from sqlalchemy import inspect

    inspector = inspect(engine)
    if "saved_games" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("saved_games")}
    additions = {
        "fixture_id": "VARCHAR",
        "source_url": "VARCHAR",
        "provider": "VARCHAR",
        "gender": "VARCHAR",
        "region": "VARCHAR",
        "home_score": "INTEGER",
        "away_score": "INTEGER",
        "user_id": "INTEGER",
    }

    with engine.begin() as connection:
        for column_name, column_type in additions.items():
            if column_name not in existing:
                connection.execute(text(f"ALTER TABLE saved_games ADD COLUMN {column_name} {column_type}"))

        if DATABASE_URL.startswith("sqlite"):
            connection.execute(text("DROP INDEX IF EXISTS ix_saved_games_fixture_id"))
            connection.execute(text("DROP INDEX IF EXISTS uq_saved_games_fixture_id"))
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_games_user_fixture_id "
                    "ON saved_games (user_id, fixture_id) WHERE fixture_id IS NOT NULL"
                )
            )


def init_db():
    from models import SavedGame, User  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_saved_games_columns()
    _backfill_cached_scores()
    _backfill_nbl1_metadata()


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


def _backfill_nbl1_metadata():
    from models import SavedGame
    from nbl1_fixtures_sync import backfill_nbl1_metadata_from_fixtures, discover_nbl1_fixtures

    db = SessionLocal()
    try:
        missing = (
            db.query(SavedGame.id)
            .filter(SavedGame.fixture_id.isnot(None))
            .filter((SavedGame.gender.is_(None)) | (SavedGame.region.is_(None)))
            .limit(1)
            .first()
        )
        if not missing:
            return

        _, fixtures = discover_nbl1_fixtures()
        backfill_nbl1_metadata_from_fixtures(db, fixtures)
    except Exception:
        db.rollback()
    finally:
        db.close()
