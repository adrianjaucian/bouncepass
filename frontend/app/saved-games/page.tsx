"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EditGameForm from "../../components/EditGameForm";
import ExportSavedGameButton from "../../components/ExportSavedGameButton";
import SiteNav from "../../components/SiteNav";
import api from "../../lib/api";
import { formatSavedGameLabel } from "../../lib/gameResultsUtils";

type SavedGameSummary = {
  id: number;
  game_date: string;
  home_team_name: string;
  away_team_name?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  created_at: string;
};

export default function SavedGamesPage() {
  const [games, setGames] = useState<SavedGameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingGameId, setEditingGameId] = useState<number | null>(null);

  const loadGames = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/games");
      setGames(res.data?.games || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Could not load saved games.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const deleteGame = async (id: number) => {
    if (!window.confirm("Delete this saved game?")) return;
    try {
      await api.delete(`/games/${id}`);
      setGames((current) => current.filter((game) => game.id !== id));
      if (editingGameId === id) setEditingGameId(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Could not delete game.");
    }
  };

  const handleGameUpdated = (updated: SavedGameSummary) => {
    setGames((current) => current.map((game) => (game.id === updated.id ? { ...game, ...updated } : game)));
    setEditingGameId(null);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <header style={{ textAlign: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
          <h1 style={{ color: "#2c3e50", margin: "0 0 10px 0", fontSize: "2.2em" }}>Saved Games</h1>
          <p style={{ color: "#7f8c8d", margin: 0 }}>Browse games saved to your database. Teams are listed as Home Team vs Away Team</p>
        </header>

        <SiteNav />

        <main style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
          {loading && <p style={{ color: "#56616b" }}>Loading saved games...</p>}
          {error && (
            <div style={{ color: "#c0392b", backgroundColor: "#fdecea", padding: "14px", borderRadius: "8px", border: "1px solid #f5c6cb", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {!loading && games.length === 0 && !error && (
            <p style={{ color: "#56616b" }}>
              No saved games yet. Upload a box score on the{" "}
              <Link href="/" style={{ color: "#3498db" }}>home page</Link> and use Save Game.
            </p>
          )}

          {games.length > 0 && (
            <div style={{ display: "grid", gap: "12px" }}>
              {games.map((game) => (
                <div
                  key={game.id}
                  style={{
                    padding: "16px",
                    border: "1px solid #e1e8ed",
                    borderRadius: "8px",
                    backgroundColor: "#fafbfc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold", color: "#2c3e50", fontSize: "16px" }}>
                        {formatSavedGameLabel({
                          homeTeamName: game.home_team_name,
                          awayTeamName: game.away_team_name ?? null,
                          homeScore: game.home_score ?? null,
                          awayScore: game.away_score ?? null,
                          results: null,
                          variant: "list",
                        })}
                      </div>
                      <div style={{ color: "#56616b", fontSize: "14px", marginTop: "4px" }}>
                        {game.game_date} · Saved {new Date(game.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" }}>
                      <ExportSavedGameButton game={game} />
                      <Link
                        href={`/saved-games/${game.id}`}
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "#3498db",
                          color: "white",
                          borderRadius: "6px",
                          textDecoration: "none",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        View
                      </Link>
                      <button
                        onClick={() => setEditingGameId(editingGameId === game.id ? null : game.id)}
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "#f39c12",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        {editingGameId === game.id ? "Close Edit" : "Edit"}
                      </button>
                      <button
                        onClick={() => deleteGame(game.id)}
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "#e74c3c",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {editingGameId === game.id && (
                    <EditGameForm
                      game={game}
                      onUpdated={handleGameUpdated}
                      onCancel={() => setEditingGameId(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
