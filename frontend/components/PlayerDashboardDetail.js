"use client";

import Link from "next/link";
import { COLORS } from "../lib/theme";

function formatPercent(value) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatRating(value) {
  return value == null ? "—" : Number(value).toFixed(1);
}

function StatCard({ label, value, subtitle }) {
  return (
    <div
      style={{
        flex: "1 1 160px",
        backgroundColor: COLORS.goldSoft,
        border: `1px solid ${COLORS.gold}`,
        borderRadius: "10px",
        padding: "16px",
        textAlign: "center",
      }}
    >
      <div style={{ color: COLORS.goldInk, fontSize: "13px", marginBottom: "6px" }}>{label}</div>
      <div style={{ color: COLORS.navy, fontSize: "1.6em", fontWeight: "bold", lineHeight: 1.1 }}>{value}</div>
      {subtitle && <div style={{ color: COLORS.muted, fontSize: "12px", marginTop: "4px" }}>{subtitle}</div>}
    </div>
  );
}

const tableHeaderStyle = {
  padding: "10px",
  color: COLORS.navy,
  fontWeight: "bold",
};

export default function PlayerDashboardDetail({ dashboard }) {
  const stats = dashboard?.stats;
  if (!dashboard || !stats) return null;

  return (
    <>
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ margin: "0 0 8px 0", color: COLORS.navy, fontSize: "2.2em" }}>{dashboard.player_name}</h2>
        <p style={{ margin: 0, color: COLORS.muted }}>
          {dashboard.team_name} · {dashboard.games_played} game{dashboard.games_played === 1 ? "" : "s"}
          {stats.mp_mins != null ? ` · ${Number(stats.mp_mins).toFixed(1)} min` : ""}
        </p>
      </div>

      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: COLORS.navy }}>Season Totals</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <StatCard label="PTS" value={String(stats.pts ?? 0)} />
          <StatCard label="REB" value={String(stats.trb ?? 0)} />
          <StatCard label="AST" value={String(stats.ast ?? 0)} />
          <StatCard label="STL" value={String(stats.stl ?? 0)} />
          <StatCard label="BLK" value={String(stats.blk ?? 0)} />
          <StatCard label="MP" value={stats.mp_mins == null ? "—" : Number(stats.mp_mins).toFixed(1)} />
        </div>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: COLORS.navy }}>Per Game</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <StatCard label="PTS/G" value={formatRating(stats.pts_pg)} />
          <StatCard label="REB/G" value={formatRating(stats.trb_pg)} />
          <StatCard label="AST/G" value={formatRating(stats.ast_pg)} />
        </div>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: COLORS.navy }}>Advanced Metrics</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <StatCard label="TS%" value={formatPercent(stats.ts_pct)} />
          <StatCard label="eFG%" value={formatPercent(stats.efg_pct)} />
          <StatCard label="USG%" value={stats.usg_pct == null ? "—" : `${Number(stats.usg_pct).toFixed(1)}%`} />
          <StatCard label="ORtg" value={formatRating(stats.ortg)} />
          <StatCard label="DRtg" value={formatRating(stats.drtg)} />
          <StatCard label="BPM" value={formatRating(stats.bpm)} />
        </div>
      </section>

      <section>
        <h3 style={{ margin: "0 0 16px 0", color: COLORS.navy }}>Game Log</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: `1px solid ${COLORS.greyBorder}` }}>
            <thead>
              <tr style={{ backgroundColor: COLORS.goldSoft }}>
                <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Date</th>
                <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Opponent</th>
                <th style={tableHeaderStyle}>MP</th>
                <th style={tableHeaderStyle}>PTS</th>
                <th style={tableHeaderStyle}>REB</th>
                <th style={tableHeaderStyle}>AST</th>
                <th style={tableHeaderStyle}>TS%</th>
                <th style={tableHeaderStyle}>USG%</th>
                <th style={tableHeaderStyle}>ORtg</th>
                <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Box Score</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard.games || []).map((game, index) => (
                <tr key={`${game.game_id}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "#fff" : COLORS.greyRow }}>
                  <td style={{ padding: "10px" }}>{game.game_date}</td>
                  <td style={{ padding: "10px" }}>{game.opponent || "—"}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{Number(game.mp_mins || 0).toFixed(1)}</td>
                  <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>{game.pts}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{game.trb}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{game.ast}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{formatPercent(game.ts_pct)}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {game.usg_pct == null ? "—" : `${Number(game.usg_pct).toFixed(1)}%`}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{formatRating(game.ortg)}</td>
                  <td style={{ padding: "10px" }}>
                    <Link href={`/saved-games/${game.game_id}`} style={{ color: COLORS.navy }}>
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
