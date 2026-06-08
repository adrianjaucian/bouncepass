from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from database import Base


class SavedGame(Base):
    __tablename__ = "saved_games"

    id = Column(Integer, primary_key=True, index=True)
    game_date = Column(String, nullable=False)
    home_team_name = Column(String, nullable=False)
    away_team_name = Column(String, nullable=True)
    results_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
