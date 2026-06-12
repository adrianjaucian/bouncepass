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


class TeamListResponse(BaseModel):
    teams: List[str]


class TeamRecord(BaseModel):
    wins: int
    losses: int


class TeamEfficiency(BaseModel):
    ortg: Optional[float] = None
    drtg: Optional[float] = None
    net_rating: Optional[float] = None
    possession_ortg: Optional[float] = None
    possession_drtg: Optional[float] = None
    possession_net_rating: Optional[float] = None
    ts_pct: Optional[float] = None
    efg_pct: Optional[float] = None
    pace: Optional[float] = None


class TeamDashboardPlayer(BaseModel):
    player: str
    games: int
    pts: int
    trb: int
    ast: int
    stl: int = 0
    blk: int = 0
    mp_mins: float
    ortg: Optional[float] = None
    drtg: Optional[float] = None
    usg_pct: Optional[float] = None
    usg_avg: Optional[float] = None


class TeamDashboardGame(BaseModel):
    id: int
    game_date: str
    opponent: Optional[str] = None
    team_score: Optional[int] = None
    opponent_score: Optional[int] = None
    side: str


class TeamDashboardLeaders(BaseModel):
    scorers: List[TeamDashboardPlayer]
    rebounders: List[TeamDashboardPlayer]
    assists: List[TeamDashboardPlayer]
    steals: List[TeamDashboardPlayer]
    blocks: List[TeamDashboardPlayer]
    usage: List[TeamDashboardPlayer]


class TeamDashboardResponse(BaseModel):
    team_name: str
    query: str
    games_played: int
    record: TeamRecord
    efficiency: TeamEfficiency
    efficiency_trends: Dict[str, Optional[str]] = {}
    totals: Dict[str, Any]
    leaders: TeamDashboardLeaders
    players: List[TeamDashboardPlayer]
    games: List[TeamDashboardGame]


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
