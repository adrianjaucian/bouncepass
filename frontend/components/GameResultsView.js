import {
  computeTeamTotals,
  filterPlayerRows,
  formatMp,
  withTeamRole,
} from "../lib/gameResultsUtils";
import { getPlayerNameFromRow } from "../lib/playerLinks";
import PlayerLink from "./PlayerLink";

const STICKY_NAME_COLUMN = {
  minWidth: "140px",
  maxWidth: "200px",
  position: "sticky",
  left: 0,
  boxShadow: "2px 0 4px rgba(0, 0, 0, 0.08)",
};

function ResultsTable({ rows }) {
  return (
    <div style={{ overflowX: "auto", maxWidth: "100%", marginBottom: "24px" }}>
      <table
        style={{
          borderCollapse: "separate",
          borderSpacing: 0,
          width: "100%",
          fontSize: "12px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          minWidth: "1400px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#3498db", color: "white" }}>
            <th
              style={{
                ...STICKY_NAME_COLUMN,
                zIndex: 3,
                padding: "8px 4px",
                textAlign: "left",
                fontWeight: "bold",
                backgroundColor: "#3498db",
              }}
            >
              Player
            </th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>MP</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FG</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FGA</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FG%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>3P</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>3PA</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>3P%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FT</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FTA</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FT%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>ORB</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>DRB</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>TRB</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>AST</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>STL</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>BLK</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>TOV</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>PTS</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>TS%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>eFG%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>3PAr</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>FTr</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>ORB%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>DRB%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>TRB%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>AST%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>STL%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>BLK%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>TOV%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>USG%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>ORtg</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>DRtg</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>BPM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((player, i) => {
            const playerName = getPlayerNameFromRow(player, i);
            const rowBackground = i % 2 === 0 ? "#fff" : "#f8f9fa";
            return (
            <tr key={i} style={{ backgroundColor: rowBackground, borderBottom: "1px solid #eee" }}>
              <td
                style={{
                  ...STICKY_NAME_COLUMN,
                  zIndex: 1,
                  padding: "8px 4px",
                  fontWeight: "500",
                  color: "#000",
                  backgroundColor: rowBackground,
                }}
              >
                <PlayerLink name={playerName} />
              </td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{formatMp(player.MP || player.MP_mins || player.mp || '0:00')}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.FG || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.FGA || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{((player['FG%'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player['3P'] || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player['3PA'] || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{((player['3P%'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.FT || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.FTA || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{((player['FT%'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.ORB || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.DRB || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.TRB || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.AST || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.STL || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.BLK || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.TOV || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '600', color: '#000' }}>{player.PTS || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{((player['TS%'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{((player['eFG%'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{((player['3PAr'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{((player['FTr'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['ORB%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['DRB%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['TRB%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['AST%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['STL%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['BLK%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['TOV%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{((player['USG%'] || 0) * 1).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{Number(player['ORtg'] || 0).toFixed(1)}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{Number(player['DRtg'] || 0).toFixed(1)}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{Number(player['BPM'] || 0).toFixed(1)}</td>
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
      <h4 style={{ margin: "8px 0", color: "#000" }}>{title} — Team Totals</h4>
      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: 0,
            width: "100%",
            minWidth: "720px",
            fontSize: "12px",
            border: "1px solid #ddd",
            borderRadius: "5px",
            color: "#000",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f1f6f9", color: "#000" }}>
              {columns.map((col) => (
                <th key={col.key} style={{ ...cellStyle, fontWeight: "bold" }}>
                  {col.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: "#fff" }}>
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
            color: "#56616b",
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
