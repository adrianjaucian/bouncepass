const EMBED_URL = "https://embed-api.eui.connect.sportradar.com/v1/embed/3/fixture_detail";
const TEAM_MINUTES = 40;
const NUMERIC_KEYS = [
  "PTS",
  "FGA",
  "FTA",
  "FG",
  "3PA",
  "3P",
  "FT",
  "ORB",
  "DRB",
  "TRB",
  "AST",
  "STL",
  "BLK",
  "TOV",
  "PF",
] as const;

export type BoxScoreRow = Record<string, string | number>;
export type TeamTotals = Record<string, number>;

type JsonMap = Record<string, unknown>;

function asRecord(value: unknown): JsonMap | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonMap)
    : null;
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

export function isoDurationToMp(value: unknown): string {
  if (value == null) return "0:00";
  const raw = String(value).trim();
  if (!raw) return "0:00";
  const match = raw.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
  if (!match) return raw;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Math.trunc(Number(match[3] || 0));
  const extraMinute = seconds >= 30 ? 1 : 0;
  const totalMinutes = hours * 60 + minutes + extraMinute;
  const displaySeconds = seconds >= 30 ? 0 : seconds;
  return `${totalMinutes}:${String(displaySeconds).padStart(2, "0")}`;
}

export function parseMpToMinutes(value: unknown): number {
  const text = String(value ?? "").trim();
  if (!text || text.toLowerCase() === "did not play" || text.toLowerCase() === "dnp") return 0;
  const parts = text.replace(/\s/g, "").split(":").filter(Boolean);
  if (parts.length === 2) {
    return num(parts[0]) + num(parts[1]) / 60;
  }
  if (parts.length === 3) {
    return num(parts[0]) * 60 + num(parts[1]) + num(parts[2]) / 60;
  }
  return num(text);
}

function playerRecord(row: JsonMap): BoxScoreRow | null {
  if (!row.participated || row.didNotPlayReason) return null;
  const name = String(row.personName || "").trim();
  if (!name) return null;
  const stats = asRecord(row.statistics) || {};
  return {
    Player: name,
    MP: isoDurationToMp(stats.minutes),
    PTS: num(stats.points),
    FG: num(stats.fieldGoalsMade),
    FGA: num(stats.fieldGoalsAttempted),
    "FG%": num(stats.fieldGoalsPercentage),
    "3P": num(stats.pointsThreeMade),
    "3PA": num(stats.pointsThreeAttempted),
    "3P%": num(stats.pointsThreePercentage),
    FT: num(stats.freeThrowsMade),
    FTA: num(stats.freeThrowsAttempted),
    "FT%": num(stats.freeThrowsPercentage),
    ORB: num(stats.reboundsOffensive),
    DRB: num(stats.reboundsDefensive),
    TRB: num(stats.rebounds),
    AST: num(stats.assists),
    STL: num(stats.steals),
    BLK: num(stats.blocks),
    TOV: num(stats.turnovers),
    PF: num(stats.foulsTotal),
    "+/-": num(stats.plusMinus),
  };
}

function teamRows(team: JsonMap | null): BoxScoreRow[] {
  if (!team) return [];
  const groups = Array.isArray(team.persons) ? team.persons : [];
  const rows: BoxScoreRow[] = [];
  for (const group of groups) {
    const record = asRecord(group);
    const groupRows = Array.isArray(record?.rows) ? record.rows : [];
    for (const item of groupRows) {
      const row = asRecord(item);
      const parsed = row ? playerRecord(row) : null;
      if (parsed) rows.push(parsed);
    }
  }
  return rows;
}

export function teamTotals(rows: BoxScoreRow[]): TeamTotals {
  const totals: TeamTotals = {};
  for (const key of [...NUMERIC_KEYS, "PTS"]) {
    totals[key] = rows.reduce((sum, row) => sum + num(row[key]), 0);
  }
  return totals;
}

export function generateAdvancedStats(
  rows: BoxScoreRow[],
  opponent: TeamTotals = {}
): BoxScoreRow[] {
  const withMinutes = rows.map((row, index) => {
    const next: BoxScoreRow = { ...row };
    for (const key of NUMERIC_KEYS) {
      next[key] = num(next[key]);
    }
    for (const key of ["FG%", "3P%", "FT%"] as const) {
      let value = num(next[key]);
      if (value > 1) value /= 100;
      next[key] = value;
    }
    next.MP_mins = parseMpToMinutes(next.MP);
    if (!String(next.Player || "").trim()) next.Player = `Player ${index + 1}`;
    return next;
  });

  const team = teamTotals(withMinutes);
  const possessions = Math.max(team.FGA + team.TOV + 0.44 * team.FTA, 1);
  const oppOrb = num(opponent.ORB);
  const oppDrb = num(opponent.DRB);
  const oppTrb = num(opponent.TRB);

  return withMinutes.map((row) => {
    const pts = num(row.PTS);
    const fga = num(row.FGA);
    const fta = num(row.FTA);
    const fg = num(row.FG);
    const three = num(row["3P"]);
    const threeA = num(row["3PA"]);
    const ast = num(row.AST);
    const tov = num(row.TOV);
    const trb = num(row.TRB);
    const orb = num(row.ORB);
    const drb = num(row.DRB);
    const stl = num(row.STL);
    const blk = num(row.BLK);
    const mp = num(row.MP_mins);
    const playerPoss = fga + 0.44 * fta + tov;

    const ts = safeDiv(pts, 2 * (fga + 0.44 * fta));
    const efg = safeDiv(fg + 0.5 * three, fga);
    const usg = safeDiv(100 * playerPoss * TEAM_MINUTES, mp * possessions);
    const astPct = safeDiv(100 * ast * TEAM_MINUTES, mp * (team.FG - fg));
    const tovPct = safeDiv(100 * tov, fga + 0.44 * fta + tov);
    const trbPct = safeDiv(100 * trb * TEAM_MINUTES, mp * Math.max(team.TRB + oppTrb, 1));
    const orbPct = safeDiv(100 * orb * TEAM_MINUTES, mp * Math.max(team.ORB + oppDrb, 1));
    const drbPct = safeDiv(100 * drb * TEAM_MINUTES, mp * Math.max(team.DRB + oppOrb, 1));
    const stlPct = safeDiv(100 * stl * TEAM_MINUTES, mp * possessions);
    const blkPct = safeDiv(100 * blk * TEAM_MINUTES, mp * possessions);
    const dRtg = 112 + 0.4 * (12 - drbPct) + 0.8 * (2 - stlPct) + 0.6 * (2 - blkPct);
    const bpm =
      0.15 * (ts * 100 - 50) +
      0.05 * (astPct - 10) +
      0.04 * (trbPct - 10) +
      0.25 * (stlPct - 2) +
      0.25 * (blkPct - 2) -
      0.15 * (tovPct - 12) -
      0.05 * (usg - 20) +
      0.03 * (orbPct - 5) +
      0.02 * (drbPct - 15);

    const clean = (value: number) => (Number.isFinite(value) ? value : 0);
    const rest = { ...row };
    delete rest.MP_mins;
    return {
      ...rest,
      MP: String(row.MP ?? "0:00"),
      "TS%": clean(ts),
      "eFG%": clean(efg),
      "3PAr": clean(safeDiv(threeA, fga)),
      FTr: clean(safeDiv(fta, fga)),
      "USG%": clean(usg),
      ORtg: clean(safeDiv((pts + 0.4 * ast + 0.44 * fta) * 100, playerPoss)),
      "AST%": clean(astPct),
      "TOV%": clean(tovPct),
      "TRB%": clean(trbPct),
      "ORB%": clean(orbPct),
      "DRB%": clean(drbPct),
      "STL%": clean(stlPct),
      "BLK%": clean(blkPct),
      DRtg: clean(dRtg),
      BPM: clean(bpm),
    };
  });
}

export async function fetchNbl1Boxscore(fixtureId: string): Promise<{
  home: BoxScoreRow[];
  away: BoxScoreRow[];
  home_team_name: string;
  away_team_name: string;
  game_date: string;
}> {
  const url = new URL(EMBED_URL);
  url.searchParams.set("fixtureId", fixtureId);
  url.searchParams.set("locale", "en-EN");
  url.searchParams.set("sub", "statistics");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; BouncePass/1.0)",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`NBL1 stats request failed (${response.status})`);
  }
  const payload = (await response.json()) as JsonMap;
  if (payload.error) {
    const err = asRecord(payload.error);
    throw new Error(String(err?.message || "Unknown stats error"));
  }
  const data = asRecord(payload.data) || {};
  const statistics = asRecord(asRecord(data.statistics)?.data) || {};
  const base = asRecord(statistics.base) || {};
  const homeRows = teamRows(asRecord(base.home));
  const awayRows = teamRows(asRecord(base.away));
  if (!homeRows.length || !awayRows.length) {
    throw new Error("No player stats found for this game");
  }

  const banner = asRecord(data.banner) || {};
  const fixture = asRecord(banner.fixture) || {};
  const competitors = Array.isArray(fixture.competitors) ? fixture.competitors : [];
  let homeName = "";
  let awayName = "";
  for (const competitor of competitors) {
    const record = asRecord(competitor);
    if (!record) continue;
    if (record.isHome) homeName = String(record.name || homeName);
    else awayName = String(record.name || awayName);
  }

  const startTime = fixture.startTimeLocal || fixture.startTime;
  let gameDate = "";
  if (startTime) {
    const parsed = new Date(String(startTime));
    gameDate = Number.isNaN(parsed.getTime()) ? String(startTime).slice(0, 10) : parsed.toISOString().slice(0, 10);
  }

  const homeTotals = teamTotals(homeRows);
  const awayTotals = teamTotals(awayRows);
  return {
    home: generateAdvancedStats(homeRows, awayTotals),
    away: generateAdvancedStats(awayRows, homeTotals),
    home_team_name: homeName,
    away_team_name: awayName,
    game_date: gameDate,
  };
}
