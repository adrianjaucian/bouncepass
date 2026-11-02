import { useState } from "react";
import api from "../lib/api";
import { COLORS } from "../lib/theme";
import { getGameOpponent, isUnavailableStatus, updateLocalGame } from "../lib/workspaceStore";

export default function EditGameForm({ game, onUpdated, onCancel }) {
  const [gameDate, setGameDate] = useState(game.game_date || "");
  const [opponentName, setOpponentName] = useState(getGameOpponent(game) || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const saveChanges = async () => {
    if (!gameDate.trim()) {
      setError("Date is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await api.put(`/games/${game.id}`, {
        game_date: gameDate,
        opponent_name: opponentName.trim() || null,
      });
      onUpdated?.(res.data);
    } catch (err) {
      if (isUnavailableStatus(err?.response?.status) || !err?.response) {
        onUpdated?.(updateLocalGame(game.id, { game_date: gameDate, opponent_name: opponentName.trim() || null }));
        return;
      }
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
    <div style={{ marginTop: "12px", padding: "16px", backgroundColor: COLORS.goldSoft, borderRadius: "8px", border: `1px solid ${COLORS.gold}` }}>
      <h4 style={{ margin: "0 0 12px 0", color: COLORS.navy }}>Edit Game Details</h4>
      <div style={{ display: "grid", gap: "12px", maxWidth: "520px" }}>
        <label style={{ display: "grid", gap: "6px", color: COLORS.navy, fontSize: "14px" }}>
          Game Date
          <input
            type="date"
            value={gameDate}
            onChange={(e) => setGameDate(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: "6px", border: `1px solid ${COLORS.greyBorder}`, color: COLORS.navy }}
          />
        </label>
        <label style={{ display: "grid", gap: "6px", color: COLORS.navy, fontSize: "14px" }}>
          Opponent
          <input
            type="text"
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            placeholder="Opponent name"
            style={{ padding: "10px 12px", borderRadius: "6px", border: `1px solid ${COLORS.greyBorder}`, color: COLORS.navy }}
          />
        </label>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={saveChanges}
            disabled={saving}
            style={{
              padding: "10px 18px",
              backgroundColor: saving ? COLORS.greyAlt : COLORS.navy,
              color: saving ? COLORS.grey : COLORS.gold,
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
                backgroundColor: COLORS.greyRow,
                color: COLORS.navy,
                border: `1px solid ${COLORS.greyBorder}`,
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
        <div style={{ marginTop: "12px", color: COLORS.danger, backgroundColor: COLORS.dangerBg, padding: "12px", borderRadius: "6px" }}>
          {error}
        </div>
      )}
    </div>
  );
}
