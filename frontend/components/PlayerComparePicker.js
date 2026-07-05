"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

export default function PlayerComparePicker({
  excludePlayers = [],
  onSelect,
  label = "Search for a player",
  placeholder = "Search any player in your database...",
  inputId = "player-compare-search",
  gender = "",
  region = "",
  teamName = "",
  teamGender = "",
  teamRegion = "",
}) {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlayers = async () => {
      setLoading(true);
      try {
        const params = {};
        if (gender) params.gender = gender;
        if (region) params.region = region;
        if (teamName) params.team_name = teamName;
        if (teamGender) params.team_gender = teamGender;
        if (teamRegion) params.team_region = teamRegion;
        const res = await api.get("/players", { params });
        setPlayers(res.data?.players || []);
      } catch {
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };
    loadPlayers();
  }, [gender, region, teamName, teamGender, teamRegion]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const excluded = new Set(excludePlayers.map((name) => name.toLowerCase()));
    return players
      .filter((name) => !excluded.has(name.toLowerCase()))
      .filter((name) => !query || name.toLowerCase().includes(query))
      .slice(0, 25);
  }, [players, search, excludePlayers]);

  const handleSelect = (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;
    onSelect(trimmed);
    setSearch("");
    setShowSuggestions(false);
  };

  return (
    <div style={{ maxWidth: "420px" }}>
      <label htmlFor={inputId} style={{ display: "block", marginBottom: "6px", color: "#56616b", fontSize: "13px" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={inputId}
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            window.setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: showSuggestions && filteredPlayers.length > 0 ? "8px 8px 0 0" : "8px",
            border: "1px solid #d0d7de",
            fontSize: "14px",
            color: "#000",
            boxSizing: "border-box",
          }}
        />
        {showSuggestions && filteredPlayers.length > 0 && (
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              margin: 0,
              padding: 0,
              listStyle: "none",
              backgroundColor: "#fff",
              border: "1px solid #d0d7de",
              borderTop: "none",
              borderRadius: "0 0 8px 8px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
              maxHeight: "280px",
              overflowY: "auto",
              zIndex: 30,
            }}
          >
            {filteredPlayers.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(name)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: "1px solid #f0f3f6",
                    backgroundColor: "#fff",
                    color: "#2c3e50",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {loading && (
        <p style={{ margin: "8px 0 0 0", color: "#7f8c8d", fontSize: "12px" }}>Loading players...</p>
      )}
      {!loading && players.length > 0 && (
        <p style={{ margin: "8px 0 0 0", color: "#7f8c8d", fontSize: "12px" }}>
          {players.length} players in database
        </p>
      )}
    </div>
  );
}
