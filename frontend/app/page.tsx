"use client";

import { FormEvent, useState } from "react";
import UploadDual from "../components/UploadDual";
import { useTeam } from "../components/TeamProvider";
import { COLORS, DEFAULT_PRIMARY, DEFAULT_SECONDARY, pageHeader, pageInner, pageMain, pageShell, subtitleStyle, titleStyle } from "../lib/theme";

export default function Page() {
  const { teams, currentTeam, createTeam, selectTeam, loading } = useTeam();
  const [newTeamName, setNewTeamName] = useState("");
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    setError("");
    try {
      await createTeam(newTeamName.trim(), {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
      });
      setNewTeamName("");
      setPrimaryColor(DEFAULT_PRIMARY);
      setSecondaryColor(DEFAULT_SECONDARY);
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
          <h1 style={{ ...titleStyle, fontSize: "clamp(1.6em, 3vw, 2.2em)" }}>Player Analytics Systems and Storage</h1>
          <p style={subtitleStyle}>
            Create a team, upload CSV box scores, calculate advanced stats, and bounce the results..
          </p>
        </header>

        <main style={pageMain}>
          <section style={{ marginBottom: "28px" }}>
            <h2 style={{ color: COLORS.text, margin: "0 0 12px 0" }}>
              {teams.length ? "Current team" : "Start with your team name"}
            </h2>
            {loading && <p style={{ color: COLORS.muted }}>Loading teams...</p>}
            {teams.length > 0 && (
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                {teams.map((team) => {
                  const selected = currentTeam?.id === team.id;
                  const primary = team.primary_color || DEFAULT_PRIMARY;
                  const secondary = team.secondary_color || DEFAULT_SECONDARY;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => selectTeam(team.id)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: `1px solid ${selected ? secondary : COLORS.greyBorder}`,
                        background: selected ? primary : COLORS.greyRow,
                        color: selected ? secondary : COLORS.text,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <span className="team-color-dots" aria-hidden="true">
                        <span style={{ background: primary }} />
                        <span style={{ background: secondary }} />
                      </span>
                      {team.name}
                      <span style={{ display: "block", fontSize: "12px", fontWeight: 500 }}>
                        {team.game_count} games · {team.player_count} players
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <p style={{ color: COLORS.muted, fontSize: "13px", margin: "0 0 12px 0" }}>
              Choose a primary and secondary colour. The whole site uses that pair while the team is selected.
            </p>
            <form onSubmit={handleCreate} className="team-create-form">
              <label style={{ display: "grid", gap: "6px", color: COLORS.text, fontWeight: 600 }}>
                {teams.length ? "Add another team" : "Team name"}
                <input
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                  placeholder="e.g. Hornsby Spiders"
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: `1px solid ${COLORS.greyBorder}`,
                    minWidth: "240px",
                    color: COLORS.text,
                  }}
                />
              </label>
              <label className="team-color-field">
                Primary colour
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  aria-label="Primary colour"
                />
              </label>
              <label className="team-color-field">
                Secondary colour
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(event) => setSecondaryColor(event.target.value)}
                  aria-label="Secondary colour"
                />
              </label>
              <div className="team-color-preview" aria-hidden="true" style={{ background: primaryColor, borderColor: secondaryColor, color: secondaryColor }}>
                Preview
              </div>
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
