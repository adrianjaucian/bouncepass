import { computeTeamTotals, filterPlayerRows, getRowPlayerName, parseNumber } from "./gameResultsUtils";

const STORAGE_KEY = "bounce_workspace_v1";

function emptyState() {
  return { teams: [], games: [], players: [], nextId: 1 };
}

function readState() {
  if (typeof window === "undefined") return emptyState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "");
    if (!parsed || !Array.isArray(parsed.teams)) return emptyState();
    return {
      teams: parsed.teams || [],
      games: parsed.games || [],
      players: parsed.players || [],
      nextId: Number(parsed.nextId) || 1,
    };
  } catch {
    return emptyState();
  }
}

function writeState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function nextId(state) {
  const id = state.nextId || 1;
  state.nextId = id + 1;
  return id;
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function scoresFromResults(results) {
  const home = computeTeamTotals(results?.home || []).PTS || null;
  const awayRows = results?.away || [];
  const away = awayRows.length ? computeTeamTotals(awayRows).PTS : null;
  return { home_score: home, away_score: away };
}

export function getTeamSide(game, results = game?.results) {
  const raw = game?.team_side || results?.team_side || "home";
  return String(raw).toLowerCase() === "away" ? "away" : "home";
}

export function getGameOpponent(game, results = game?.results) {
  return getTeamSide(game, results) === "away" ? game?.home_team_name || null : game?.away_team_name || null;
}

function teamRowsFromResults(results, side) {
  return filterPlayerRows(results?.[side] || []);
}

function collectTeamPlayers(results, side = getTeamSide({ results }, results)) {
  const names = [];
  const seen = new Set();
  teamRowsFromResults(results, side).forEach((row, index) => {
    const name = String(getRowPlayerName(row) || `Player ${index + 1}`).trim();
    const key = normalizeName(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    names.push(name);
  });
  return names;
}

export function listLocalTeams() {
  const state = readState();
  return state.teams.map((team) => {
    const games = state.games.filter((game) => game.team_id === team.id);
    const players = state.players.filter((player) => player.team_id === team.id);
    return {
      ...team,
      game_count: games.length,
      player_count: players.length,
    };
  });
}

export function createLocalTeam(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Team name is required");
  const state = readState();
  const exists = state.teams.some((team) => team.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) throw new Error("A team with that name already exists");
  const team = {
    id: nextId(state),
    name: trimmed,
    created_at: new Date().toISOString(),
    game_count: 0,
    player_count: 0,
  };
  state.teams.push(team);
  writeState(state);
  return team;
}

export function listLocalGames(teamId) {
  const state = readState();
  const games = state.games
    .filter((game) => !teamId || game.team_id === teamId)
    .sort((a, b) => String(b.game_date).localeCompare(String(a.game_date)) || String(b.created_at).localeCompare(String(a.created_at)));
  return { games, total: games.length, limit: games.length, offset: 0 };
}

export function getLocalGame(gameId) {
  return readState().games.find((game) => String(game.id) === String(gameId)) || null;
}

export function updateLocalGame(gameId, { game_date, opponent_name }) {
  const state = readState();
  const game = state.games.find((item) => String(item.id) === String(gameId));
  if (!game) throw new Error("Game not found");
  game.game_date = game_date;
  if (getTeamSide(game) === "away") {
    game.home_team_name = opponent_name || "Opponent";
  } else {
    game.away_team_name = opponent_name || null;
  }
  writeState(state);
  return game;
}

export function deleteLocalGame(gameId) {
  const state = readState();
  state.games = state.games.filter((game) => String(game.id) !== String(gameId));
  writeState(state);
}

export function saveLocalGame({ team_id, game_date, opponent_name, results, team_side }) {
  const state = readState();
  const team = state.teams.find((item) => item.id === team_id);
  if (!team) throw new Error("Create or select a team before saving.");
  const opponent = (opponent_name || "").trim() || null;
  const side = getTeamSide({ team_side, results }, results);
  const storedResults = { ...(results || {}), team_side: side };
  const duplicate = state.games.find(
    (game) =>
      game.team_id === team_id &&
      game.game_date === game_date &&
      String(getGameOpponent(game) || "").toLowerCase() === String(opponent || "").toLowerCase(),
  );
  if (duplicate) throw new Error("This game is already saved for the team");
  const scores = scoresFromResults(storedResults);
  const record = {
    id: nextId(state),
    team_id,
    team_side: side,
    game_date,
    home_team_name: side === "away" ? opponent || "Opponent" : team.name,
    away_team_name: side === "away" ? team.name : opponent,
    home_score: scores.home_score,
    away_score: scores.away_score,
    results: storedResults,
    created_at: new Date().toISOString(),
  };
  state.games.push(record);
  collectTeamPlayers(storedResults, side).forEach((name) => {
    const exists = state.players.some(
      (player) => player.team_id === team_id && normalizeName(player.name) === normalizeName(name),
    );
    if (!exists) {
      state.players.push({ id: nextId(state), team_id, name, created_at: new Date().toISOString() });
    }
  });
  writeState(state);
  return record;
}

function number(row, keys) {
  for (const key of keys) {
    if (row && row[key] != null && String(row[key]).trim() !== "") {
      return parseNumber(row[key]);
    }
  }
  return 0;
}

function parseMinutes(row) {
  const raw = row?.MP || row?.MP_mins || row?.mp || 0;
  if (typeof raw === "number") return raw;
  const text = String(raw);
  const colon = text.match(/^(\d+):([0-5]?\d)$/);
  if (colon) return Number(colon[1]) + Number(colon[2]) / 60;
  return parseNumber(text);
}

function emptyPlayer(name) {
  return {
    player: name,
    games: 0,
    pts: 0,
    trb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    mp_mins: 0,
    ts_weighted: 0,
    efg_weighted: 0,
    usg_weighted: 0,
    ortg_weighted: 0,
    drtg_weighted: 0,
    bpm_weighted: 0,
    game_log: [],
  };
}

function addPlayerRow(bucket, row, game) {
  const mpMins = parseMinutes(row);
  const pts = number(row, ["PTS", "pts"]);
  bucket.games += 1;
  bucket.pts += pts;
  bucket.trb += number(row, ["TRB", "REB", "trb"]);
  bucket.ast += number(row, ["AST", "ast"]);
  bucket.stl += number(row, ["STL", "stl"]);
  bucket.blk += number(row, ["BLK", "blk"]);
  bucket.mp_mins += mpMins;
  const weight = mpMins || 1;
  bucket.ts_weighted += number(row, ["TS%"]) * weight;
  bucket.efg_weighted += number(row, ["eFG%"]) * weight;
  bucket.usg_weighted += number(row, ["USG%"]) * weight;
  bucket.ortg_weighted += number(row, ["ORtg"]) * weight;
  bucket.drtg_weighted += number(row, ["DRtg"]) * weight;
  bucket.bpm_weighted += number(row, ["BPM"]) * weight;
  bucket.game_log.push({
    game_id: game.id,
    game_date: game.game_date,
    opponent: getGameOpponent(game),
    team_side: getTeamSide(game),
    pts,
    trb: number(row, ["TRB", "REB"]),
    ast: number(row, ["AST"]),
    stl: number(row, ["STL"]),
    blk: number(row, ["BLK"]),
    mp_mins: mpMins,
    ts_pct: number(row, ["TS%"]),
    efg_pct: number(row, ["eFG%"]),
    usg_pct: (() => {
      const usg = number(row, ["USG%"]);
      return usg > 0 && usg <= 1 ? usg * 100 : usg;
    })(),
    ortg: number(row, ["ORtg"]),
    drtg: number(row, ["DRtg"]),
    bpm: number(row, ["BPM"]),
  });
}

function teamGameSnapshot(game) {
  const side = getTeamSide(game);
  const results = game.results || {};
  const teamRows = teamRowsFromResults(results, side);
  const oppRows = teamRowsFromResults(results, side === "home" ? "away" : "home");
  const totals = computeTeamTotals(teamRows);
  const oppTotals = computeTeamTotals(oppRows);
  const teamScore = side === "home" ? game.home_score : game.away_score;
  const oppScore = side === "home" ? game.away_score : game.home_score;
  let weight = 0;
  let ts = 0;
  let efg = 0;
  let usg = 0;
  let ortg = 0;
  let drtg = 0;
  let bpm = 0;
  teamRows.forEach((row) => {
    const gameWeight = parseMinutes(row) || 1;
    weight += gameWeight;
    ts += number(row, ["TS%"]) * gameWeight;
    efg += number(row, ["eFG%"]) * gameWeight;
    usg += number(row, ["USG%"]) * gameWeight;
    ortg += number(row, ["ORtg"]) * gameWeight;
    drtg += number(row, ["DRtg"]) * gameWeight;
    bpm += number(row, ["BPM"]) * gameWeight;
  });
  const usgValue = weight ? usg / weight : 0;
  return {
    id: game.id,
    game_date: game.game_date,
    opponent: getGameOpponent(game),
    team_side: side,
    pts: teamScore != null ? teamScore : totals.PTS,
    opp_pts: oppScore != null ? oppScore : oppTotals.PTS,
    trb: totals.TRB,
    ast: totals.AST,
    stl: totals.STL,
    blk: totals.BLK,
    tov: totals.TOV,
    mp_mins: totals.MP_mins,
    fg: totals.FG,
    fga: totals.FGA,
    fg3: totals["3P"],
    fg3a: totals["3PA"],
    ft: totals.FT,
    fta: totals.FTA,
    fg_pct: totals["FG%"],
    fg3_pct: totals["3P%"],
    ft_pct: totals["FT%"],
    ts_pct: weight ? ts / weight : 0,
    efg_pct: weight ? efg / weight : 0,
    usg_pct: usgValue <= 1 ? usgValue * 100 : usgValue,
    ortg: weight ? ortg / weight : 0,
    drtg: weight ? drtg / weight : 0,
    bpm: weight ? bpm / weight : 0,
  };
}

function finalizePlayer(bucket) {
  const games = bucket.games || 1;
  const minutes = bucket.mp_mins || 1;
  let usg = bucket.usg_weighted / minutes;
  if (usg <= 1) usg *= 100;
  return {
    player: bucket.player,
    games: bucket.games,
    pts: bucket.pts,
    trb: bucket.trb,
    ast: bucket.ast,
    stl: bucket.stl,
    blk: bucket.blk,
    mp_mins: Math.round(bucket.mp_mins * 10) / 10,
    pts_pg: Math.round((bucket.pts / games) * 10) / 10,
    trb_pg: Math.round((bucket.trb / games) * 10) / 10,
    ast_pg: Math.round((bucket.ast / games) * 10) / 10,
    ts_pct: bucket.ts_weighted / minutes,
    efg_pct: bucket.efg_weighted / minutes,
    usg_pct: usg,
    ortg: bucket.ortg_weighted / minutes,
    drtg: bucket.drtg_weighted / minutes,
    bpm: bucket.bpm_weighted / minutes,
    game_log: bucket.game_log,
  };
}

export function listLocalPlayers(teamId) {
  const analytics = buildLocalTeamAnalytics(teamId);
  const state = readState();
  const statsByName = Object.fromEntries(
    (analytics?.players || []).map((player) => [normalizeName(player.player), player]),
  );
  return state.players
    .filter((player) => player.team_id === teamId)
    .map((player) => {
      const stats = statsByName[normalizeName(player.name)] || {};
      return {
        id: player.id,
        name: player.name,
        games: stats.games || 0,
        pts: stats.pts || 0,
        trb: stats.trb || 0,
        ast: stats.ast || 0,
      };
    })
    .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
}

export function buildLocalTeamAnalytics(teamId) {
  const state = readState();
  const team = state.teams.find((item) => item.id === teamId);
  if (!team) return null;
  const games = state.games.filter((game) => game.team_id === teamId);
  const players = {};
  const gameRows = [];
  let wins = 0;
  let losses = 0;
  const totals = { pts: 0, opp_pts: 0, trb: 0, ast: 0 };

  const metricSeries = [];
  games.forEach((game) => {
    const snapshot = teamGameSnapshot(game);
    const teamRows = teamRowsFromResults(game.results, snapshot.team_side);
    if (snapshot.pts != null && snapshot.opp_pts != null) {
      if (snapshot.pts > snapshot.opp_pts) wins += 1;
      else if (snapshot.pts < snapshot.opp_pts) losses += 1;
    }
    totals.pts += snapshot.pts || 0;
    totals.opp_pts += snapshot.opp_pts || 0;
    teamRows.forEach((row, index) => {
      const name = String(getRowPlayerName(row) || `Player ${index + 1}`).trim();
      const key = normalizeName(name);
      if (!players[key]) players[key] = emptyPlayer(name);
      addPlayerRow(players[key], row, game);
      totals.trb += number(row, ["TRB", "REB"]);
      totals.ast += number(row, ["AST"]);
    });
    metricSeries.push(snapshot);
    gameRows.push({
      id: game.id,
      game_date: game.game_date,
      opponent: snapshot.opponent,
      team_score: snapshot.pts,
      opponent_score: snapshot.opp_pts,
      team_side: snapshot.team_side,
    });
  });

  const finalized = Object.values(players).map((bucket) => {
    const player = finalizePlayer(bucket);
    delete player.game_log;
    return player;
  });
  finalized.sort((a, b) => b.pts - a.pts || a.player.localeCompare(b.player));
  gameRows.sort((a, b) => String(b.game_date).localeCompare(String(a.game_date)));
  metricSeries.sort((a, b) => String(a.game_date).localeCompare(String(b.game_date)));
  return {
    team_id: team.id,
    team_name: team.name,
    games_played: games.length,
    record: { wins, losses },
    totals,
    players: finalized,
    games: gameRows,
    metric_series: metricSeries,
  };
}

export function buildLocalPlayerAnalytics(teamId, playerName) {
  const state = readState();
  const team = state.teams.find((item) => item.id === teamId);
  if (!team) return null;
  const target = normalizeName(playerName);
  const bucket = emptyPlayer(playerName);
  let matched = false;
  state.games
    .filter((game) => game.team_id === teamId)
    .forEach((game) => {
      teamRowsFromResults(game.results, getTeamSide(game)).forEach((row, index) => {
        const name = String(getRowPlayerName(row) || `Player ${index + 1}`).trim();
        if (normalizeName(name) !== target) return;
        matched = true;
        bucket.player = name;
        addPlayerRow(bucket, row, game);
      });
    });
  if (!matched) return null;
  const stats = finalizePlayer(bucket);
  return {
    team_id: team.id,
    team_name: team.name,
    player_name: stats.player,
    games_played: stats.games,
    stats,
    games: stats.game_log,
  };
}

export function isUnavailableStatus(status) {
  return status === 502 || status === 503 || status === 504;
}
