"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import PlayerDashboardDetail from "../../components/PlayerDashboardDetail";
import PlayerLeagueLeaders from "../../components/PlayerLeagueLeaders";
import api from "../../lib/api";

type PlayerDashboard = {
  player_name: string;
  query: string;
  games_played: number;
  teams: string[];
  stats: Record<string, any> | null;
  games: Record<string, any>[];
  trend_charts?: Record<string, any>;
  league_players: number;
  league_games: number;
};

function PlayerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlayer = searchParams.get("player") || "";

  const [players, setPlayers] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer);
  const [dashboard, setDashboard] = useState<PlayerDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const res = await api.get("/players");
        setPlayers(res.data?.players || []);
      } catch {
        setPlayers([]);
      }
    };
    loadPlayers();
  }, []);

  useEffect(() => {
    const query = initialPlayer.trim();
    if (!query) return;
    setSelectedPlayer(query);
  }, [initialPlayer]);

  const fetchDashboard = useCallback(async (playerName: string) => {
    const res = await api.get("/players/dashboard", {
      params: { player_name: playerName.trim() },
    });
    return res.data as PlayerDashboard;
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!selectedPlayer.trim()) {
        setDashboard(null);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await fetchDashboard(selectedPlayer);
        setDashboard(data);
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
  }, [selectedPlayer, fetchDashboard]);

  const selectPlayer = (name: string) => {
    const next = name.trim();
    setSelectedPlayer(next);
    if (next) {
      router.replace(`/player-dashboard?player=${encodeURIComponent(next)}`);
    } else {
      router.replace("/player-dashboard");
    }
  };

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
          <h1 style={{ color: "#2c3e50", margin: "0 0 10px 0", fontSize: "2.2em" }}>Player Metrics</h1>
          <p style={{ color: "#7f8c8d", margin: 0 }}>
            Season totals, per-game averages, advanced metrics, and league ranks across all saved box scores.
          </p>
        </header>

        <main
          style={{
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ marginBottom: "24px", maxWidth: "360px" }}>
            <label htmlFor="player-select" style={{ display: "block", marginBottom: "8px", color: "#2c3e50", fontWeight: "bold" }}>
              Player
            </label>
            <select
              id="player-select"
              value={selectedPlayer}
              onChange={(event) => selectPlayer(event.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid #d0d7de",
                fontSize: "14px",
                color: "#000",
                backgroundColor: "#fff",
              }}
            >
              <option value="">Choose a player...</option>
              {players.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {players.length === 0 && (
              <p style={{ margin: "10px 0 0 0", color: "#7f8c8d", fontSize: "13px" }}>
                Save a box score from Home to populate this list.
              </p>
            )}
          </div>

          {loading && <p style={{ color: "#56616b", marginBottom: "24px" }}>Loading player data...</p>}

          {error && (
            <div
              style={{
                color: "#c0392b",
                backgroundColor: "#fdecea",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #f5c6cb",
                marginBottom: "24px",
              }}
            >
              {error}
            </div>
          )}

          {dashboard && !loading && (
            <div style={{ marginBottom: "32px", paddingBottom: "8px" }}>
              <PlayerDashboardDetail dashboard={dashboard} />
            </div>
          )}

          {!selectedPlayer.trim() && !loading && !error && (
            <PlayerLeagueLeaders onSelectPlayer={selectPlayer} selectedPlayer={selectedPlayer} />
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
