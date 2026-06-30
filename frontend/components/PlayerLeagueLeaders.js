"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import { formatCompetitionLabel } from "../lib/gender";
import SeasonLeadersSection from "./SeasonLeadersSection";

export default function PlayerLeagueLeaders({ gender = "", region = "" }) {
  const [leaders, setLeaders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLeaders = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (gender) params.gender = gender;
        if (region) params.region = region;
        const res = await api.get("/players/leaders", { params });
        setLeaders(res.data);
      } catch (err) {
        const message =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not load league leaders.";
        setError(typeof message === "string" ? message : JSON.stringify(message));
      } finally {
        setLoading(false);
      }
    };
    loadLeaders();
  }, [gender, region]);

  if (loading) {
    return <p style={{ color: "#56616b", margin: "0 0 24px 0" }}>Loading league leaders...</p>;
  }

  if (error) {
    return (
      <div
        style={{
          color: "#c0392b",
          backgroundColor: "#fdecea",
          padding: "14px",
          borderRadius: "8px",
          border: "1px solid #f5c6cb",
          marginBottom: "24px",
        }}
      >
        {error}
      </div>
    );
  }

  if (!leaders?.players?.length) {
    return null;
  }

  const competitionLabel = formatCompetitionLabel(gender, region);
  const titleSuffix = competitionLabel ? ` (${competitionLabel})` : "";

  return (
    <SeasonLeadersSection
      players={leaders.players}
      title={`League Leaders${titleSuffix}`}
      showTeams
      description={`Top players across all teams from ${leaders.league_games} saved game${
        leaders.league_games === 1 ? "" : "s"
      }${competitionLabel ? ` in ${competitionLabel}` : ""} (${leaders.league_players} players). Only players with at least 50% of their team's games played qualify. Click a name to open their dashboard.`}
    />
  );
}
