/** @param {{ homeTeamName: string, awayTeamName?: string|null, homeScore?: number|null, awayScore?: number|null, results?: { home?: unknown[], away?: unknown[] }|null, variant?: 'default'|'list' }} options */
export const formatSavedGameLabel = ({
  homeTeamName,
  awayTeamName,
  homeScore = null,
  awayScore = null,
  results = null,
  variant = 'default',
}) => {
  let homePts = homeScore;
  let awayPts = awayScore;

  if ((homePts == null || awayPts == null) && results) {
    const totalsFromResults = (side) => {
      const rows = results?.[side];
      if (!rows?.length) return null;
      return computeTeamTotals(rows).PTS;
    };
    if (homePts == null) homePts = totalsFromResults('home');
    if (awayPts == null) awayPts = totalsFromResults('away');
  }

  const formatTeam = (name, role, pts) => {
    const trimmed = String(name || (role === 'Home' ? 'Home' : 'Away')).trim();
    if (variant === 'list') {
      return pts != null ? `${trimmed} (${pts})` : trimmed;
    }
    const labeled = withTeamRole(trimmed, role);
    return pts != null ? `${labeled} ${pts}` : labeled;
  };

  const homeLabel = formatTeam(homeTeamName, 'Home', homePts);
  if (!awayTeamName) {
    return homeLabel;
  }

  const awayLabel = formatTeam(awayTeamName, 'Away', awayPts);
  return `${homeLabel} vs ${awayLabel}`;
};

export const withTeamRole = (name, role) => {
  const trimmed = String(name || "").trim();
  const suffix = role === "Home" ? "(Home)" : "(Away)";
  if (!trimmed) {
    return role === "Home" ? "Home (Home)" : "Away (Away)";
  }
  if (trimmed.endsWith("(Home)") || trimmed.endsWith("(Away)")) {
    return trimmed;
  }
  return `${trimmed} ${suffix}`;
};

export const parseNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const raw = String(value).trim();
  if (raw === '' || /^dnp$/i.test(raw) || /^didnotplay$/i.test(raw)) return 0;
  const cleaned = raw.replace(/,/g, '').replace(/%/g, '').trim();
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

export const formatMp = (value) => {
  if (value === null || value === undefined) return '0:00';
  const raw = String(value).trim();
  if (raw === '' || /^dnp$/i.test(raw) || /^didnotplay$/i.test(raw)) return '0:00';

  const colon = raw.match(/^(\d+):([0-5]?\d)$/);
  if (colon) {
    const mins = Number(colon[1]);
    const secs = Number(colon[2]);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  const num = parseNumber(raw);
  if (Number.isNaN(num)) return '0:00';

  const minutes = Math.floor(num);
  const seconds = Math.round((num - minutes) * 60);
  const normalizedSeconds = seconds === 60 ? 0 : seconds;
  const normalizedMinutes = seconds === 60 ? minutes + 1 : minutes;
  return `${normalizedMinutes}:${String(normalizedSeconds).padStart(2, '0')}`;
};

const normalizePlayerName = (value) =>
  String(value || '')
    .trim()
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

export const isTotalsRowName = (value) => {
  const normalized = normalizePlayerName(value);
  if (!normalized) return true;
  if (
    normalized === 'total' ||
    normalized === 'totals' ||
    normalized === 'team' ||
    normalized === 'teamtotals' ||
    normalized === 'teamtotal' ||
    normalized === 'starters' ||
    normalized === 'bench' ||
    normalized === 'teamcoach' ||
    normalized === 'dnp' ||
    normalized === 'didnotplay'
  ) {
    return true;
  }
  if (normalized.startsWith('total')) return true;
  if (normalized.includes('teamtotal')) return true;
  return false;
};

export const getRowPlayerName = (row) =>
  row?.Player || row?.Name || row?.PLAYER || row?.player || Object.values(row || {})[0] || '';

export const filterPlayerRows = (rows) =>
  (rows || []).filter((row) => !isTotalsRowName(getRowPlayerName(row)));

export const computeTeamTotals = (rows) => {
  const playerRows = filterPlayerRows(rows);
  const totals = {
    FG: 0,
    FGA: 0,
    '3P': 0,
    '3PA': 0,
    FT: 0,
    FTA: 0,
    ORB: 0,
    DRB: 0,
    TRB: 0,
    AST: 0,
    STL: 0,
    BLK: 0,
    TOV: 0,
    PTS: 0,
    MP_mins: 0,
    'FG%': 0,
    '3P%': 0,
    'FT%': 0,
  };

  const normalize = (s) => String(s).replace(/[^a-z0-9]/gi, '').toLowerCase();
  const getField = (p, names) => {
    for (const n of names) {
      if (n in p && p[n] !== undefined && p[n] !== null && String(p[n]).trim() !== '') return parseNumber(p[n]);
    }
    const keys = Object.keys(p || {});
    for (const n of names) {
      const normN = normalize(n);
      const found = keys.find((k) => normalize(k) === normN);
      if (found) return parseNumber(p[found]);
    }
    return 0;
  };

  playerRows.forEach((p) => {
    totals.FG += getField(p, ['FG', 'FGM']);
    totals.FGA += getField(p, ['FGA']);
    totals['3P'] += getField(p, ['3P', '3PM']);
    totals['3PA'] += getField(p, ['3PA']);
    totals.FT += getField(p, ['FT', 'FTM']);
    totals.FTA += getField(p, ['FTA']);
    totals.ORB += getField(p, ['ORB', 'OR']);
    totals.DRB += getField(p, ['DRB', 'DR']);
    totals.TRB += getField(p, ['TRB', 'REB', 'TOTAL_REB']);
    totals.AST += getField(p, ['AST']);
    totals.STL += getField(p, ['STL']);
    totals.BLK += getField(p, ['BLK']);
    totals.TOV += getField(p, ['TOV', 'TO']);
    totals.PTS += getField(p, ['PTS', 'POINTS']);
    totals.MP_mins += getField(p, ['MP_mins', 'MP']);
  });

  totals['FG%'] = totals.FGA ? totals.FG / totals.FGA : 0;
  totals['3P%'] = totals['3PA'] ? totals['3P'] / totals['3PA'] : 0;
  totals['FT%'] = totals.FTA ? totals.FT / totals.FTA : 0;
  return totals;
};
