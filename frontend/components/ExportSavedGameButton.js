import { useState } from "react";
import api from "../lib/api";
import { exportGameResults } from "../lib/exportResults";

export default function ExportSavedGameButton({ game }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const res = await api.get(`/games/${game.id}`);
      exportGameResults(res.data.results, {
        dateStamp: game.game_date,
        homeLabel: game.home_team_name,
        awayLabel: game.away_team_name || "Away",
        fileSlug: `${game.home_team_name}-vs-${game.away_team_name || "solo"}`,
      });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
      <button
        onClick={handleExport}
        disabled={exporting}
        style={{
          padding: "10px 16px",
          backgroundColor: exporting ? "#bdc3c7" : "#2ecc71",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: exporting ? "not-allowed" : "pointer",
          fontWeight: "bold",
          fontSize: "14px",
        }}
      >
        {exporting ? "Exporting..." : "Bounce Results"}
      </button>
      {error && <span style={{ color: "#c0392b", fontSize: "12px" }}>{error}</span>}
    </div>
  );
}
