"use client";

import { FormEvent, useState } from "react";
import UploadDual from "../components/UploadDual";
import { useTeam } from "../components/TeamProvider";
import { COLORS, pageHeader, pageInner, pageMain, pageShell, subtitleStyle, titleStyle } from "../lib/theme";

export default function Page() {
  const { teams, currentTeam, createTeam, selectTeam, loading } = useTeam();
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    setError("");
    try {
      await createTeam(newTeamName.trim());
      setNewTeamName("");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not create team.",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={pageShell}>
      <div style={pageInner}>
        <header style={pageHeader}>
          <h1 style={{ ...titleStyle, fontSize: "clamp(1.6em, 3vw, 2.2em)" }}>Your team workspace</h1>
          <p style={subtitleStyle}>
            Create a team, upload CSV box scores, calculate advanced stats, and save them to that team only.
          </p>
        </header>

        <main style={pageMain}>
          <section style={{ marginBottom: "28px" }}>
            <h2 style={{ color: COLORS.navy, margin: "0 0 12px 0" }}>
              {teams.length ? "Current team" : "Start with your team name"}
            </h2>
            {loading && <p style={{ color: COLORS.muted }}>Loading teams...</p>}
            {teams.length > 0 && (
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => selectTeam(team.id)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: currentTeam?.id === team.id ? `1px solid ${COLORS.gold}` : `1px solid ${COLORS.greyBorder}`,
                      background: currentTeam?.id === team.id ? COLORS.navy : COLORS.greyRow,
                      color: currentTeam?.id === team.id ? COLORS.gold : COLORS.navy,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {team.name}
                    <span style={{ display: "block", fontSize: "12px", fontWeight: 500 }}>
                      {team.game_count} games · {team.player_count} players
                    </span>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ display: "grid", gap: "6px", color: COLORS.navy, fontWeight: 600 }}>
                {teams.length ? "Add another team" : "Team name"}
                <input
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                  placeholder="e.g. Metro Spiders"
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: `1px solid ${COLORS.greyBorder}`,
                    minWidth: "240px",
                    color: COLORS.navy,
                  }}
                />
              </label>
              <button
                type="submit"
                disabled={creating || !newTeamName.trim()}
                className="upload-calculate"
                style={{ width: "auto" }}
              >
                {creating ? "Adding..." : teams.length ? "Add team" : "Create team"}
              </button>
            </form>
            {error && (
              <p style={{ color: COLORS.danger, marginTop: "12px" }}>{error}</p>
            )}
          </section>

          {currentTeam ? (
            <UploadDual />
          ) : (
            <p style={{ color: COLORS.muted, margin: 0 }}>
              Enter a team name to start tracking box scores, team metrics, and individual player stats.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
