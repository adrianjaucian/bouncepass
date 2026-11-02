export const TEAM_CHART_METRICS = [
  { id: "pts", label: "Points (PTS)", kind: "count" },
  { id: "opp_pts", label: "Opponent points", kind: "count" },
  { id: "trb", label: "Rebounds (REB)", kind: "count" },
  { id: "ast", label: "Assists (AST)", kind: "count" },
  { id: "stl", label: "Steals (STL)", kind: "count" },
  { id: "blk", label: "Blocks (BLK)", kind: "count" },
  { id: "tov", label: "Turnovers (TOV)", kind: "count" },
  { id: "mp_mins", label: "Minutes (MP)", kind: "count" },
  { id: "fg", label: "Field goals made (FG)", kind: "count" },
  { id: "fga", label: "Field goals attempted (FGA)", kind: "count" },
  { id: "fg3", label: "Threes made (3P)", kind: "count" },
  { id: "fg3a", label: "Threes attempted (3PA)", kind: "count" },
  { id: "ft", label: "Free throws made (FT)", kind: "count" },
  { id: "fta", label: "Free throws attempted (FTA)", kind: "count" },
  { id: "fg_pct", label: "Field goal %", kind: "pct01" },
  { id: "fg3_pct", label: "Three-point %", kind: "pct01" },
  { id: "ft_pct", label: "Free throw %", kind: "pct01" },
  { id: "ts_pct", label: "True shooting % (TS%)", kind: "pct01" },
  { id: "efg_pct", label: "Effective FG% (eFG%)", kind: "pct01" },
  { id: "usg_pct", label: "Usage rate (USG%)", kind: "pct100" },
  { id: "ortg", label: "Offensive rating (ORtg)", kind: "rating" },
  { id: "drtg", label: "Defensive rating (DRtg)", kind: "rating" },
  { id: "bpm", label: "Box plus/minus (BPM)", kind: "rating" },
];

export function formatMetricValue(value, kind) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const num = Number(value);
  if (kind === "pct01") return `${(num <= 1 ? num * 100 : num).toFixed(1)}%`;
  if (kind === "pct100") return `${num.toFixed(1)}%`;
  if (kind === "rating") return num.toFixed(1);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

export function metricKind(id) {
  return TEAM_CHART_METRICS.find((item) => item.id === id)?.kind || "count";
}

export function shortGameDate(value) {
  const text = String(value || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${Number(match[2])}/${Number(match[3])}`;
  return text.slice(5) || text || "Game";
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

export function buildChartPoints(series, metricId, mode = "per_game") {
  const rows = [...(series || [])].sort((a, b) =>
    String(a.game_date || "").localeCompare(String(b.game_date || "")),
  );
  const kind = metricKind(metricId);
  let count = 0;
  let attempts = 0;
  let weight = 0;
  let weighted = 0;

  return rows.map((row) => {
    const label = shortGameDate(row.game_date);
    const opponent = row.opponent || "Opponent";
    let value = Number(row[metricId] ?? 0);

    if (mode === "season") {
      if (metricId === "fg_pct") {
        count += Number(row.fg || 0);
        attempts += Number(row.fga || 0);
        value = ratio(count, attempts);
      } else if (metricId === "fg3_pct") {
        count += Number(row.fg3 || 0);
        attempts += Number(row.fg3a || 0);
        value = ratio(count, attempts);
      } else if (metricId === "ft_pct") {
        count += Number(row.ft || 0);
        attempts += Number(row.fta || 0);
        value = ratio(count, attempts);
      } else if (kind === "count") {
        count += Number(row[metricId] || 0);
        value = count;
      } else {
        const gameWeight = Number(row.mp_mins) || 1;
        weight += gameWeight;
        weighted += Number(row[metricId] || 0) * gameWeight;
        value = weight ? weighted / weight : 0;
      }
    }

    return {
      ...row,
      label,
      opponent,
      value,
    };
  });
}

export function windowGameLog(games, windowId) {
  const chronological = [...(games || [])].sort((a, b) =>
    String(a.game_date || "").localeCompare(String(b.game_date || "")),
  );
  if (windowId === "last5") return chronological.slice(-5);
  if (windowId === "last10") return chronological.slice(-10);
  return chronological;
}
