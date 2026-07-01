from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    games = relationship("SavedGame", back_populates="user")


class SavedGame(Base):
    __tablename__ = "saved_games"
    __table_args__ = (
        UniqueConstraint("user_id", "fixture_id", name="uq_saved_games_user_fixture_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    game_date = Column(String, nullable=False)
    home_team_name = Column(String, nullable=False)
    away_team_name = Column(String, nullable=True)
    results_json = Column(Text, nullable=False)
    fixture_id = Column(String, nullable=True, index=True)
    source_url = Column(String, nullable=True)
    provider = Column(String, nullable=True)
    gender = Column(String, nullable=True, index=True)
    region = Column(String, nullable=True, index=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="games")
