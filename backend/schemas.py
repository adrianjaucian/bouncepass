from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class GameSaveRequest(BaseModel):
    game_date: str = Field(..., min_length=1)
    home_team_name: str = Field(..., min_length=1)
    away_team_name: Optional[str] = None
    results: Dict[str, Any]


class GameSummary(BaseModel):
    id: int
    game_date: str
    home_team_name: str
    away_team_name: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    created_at: str


class GameDetail(GameSummary):
    results: Dict[str, Any]


class GameUpdateRequest(BaseModel):
    game_date: str = Field(..., min_length=1)
    home_team_name: str = Field(..., min_length=1)
    away_team_name: Optional[str] = None


class GameListResponse(BaseModel):
    games: List[GameSummary]


class BoxScoreUrlRequest(BaseModel):
    url: str = Field(..., min_length=1)


class BoxScoreUrlMeta(BaseModel):
    home_team_name: str
    away_team_name: str
    game_date: str
    fixture_id: str
    source_url: str
    provider: Optional[str] = None


class BoxScoreUrlResponse(BaseModel):
    home: List[Dict[str, Any]]
    away: List[Dict[str, Any]]
    meta: BoxScoreUrlMeta
