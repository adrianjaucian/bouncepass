"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ExportSavedGameButton from "../../components/ExportSavedGameButton";
import { useTeam } from "../../components/TeamProvider";
import api from "../../lib/api";
import { formatSavedGameLabel } from "../../lib/gameResultsUtils";
import { COLORS, pageHeader, pageInner, pageMain, pageShell, subtitleStyle, titleStyle } from "../../lib/theme";

type SavedGameSummary = {
  id: number;
  team_id?: number | null;
  game_date: string;
  home_team_name: string;
  away_team_name?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  created_at: string;
};

const PAGE_SIZE = 100;

export default function SavedGamesPage() {
  const { currentTeam, loading: teamLoading } = useTeam();
  const [games, setGames] = useState<SavedGameSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadGames = useCallback(
    async ({ append = false, offset = 0 }: { append?: boolean; offset?: number } = {}) => {
      if (!currentTeam) {
        setGames([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const res = await api.get("/games", {
          params: { team_id: currentTeam.id, limit: PAGE_SIZE, offset },
        });
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
    [currentTeam],
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
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Could not delete game.");
    }
  };

  const hasMore = games.length < total;

  return (
    <div style={pageShell}>
      <div style={pageInner}>
        <header style={pageHeader}>
          <h1 style={{ ...titleStyle, fontSize: "2.2em" }}>Advanced Box Scores</h1>
          <p style={subtitleStyle}>
            {currentTeam
              ? `Saved games for ${currentTeam.name}. Each save also stores that team's players.`
              : "Create a team on Home to start saving box scores."}
          </p>
        </header>

        <main style={pageMain}>
          {(loading || teamLoading) && <p style={{ color: COLORS.muted }}>Loading saved games...</p>}
          {error && (
            <div style={{ color: COLORS.danger, backgroundColor: COLORS.dangerBg, padding: "14px", borderRadius: "8px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {!currentTeam && !teamLoading && (
            <p style={{ color: COLORS.muted }}>
              No team selected.{" "}
              <Link href="/" style={{ color: COLORS.navy, fontWeight: 700 }}>
                Add a team
              </Link>{" "}
              to track box scores.
            </p>
          )}

          {currentTeam && !loading && !error && total === 0 && (
            <p style={{ color: COLORS.muted }}>
              No games saved for {currentTeam.name} yet. Upload a box score on{" "}
              <Link href="/" style={{ color: COLORS.navy }}>
                Home
              </Link>{" "}
              and save it here.
            </p>
          )}

          {games.length > 0 && (
            <>
              <p style={{ margin: "0 0 12px 0", color: COLORS.muted, fontSize: "14px" }}>
                Showing {games.length} of {total} game{total === 1 ? "" : "s"}
              </p>
              <div style={{ display: "grid", gap: "12px" }}>
                {games.map((game) => (
                  <div
                    key={game.id}
                    style={{
                      padding: "16px",
                      border: `1px solid ${COLORS.greyBorder}`,
                      borderRadius: "8px",
                      backgroundColor: COLORS.greyRow,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: "bold", color: COLORS.navy, fontSize: "16px" }}>
                          {formatSavedGameLabel({
                            homeTeamName: game.home_team_name,
                            awayTeamName: game.away_team_name ?? null,
                            homeScore: game.home_score ?? null,
                            awayScore: game.away_score ?? null,
                            results: null,
                            variant: "list",
                          })}
                        </div>
                        <div style={{ color: COLORS.muted, fontSize: "14px", marginTop: "4px" }}>
                          {game.game_date} · Saved {new Date(game.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" }}>
                        <ExportSavedGameButton game={game} />
                        <Link
                          href={`/saved-games/${game.id}`}
                          style={{
                            padding: "10px 16px",
                            backgroundColor: COLORS.navy,
                            color: COLORS.gold,
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontWeight: "bold",
                            fontSize: "14px",
                          }}
                        >
                          View
                        </Link>
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
                    backgroundColor: loadingMore ? COLORS.greyAlt : COLORS.navy,
                    color: loadingMore ? COLORS.grey : COLORS.gold,
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
