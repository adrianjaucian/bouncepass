"use client";

import Link from "next/link";
import TrendCharts from "./TrendCharts";

function formatPercent(value) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatRating(value) {
  return value == null ? "—" : value.toFixed(1);
}

function formatRank(rank) {
  if (!rank || !rank.of) return "—";
  return `#${rank.rank} of ${rank.of}`;
}

function StatCard({ label, value, rank, subtitle }) {
  return (
    <div
      style={{
        flex: "1 1 160px",
        backgroundColor: "#f4f8fb",
        border: "1px solid #d6e4f0",
        borderRadius: "10px",
        padding: "16px",
        textAlign: "center",
      }}
    >
      <div style={{ color: "#56616b", fontSize: "13px", marginBottom: "6px" }}>{label}</div>
      <div style={{ color: "#2c3e50", fontSize: "1.6em", fontWeight: "bold", lineHeight: 1.1 }}>{value}</div>
      {rank && (
        <div style={{ color: "#7f8c8d", fontSize: "12px", marginTop: "6px", fontWeight: 600 }}>
          League {formatRank(rank)}
        </div>
      )}
      {subtitle && <div style={{ color: "#95a5a6", fontSize: "12px", marginTop: "4px" }}>{subtitle}</div>}
    </div>
  );
}

const tableHeaderStyle = {
  padding: "10px",
  color: "#000",
  fontWeight: "bold",
};

export default function PlayerDashboardDetail({ dashboard }) {
  const stats = dashboard?.stats;
  if (!dashboard || !stats) return null;

  const ranks = stats.ranks || {};

  return (
    <>
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>{dashboard.player_name}</h2>
        <p style={{ margin: 0, color: "#56616b" }}>
          {dashboard.games_played} game{dashboard.games_played === 1 ? "" : "s"} · {stats.mp_mins.toFixed(1)} min ·{" "}
          {dashboard.teams.join(", ") || "—"}
        </p>
        <p style={{ margin: "8px 0 0 0", color: "#7f8c8d", fontSize: "13px" }}>
          Ranked against {dashboard.league_players} players from {dashboard.league_games} saved game
          {dashboard.league_games === 1 ? "" : "s"}
        </p>
      </div>

      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#2c3e50" }}>Season Totals</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <StatCard label="PTS" value={String(stats.pts)} rank={ranks.pts} />
          <StatCard label="REB" value={String(stats.trb)} rank={ranks.trb} />
          <StatCard label="AST" value={String(stats.ast)} rank={ranks.ast} />
          <StatCard label="STL" value={String(stats.stl)} rank={ranks.stl} />
          <StatCard label="BLK" value={String(stats.blk)} rank={ranks.blk} />
          <StatCard label="MP" value={stats.mp_mins.toFixed(1)} rank={ranks.mp_mins} />
        </div>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#2c3e50" }}>Per Game Averages</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <StatCard label="PTS/G" value={formatRating(stats.pts_pg)} rank={ranks.pts_pg} />
          <StatCard label="REB/G" value={formatRating(stats.trb_pg)} rank={ranks.trb_pg} />
          <StatCard label="AST/G" value={formatRating(stats.ast_pg)} rank={ranks.ast_pg} />
          <StatCard label="STL/G" value={formatRating(stats.stl_pg)} rank={ranks.stl_pg} />
          <StatCard label="BLK/G" value={formatRating(stats.blk_pg)} rank={ranks.blk_pg} />
          <StatCard label="TOV/G" value={formatRating(stats.tov_pg)} />
        </div>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#2c3e50" }}>Shooting</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <StatCard label="TS%" value={formatPercent(stats.ts_pct)} rank={ranks.ts_pct} />
          <StatCard label="eFG%" value={formatPercent(stats.efg_pct)} rank={ranks.efg_pct} />
          <StatCard label="3P%" value={formatPercent(stats.fg3_pct)} rank={ranks.fg3_pct} />
          <StatCard label="3PAr" value={formatPercent(stats.fg3par)} rank={ranks.fg3par} />
          <StatCard label="FT%" value={formatPercent(stats.ft_pct)} />
          <StatCard
            label="FG"
            value={`${stats.fg}/${stats.fga}`}
            subtitle={`3P ${stats.fg3}-${stats.fg3a} · FT ${stats.ft}-${stats.fta}`}
          />
        </div>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#2c3e50" }}>Advanced Metrics</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <StatCard label="ORtg" value={formatRating(stats.ortg)} rank={ranks.ortg} />
          <StatCard label="DRtg" value={formatRating(stats.drtg)} rank={ranks.drtg} />
          <StatCard label="USG%" value={stats.usg_pct == null ? "—" : `${stats.usg_pct.toFixed(1)}%`} rank={ranks.usg_pct} />
          <StatCard label="BPM" value={formatRating(stats.bpm)} rank={ranks.bpm} />
          <StatCard label="AST%" value={stats.ast_pct == null ? "—" : `${stats.ast_pct.toFixed(1)}%`} />
          <StatCard label="TRB%" value={stats.trb_pct == null ? "—" : `${stats.trb_pct.toFixed(1)}%`} />
          <StatCard label="STL%" value={stats.stl_pct == null ? "—" : `${stats.stl_pct.toFixed(1)}%`} />
          <StatCard label="BLK%" value={stats.blk_pct == null ? "—" : `${stats.blk_pct.toFixed(1)}%`} />
          <StatCard label="TOV%" value={stats.tov_pct == null ? "—" : `${stats.tov_pct.toFixed(1)}%`} />
          <StatCard label="ORB%" value={stats.orb_pct == null ? "—" : `${stats.orb_pct.toFixed(1)}%`} />
          <StatCard label="DRB%" value={stats.drb_pct == null ? "—" : `${stats.drb_pct.toFixed(1)}%`} />
        </div>
      </section>

      <TrendCharts
        trendCharts={dashboard.trend_charts}
        title="Player Performance Trends"
        description="Game-by-game lines for scoring, rebounding, playmaking, efficiency, usage, BPM, shot profile, and rebound/block rates. Hover a point for game details. Oldest game left, most recent right."
      />

      <section>
        <h3 style={{ margin: "0 0 16px 0", color: "#2c3e50" }}>Game Log</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: "1px solid #e1e8ed" }}>
            <thead>
              <tr style={{ backgroundColor: "#f1f6f9" }}>
                <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Date</th>
                <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Team</th>
                <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Opponent</th>
                <th style={tableHeaderStyle}>MP</th>
                <th style={tableHeaderStyle}>PTS</th>
                <th style={tableHeaderStyle}>REB</th>
                <th style={tableHeaderStyle}>AST</th>
                <th style={tableHeaderStyle}>TS%</th>
                <th style={tableHeaderStyle}>USG%</th>
                <th style={tableHeaderStyle}>BPM</th>
                <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Box Score</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.games.map((game, index) => (
                <tr key={`${game.game_id}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ padding: "10px", color: "#000" }}>{game.game_date}</td>
                  <td style={{ padding: "10px", color: "#000" }}>{game.team_label || game.team_name}</td>
                  <td style={{ padding: "10px", color: "#000" }}>{game.opponent || "—"}</td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{game.mp_mins.toFixed(1)}</td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000", fontWeight: "bold" }}>{game.pts}</td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{game.trb}</td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{game.ast}</td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{formatPercent(game.ts_pct)}</td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>
                    {game.usg_pct == null ? "—" : `${game.usg_pct.toFixed(1)}%`}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{formatRating(game.bpm)}</td>
                  <td style={{ padding: "10px" }}>
                    <Link href={`/saved-games/${game.game_id}`} style={{ color: "#3498db" }}>
                      View game
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
