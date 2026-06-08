import { useEffect, useState } from "react";
import api from "../lib/api";

export default function SaveGameForm({
  results,
  hasAwayTeam,
  initialGameDate = "",
  initialHomeTeamName = "",
  initialAwayTeamName = "",
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [gameDate, setGameDate] = useState(initialGameDate || today);
  const [homeTeamName, setHomeTeamName] = useState(initialHomeTeamName || "");
  const [awayTeamName, setAwayTeamName] = useState(initialAwayTeamName || "");

  useEffect(() => {
    if (initialGameDate) setGameDate(initialGameDate);
    if (initialHomeTeamName) setHomeTeamName(initialHomeTeamName);
    if (initialAwayTeamName) setAwayTeamName(initialAwayTeamName);
  }, [initialGameDate, initialHomeTeamName, initialAwayTeamName]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const saveGame = async () => {
    if (!results) return;
    if (!gameDate.trim() || !homeTeamName.trim()) {
      setError("Date and home team name are required.");
      return;
    }
    if (hasAwayTeam && !awayTeamName.trim()) {
      setError("Away team name is required when away stats are included.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post("/games", {
        game_date: gameDate,
        home_team_name: homeTeamName.trim(),
        away_team_name: hasAwayTeam ? awayTeamName.trim() : null,
        results,
      });
      setMessage(`Game saved (ID ${res.data.id}). View it on the Saved Games page.`);
    } catch (err) {
      const serverMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Could not save game.";
      setError(typeof serverMessage === "string" ? serverMessage : JSON.stringify(serverMessage));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f4f8fb', borderRadius: '8px', border: '1px solid #d6e4f0' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>Save Game</h3>
      <div style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
        <label style={{ display: 'grid', gap: '6px', color: '#000', fontSize: '14px' }}>
          Game Date
          <input
            type="date"
            value={gameDate}
            onChange={(e) => setGameDate(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d0d7de', color: '#000' }}
          />
        </label>
        <label style={{ display: 'grid', gap: '6px', color: '#000', fontSize: '14px' }}>
          Team Name (Home)
          <input
            type="text"
            value={homeTeamName}
            onChange={(e) => setHomeTeamName(e.target.value)}
            placeholder="e.g. Spiders"
            style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d0d7de', color: '#000' }}
          />
        </label>
        {hasAwayTeam && (
          <label style={{ display: 'grid', gap: '6px', color: '#000', fontSize: '14px' }}>
            Team Name (Away)
            <input
              type="text"
              value={awayTeamName}
              onChange={(e) => setAwayTeamName(e.target.value)}
              placeholder="e.g. Sixers"
              style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d0d7de', color: '#000' }}
            />
          </label>
        )}
        <button
          onClick={saveGame}
          disabled={saving}
          style={{
            padding: '12px 20px',
            backgroundColor: saving ? '#bdc3c7' : '#9b59b6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            width: 'fit-content',
          }}
        >
          {saving ? 'Saving...' : 'Save to Database'}
        </button>
      </div>
      {message && (
        <div style={{ marginTop: '12px', color: '#1e7e34', backgroundColor: '#e8f8ee', padding: '12px', borderRadius: '6px', border: '1px solid #b7e4c7' }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ marginTop: '12px', color: '#c0392b', backgroundColor: '#fdecea', padding: '12px', borderRadius: '6px', border: '1px solid #f5c6cb' }}>
          {error}
        </div>
      )}
    </div>
  );
}
