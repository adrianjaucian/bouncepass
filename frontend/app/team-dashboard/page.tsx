"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TeamMetricChart from "../../components/TeamMetricChart";
import { useTeam } from "../../components/TeamProvider";
import api from "../../lib/api";
import { buildLocalTeamAnalytics, isUnavailableStatus } from "../../lib/workspaceStore";
import { COLORS, pageHeader, pageInner, pageMain, pageShell, subtitleStyle, titleStyle } from "../../lib/theme";

type DashboardPlayer = {
  player: string;
  games: number;
  pts: number;
  trb: number;
  ast: number;
  stl?: number;
  blk?: number;
  mp_mins?: number;
  pts_pg?: number | null;
  trb_pg?: number | null;
  ast_pg?: number | null;
  ts_pct?: number | null;
  efg_pct?: number | null;
  usg_pct?: number | null;
  ortg?: number | null;
  drtg?: number | null;
  bpm?: number | null;
};

type TeamDashboard = {
  team_id: number;
  team_name: string;
  games_played: number;
  record: { wins: number; losses: number };
  totals: { pts: number; opp_pts: number; trb: number; ast: number };
  players: DashboardPlayer[];
  games: {
    id: number;
    game_date: string;
    opponent?: string | null;
    team_score?: number | null;
    opponent_score?: number | null;
    team_side?: string | null;
  }[];
  metric_series?: Record<string, any>[];
};

function formatRating(value?: number | null) {
  return value == null ? "—" : value.toFixed(1);
}

function formatPercent(value?: number | null) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export default function TeamDashboardPage() {
  const { currentTeam, loading: teamLoading } = useTeam();
  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      if (!currentTeam) {
        setDashboard(null);
        setError("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/teams/${currentTeam.id}/dashboard`, { timeout: 8000 });
        const local = buildLocalTeamAnalytics(currentTeam.id);
        setDashboard({
          ...res.data,
          metric_series: res.data.metric_series?.length ? res.data.metric_series : local?.metric_series || [],
        });
      } catch (err: any) {
        const local = buildLocalTeamAnalytics(currentTeam.id);
        if (local && (isUnavailableStatus(err?.response?.status) || !err?.response || err?.response?.status === 404)) {
          setDashboard(local);
          return;
        }
        const message =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not load team analytics.";
        setError(typeof message === "string" ? message : JSON.stringify(message));
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [currentTeam]);

  return (
    <div style={pageShell}>
      <div style={pageInner}>
        <header style={pageHeader}>
          <h1 style={{ ...titleStyle, fontSize: "2.2em" }}>Team Analytics</h1>
          <p style={subtitleStyle}>
            {currentTeam
              ? `Metrics for ${currentTeam.name} only. Switch teams in the header to view another roster.`
              : "Create a team on Home to start tracking team analytics."}
          </p>
        </header>

        <main style={pageMain}>
          {(loading || teamLoading) && <p style={{ color: COLORS.muted }}>Loading team analytics...</p>}
          {!currentTeam && !teamLoading && (
            <p style={{ color: COLORS.muted }}>
              No team selected.{" "}
              <Link href="/" style={{ color: COLORS.text, fontWeight: 700 }}>
                Add a team
              </Link>{" "}
              first.
            </p>
          )}
          {error && (
            <div style={{ color: COLORS.danger, backgroundColor: COLORS.dangerBg, padding: "14px", borderRadius: "8px" }}>
              {error}
            </div>
          )}

          {dashboard && !loading && (
            <>
              <div style={{ marginBottom: "28px" }}>
                <h2 style={{ margin: "0 0 8px 0", color: COLORS.text, fontSize: "2em" }}>{dashboard.team_name}</h2>
                <p style={{ margin: 0, color: COLORS.muted }}>
                  {dashboard.games_played} saved game{dashboard.games_played === 1 ? "" : "s"} · Record{" "}
                  {dashboard.record.wins}-{dashboard.record.losses}
                </p>
              </div>

              <section style={{ marginBottom: "32px" }}>
                <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>Trend</h3>
                <TeamMetricChart series={dashboard.metric_series || []} />
              </section>

              <section style={{ marginBottom: "32px" }}>
                <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>Players</h3>
                {dashboard.players.length === 0 ? (
                  <p style={{ color: COLORS.muted }}>Save a box score to store this team&apos;s players.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: `1px solid ${COLORS.greyBorder}` }}>
                      <thead>
                        <tr style={{ backgroundColor: COLORS.goldSoft }}>
                          {["Player", "G", "PTS", "REB", "AST", "TS%", "USG%", "ORtg", "BPM"].map((label) => (
                            <th key={label} style={{ padding: "10px", color: COLORS.onGoldSoft, textAlign: label === "Player" ? "left" : "center" }}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.players.map((player, index) => (
                          <tr key={player.player} style={{ backgroundColor: index % 2 === 0 ? "#fff" : COLORS.greyRow }}>
                            <td style={{ padding: "10px" }}>
                              <Link
                                href={`/player-dashboard?player=${encodeURIComponent(player.player)}`}
                                style={{ color: COLORS.text, fontWeight: 600, textDecoration: "none" }}
                              >
                                {player.player}
                              </Link>
                            </td>
                            <td style={{ padding: "10px", textAlign: "center" }}>{player.games}</td>
                            <td style={{ padding: "10px", textAlign: "center" }}>{player.pts}</td>
                            <td style={{ padding: "10px", textAlign: "center" }}>{player.trb}</td>
                            <td style={{ padding: "10px", textAlign: "center" }}>{player.ast}</td>
                            <td style={{ padding: "10px", textAlign: "center" }}>{formatPercent(player.ts_pct)}</td>
                            <td style={{ padding: "10px", textAlign: "center" }}>{formatRating(player.usg_pct)}</td>
                            <td style={{ padding: "10px", textAlign: "center" }}>{formatRating(player.ortg)}</td>
                            <td style={{ padding: "10px", textAlign: "center" }}>{formatRating(player.bpm)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>Games</h3>
                {dashboard.games.length === 0 ? (
                  <p style={{ color: COLORS.muted }}>No saved games yet.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: `1px solid ${COLORS.greyBorder}` }}>
                      <thead>
                        <tr style={{ backgroundColor: COLORS.greyRow }}>
                          <th style={{ padding: "10px", textAlign: "left", color: COLORS.text }}>Date</th>
                          <th style={{ padding: "10px", textAlign: "left", color: COLORS.text }}>Opponent</th>
                          <th style={{ padding: "10px", textAlign: "center", color: COLORS.text }}>Side</th>
                          <th style={{ padding: "10px", textAlign: "center", color: COLORS.text }}>Result</th>
                          <th style={{ padding: "10px", textAlign: "left", color: COLORS.text }}>Box score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.games.map((game, index) => {
                          const won =
                            game.team_score != null &&
                            game.opponent_score != null &&
                            game.team_score > game.opponent_score;
                          const lost =
                            game.team_score != null &&
                            game.opponent_score != null &&
                            game.team_score < game.opponent_score;
                          const result =
                            game.team_score != null && game.opponent_score != null
                              ? `${game.team_score}-${game.opponent_score}${won ? " W" : lost ? " L" : ""}`
                              : "—";
                          return (
                            <tr key={game.id} style={{ backgroundColor: index % 2 === 0 ? "#fff" : COLORS.greyRow }}>
                              <td style={{ padding: "10px" }}>{game.game_date}</td>
                              <td style={{ padding: "10px" }}>{game.opponent || "—"}</td>
                              <td style={{ padding: "10px", textAlign: "center", textTransform: "capitalize" }}>
                                {game.team_side === "away" ? "Away" : "Home"}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  textAlign: "center",
                                  fontWeight: "bold",
                                  color: won ? "#1e7e34" : lost ? COLORS.danger : COLORS.navy,
                                }}
                              >
                                {result}
                              </td>
                              <td style={{ padding: "10px" }}>
                                <Link href={`/saved-games/${game.id}`} style={{ color: COLORS.text, fontWeight: 500 }}>
                                  View game
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
