"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "../lib/api";
import { formatCompetitionLabel } from "../lib/gender";

const tableHeaderStyle = {
  padding: "10px",
  color: "#000",
  fontWeight: "bold",
};

function formatRating(value) {
  return value == null ? "—" : Number(value).toFixed(1);
}

function formatPercent(value) {
  return value == null ? "—" : `${(Number(value) * 100).toFixed(1)}%`;
}

function TeamMetricLeaderTable({ title, teams, formatValue, onSelectTeam }) {
  if (!teams?.length) return null;

  return (
    <div style={{ flex: "1 1 280px", minWidth: "260px" }}>
      <h4 style={{ margin: "0 0 12px 0", color: "#2c3e50", fontSize: "1.05em" }}>{title}</h4>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: "1px solid #e1e8ed" }}>
        <thead>
          <tr style={{ backgroundColor: "#f1f6f9" }}>
            <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Team</th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>GP</th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>Record</th>
            <th style={{ ...tableHeaderStyle, textAlign: "center" }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => (
            <tr key={`${team.team_name}-${team.gender}-${team.region}`} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc" }}>
              <td style={{ padding: "10px", color: "#000" }}>
                {onSelectTeam ? (
                  <button
                    type="button"
                    onClick={() => onSelectTeam(team)}
                    style={{
                      border: "none",
                      background: "none",
                      padding: 0,
                      color: "#3498db",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "14px",
                    }}
                  >
                    {team.team_label}
                  </button>
                ) : (
                  team.team_label
                )}
              </td>
              <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>{team.games_played}</td>
              <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>
                {team.wins}-{team.losses}
              </td>
              <td style={{ padding: "10px", textAlign: "center", color: "#000", fontWeight: 600 }}>
                {formatValue(team.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TeamLeagueLeaders({ gender = "men", region = "", onSelectTeam }) {
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
        const res = await api.get("/teams/leaders", { params });
        setLeaders(res.data);
      } catch (err) {
        const message =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not load team season leaders.";
        setError(typeof message === "string" ? message : JSON.stringify(message));
      } finally {
        setLoading(false);
      }
    };
    loadLeaders();
  }, [gender, region]);

  if (loading) {
    return <p style={{ color: "#56616b", margin: "0 0 24px 0" }}>Loading team season leaders...</p>;
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

  if (!leaders?.league_teams) {
    return (
      <p style={{ color: "#56616b", margin: "0 0 24px 0" }}>
        No team data yet for this filter. Save more games or try another gender or region.
      </p>
    );
  }

  const competitionLabel = formatCompetitionLabel(gender, region);
  const titleSuffix = competitionLabel ? ` (${competitionLabel})` : "";
  const description = `Top teams from ${leaders.league_games} saved game${
    leaders.league_games === 1 ? "" : "s"
  }${competitionLabel ? ` in ${competitionLabel}` : ""} (${leaders.league_teams} teams). Click a team to open its dashboard.`;

  return (
    <div style={{ marginBottom: "32px" }}>
      <h3 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>Season Leaders{titleSuffix}</h3>
      <p style={{ margin: "0 0 20px 0", color: "#7f8c8d", fontSize: "14px" }}>
        {description}{" "}
        <Link href="/metric-definitions#team-efficiency" style={{ color: "#3498db" }}>
          See metric definitions
        </Link>
        .
      </p>

      <section style={{ marginBottom: "28px" }}>
        <h4 style={{ margin: "0 0 14px 0", color: "#2c3e50" }}>Team Efficiency</h4>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <TeamMetricLeaderTable title="Offensive Rating (ORtg)" teams={leaders.efficiency?.ortg} formatValue={formatRating} onSelectTeam={onSelectTeam} />
          <TeamMetricLeaderTable title="Defensive Rating (DRtg)" teams={leaders.efficiency?.drtg} formatValue={formatRating} onSelectTeam={onSelectTeam} />
          <TeamMetricLeaderTable title="Net Rating" teams={leaders.efficiency?.net_rating} formatValue={formatRating} onSelectTeam={onSelectTeam} />
          <TeamMetricLeaderTable title="Possession ORtg" teams={leaders.efficiency?.possession_ortg} formatValue={formatRating} onSelectTeam={onSelectTeam} />
          <TeamMetricLeaderTable title="Possession DRtg" teams={leaders.efficiency?.possession_drtg} formatValue={formatRating} onSelectTeam={onSelectTeam} />
        </div>
      </section>

      <section>
        <h4 style={{ margin: "0 0 14px 0", color: "#2c3e50" }}>Shooting &amp; Pace</h4>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <TeamMetricLeaderTable title="True Shooting % (TS%)" teams={leaders.shooting_pace?.ts_pct} formatValue={formatPercent} onSelectTeam={onSelectTeam} />
          <TeamMetricLeaderTable title="Effective FG% (eFG%)" teams={leaders.shooting_pace?.efg_pct} formatValue={formatPercent} onSelectTeam={onSelectTeam} />
          <TeamMetricLeaderTable title="Pace" teams={leaders.shooting_pace?.pace} formatValue={formatRating} onSelectTeam={onSelectTeam} />
        </div>
      </section>
    </div>
  );
}
