"use client";

import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { decodeTeamOption, encodeTeamOption, GENDER_OPTIONS, REGION_OPTIONS } from "../lib/gender";
import PlayerComparePicker from "./PlayerComparePicker";
import PlayerComparison from "./PlayerComparison";

const MAX_COMPARE_PLAYERS = 5;
const BLANK_SELECTION = "";

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
  const [genderFilter, setGenderFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [teamOptions, setTeamOptions] = useState([]);
  const [playerOptions, setPlayerOptions] = useState([]);
  const [manualPlayerSelection, setManualPlayerSelection] = useState(BLANK_SELECTION);
  const [comparePlayers, setComparePlayers] = useState(() =>
    initialComparePlayers.slice(0, MAX_COMPARE_PLAYERS),
  );
  const [compareDashboards, setCompareDashboards] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    if (initialComparePlayers.length === 0) return;
    setComparePlayers(initialComparePlayers.slice(0, MAX_COMPARE_PLAYERS));
  }, [initialComparePlayers.join("\u0000")]);

  const selectedTeam = teamFilter ? decodeTeamOption(teamFilter) : null;

  const filterParams = {
    ...(genderFilter ? { gender: genderFilter } : {}),
    ...(regionFilter ? { region: regionFilter } : {}),
    ...(selectedTeam?.name ? { team_name: selectedTeam.name } : {}),
    ...(selectedTeam?.gender ? { team_gender: selectedTeam.gender } : {}),
    ...(selectedTeam?.region ? { team_region: selectedTeam.region } : {}),
  };

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const params = {};
        if (genderFilter) params.gender = genderFilter;
        if (regionFilter) params.region = regionFilter;
        const res = await api.get("/teams", { params });
        setTeamOptions(res.data?.options || []);
        setTeamFilter("");
      } catch {
        setTeamOptions([]);
      }
    };
    loadTeams();
  }, [genderFilter, regionFilter]);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const res = await api.get("/players", { params: filterParams });
        setPlayerOptions(res.data?.players || []);
        setManualPlayerSelection(BLANK_SELECTION);
      } catch {
        setPlayerOptions([]);
      }
    };
    loadPlayers();
  }, [genderFilter, regionFilter, teamFilter]);

  const fetchDashboard = useCallback(
    async (playerName) => {
      const res = await api.get("/players/dashboard", {
        params: { player_name: playerName.trim(), ...filterParams },
      });
      return res.data;
    },
    [genderFilter, regionFilter],
  );

  useEffect(() => {
    const loadComparison = async () => {
      if (comparePlayers.length < 2) {
        setCompareDashboards([]);
        return;
      }

      setCompareLoading(true);
      try {
        const results = await Promise.all(comparePlayers.map((name) => fetchDashboard(name)));
        setCompareDashboards(results.filter((item) => item?.stats));
      } catch {
        setCompareDashboards([]);
      } finally {
        setCompareLoading(false);
      }
    };
    loadComparison();
  }, [comparePlayers, fetchDashboard]);

  const addToCompare = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setComparePlayers((current) => {
      if (current.includes(trimmed)) return current;
      if (current.length >= MAX_COMPARE_PLAYERS) return current;
      return [...current, trimmed];
    });
  };

  const removeFromCompare = (name) => {
    setComparePlayers((current) => current.filter((player) => player !== name));
  };

  const availablePlayers = playerOptions.filter((name) => !comparePlayers.includes(name));

  const handleManualPlayerSelect = (value) => {
    if (!value) return;
    addToCompare(value);
    setManualPlayerSelection(BLANK_SELECTION);
  };

  return (
    <section>
      <p style={{ margin: "0 0 20px 0", color: "#56616b", fontSize: "14px" }}>
        Compare up to five players side by side. Search or use the filters below to pick from a list.
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
        {comparePlayers.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
            <button
              type="button"
              onClick={() => {
                setComparePlayers([]);
                setCompareDashboards([]);
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "#fff",
                color: "#c0392b",
                border: "1px solid #f5dcc8",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Clear players
            </button>
          </div>
        )}

        {comparePlayers.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
            {comparePlayers.map((name) => (
              <span
                key={name}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  backgroundColor: "#fff",
                  border: "1px solid #f5dcc8",
                  borderRadius: "999px",
                  fontSize: "13px",
                  color: "#2c3e50",
                }}
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeFromCompare(name)}
                  aria-label={`Remove ${name} from comparison`}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#c0392b",
                    cursor: "pointer",
                    fontWeight: "bold",
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {comparePlayers.length < MAX_COMPARE_PLAYERS && (
          <>
            <PlayerComparePicker
              excludePlayers={comparePlayers}
              onSelect={addToCompare}
              gender={genderFilter}
              region={regionFilter}
              teamName={selectedTeam?.name || ""}
              teamGender={selectedTeam?.gender || ""}
              teamRegion={selectedTeam?.region || ""}
              label={`Search for player ${comparePlayers.length + 1} of ${MAX_COMPARE_PLAYERS}`}
              inputId="scouting-player-compare-search"
            />

            <div
              style={{
                marginTop: "16px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "12px",
                maxWidth: "720px",
              }}
            >
              <label style={{ display: "grid", gap: "6px", color: "#56616b", fontSize: "13px" }}>
                Gender
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  style={selectStyle}
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: "6px", color: "#56616b", fontSize: "13px" }}>
                Region
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  style={selectStyle}
                >
                  {REGION_OPTIONS.map((option) => (
                    <option key={option.value || "all-regions"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: "6px", color: "#56616b", fontSize: "13px" }}>
                Team
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  style={selectStyle}
                  disabled={teamOptions.length === 0}
                >
                  <option value="">
                    {teamOptions.length === 0 ? "No teams match filters" : "All teams"}
                  </option>
                  {teamOptions.map((option) => {
                    const value = encodeTeamOption(option.name, option.gender, option.region);
                    return (
                      <option key={value} value={value}>
                        {option.label || option.name}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label style={{ display: "grid", gap: "6px", color: "#56616b", fontSize: "13px" }}>
                Select player
                <select
                  value={manualPlayerSelection}
                  onChange={(e) => {
                    setManualPlayerSelection(e.target.value);
                    handleManualPlayerSelect(e.target.value);
                  }}
                  style={selectStyle}
                  disabled={availablePlayers.length === 0}
                >
                  <option value={BLANK_SELECTION}>
                    {availablePlayers.length === 0 ? "No players match filters" : "Choose a player..."}
                  </option>
                  {availablePlayers.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        {comparePlayers.length === 1 && (
          <p style={{ margin: "12px 0 0 0", color: "#7f8c8d", fontSize: "13px" }}>
            Add at least one more player to see side-by-side stats.
          </p>
        )}
      </div>

      {compareLoading && <p style={{ color: "#56616b", marginBottom: "16px" }}>Loading player comparison...</p>}

      {comparePlayers.length >= 2 && compareDashboards.length >= 2 && !compareLoading && (
        <PlayerComparison dashboards={compareDashboards} onRemovePlayer={removeFromCompare} />
      )}
    </section>
  );
}
