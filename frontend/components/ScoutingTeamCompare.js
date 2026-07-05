"use client";

import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { GENDER_OPTIONS, REGION_OPTIONS, encodeTeamOption, formatTeamLabel } from "../lib/gender";
import TeamComparePicker from "./TeamComparePicker";
import TeamComparison from "./TeamComparison";

const MAX_COMPARE_TEAMS = 2;
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
 * @param {{ initialCompareTeams?: { name: string, gender: string, region: string }[] }} props
 */
export default function ScoutingTeamCompare({ initialCompareTeams = [] }) {
  const [genderFilter, setGenderFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [teamOptions, setTeamOptions] = useState([]);
  const [manualTeamSelection, setManualTeamSelection] = useState(BLANK_SELECTION);
  const [compareTeams, setCompareTeams] = useState(() =>
    initialCompareTeams.slice(0, MAX_COMPARE_TEAMS),
  );
  const [compareDashboards, setCompareDashboards] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    if (initialCompareTeams.length === 0) return;
    setCompareTeams(initialCompareTeams.slice(0, MAX_COMPARE_TEAMS));
  }, [initialCompareTeams.map((team) => encodeTeamOption(team.name, team.gender, team.region)).join("\u0000")]);

  const fetchTeamDashboard = useCallback(async (team) => {
    const res = await api.get("/teams/dashboard", {
      params: {
        team_name: team.name.trim(),
        gender: team.gender,
        region: team.region,
      },
    });
    return res.data;
  }, []);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const params = {};
        if (genderFilter) params.gender = genderFilter;
        if (regionFilter) params.region = regionFilter;
        const res = await api.get("/teams", { params });
        setTeamOptions(res.data?.options || []);
        setManualTeamSelection(BLANK_SELECTION);
      } catch {
        setTeamOptions([]);
      }
    };
    loadTeams();
  }, [genderFilter, regionFilter]);

  useEffect(() => {
    const loadComparison = async () => {
      if (compareTeams.length < 2) {
        setCompareDashboards([]);
        return;
      }

      setCompareLoading(true);
      try {
        const results = await Promise.all(compareTeams.map((team) => fetchTeamDashboard(team)));
        setCompareDashboards(results.filter((item) => item?.games_played > 0));
      } catch {
        setCompareDashboards([]);
      } finally {
        setCompareLoading(false);
      }
    };
    loadComparison();
  }, [compareTeams, fetchTeamDashboard]);

  const addToCompare = (team) => {
    if (!team.name?.trim() || !team.gender || !team.region) return;
    setCompareTeams((current) => {
      const exists = current.some(
        (item) => item.name === team.name && item.gender === team.gender && item.region === team.region,
      );
      if (exists) return current;
      if (current.length >= MAX_COMPARE_TEAMS) return current;
      return [...current, team];
    });
  };

  const removeFromCompare = (team) => {
    setCompareTeams((current) =>
      current.filter(
        (item) => !(item.name === team.name && item.gender === team.gender && item.region === team.region),
      ),
    );
  };

  const formatTeamChipLabel = (team) => formatTeamLabel(team.name, team.gender, team.region) || team.name;

  const availableTeamOptions = teamOptions.filter(
    (option) =>
      option.name &&
      option.gender &&
      option.region &&
      !compareTeams.some(
        (item) =>
          item.name === option.name && item.gender === option.gender && item.region === option.region,
      ),
  );

  const handleManualTeamSelect = (value) => {
    if (!value) return;
    const option = availableTeamOptions.find(
      (item) => encodeTeamOption(item.name, item.gender, item.region) === value,
    );
    if (!option) return;
    addToCompare({ name: option.name, gender: option.gender, region: option.region });
    setManualTeamSelection(BLANK_SELECTION);
  };

  return (
    <section>
      <p style={{ margin: "0 0 20px 0", color: "#56616b", fontSize: "14px" }}>
        Compare any two teams — men&apos;s or women&apos;s, any NBL1 region. Search or use the filters below.
      </p>

      <div
        style={{
          padding: "18px 20px",
          backgroundColor: "#f9f4fd",
          border: "1px solid #e8d4f4",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "flex-start" }}>
          {compareTeams.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCompareTeams([]);
                setCompareDashboards([]);
              }}
              style={{
                marginLeft: "auto",
                padding: "6px 12px",
                backgroundColor: "#fff",
                color: "#c0392b",
                border: "1px solid #e8d4f4",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Clear teams
            </button>
          )}
        </div>

        {compareTeams.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
            {compareTeams.map((team) => (
              <span
                key={`${team.name}-${team.gender}-${team.region}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  backgroundColor: "#fff",
                  border: "1px solid #e8d4f4",
                  borderRadius: "999px",
                  fontSize: "13px",
                  color: "#2c3e50",
                }}
              >
                {formatTeamChipLabel(team)}
                <button
                  type="button"
                  onClick={() => removeFromCompare(team)}
                  aria-label={`Remove ${team.name} from comparison`}
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

        {compareTeams.length < MAX_COMPARE_TEAMS && (
          <>
            <TeamComparePicker
              excludeTeams={compareTeams}
              onSelect={addToCompare}
              gender={genderFilter}
              region={regionFilter}
              label={
                compareTeams.length === 0 ? "Search for first team" : "Search for second team"
              }
              inputId="scouting-team-compare-search"
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
                Select team
                <select
                  value={manualTeamSelection}
                  onChange={(e) => {
                    setManualTeamSelection(e.target.value);
                    handleManualTeamSelect(e.target.value);
                  }}
                  style={selectStyle}
                  disabled={availableTeamOptions.length === 0}
                >
                  <option value={BLANK_SELECTION}>
                    {availableTeamOptions.length === 0 ? "No teams match filters" : "Choose a team..."}
                  </option>
                  {availableTeamOptions.map((option) => {
                    const value = encodeTeamOption(option.name, option.gender, option.region);
                    return (
                      <option key={value} value={value}>
                        {option.label || formatTeamLabel(option.name, option.gender, option.region)}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
          </>
        )}

        {compareTeams.length === 1 && (
          <p style={{ margin: "12px 0 0 0", color: "#7f8c8d", fontSize: "13px" }}>
            Add one more team to see side-by-side stats.
          </p>
        )}
      </div>

      {compareLoading && <p style={{ color: "#56616b", marginBottom: "16px" }}>Loading team comparison...</p>}

      {compareTeams.length >= 2 && compareDashboards.length >= 2 && !compareLoading && (
        <TeamComparison dashboards={compareDashboards} onRemoveTeam={removeFromCompare} />
      )}
    </section>
  );
}
