import { useState } from "react";
import api from "../lib/api";

export default function EditGameForm({ game, onUpdated, onCancel }) {
  const [gameDate, setGameDate] = useState(game.game_date || "");
  const [homeTeamName, setHomeTeamName] = useState(game.home_team_name || "");
  const [awayTeamName, setAwayTeamName] = useState(game.away_team_name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hasAwayTeam = Boolean(game.away_team_name);

  const saveChanges = async () => {
    if (!gameDate.trim() || !homeTeamName.trim()) {
      setError("Date and home team name are required.");
      return;
    }
    if (hasAwayTeam && !awayTeamName.trim()) {
      setError("Away team name is required for this game.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await api.put(`/games/${game.id}`, {
        game_date: gameDate,
        home_team_name: homeTeamName.trim(),
        away_team_name: hasAwayTeam ? awayTeamName.trim() : null,
      });
      onUpdated?.(res.data);
    } catch (err) {
      const serverMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Could not update game.";
      setError(typeof serverMessage === "string" ? serverMessage : JSON.stringify(serverMessage));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: "12px", padding: "16px", backgroundColor: "#fff9e6", borderRadius: "8px", border: "1px solid #f0d98c" }}>
      <h4 style={{ margin: "0 0 12px 0", color: "#2c3e50" }}>Edit Game Details</h4>
      <div style={{ display: "grid", gap: "12px", maxWidth: "520px" }}>
        <label style={{ display: "grid", gap: "6px", color: "#000", fontSize: "14px" }}>
          Game Date
          <input
            type="date"
            value={gameDate}
            onChange={(e) => setGameDate(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: "6px", border: "1px solid #d0d7de", color: "#000" }}
          />
        </label>
        <label style={{ display: "grid", gap: "6px", color: "#000", fontSize: "14px" }}>
          Home Team Name (Home)
          <input
            type="text"
            value={homeTeamName}
            onChange={(e) => setHomeTeamName(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: "6px", border: "1px solid #d0d7de", color: "#000" }}
          />
        </label>
        {hasAwayTeam && (
          <label style={{ display: "grid", gap: "6px", color: "#000", fontSize: "14px" }}>
            Away Team Name (Away)
            <input
              type="text"
              value={awayTeamName}
              onChange={(e) => setAwayTeamName(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: "6px", border: "1px solid #d0d7de", color: "#000" }}
            />
          </label>
        )}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={saveChanges}
            disabled={saving}
            style={{
              padding: "10px 18px",
              backgroundColor: saving ? "#bdc3c7" : "#f39c12",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={saving}
              style={{
                padding: "10px 18px",
                backgroundColor: "#ecf0f1",
                color: "#2c3e50",
                border: "1px solid #d0d7de",
                borderRadius: "6px",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {error && (
        <div style={{ marginTop: "12px", color: "#c0392b", backgroundColor: "#fdecea", padding: "12px", borderRadius: "6px", border: "1px solid #f5c6cb" }}>
          {error}
        </div>
      )}
    </div>
  );
}
