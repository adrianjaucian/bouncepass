"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import EditGameForm from "../../components/EditGameForm";
import ExportSavedGameButton from "../../components/ExportSavedGameButton";
import SiteNav from "../../components/SiteNav";
import api from "../../lib/api";
import { formatSavedGameLabel } from "../../lib/gameResultsUtils";
import { GENDER_OPTIONS, REGION_OPTIONS, formatGenderLabel, formatRegionLabel, genderBadgeStyle, regionBadgeStyle } from "../../lib/gender";

type SavedGameSummary = {
  id: number;
  game_date: string;
  home_team_name: string;
  away_team_name?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  gender?: string | null;
  region?: string | null;
  created_at: string;
};

const PAGE_SIZE = 100;

export default function SavedGamesPage() {
  const [games, setGames] = useState<SavedGameSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [genderFilter, setGenderFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [debouncedTeamSearch, setDebouncedTeamSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [editingGameId, setEditingGameId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTeamSearch(teamSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [teamSearch]);

  const loadGames = useCallback(
    async ({ append = false, offset = 0 }: { append?: boolean; offset?: number } = {}) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const params: Record<string, string | number> = {
          limit: PAGE_SIZE,
          offset,
        };
        if (genderFilter) params.gender = genderFilter;
        if (regionFilter) params.region = regionFilter;
        if (debouncedTeamSearch) params.team = debouncedTeamSearch;

        const res = await api.get("/games", { params });
        const nextGames: SavedGameSummary[] = res.data?.games || [];
        setTotal(res.data?.total ?? nextGames.length);
        setGames((current) => (append ? [...current, ...nextGames] : nextGames));
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not load saved games.";
        setError(typeof message === "string" ? message : JSON.stringify(message));
        if (!append) setGames([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [genderFilter, regionFilter, debouncedTeamSearch],
  );

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const deleteGame = async (id: number) => {
    if (!window.confirm("Delete this saved game?")) return;
    try {
      await api.delete(`/games/${id}`);
      setGames((current) => current.filter((game) => game.id !== id));
      setTotal((current) => Math.max(0, current - 1));
      if (editingGameId === id) setEditingGameId(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Could not delete game.");
    }
  };

  const handleGameUpdated = (updated: SavedGameSummary) => {
    setGames((current) => current.map((game) => (game.id === updated.id ? { ...game, ...updated } : game)));
    setEditingGameId(null);
  };

  const hasMore = games.length < total;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <header style={{ textAlign: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
          <h1 style={{ color: "#2c3e50", margin: "0 0 10px 0", fontSize: "2.2em" }}>Saved Games</h1>
          <p style={{ color: "#7f8c8d", margin: 0 }}>Browse games saved to your database. Teams are listed as Home Team vs Away Team</p>
        </header>

        <SiteNav />

        <main style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
            {GENDER_OPTIONS.map((option) => (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => setGenderFilter(option.value)}
                style={{
                  padding: "10px 16px",
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

          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            {REGION_OPTIONS.map((option) => (
              <button
                key={option.value || "all-regions"}
                type="button"
                onClick={() => setRegionFilter(option.value)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: regionFilter === option.value ? "#27ae60" : "#ecf0f1",
                  color: regionFilter === option.value ? "#fff" : "#2c3e50",
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

          <div style={{ marginBottom: "20px", maxWidth: "420px" }}>
            <label htmlFor="team-search" style={{ display: "block", marginBottom: "8px", color: "#2c3e50", fontWeight: "bold", fontSize: "14px" }}>
              Search by team
            </label>
            <input
              id="team-search"
              type="search"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="e.g. Spiders, Logan, Hornsby..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid #d0d7de",
                fontSize: "14px",
                color: "#000",
              }}
            />
          </div>

          {loading && <p style={{ color: "#56616b" }}>Loading saved games...</p>}
          {error && (
            <div style={{ color: "#c0392b", backgroundColor: "#fdecea", padding: "14px", borderRadius: "8px", border: "1px solid #f5c6cb", marginBottom: "16px" }}>
              {error}
              <div style={{ marginTop: "10px", fontSize: "14px" }}>
                If this keeps happening, restart the backend server. A long sync may have blocked it earlier.
              </div>
            </div>
          )}

          {!loading && !error && total === 0 && (
            <p style={{ color: "#56616b" }}>
              No saved games yet. Upload a box score on the{" "}
              <Link href="/" style={{ color: "#3498db" }}>home page</Link> and use Save Game.
            </p>
          )}

          {!loading && !error && total > 0 && games.length === 0 && (
            <p style={{ color: "#56616b" }}>
              No games match your filters. Try a different team name or gender.
            </p>
          )}

          {games.length > 0 && (
            <>
              <p style={{ margin: "0 0 12px 0", color: "#7f8c8d", fontSize: "14px" }}>
                Showing {games.length} of {total} game{total === 1 ? "" : "s"}
              </p>
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
                        <div style={{ fontWeight: "bold", color: "#2c3e50", fontSize: "16px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                          <span>
                            {formatSavedGameLabel({
                              homeTeamName: game.home_team_name,
                              awayTeamName: game.away_team_name ?? null,
                              homeScore: game.home_score ?? null,
                              awayScore: game.away_score ?? null,
                              results: null,
                              variant: "list",
                            })}
                          </span>
                          <span
                            style={{
                              ...genderBadgeStyle(game.gender || ""),
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "999px",
                            }}
                          >
                            {formatGenderLabel(game.gender || "")}
                          </span>
                          <span
                            style={{
                              ...regionBadgeStyle(game.region || ""),
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "999px",
                            }}
                          >
                            {formatRegionLabel(game.region || "")}
                          </span>
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

              {hasMore && (
                <button
                  type="button"
                  onClick={() => loadGames({ append: true, offset: games.length })}
                  disabled={loadingMore}
                  style={{
                    marginTop: "20px",
                    padding: "12px 20px",
                    backgroundColor: loadingMore ? "#bdc3c7" : "#2c3e50",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: loadingMore ? "not-allowed" : "pointer",
                  }}
                >
                  {loadingMore ? "Loading more..." : "Load more games"}
                </button>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
