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

    teams = relationship("Team", back_populates="user")
    games = relationship("SavedGame", back_populates="user")


class Team(Base):
    __tablename__ = "teams"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_teams_user_name"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="teams")
    players = relationship("TeamPlayer", back_populates="team", cascade="all, delete-orphan")
    games = relationship("SavedGame", back_populates="team")


class TeamPlayer(Base):
    __tablename__ = "team_players"
    __table_args__ = (UniqueConstraint("team_id", "name", name="uq_team_players_team_name"),)

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    team = relationship("Team", back_populates="players")


class SavedGame(Base):
    __tablename__ = "saved_games"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True, index=True)
    game_date = Column(String, nullable=False)
    home_team_name = Column(String, nullable=False)
    away_team_name = Column(String, nullable=True)
    results_json = Column(Text, nullable=False)
    fixture_id = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    provider = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    region = Column(String, nullable=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="games")
    team = relationship("Team", back_populates="games")
