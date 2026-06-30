from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class GameSaveRequest(BaseModel):
    game_date: str = Field(..., min_length=1)
    home_team_name: str = Field(..., min_length=1)
    away_team_name: Optional[str] = None
    results: Dict[str, Any]
    fixture_id: Optional[str] = None
    source_url: Optional[str] = None
    provider: Optional[str] = None
    gender: Optional[str] = None
    region: Optional[str] = None


class GameImportBatchRequest(BaseModel):
    games: List[GameSaveRequest] = Field(..., min_length=1, max_length=50)


class GameImportBatchResponse(BaseModel):
    imported: int
    skipped: int
    failed: int
    errors: List[str] = []


class Nbl1SyncRequest(BaseModel):
    season_year: Optional[str] = None
    max_imports: Optional[int] = Field(default=None, ge=1, le=500)


class Nbl1SyncImportedGame(BaseModel):
    id: int
    fixture_id: str
    game_date: str
    home_team_name: str
    away_team_name: Optional[str] = None
    gender: Optional[str] = None
    region: Optional[str] = None
    label: str


class Nbl1SyncErrorItem(BaseModel):
    fixture_id: str
    label: str
    error: str


class Nbl1SyncResponse(BaseModel):
    season_year: str
    discovered: int
    completed: int
    pending: int
    skipped_existing: int
    updated_metadata_count: int = 0
    imported_count: int
    imported: List[Nbl1SyncImportedGame]
    failed_count: int
    errors: List[Nbl1SyncErrorItem]
    has_more: bool = False


class GameSummary(BaseModel):
    id: int
    game_date: str
    home_team_name: str
    away_team_name: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    gender: Optional[str] = None
    region: Optional[str] = None
    created_at: str


class GameDetail(GameSummary):
    results: Dict[str, Any]


class GameUpdateRequest(BaseModel):
    game_date: str = Field(..., min_length=1)
    home_team_name: str = Field(..., min_length=1)
    away_team_name: Optional[str] = None
    gender: Optional[str] = None
    region: Optional[str] = None


class GameListResponse(BaseModel):
    games: List[GameSummary]
    total: int
    limit: int
    offset: int


class Nbl1SyncStartResponse(BaseModel):
    started: bool
    message: str


class Nbl1SyncStatusResponse(BaseModel):
    running: bool
    progress: str
    result: Optional[Nbl1SyncResponse] = None
    error: Optional[str] = None


class TeamOption(BaseModel):
    name: str
    gender: Optional[str] = None
    region: Optional[str] = None
    label: str


class TeamListResponse(BaseModel):
    teams: List[str]
    options: List[TeamOption] = []


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
    fga: int = 0
    fg3a: int = 0
    efg_pct: Optional[float] = None
    efg_avg: Optional[float] = None
    fg3_pct: Optional[float] = None
    fg3par: Optional[float] = None
    fg3_avg: Optional[float] = None
    bpm: Optional[float] = None
    bpm_avg: Optional[float] = None


class TeamDashboardGame(BaseModel):
    id: int
    game_date: str
    opponent: Optional[str] = None
    team_score: Optional[int] = None
    opponent_score: Optional[int] = None
    side: str


class TrendPoint(BaseModel):
    game_date: str
    label: str
    opponent: Optional[str] = None
    team_name: Optional[str] = None
    pts: Optional[float] = None
    trb: Optional[float] = None
    ast: Optional[float] = None
    ts_pct: Optional[float] = None
    usg_pct: Optional[float] = None
    net_rating: Optional[float] = None
    ortg: Optional[float] = None
    drtg: Optional[float] = None
    bpm: Optional[float] = None
    fg3par: Optional[float] = None
    trb_pct: Optional[float] = None
    blk_pct: Optional[float] = None


class TrendCharts(BaseModel):
    last_5: List[TrendPoint] = []
    last_10: List[TrendPoint] = []
    season: List[TrendPoint] = []


class TeamDashboardLeaders(BaseModel):
    scorers: List[TeamDashboardPlayer]
    rebounders: List[TeamDashboardPlayer]
    assists: List[TeamDashboardPlayer]
    steals: List[TeamDashboardPlayer]
    blocks: List[TeamDashboardPlayer]
    usage: List[TeamDashboardPlayer]


class TeamDashboardResponse(BaseModel):
    team_name: str
    team_label: str
    gender: Optional[str] = None
    region: Optional[str] = None
    query: str
    games_played: int
    record: TeamRecord
    efficiency: TeamEfficiency
    efficiency_trends: Dict[str, Optional[str]] = {}
    totals: Dict[str, Any]
    leaders: TeamDashboardLeaders
    players: List[TeamDashboardPlayer]
    leader_players: List[TeamDashboardPlayer] = []
    games: List[TeamDashboardGame]
    trend_charts: TrendCharts = TrendCharts()


class TeamLeagueLeaderEntry(BaseModel):
    team_name: str
    team_label: str
    gender: Optional[str] = None
    region: Optional[str] = None
    games_played: int
    wins: int
    losses: int
    value: float


class TeamEfficiencyLeaders(BaseModel):
    ortg: List[TeamLeagueLeaderEntry] = []
    drtg: List[TeamLeagueLeaderEntry] = []
    net_rating: List[TeamLeagueLeaderEntry] = []
    possession_ortg: List[TeamLeagueLeaderEntry] = []
    possession_drtg: List[TeamLeagueLeaderEntry] = []


class TeamShootingPaceLeaders(BaseModel):
    ts_pct: List[TeamLeagueLeaderEntry] = []
    efg_pct: List[TeamLeagueLeaderEntry] = []
    pace: List[TeamLeagueLeaderEntry] = []


class TeamLeagueLeadersResponse(BaseModel):
    league_games: int
    league_teams: int
    efficiency: TeamEfficiencyLeaders
    shooting_pace: TeamShootingPaceLeaders


class StatRank(BaseModel):
    rank: int
    of: int


class PlayerDashboardStats(BaseModel):
    player: str
    teams: List[str] = []
    games: int
    mp_mins: float
    pts: int
    trb: int
    ast: int
    stl: int
    blk: int
    tov: int
    orb: int
    drb: int
    fg: int
    fga: int
    fg3: int
    fg3a: int
    ft: int
    fta: int
    pts_pg: Optional[float] = None
    trb_pg: Optional[float] = None
    ast_pg: Optional[float] = None
    stl_pg: Optional[float] = None
    blk_pg: Optional[float] = None
    tov_pg: Optional[float] = None
    ts_pct: Optional[float] = None
    efg_pct: Optional[float] = None
    fg3_pct: Optional[float] = None
    fg3par: Optional[float] = None
    ft_pct: Optional[float] = None
    ortg: Optional[float] = None
    drtg: Optional[float] = None
    usg_pct: Optional[float] = None
    usg_avg: Optional[float] = None
    bpm: Optional[float] = None
    bpm_avg: Optional[float] = None
    efg_avg: Optional[float] = None
    fg3_avg: Optional[float] = None
    ast_pct: Optional[float] = None
    trb_pct: Optional[float] = None
    stl_pct: Optional[float] = None
    blk_pct: Optional[float] = None
    tov_pct: Optional[float] = None
    orb_pct: Optional[float] = None
    drb_pct: Optional[float] = None
    ranks: Dict[str, StatRank] = {}


class PlayerDashboardGame(BaseModel):
    game_id: int
    game_date: str
    team_name: str
    team_label: Optional[str] = None
    opponent: Optional[str] = None
    mp_mins: float
    pts: int
    trb: int
    ast: int
    stl: int
    blk: int
    fg: int
    fga: int
    fg3: int
    fg3a: int
    ft: int
    fta: int
    tov: int
    ts_pct: Optional[float] = None
    efg_pct: Optional[float] = None
    usg_pct: Optional[float] = None
    ortg: Optional[float] = None
    drtg: Optional[float] = None
    bpm: Optional[float] = None


class PlayerDashboardResponse(BaseModel):
    player_name: str
    query: str
    games_played: int
    teams: List[str]
    stats: Optional[PlayerDashboardStats] = None
    games: List[PlayerDashboardGame]
    trend_charts: TrendCharts = TrendCharts()
    league_players: int
    league_games: int


class PlayerListResponse(BaseModel):
    players: List[str]


class PlayerLeagueLeadersResponse(BaseModel):
    league_players: int
    league_games: int
    players: List[PlayerDashboardStats]


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
