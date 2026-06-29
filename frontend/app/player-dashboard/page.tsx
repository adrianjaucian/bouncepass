"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import PlayerLeagueLeaders from "../../components/PlayerLeagueLeaders";
import SiteNav from "../../components/SiteNav";
import TrendCharts from "../../components/TrendCharts";
import api from "../../lib/api";
import { GENDER_OPTIONS } from "../../lib/gender";

type StatRank = { rank: number; of: number };

type PlayerStats = {
  player: string;
  games: number;
  mp_mins: number;
  pts: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  orb: number;
  drb: number;
  fg: number;
  fga: number;
  fg3: number;
  fg3a: number;
  ft: number;
  fta: number;
  pts_pg?: number | null;
  trb_pg?: number | null;
  ast_pg?: number | null;
  stl_pg?: number | null;
  blk_pg?: number | null;
  tov_pg?: number | null;
  ts_pct?: number | null;
  efg_pct?: number | null;
  fg3_pct?: number | null;
  fg3par?: number | null;
  ft_pct?: number | null;
  ortg?: number | null;
  drtg?: number | null;
  usg_pct?: number | null;
  bpm?: number | null;
  ast_pct?: number | null;
  trb_pct?: number | null;
  stl_pct?: number | null;
  blk_pct?: number | null;
  tov_pct?: number | null;
  orb_pct?: number | null;
  drb_pct?: number | null;
  ranks?: Record<string, StatRank>;
};

type PlayerGame = {
  game_id: number;
  game_date: string;
  team_name: string;
  opponent?: string | null;
  mp_mins: number;
  pts: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  fg: number;
  fga: number;
  fg3: number;
  fg3a: number;
  ft: number;
  fta: number;
  tov: number;
  ts_pct?: number | null;
  efg_pct?: number | null;
  usg_pct?: number | null;
  ortg?: number | null;
  drtg?: number | null;
  bpm?: number | null;
};

type TrendPoint = {
  game_date: string;
  label: string;
  pts?: number | null;
  trb?: number | null;
  ast?: number | null;
  ts_pct?: number | null;
  usg_pct?: number | null;
  ortg?: number | null;
  drtg?: number | null;
};

type PlayerDashboard = {
  player_name: string;
  query: string;
  games_played: number;
  teams: string[];
  stats: PlayerStats | null;
  games: PlayerGame[];
  trend_charts?: {
    last_5: TrendPoint[];
    last_10: TrendPoint[];
    season: TrendPoint[];
  };
  league_players: number;
  league_games: number;
};

const tableHeaderStyle: React.CSSProperties = {
  padding: "10px",
  color: "#000",
  fontWeight: "bold",
};

function formatPercent(value?: number | null) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatRating(value?: number | null) {
  return value == null ? "—" : value.toFixed(1);
}

function formatRank(rank?: StatRank) {
  if (!rank || !rank.of) return "—";
  return `#${rank.rank} of ${rank.of}`;
}

function StatCard({
  label,
  value,
  rank,
  subtitle,
}: {
  label: string;
  value: string;
  rank?: StatRank;
  subtitle?: string;
}) {
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

function PlayerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlayer = searchParams.get("player") || "";

  const [players, setPlayers] = useState<string[]>([]);
  const [genderFilter, setGenderFilter] = useState("");
  const [search, setSearch] = useState(initialPlayer);
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer);
  const [dashboard, setDashboard] = useState<PlayerDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const params = genderFilter ? { gender: genderFilter } : {};
        const res = await api.get("/players", { params });
        setPlayers(res.data?.players || []);
      } catch {
        setPlayers([]);
      }
    };
    loadPlayers();
  }, [genderFilter]);

  useEffect(() => {
    const query = initialPlayer.trim();
    if (!query) return;
    setSearch(query);
    setSelectedPlayer(query);
  }, [initialPlayer]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!selectedPlayer.trim()) {
        setDashboard(null);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      setDashboard(null);
      try {
        const params: { player_name: string; gender?: string } = { player_name: selectedPlayer.trim() };
        if (genderFilter) params.gender = genderFilter;
        const res = await api.get("/players/dashboard", { params });
        setDashboard(res.data);
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not load player dashboard.";
        setError(typeof message === "string" ? message : JSON.stringify(message));
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [selectedPlayer, genderFilter]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return players.slice(0, 20);
    return players.filter((name) => name.toLowerCase().includes(query)).slice(0, 20);
  }, [players, search]);

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = search.trim();
    if (!next) return;
    setSelectedPlayer(next);
    router.replace(`/player-dashboard?player=${encodeURIComponent(next)}`);
  };

  const stats = dashboard?.stats;
  const ranks = stats?.ranks || {};

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <header
          style={{
            textAlign: "center",
            marginBottom: "24px",
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ color: "#2c3e50", margin: "0 0 10px 0", fontSize: "2.2em" }}>Player Dashboard</h1>
          <p style={{ color: "#7f8c8d", margin: 0 }}>
            Season totals, per-game averages, advanced metrics, and league ranks across all saved box scores.
          </p>
        </header>

        <SiteNav />

        <main
          style={{
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            {GENDER_OPTIONS.map((option) => (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => setGenderFilter(option.value)}
                style={{
                  padding: "8px 14px",
                  backgroundColor: genderFilter === option.value ? "#3498db" : "#ecf0f1",
                  color: genderFilter === option.value ? "#fff" : "#2c3e50",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ marginBottom: "24px" }}>
            <label htmlFor="player-search" style={{ display: "block", marginBottom: "8px", color: "#2c3e50", fontWeight: "bold" }}>
              Search players
            </label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                id="player-search"
                list="player-options"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Type a player name..."
                style={{
                  flex: "1 1 260px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid #d0d7de",
                  fontSize: "14px",
                  color: "#000",
                }}
              />
              <datalist id="player-options">
                {filteredPlayers.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <button
                type="submit"
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#3498db",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                View Player
              </button>
            </div>
            {players.length > 0 && (
              <p style={{ margin: "10px 0 0 0", color: "#7f8c8d", fontSize: "13px" }}>
                {players.length} player{players.length === 1 ? "" : "s"} in league database
              </p>
            )}
          </form>

          <PlayerLeagueLeaders gender={genderFilter} />

          {loading && <p style={{ color: "#56616b" }}>Loading player dashboard...</p>}
          {error && (
            <div
              style={{
                color: "#c0392b",
                backgroundColor: "#fdecea",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #f5c6cb",
              }}
            >
              {error}
            </div>
          )}

          {dashboard && stats && !loading && (
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
                          <td style={{ padding: "10px", color: "#000" }}>{game.team_name}</td>
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
          )}

          {!selectedPlayer.trim() && !loading && !error && (
            <p style={{ color: "#7f8c8d", margin: 0 }}>Search for a player to view their dashboard.</p>
          )}
        </main>
      </div>
    </div>
  );
}

export default function PlayerDashboardPage() {
  return (
    <Suspense>
      <PlayerDashboardContent />
    </Suspense>
  );
}
