from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AccessRequest(BaseModel):
    password: str = Field(..., min_length=1)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    id: int
    email: str


class AuthResponse(BaseModel):
    access_token: str
    user: UserResponse


class TeamCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)


class TeamSummary(BaseModel):
    id: int
    name: str
    game_count: int = 0
    player_count: int = 0
    created_at: str


class TeamListResponse(BaseModel):
    teams: List[TeamSummary]


class GameSaveRequest(BaseModel):
    team_id: int
    game_date: str = Field(..., min_length=1)
    opponent_name: Optional[str] = None
    results: Dict[str, Any]


class GameUpdateRequest(BaseModel):
    game_date: str = Field(..., min_length=1)
    opponent_name: Optional[str] = None


class GameSummary(BaseModel):
    id: int
    team_id: Optional[int] = None
    game_date: str
    home_team_name: str
    away_team_name: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    created_at: str


class GameDetail(GameSummary):
    results: Dict[str, Any]


class GameListResponse(BaseModel):
    games: List[GameSummary]
    total: int
    limit: int
    offset: int


class PlayerSummary(BaseModel):
    id: int
    name: str
    games: int = 0
    pts: float = 0
    trb: float = 0
    ast: float = 0


class PlayerListResponse(BaseModel):
    players: List[PlayerSummary]


class TeamDashboardPlayer(BaseModel):
    player: str
    games: int
    pts: float
    trb: float
    ast: float
    stl: float = 0
    blk: float = 0
    mp_mins: float = 0
    pts_pg: Optional[float] = None
    trb_pg: Optional[float] = None
    ast_pg: Optional[float] = None
    ts_pct: Optional[float] = None
    efg_pct: Optional[float] = None
    usg_pct: Optional[float] = None
    ortg: Optional[float] = None
    drtg: Optional[float] = None
    bpm: Optional[float] = None


class TeamDashboardGame(BaseModel):
    id: int
    game_date: str
    opponent: Optional[str] = None
    team_score: Optional[int] = None
    opponent_score: Optional[int] = None


class TeamDashboardResponse(BaseModel):
    team_id: int
    team_name: str
    games_played: int
    record: Dict[str, int]
    totals: Dict[str, Any]
    players: List[TeamDashboardPlayer]
    games: List[TeamDashboardGame]


class PlayerDashboardResponse(BaseModel):
    team_id: int
    team_name: str
    player_name: str
    games_played: int
    stats: Dict[str, Any]
    games: List[Dict[str, Any]]
