"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import EditGameForm from "../../../components/EditGameForm";
import ExportResultsButton from "../../../components/ExportResultsButton";
import GameResultsView from "../../../components/GameResultsView";
import SiteNav from "../../../components/SiteNav";
import api from "../../../lib/api";
import { formatCompetitionLabel, formatGenderLabel, formatRegionLabel, genderBadgeStyle, regionBadgeStyle } from "../../../lib/gender";
import { formatSavedGameLabel } from "../../../lib/gameResultsUtils";

type SavedGameDetail = {
  id: number;
  game_date: string;
  home_team_name: string;
  away_team_name?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  gender?: string | null;
  region?: string | null;
  created_at: string;
  results: { home?: unknown[]; away?: unknown[] };
};

export default function SavedGameDetailPage() {
  const params = useParams();
  const gameId = params?.id;
  const [game, setGame] = useState<SavedGameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const loadGame = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/games/${gameId}`);
        setGame(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Could not load game.");
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, [gameId]);

  const handleGameUpdated = (updated: SavedGameDetail) => {
    setGame(updated);
    setEditing(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <header style={{ textAlign: "center", marginBottom: "24px", backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
            {game && (
              <>
                <span
                  style={{
                    ...genderBadgeStyle(game.gender || ""),
                    fontSize: "13px",
                    fontWeight: 700,
                    padding: "6px 14px",
                    borderRadius: "999px",
                  }}
                >
                  {formatGenderLabel(game.gender || "")}
                </span>
                <span
                  style={{
                    ...regionBadgeStyle(game.region || ""),
                    fontSize: "13px",
                    fontWeight: 700,
                    padding: "6px 14px",
                    borderRadius: "999px",
                  }}
                >
                  {formatRegionLabel(game.region || "")}
                </span>
              </>
            )}
          </div>
          <h1 style={{ color: "#2c3e50", margin: "0 0 10px 0", fontSize: "2.2em" }}>
            {game
              ? formatSavedGameLabel({
                  homeTeamName: game.home_team_name,
                  awayTeamName: game.away_team_name,
                  homeScore: game.home_score,
                  awayScore: game.away_score,
                  results: game.results,
                })
              : "Saved Game"}
          </h1>
          {game && (
            <p style={{ color: "#7f8c8d", margin: 0 }}>
              {game.game_date} · Saved {new Date(game.created_at).toLocaleString()}
            </p>
          )}
        </header>

        <SiteNav />

        <main style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
          {loading && <p style={{ color: "#56616b" }}>Loading game...</p>}
          {error && (
            <div style={{ color: "#c0392b", backgroundColor: "#fdecea", padding: "14px", borderRadius: "8px", border: "1px solid #f5c6cb" }}>
              {error}
            </div>
          )}
          {game && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                <h3 style={{ color: "#2c3e50", margin: "20px 0 10px 0" }}>Results</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => setEditing((current) => !current)}
                    style={{
                      padding: "10px 18px",
                      backgroundColor: "#f39c12",
                      color: "white",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    {editing ? "Close Edit" : "Edit"}
                  </button>
                  <ExportResultsButton
                    data={game.results}
                    dateStamp={game.game_date}
                    homeLabel={game.home_team_name}
                    awayLabel={game.away_team_name || "Away"}
                    fileSlug={`${game.home_team_name}-vs-${game.away_team_name || "solo"}`}
                  />
                </div>
              </div>
              {editing && (
                <EditGameForm
                  game={game}
                  onUpdated={handleGameUpdated}
                  onCancel={() => setEditing(false)}
                />
              )}
              <GameResultsView
                data={game.results}
                homeLabel={game.home_team_name}
                awayLabel={game.away_team_name || "Away"}
                competitionLabel={
                  game.gender || game.region
                    ? `${formatCompetitionLabel(game.gender || "", game.region || "")} competition — men's and women's results are kept separate by region across the app.`
                    : "Gender and region not set for this game. Edit the game to label it as men's or women's and pick a region."
                }
              />
            </>
          )}
          {!loading && !error && (
            <div style={{ marginTop: "24px" }}>
              <Link href="/saved-games" style={{ color: "#3498db", fontWeight: "bold" }}>
                ← Back to Advanced Box Scores
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
