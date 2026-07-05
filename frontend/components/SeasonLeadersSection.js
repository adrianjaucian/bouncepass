"use client";

import Link from "next/link";
import { useState } from "react";
import PlayerLink from "./PlayerLink";

const tableHeaderStyle = {
  padding: "10px",
  color: "#000",
  fontWeight: "bold",
};

const LEADER_LIMIT = 5;

function perGameAverage(total, games) {
  if (!games) return "—";
  return (total / games).toFixed(1);
}

function perGameValue(total, games) {
  if (!games) return 0;
  return total / games;
}

function formatRatePercent(value) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatBpm(value) {
  return value == null ? "—" : value.toFixed(1);
}

function sortEfgLeaders(players, limit = LEADER_LIMIT) {
  return [...players]
    .filter((player) => player.efg_pct != null)
    .sort((a, b) => {
      const aValue = a.efg_pct ?? 0;
      const bValue = b.efg_pct ?? 0;
      if (bValue !== aValue) return bValue - aValue;
      return a.player.localeCompare(b.player);
    })
    .slice(0, limit);
}

function sortThreePointLeaders(players, sortBy, limit = LEADER_LIMIT) {
  return [...players]
    .filter((player) => player.fg3_pct != null)
    .sort((a, b) => {
      const aValue = sortBy === "total" ? a.fg3_pct ?? 0 : a.fg3_avg ?? 0;
      const bValue = sortBy === "total" ? b.fg3_pct ?? 0 : b.fg3_avg ?? 0;
      if (bValue !== aValue) return bValue - aValue;
      return a.player.localeCompare(b.player);
    })
    .slice(0, limit);
}

function sortBpmLeaders(players, limit = LEADER_LIMIT) {
  return [...players]
    .filter((player) => player.bpm != null)
    .sort((a, b) => {
      const aValue = a.bpm ?? 0;
      const bValue = b.bpm ?? 0;
      if (bValue !== aValue) return bValue - aValue;
      return a.player.localeCompare(b.player);
    })
    .slice(0, limit);
}

function sortStatLeaders(players, stat, sortBy, limit = LEADER_LIMIT) {
  return [...players]
    .sort((a, b) => {
      const aValue = sortBy === "total" ? a[stat] : perGameValue(a[stat], a.games);
      const bValue = sortBy === "total" ? b[stat] : perGameValue(b[stat], b.games);
      if (bValue !== aValue) return bValue - aValue;
      return a.player.localeCompare(b.player);
    })
    .slice(0, limit);
}

function sortUsageLeaders(players, limit = LEADER_LIMIT) {
  return [...players]
    .filter((player) => player.usg_pct != null)
    .sort((a, b) => {
      const aValue = a.usg_pct ?? 0;
      const bValue = b.usg_pct ?? 0;
      if (bValue !== aValue) return bValue - aValue;
      return a.player.localeCompare(b.player);
    })
    .slice(0, limit);
}

function leaderSortToggleStyle(active) {
  return {
    padding: "6px 12px",
    fontSize: "13px",
    border: "1px solid #d6e4f0",
    borderRadius: "6px",
    cursor: "pointer",
    backgroundColor: active ? "#3498db" : "#fff",
    color: active ? "#fff" : "#2c3e50",
    fontWeight: active ? 600 : 400,
  };
}

function PlayerCell({ name, teams, showTeams }) {
  return (
    <td style={{ padding: "10px", color: "#000" }}>
      <PlayerLink name={name} />
      {showTeams && teams?.length > 0 && (
        <div style={{ fontSize: "11px", color: "#7f8c8d", marginTop: "4px" }}>{teams.join(", ")}</div>
      )}
    </td>
  );
}

function LeaderTable({ title, players, stat, statLabel, sortBy, showTeams, formatTotal, formatAvg }) {
  const rows = sortStatLeaders(players, stat, sortBy);

  return (
    <div style={{ flex: "1 1 280px", minWidth: "260px" }}>
      <h3 style={{ margin: "0 0 12px 0", color: "#2c3e50", fontSize: "1.1em" }}>{title}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: "1px solid #e1e8ed" }}>
        <thead>
          <tr style={{ backgroundColor: "#f1f6f9" }}>
            <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Player</th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>GP</th>
            <th
              style={{
                ...tableHeaderStyle,
                textAlign: "center",
                fontWeight: sortBy === "total" ? "bold" : tableHeaderStyle.fontWeight,
              }}
            >
              {statLabel}
            </th>
            <th
              style={{
                ...tableHeaderStyle,
                textAlign: "center",
                fontWeight: sortBy === "avg" ? "bold" : tableHeaderStyle.fontWeight,
              }}
            >
              AVG
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.player} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc" }}>
              <PlayerCell name={row.player} teams={row.teams} showTeams={showTeams} />
              <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{row.games}</td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "center",
                  fontWeight: sortBy === "total" ? "bold" : "normal",
                  color: "#000",
                }}
              >
                {formatTotal ? formatTotal(row) : row[stat]}
              </td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "center",
                  fontWeight: sortBy === "avg" ? "bold" : "normal",
                  color: "#000",
                }}
              >
                {formatAvg ? formatAvg(row) : perGameAverage(row[stat], row.games)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsageLeaderTable({ title, players, showTeams }) {
  const formatUsg = (value) => (value == null ? "—" : `${value.toFixed(1)}%`);
  const rows = sortUsageLeaders(players);

  return (
    <div style={{ flex: "1 1 280px", minWidth: "260px" }}>
      <h3 style={{ margin: "0 0 12px 0", color: "#2c3e50", fontSize: "1.1em" }}>{title}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: "1px solid #e1e8ed" }}>
        <thead>
          <tr style={{ backgroundColor: "#f1f6f9" }}>
            <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Player</th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>GP</th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>USG%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.player} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc" }}>
              <PlayerCell name={row.player} teams={row.teams} showTeams={showTeams} />
              <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{row.games}</td>
              <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold", color: "#000" }}>
                {formatUsg(row.usg_pct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EfgLeaderTable({ title, players, showTeams }) {
  const rows = sortEfgLeaders(players);

  return (
    <div style={{ flex: "1 1 280px", minWidth: "260px" }}>
      <h3 style={{ margin: "0 0 12px 0", color: "#2c3e50", fontSize: "1.1em" }}>{title}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: "1px solid #e1e8ed" }}>
        <thead>
          <tr style={{ backgroundColor: "#f1f6f9" }}>
            <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Player</th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>GP</th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>eFG%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.player} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc" }}>
              <PlayerCell name={row.player} teams={row.teams} showTeams={showTeams} />
              <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{row.games}</td>
              <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold", color: "#000" }}>
                {formatRatePercent(row.efg_pct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ThreePointLeaderTable({ title, players, sortBy, showTeams }) {
  const rows = sortThreePointLeaders(players, sortBy);

  return (
    <div style={{ flex: "1 1 280px", minWidth: "260px" }}>
      <h3 style={{ margin: "0 0 12px 0", color: "#2c3e50", fontSize: "1.1em" }}>{title}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: "1px solid #e1e8ed" }}>
        <thead>
          <tr style={{ backgroundColor: "#f1f6f9" }}>
            <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Player</th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>GP</th>
            <th
              style={{
                ...tableHeaderStyle,
                textAlign: "center",
                fontWeight: sortBy === "total" ? "bold" : tableHeaderStyle.fontWeight,
              }}
            >
              3P%
            </th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>3PAr</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.player} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc" }}>
              <PlayerCell name={row.player} teams={row.teams} showTeams={showTeams} />
              <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{row.games}</td>
              <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold", color: "#000" }}>
                {formatRatePercent(row.fg3_pct)}
              </td>
              <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>
                {formatRatePercent(row.fg3par)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BpmLeaderTable({ title, players, showTeams }) {
  const rows = sortBpmLeaders(players);

  return (
    <div style={{ flex: "1 1 280px", minWidth: "260px" }}>
      <h3 style={{ margin: "0 0 12px 0", color: "#2c3e50", fontSize: "1.1em" }}>{title}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: "1px solid #e1e8ed" }}>
        <thead>
          <tr style={{ backgroundColor: "#f1f6f9" }}>
            <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Player</th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>GP</th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>BPM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.player} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc" }}>
              <PlayerCell name={row.player} teams={row.teams} showTeams={showTeams} />
              <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{row.games}</td>
              <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold", color: "#000" }}>
                {formatBpm(row.bpm)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SeasonLeadersSection({
  players,
  title = "Season Leaders",
  description,
  showTeams = false,
  definitionsHref = "/metric-definitions#season-leaders",
}) {
  const [leaderSortBy, setLeaderSortBy] = useState("total");

  if (!players?.length) {
    return null;
  }

  return (
    <section style={{ marginBottom: "32px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "8px",
        }}
      >
        <h3 style={{ margin: 0, color: "#2c3e50" }}>{title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#7f8c8d", fontSize: "14px" }}>Sort counting stats by:</span>
          <button
            type="button"
            onClick={() => setLeaderSortBy("total")}
            style={leaderSortToggleStyle(leaderSortBy === "total")}
          >
            Total
          </button>
          <button
            type="button"
            onClick={() => setLeaderSortBy("avg")}
            style={leaderSortToggleStyle(leaderSortBy === "avg")}
          >
            Per game
          </button>
        </div>
      </div>
      {description && (
        <p style={{ margin: "0 0 16px 0", color: "#7f8c8d", fontSize: "14px" }}>
          {definitionsHref && (
            <>
              <Link href={definitionsHref} style={{ color: "#3498db" }}>
                See metric definitions
              </Link>{" "}
            </>
          )}
          {description}
        </p>
      )}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <LeaderTable title="Top Scorers" players={players} stat="pts" statLabel="PTS" sortBy={leaderSortBy} showTeams={showTeams} />
        <LeaderTable title="Top Rebounders" players={players} stat="trb" statLabel="REB" sortBy={leaderSortBy} showTeams={showTeams} />
        <LeaderTable title="Top Assists" players={players} stat="ast" statLabel="AST" sortBy={leaderSortBy} showTeams={showTeams} />
        <LeaderTable title="Top Steals" players={players} stat="stl" statLabel="STL" sortBy={leaderSortBy} showTeams={showTeams} />
        <LeaderTable title="Top Blocks" players={players} stat="blk" statLabel="BLK" sortBy={leaderSortBy} showTeams={showTeams} />
        <UsageLeaderTable title="Usage Rate" players={players} showTeams={showTeams} />
        <EfgLeaderTable title="Top eFG%" players={players} showTeams={showTeams} />
        <ThreePointLeaderTable title="Top 3P%" players={players} sortBy={leaderSortBy} showTeams={showTeams} />
        <BpmLeaderTable title="Top BPM" players={players} showTeams={showTeams} />
      </div>
    </section>
  );
}
