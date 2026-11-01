const REQUIRED_COLUMNS = ["PTS", "FG", "FGA", "FTA"];
const GAME_MINUTES = 40;
const NUMERIC_COLS = [
  "PTS", "FGA", "FTA", "FG", "3PA", "3P", "FT",
  "ORB", "DRB", "TRB", "AST", "STL", "BLK", "TOV", "PF",
];
const PCT_COLS = ["FG%", "3P%", "FT%"];
const COLUMN_ALIASES = {
  player: "Player",
  players: "Player",
  starters: "Player",
  name: "Player",
  playername: "Player",
  no: "#",
  num: "Number",
  number: "#",
  jersey: "#",
  mp: "MP",
  min: "MP",
  minutes: "MP",
  mins: "MP",
  mpmins: "MP",
  fg: "FG",
  fgm: "FG",
  fieldgoalmade: "FG",
  fieldgoalsmade: "FG",
  fga: "FGA",
  fgpct: "FG%",
  fgpercent: "FG%",
  "3p": "3P",
  "3pm": "3P",
  "3pointmade": "3P",
  "3pa": "3PA",
  "3ppct": "3P%",
  "3ppercent": "3P%",
  ft: "FT",
  ftm: "FT",
  freethrowsmade: "FT",
  fta: "FTA",
  ftpct: "FT%",
  ftpercent: "FT%",
  orb: "ORB",
  or: "ORB",
  offensiverebounds: "ORB",
  drb: "DRB",
  dr: "DRB",
  defensiverebounds: "DRB",
  trb: "TRB",
  reb: "TRB",
  totalreb: "TRB",
  totalrebounds: "TRB",
  ast: "AST",
  stl: "STL",
  blk: "BLK",
  tov: "TOV",
  to: "TOV",
  turnovers: "TOV",
  pf: "PF",
  fouls: "PF",
  pts: "PTS",
  points: "PTS",
  teampts: "PTS",
};

export function parseCsvText(text) {
  const rows = [];
  let cur = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if ((ch === "," || ch === "\t") && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cur);
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      cur = "";
      continue;
    }
    cur += ch;
  }
  row.push(cur);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function headerKey(value) {
  return String(value || "")
    .trim()
    .replace(/\ufeff/g, "")
    .toLowerCase()
    .replace(/%/g, "pct")
    .replace(/[\s_-]/g, "");
}

function normalizeColumnName(col) {
  const key = headerKey(col);
  if (COLUMN_ALIASES[key]) return COLUMN_ALIASES[key];
  const raw = String(col || "").trim().replace(/\ufeff/g, "");
  return raw;
}

function detectHeaderRow(lines) {
  for (let i = 0; i < lines.length; i += 1) {
    const clean = lines[i].replace(/ /g, "").replace(/\ufeff/g, "").toLowerCase();
    const hasTime = clean.includes("mp") || clean.includes("min");
    const hasFga = clean.includes("fga");
    const hasFg = clean.includes("fg") || clean.includes("fgm");
    const hasPts = clean.includes("pts") || clean.includes("points");
    const hasReb = clean.includes("reb") || clean.includes("or") || clean.includes("dr") || clean.includes("trb");
    if (hasTime && hasFga && hasFg && hasPts && hasReb) return i;
  }
  return -1;
}

function isTotalsRowName(name) {
  if (name == null || String(name).trim() === "") return true;
  const normalized = String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (
    [
      "total",
      "totals",
      "team",
      "teamtotals",
      "teamtotal",
      "starters",
      "bench",
      "teamcoach",
      "dnp",
      "didnotplay",
    ].includes(normalized)
  ) {
    return true;
  }
  return normalized.startsWith("total") || normalized.includes("teamtotal");
}

function parseNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw || [".", "-", "nan", "None"].includes(raw)) return 0;
  const n = Number(raw.replace("%", ""));
  return Number.isFinite(n) ? n : 0;
}

function parseFraction(value) {
  const raw = String(value ?? "").trim();
  if (!raw || [".", "-", "nan", "None"].includes(raw)) return [0, 0];
  if (raw.includes("-") && !raw.startsWith("-")) {
    const [made, attempted] = raw.split("-", 2);
    return [parseNumber(made), parseNumber(attempted)];
  }
  const made = parseNumber(raw);
  return [made, made];
}

function parseMpToMinutes(value) {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).trim();
  if (!text || ["did not play", "dnp"].includes(text.toLowerCase())) return 0;
  const parts = text.replace(/ /g, "").split(":").filter(Boolean);
  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (Number.isFinite(minutes) && Number.isFinite(seconds)) return minutes + seconds / 60;
    return 0;
  }
  if (parts.length === 3) {
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    const c = Number(parts[2]);
    if (parts[2] === "00" && Number.isFinite(a) && Number.isFinite(b)) return a + b / 60;
    if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) return a * 60 + b + c / 60;
    return 0;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function expandMadeAttempted(row) {
  const pairs = [
    ["FG", "FGA"],
    ["3P", "3PA"],
    ["FT", "FTA"],
  ];
  const next = { ...row };
  for (const [madeCol, attCol] of pairs) {
    if (next[attCol] != null && String(next[attCol]).trim() !== "") continue;
    const source = next[madeCol];
    if (source == null) continue;
    if (!/^\d+\s*-\s*\d+/.test(String(source))) continue;
    const [made, attempted] = parseFraction(source);
    next[madeCol] = made;
    next[attCol] = attempted;
  }
  return next;
}

function getPlayerName(row, index) {
  const raw = row.Player;
  if (raw != null && String(raw).trim() !== "") return String(raw).trim();
  const skip = new Set([
    "MP", "PTS", "FGA", "FG", "FTA", "3P", "3PA", "FT", "ORB", "DRB", "TRB",
    "AST", "STL", "BLK", "TOV", "PF", "GmSc", "FG%", "3P%", "FT%", "+/-", "#",
    "MP_mins",
  ]);
  for (const [key, value] of Object.entries(row)) {
    if (skip.has(key)) continue;
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return `Player ${index + 1}`;
}

function safeDiv(a, b) {
  if (!b) return 0;
  const value = a / b;
  return Number.isFinite(value) ? value : 0;
}

function num(row, key) {
  return parseNumber(row[key]);
}

export function buildTeamStats(rows) {
  const stats = { FGA: 0, FTA: 0, TOV: 0, ORB: 0, DRB: 0, TRB: 0, AST: 0, PTS: 0, FG: 0, MP_mins: 0 };
  for (const row of rows) {
    for (const key of Object.keys(stats)) {
      if (key === "MP_mins") {
        stats.MP_mins += parseMpToMinutes(row.MP ?? row.MP_mins);
      } else {
        stats[key] += num(row, key);
      }
    }
  }
  return stats;
}

export function generateAdvancedStats(rows, teamStats = null, opponentStats = null) {
  const team = teamStats || buildTeamStats(rows);
  const opponent = opponentStats || {
    FGA: 0, FTA: 0, TOV: 0, ORB: 0, DRB: 0, TRB: 0, AST: 0, PTS: 0, FG: 0, MP_mins: 0,
  };
  const possessions = Math.max(team.FGA + team.TOV + 0.44 * team.FTA, 1);
  const oppOrb = opponent.ORB || 0;
  const oppDrb = opponent.DRB || 0;
  const oppTrb = opponent.TRB || 0;

  return rows.map((raw, index) => {
    const row = { ...raw };
    for (const col of NUMERIC_COLS) {
      row[col] = num(row, col);
    }
    for (const col of PCT_COLS) {
      let value = num(row, col);
      if (value > 1) value /= 100;
      row[col] = value;
    }
    if (!row["FG%"] && row.FGA) row["FG%"] = row.FG / row.FGA;
    if (!row["3P%"] && row["3PA"]) row["3P%"] = row["3P"] / row["3PA"];
    if (!row["FT%"] && row.FTA) row["FT%"] = row.FT / row.FTA;

    const mpMins = parseMpToMinutes(row.MP ?? row.MP_mins);
    row.TS = safeDiv(row.PTS, 2 * (row.FGA + 0.44 * row.FTA));
    row["TS%"] = row.TS;
    row["eFG%"] = safeDiv(row.FG + 0.5 * row["3P"], row.FGA);
    row["3PAr"] = safeDiv(row["3PA"], row.FGA);
    row.FTr = safeDiv(row.FTA, row.FGA);
    const playerPoss = row.FGA + 0.44 * row.FTA + row.TOV;
    row["USG%"] = safeDiv(100 * playerPoss * GAME_MINUTES, mpMins * possessions);
    row.ORtg = safeDiv((row.PTS + 0.4 * row.AST + 0.44 * row.FTA) * 100, playerPoss);
    row["AST%"] = safeDiv(100 * row.AST * GAME_MINUTES, mpMins * (team.FG - row.FG));
    row["TOV%"] = safeDiv(100 * row.TOV, playerPoss);
    row["TRB%"] = safeDiv(100 * row.TRB * GAME_MINUTES, mpMins * Math.max(team.TRB + oppTrb, 1));
    row["ORB%"] = safeDiv(100 * row.ORB * GAME_MINUTES, mpMins * Math.max(team.ORB + oppDrb, 1));
    row["DRB%"] = safeDiv(100 * row.DRB * GAME_MINUTES, mpMins * Math.max(team.DRB + oppOrb, 1));
    row["STL%"] = safeDiv(100 * row.STL * GAME_MINUTES, mpMins * possessions);
    row["BLK%"] = safeDiv(100 * row.BLK * GAME_MINUTES, mpMins * possessions);
    row.DRtg = 112 + 0.4 * (12 - row["DRB%"]) + 0.8 * (2 - row["STL%"]) + 0.6 * (2 - row["BLK%"]);
    row.BPM =
      0.15 * (row["TS%"] * 100 - 50) +
      0.05 * (row["AST%"] - 10) +
      0.04 * (row["TRB%"] - 10) +
      0.25 * (row["STL%"] - 2) +
      0.25 * (row["BLK%"] - 2) -
      0.15 * (row["TOV%"] - 12) -
      0.05 * (row["USG%"] - 20) +
      0.03 * (row["ORB%"] - 5) +
      0.02 * (row["DRB%"] - 15);

    row.Player = getPlayerName(row, index);
    if (row.MP != null) row.MP = String(row.MP);
    delete row.MP_mins;
    delete row.TS;
    return row;
  });
}

export function parseBoxScoreCsv(text) {
  const rawLines = String(text || "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "" && !line.includes("Basic Box Score Stats"));
  if (!rawLines.length) {
    throw new Error("CSV is empty");
  }

  let headerIndex = detectHeaderRow(rawLines);
  if (headerIndex < 0) {
    const parsed = parseCsvText(rawLines.join("\n"));
    headerIndex = parsed.findIndex((row) => {
      const keys = row.map(headerKey);
      return (keys.includes("pts") || keys.includes("points")) && (keys.includes("fga") || keys.includes("fg"));
    });
    if (headerIndex < 0) {
      throw new Error("Could not detect header row in the uploaded CSV");
    }
  }

  const parsed = parseCsvText(rawLines.slice(headerIndex).join("\n"));
  if (parsed.length < 2) {
    throw new Error("CSV needs a header row and at least one player");
  }

  const headers = parsed[0].map(normalizeColumnName);
  const rows = parsed
    .slice(1)
    .map((cells) => {
      const row = {};
      headers.forEach((header, idx) => {
        if (!header) return;
        row[header] = cells[idx];
      });
      return expandMadeAttempted(row);
    })
    .filter((row) => {
      const mp = String(row.MP || "");
      if (/did not play|dnp/i.test(mp)) return false;
      return !isTotalsRowName(row.Player ?? Object.values(row)[0]);
    });

  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length) {
    throw new Error(`Missing columns: ${missing.join(", ")}`);
  }
  if (!rows.length) {
    throw new Error("No player rows found in the CSV");
  }
  return rows;
}

export function calculateBoxScoresFromCsv(homeText, awayText = "") {
  const homeRows = parseBoxScoreCsv(homeText);
  const homeStats = buildTeamStats(homeRows);
  if (!awayText || !String(awayText).trim()) {
    return { home: generateAdvancedStats(homeRows, homeStats) };
  }
  const awayRows = parseBoxScoreCsv(awayText);
  const awayStats = buildTeamStats(awayRows);
  return {
    home: generateAdvancedStats(homeRows, homeStats, awayStats),
    away: generateAdvancedStats(awayRows, awayStats, homeStats),
  };
}
