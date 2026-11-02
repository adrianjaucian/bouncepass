import {
  computeTeamTotals,
  filterPlayerRows,
  formatMp,
  withTeamRole,
} from "../lib/gameResultsUtils";
import { COLORS } from "../lib/theme";
import { getPlayerNameFromRow } from "../lib/playerLinks";
import PlayerLink from "./PlayerLink";

const REGULAR_COLUMNS = [
  { key: "MP", label: "MP" },
  { key: "FG", label: "FG" },
  { key: "FGA", label: "FGA" },
  { key: "FG%", label: "FG%" },
  { key: "3P", label: "3P" },
  { key: "3PA", label: "3PA" },
  { key: "3P%", label: "3P%" },
  { key: "FT", label: "FT" },
  { key: "FTA", label: "FTA" },
  { key: "FT%", label: "FT%" },
  { key: "ORB", label: "ORB" },
  { key: "DRB", label: "DRB" },
  { key: "TRB", label: "TRB" },
  { key: "AST", label: "AST" },
  { key: "STL", label: "STL" },
  { key: "BLK", label: "BLK" },
  { key: "TOV", label: "TOV" },
  { key: "PTS", label: "PTS" },
];

const ADVANCED_COLUMNS = [
  { key: "TS%", label: "TS%" },
  { key: "eFG%", label: "eFG%" },
  { key: "3PAr", label: "3PAr" },
  { key: "FTr", label: "FTr" },
  { key: "ORB%", label: "ORB%" },
  { key: "DRB%", label: "DRB%" },
  { key: "TRB%", label: "TRB%" },
  { key: "AST%", label: "AST%" },
  { key: "STL%", label: "STL%" },
  { key: "BLK%", label: "BLK%" },
  { key: "TOV%", label: "TOV%" },
  { key: "USG%", label: "USG%" },
  { key: "ORtg", label: "ORtg" },
  { key: "DRtg", label: "DRtg" },
  { key: "BPM", label: "BPM" },
];

const STICKY_NAME_COLUMN = {
  minWidth: "140px",
  maxWidth: "200px",
  position: "sticky",
  left: 0,
  boxShadow: "2px 0 4px rgba(27, 40, 56, 0.08)",
};

function formatCell(player, key) {
  if (key === "MP") return formatMp(player.MP || player.MP_mins || player.mp || "0:00");
  if (["FG%", "3P%", "FT%", "TS%", "eFG%", "3PAr", "FTr"].includes(key)) {
    return `${((player[key] || 0) * 100).toFixed(1)}%`;
  }
  if (["ORB%", "DRB%", "TRB%", "AST%", "STL%", "BLK%", "TOV%", "USG%"].includes(key)) {
    return `${(player[key] || 0).toFixed(1)}%`;
  }
  if (["ORtg", "DRtg", "BPM"].includes(key)) {
    return Number(player[key] || 0).toFixed(1);
  }
  return player[key] || 0;
}

function ResultsTable({ rows }) {
  return (
    <div style={{ overflowX: "auto", maxWidth: "100%", marginBottom: "24px" }}>
      <table
        style={{
          borderCollapse: "separate",
          borderSpacing: 0,
          width: "100%",
          fontSize: "12px",
          border: `1px solid ${COLORS.greyBorder}`,
          borderRadius: "5px",
          minWidth: "1400px",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                ...STICKY_NAME_COLUMN,
                zIndex: 3,
                padding: "8px 4px",
                textAlign: "left",
                fontWeight: "bold",
                backgroundColor: COLORS.greyHeader,
                color: "#fff",
              }}
            >
              Player
            </th>
            {REGULAR_COLUMNS.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "8px 4px",
                  textAlign: "center",
                  fontWeight: "bold",
                  backgroundColor: COLORS.greyHeader,
                  color: "#fff",
                }}
              >
                {col.label}
              </th>
            ))}
            {ADVANCED_COLUMNS.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "8px 4px",
                  textAlign: "center",
                  fontWeight: "bold",
                  backgroundColor: COLORS.gold,
                  color: COLORS.onGold,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((player, i) => {
            const playerName = getPlayerNameFromRow(player, i);
            const regularBg = i % 2 === 0 ? COLORS.greyRow : COLORS.greyAlt;
            const advancedBg = i % 2 === 0 ? COLORS.goldSoft : COLORS.goldMuted;
            const advancedFg = i % 2 === 0 ? COLORS.onGoldSoft : COLORS.onGoldMuted;
            return (
              <tr key={i}>
                <td
                  style={{
                    ...STICKY_NAME_COLUMN,
                    zIndex: 1,
                    padding: "8px 4px",
                    fontWeight: 500,
                    color: COLORS.text,
                    backgroundColor: regularBg,
                  }}
                >
                  <PlayerLink name={playerName} />
                </td>
                {REGULAR_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "8px 4px",
                      textAlign: "center",
                      color: COLORS.text,
                      backgroundColor: regularBg,
                      fontWeight: col.key === "PTS" ? 700 : 400,
                    }}
                  >
                    {formatCell(player, col.key)}
                  </td>
                ))}
                {ADVANCED_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "8px 4px",
                      textAlign: "center",
                      color: advancedFg,
                      backgroundColor: advancedBg,
                      fontWeight: 600,
                    }}
                  >
                    {formatCell(player, col.key)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamSummary({ totals, title }) {
  const t = totals || {
    PTS: 0, FG: 0, FGA: 0, "3P": 0, "3PA": 0, FT: 0, FTA: 0,
    ORB: 0, DRB: 0, TRB: 0, AST: 0, STL: 0, BLK: 0, TOV: 0,
    "FG%": 0, "3P%": 0, "FT%": 0,
  };

  const columns = [
    { key: "PTS", value: t.PTS },
    { key: "FG", value: t.FG },
    { key: "FGA", value: t.FGA },
    { key: "FG%", value: `${(t["FG%"] * 100).toFixed(1)}%` },
    { key: "3P", value: t["3P"] },
    { key: "3PA", value: t["3PA"] },
    { key: "3P%", value: `${(t["3P%"] * 100).toFixed(1)}%` },
    { key: "FT", value: t.FT },
    { key: "FTA", value: t.FTA },
    { key: "FT%", value: `${(t["FT%"] * 100).toFixed(1)}%` },
    { key: "ORB", value: t.ORB },
    { key: "DRB", value: t.DRB },
    { key: "TRB", value: t.TRB },
    { key: "AST", value: t.AST },
    { key: "STL", value: t.STL },
    { key: "BLK", value: t.BLK },
    { key: "TOV", value: t.TOV },
  ];

  const cellStyle = {
    padding: "8px 4px",
    textAlign: "center",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ marginTop: "12px", marginBottom: "20px" }}>
      <h4 style={{ margin: "8px 0", color: COLORS.text }}>{title} — Team Totals</h4>
      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: 0,
            width: "100%",
            minWidth: "720px",
            fontSize: "12px",
            border: `1px solid ${COLORS.greyBorder}`,
            borderRadius: "5px",
            color: COLORS.text,
          }}
        >
          <thead>
            <tr style={{ backgroundColor: COLORS.greyHeader, color: "#fff" }}>
              {columns.map((col) => (
                <th key={col.key} style={{ ...cellStyle, fontWeight: "bold" }}>
                  {col.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: COLORS.greyRow }}>
              {columns.map((col) => (
                <td key={col.key} style={cellStyle}>
                  {col.value}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function GameResultsView({
  data,
  homeLabel = "Home",
  awayLabel = "Away",
  showTeamRoles = true,
  competitionLabel = "",
}) {
  if (!data) return null;

  const homeTitle = showTeamRoles ? withTeamRole(homeLabel, "Home") : homeLabel;
  const awayTitle = showTeamRoles ? withTeamRole(awayLabel, "Away") : awayLabel;

  return (
    <div>
      {competitionLabel && (
        <p
          style={{
            margin: "0 0 16px 0",
            color: COLORS.muted,
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          {competitionLabel}
        </p>
      )}
      {data.home && (
        <div>
          <TeamSummary totals={computeTeamTotals(data.home)} title={homeTitle} />
          <ResultsTable rows={filterPlayerRows(data.home)} />
        </div>
      )}
      {data.away && (
        <div>
          <TeamSummary totals={computeTeamTotals(data.away)} title={awayTitle} />
          <ResultsTable rows={filterPlayerRows(data.away)} />
        </div>
      )}
    </div>
  );
}
