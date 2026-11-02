"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import PlayerDashboardDetail from "../../components/PlayerDashboardDetail";
import { useTeam } from "../../components/TeamProvider";
import api from "../../lib/api";
import { buildLocalPlayerAnalytics, isUnavailableStatus, listLocalPlayers } from "../../lib/workspaceStore";
import { COLORS, pageHeader, pageInner, pageMain, pageShell, subtitleStyle, titleStyle } from "../../lib/theme";

type TeamPlayer = {
  id: number;
  name: string;
  games: number;
  pts: number;
  trb: number;
  ast: number;
};

type PlayerDashboard = {
  team_id: number;
  team_name: string;
  player_name: string;
  games_played: number;
  stats: Record<string, any>;
  games: Record<string, any>[];
};

function PlayerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTeam, loading: teamLoading } = useTeam();
  const initialPlayer = searchParams.get("player") || "";

  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer);
  const [dashboard, setDashboard] = useState<PlayerDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = initialPlayer.trim();
    if (query) setSelectedPlayer(query);
  }, [initialPlayer]);

  useEffect(() => {
    const loadPlayers = async () => {
      if (!currentTeam) {
        setPlayers([]);
        return;
      }
      try {
        const res = await api.get(`/teams/${currentTeam.id}/players`, { timeout: 8000 });
        setPlayers(res.data?.players || []);
      } catch (err: any) {
        setPlayers(isUnavailableStatus(err?.response?.status) || !err?.response ? listLocalPlayers(currentTeam.id) : []);
      }
    };
    loadPlayers();
  }, [currentTeam]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!currentTeam || !selectedPlayer.trim()) {
        setDashboard(null);
        setError("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/players/dashboard", {
          params: { team_id: currentTeam.id, player_name: selectedPlayer.trim() },
          timeout: 8000,
        });
        setDashboard(res.data);
      } catch (err: any) {
        const local = buildLocalPlayerAnalytics(currentTeam.id, selectedPlayer.trim());
        if (local && (isUnavailableStatus(err?.response?.status) || !err?.response || err?.response?.status === 404)) {
          setDashboard(local);
          return;
        }
        const message =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not load player analytics.";
        setError(typeof message === "string" ? message : JSON.stringify(message));
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [currentTeam, selectedPlayer]);

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
    <div style={pageShell}>
      <div style={pageInner}>
        <header style={pageHeader}>
          <h1 style={{ ...titleStyle, fontSize: "2.2em" }}>Player Analytics</h1>
          <p style={subtitleStyle}>
            {currentTeam
              ? `Individual metrics for players stored on ${currentTeam.name}.`
              : "Create a team on Home, then save box scores to track players."}
          </p>
        </header>

        <main style={pageMain}>
          {!currentTeam && !teamLoading && (
            <p style={{ color: COLORS.muted }}>
              No team selected.{" "}
              <Link href="/" style={{ color: COLORS.navy, fontWeight: 700 }}>
                Add a team
              </Link>{" "}
              first.
            </p>
          )}

          {currentTeam && (
            <div style={{ marginBottom: "24px", maxWidth: "360px" }}>
              <label htmlFor="player-select" style={{ display: "block", marginBottom: "8px", color: COLORS.navy, fontWeight: "bold" }}>
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
                  border: `1px solid ${COLORS.greyBorder}`,
                  fontSize: "14px",
                  color: COLORS.navy,
                  backgroundColor: "#fff",
                }}
              >
                <option value="">Choose a player...</option>
                {players.map((player) => (
                  <option key={player.id} value={player.name}>
                    {player.name}
                  </option>
                ))}
              </select>
              {players.length === 0 && (
                <p style={{ margin: "10px 0 0 0", color: COLORS.muted, fontSize: "13px" }}>
                  Save a box score from Home to store this team&apos;s players.
                </p>
              )}
            </div>
          )}

          {loading && <p style={{ color: COLORS.muted, marginBottom: "24px" }}>Loading player data...</p>}

          {error && (
            <div
              style={{
                color: COLORS.danger,
                backgroundColor: COLORS.dangerBg,
                padding: "14px",
                borderRadius: "8px",
                marginBottom: "24px",
              }}
            >
              {error}
            </div>
          )}

          {dashboard && !loading && <PlayerDashboardDetail dashboard={dashboard} />}
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
