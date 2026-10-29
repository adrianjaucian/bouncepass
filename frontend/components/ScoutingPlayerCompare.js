"use client";

import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import PlayerComparison from "./PlayerComparison";

const selectStyle = {
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #d0d7de",
  color: "#000",
  backgroundColor: "#fff",
  fontSize: "14px",
  width: "100%",
};

/**
 * @param {{ initialComparePlayers?: string[] }} props
 */
export default function ScoutingPlayerCompare({ initialComparePlayers = [] }) {
  const [playerOptions, setPlayerOptions] = useState([]);
  const [playerA, setPlayerA] = useState(initialComparePlayers[0] || "");
  const [playerB, setPlayerB] = useState(initialComparePlayers[1] || "");
  const [compareDashboards, setCompareDashboards] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    setPlayerA(initialComparePlayers[0] || "");
    setPlayerB(initialComparePlayers[1] || "");
  }, [initialComparePlayers.join("\u0000")]);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const res = await api.get("/players");
        setPlayerOptions(res.data?.players || []);
      } catch {
        setPlayerOptions([]);
      }
    };
    loadPlayers();
  }, []);

  const fetchDashboard = useCallback(async (playerName) => {
    const res = await api.get("/players/dashboard", {
      params: { player_name: playerName.trim() },
    });
    return res.data;
  }, []);

  useEffect(() => {
    const loadComparison = async () => {
      if (!playerA.trim() || !playerB.trim() || playerA.trim() === playerB.trim()) {
        setCompareDashboards([]);
        return;
      }

      setCompareLoading(true);
      try {
        const results = await Promise.all([fetchDashboard(playerA), fetchDashboard(playerB)]);
        setCompareDashboards(results.filter((item) => item?.stats));
      } catch {
        setCompareDashboards([]);
      } finally {
        setCompareLoading(false);
      }
    };
    loadComparison();
  }, [playerA, playerB, fetchDashboard]);

  const optionsFor = (selectedOther) =>
    playerOptions.filter((name) => name !== selectedOther);

  return (
    <section>
      <p style={{ margin: "0 0 20px 0", color: "#56616b", fontSize: "14px" }}>
        Choose two players from your saved games to compare their season stats side by side.
      </p>

      <div
        style={{
          padding: "18px 20px",
          backgroundColor: "#fef6ee",
          border: "1px solid #f5dcc8",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            maxWidth: "720px",
          }}
        >
          <label style={{ display: "grid", gap: "6px", color: "#56616b", fontSize: "13px" }}>
            Player 1
            <select value={playerA} onChange={(e) => setPlayerA(e.target.value)} style={selectStyle}>
              <option value="">Choose a player...</option>
              {optionsFor(playerB).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "6px", color: "#56616b", fontSize: "13px" }}>
            Player 2
            <select value={playerB} onChange={(e) => setPlayerB(e.target.value)} style={selectStyle}>
              <option value="">Choose a player...</option>
              {optionsFor(playerA).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {playerOptions.length === 0 && (
          <p style={{ margin: "12px 0 0 0", color: "#7f8c8d", fontSize: "13px" }}>
            Save a box score from Home to populate the player list.
          </p>
        )}
      </div>

      {compareLoading && <p style={{ color: "#56616b", marginBottom: "16px" }}>Loading player comparison...</p>}

      {compareDashboards.length >= 2 && !compareLoading && (
        <PlayerComparison dashboards={compareDashboards} />
      )}
    </section>
  );
}
