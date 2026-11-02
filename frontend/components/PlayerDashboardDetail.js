"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { COLORS } from "../lib/theme";
import { formatMetricValue, shortGameDate, windowGameLog } from "../lib/metricOptions";
import MetricLineChart from "./MetricLineChart";

function formatPercent(value) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatRating(value) {
  return value == null ? "—" : Number(value).toFixed(1);
}

const PLAYER_WINDOWS = [
  { id: "last5", label: "Last 5 games" },
  { id: "last10", label: "Last 10 games" },
  { id: "season", label: "Season" },
];

function PlayerStatCard({ label, value, subtitle, kind, gameKey, games }) {
  const [open, setOpen] = useState(false);
  const [windowId, setWindowId] = useState("last5");
  const points = useMemo(() => {
    return windowGameLog(games, windowId).map((game) => ({
      label: shortGameDate(game.game_date),
      opponent: game.opponent,
      value: Number(game[gameKey] ?? 0),
    }));
  }, [games, gameKey, windowId]);

  return (
    <div className="stat-card-wrap" data-expanded={open ? "true" : "false"}>
      <button
        type="button"
        className="stat-card-button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <div style={{ color: COLORS.onGoldSoft, fontSize: "13px", marginBottom: "6px" }}>{label}</div>
        <div style={{ color: COLORS.onGoldSoft, fontSize: "1.6em", fontWeight: "bold", lineHeight: 1.1 }}>{value}</div>
        {subtitle && <div style={{ color: COLORS.muted, fontSize: "12px", marginTop: "4px" }}>{subtitle}</div>}
        <div style={{ color: COLORS.muted, fontSize: "11px", marginTop: "8px", fontWeight: 700 }}>
          {open ? "Hide trend" : "Show trend"}
        </div>
      </button>
      {open && (
        <div className="stat-card-chart">
          <div className="window-tabs" role="group" aria-label={`${label} trend window`}>
            {PLAYER_WINDOWS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="window-tab"
                aria-pressed={windowId === option.id}
                onClick={() => setWindowId(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <MetricLineChart points={points} kind={kind} height={180} />
          {points.length > 0 && (
            <p style={{ margin: "0 0 4px 0", color: COLORS.muted, fontSize: "12px" }}>
              Latest: {formatMetricValue(points[points.length - 1].value, kind)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const tableHeaderStyle = {
  padding: "10px",
  color: COLORS.onGoldSoft,
  fontWeight: "bold",
};

export default function PlayerDashboardDetail({ dashboard }) {
  const stats = dashboard?.stats;
  const games = dashboard?.games || [];
  if (!dashboard || !stats) return null;

  return (
    <>
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ margin: "0 0 8px 0", color: COLORS.text, fontSize: "2.2em" }}>{dashboard.player_name}</h2>
        <p style={{ margin: 0, color: COLORS.muted }}>
          {dashboard.team_name} · {dashboard.games_played} game{dashboard.games_played === 1 ? "" : "s"}
          {stats.mp_mins != null ? ` · ${Number(stats.mp_mins).toFixed(1)} min` : ""}
        </p>
      </div>

      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>Season Totals</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <PlayerStatCard label="PTS" value={String(stats.pts ?? 0)} kind="count" gameKey="pts" games={games} />
          <PlayerStatCard label="REB" value={String(stats.trb ?? 0)} kind="count" gameKey="trb" games={games} />
          <PlayerStatCard label="AST" value={String(stats.ast ?? 0)} kind="count" gameKey="ast" games={games} />
          <PlayerStatCard label="STL" value={String(stats.stl ?? 0)} kind="count" gameKey="stl" games={games} />
          <PlayerStatCard label="BLK" value={String(stats.blk ?? 0)} kind="count" gameKey="blk" games={games} />
          <PlayerStatCard
            label="MP"
            value={stats.mp_mins == null ? "—" : Number(stats.mp_mins).toFixed(1)}
            kind="count"
            gameKey="mp_mins"
            games={games}
          />
        </div>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>Per Game</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <PlayerStatCard label="PTS/G" value={formatRating(stats.pts_pg)} kind="count" gameKey="pts" games={games} />
          <PlayerStatCard label="REB/G" value={formatRating(stats.trb_pg)} kind="count" gameKey="trb" games={games} />
          <PlayerStatCard label="AST/G" value={formatRating(stats.ast_pg)} kind="count" gameKey="ast" games={games} />
        </div>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>Advanced Metrics</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <PlayerStatCard label="TS%" value={formatPercent(stats.ts_pct)} kind="pct01" gameKey="ts_pct" games={games} />
          <PlayerStatCard label="eFG%" value={formatPercent(stats.efg_pct)} kind="pct01" gameKey="efg_pct" games={games} />
          <PlayerStatCard
            label="USG%"
            value={stats.usg_pct == null ? "—" : `${Number(stats.usg_pct).toFixed(1)}%`}
            kind="pct100"
            gameKey="usg_pct"
            games={games}
          />
          <PlayerStatCard label="ORtg" value={formatRating(stats.ortg)} kind="rating" gameKey="ortg" games={games} />
          <PlayerStatCard label="DRtg" value={formatRating(stats.drtg)} kind="rating" gameKey="drtg" games={games} />
          <PlayerStatCard label="BPM" value={formatRating(stats.bpm)} kind="rating" gameKey="bpm" games={games} />
        </div>
      </section>

      <section>
        <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>Game Log</h3>
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
              {games.map((game, index) => (
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
                    <Link href={`/saved-games/${game.game_id}`} style={{ color: COLORS.text }}>
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
