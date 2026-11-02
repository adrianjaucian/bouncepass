import { useState } from "react";
import Link from "next/link";
import api from "../lib/api";
import { COLORS } from "../lib/theme";
import { isUnavailableStatus, saveLocalGame } from "../lib/workspaceStore";
import { useTeam } from "./TeamProvider";

export default function SaveGameForm({ results, teamSide = "home", hasOpponent }) {
  const { currentTeam, reloadTeams } = useTeam();
  const today = new Date().toISOString().slice(0, 10);
  const [gameDate, setGameDate] = useState(today);
  const [opponentName, setOpponentName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savedGameId, setSavedGameId] = useState(null);

  const saveGame = async () => {
    if (!results || !currentTeam) {
      setError("Create or select a team before saving.");
      return;
    }
    if (!gameDate.trim()) {
      setError("Game date is required.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    setSavedGameId(null);
    const payload = {
      team_id: currentTeam.id,
      game_date: gameDate,
      opponent_name: opponentName.trim() || null,
      team_side: teamSide === "away" ? "away" : "home",
      results: { ...(results || {}), team_side: teamSide === "away" ? "away" : "home" },
    };
    try {
      const res = await api.post("/games", payload, { timeout: 8000 });
      setSavedGameId(res.data.id);
      setMessage(`Saved to ${currentTeam.name}.`);
      await reloadTeams();
    } catch (err) {
      if (isUnavailableStatus(err?.response?.status) || !err?.response) {
        try {
          const local = saveLocalGame(payload);
          setSavedGameId(local.id);
          setMessage(`Saved to ${currentTeam.name}.`);
          await reloadTeams();
        } catch (localErr) {
          setError(localErr.message || "Could not save game.");
        }
      } else {
        const serverMessage = err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Could not save game.";
        setError(typeof serverMessage === "string" ? serverMessage : JSON.stringify(serverMessage));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: "24px", padding: "20px", backgroundColor: COLORS.goldSoft, borderRadius: "8px", border: `1px solid ${COLORS.gold}` }}>
      <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>
        Save to {currentTeam?.name || "this team"}
      </h3>
      <p style={{ margin: "0 0 12px 0", color: COLORS.muted, fontSize: "13px" }}>
        {currentTeam?.name || "This team"} is saved as the {teamSide === "away" ? "away" : "home"} team for this game.
        Metrics still track {currentTeam?.name || "this team"} only.
        {hasOpponent ? " The opponent CSV is kept as the other box score." : ""}
      </p>
      <div style={{ display: "grid", gap: "12px", maxWidth: "520px" }}>
        <label style={{ display: "grid", gap: "6px", color: COLORS.text, fontSize: "14px" }}>
          Game Date
          <input
            type="date"
            value={gameDate}
            onChange={(e) => setGameDate(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: "6px", border: `1px solid ${COLORS.greyBorder}`, color: COLORS.text }}
          />
        </label>
        <label style={{ display: "grid", gap: "6px", color: COLORS.text, fontSize: "14px" }}>
          Opponent (optional)
          <input
            type="text"
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            placeholder="e.g. City Hawks"
            style={{ padding: "10px 12px", borderRadius: "6px", border: `1px solid ${COLORS.greyBorder}`, color: COLORS.text }}
          />
        </label>
        <button
          onClick={saveGame}
          disabled={saving || !currentTeam}
          className="upload-calculate"
          style={{ width: "fit-content" }}
        >
          {saving ? "Saving..." : "Save box score"}
        </button>
      </div>
      {message && (
        <div style={{ marginTop: "12px", color: "#1e7e34", backgroundColor: "#e8f8ee", padding: "12px", borderRadius: "6px" }}>
          {message}{" "}
          <Link href={savedGameId ? `/saved-games/${savedGameId}` : "/saved-games"} style={{ color: "#1e7e34", fontWeight: 700 }}>
            View box scores
          </Link>
        </div>
      )}
      {error && (
        <div style={{ marginTop: "12px", color: COLORS.danger, backgroundColor: COLORS.dangerBg, padding: "12px", borderRadius: "6px" }}>
          {error}
        </div>
      )}
    </div>
  );
}
