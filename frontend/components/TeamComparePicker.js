"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { formatTeamLabel } from "../lib/gender";

function teamKey(team) {
  return `${team.name}::${team.gender}::${team.region}`;
}

function isSameTeam(a, b) {
  return a.name === b.name && a.gender === b.gender && a.region === b.region;
}

export default function TeamComparePicker({
  excludeTeams = [],
  onSelect,
  label = "Select team",
  placeholder = "Search any team (men or women, any region)...",
  inputId = "team-compare-search",
  gender = "",
  region = "",
}) {
  const [allOptions, setAllOptions] = useState([]);
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true);
      try {
        const res = await api.get("/teams");
        setAllOptions(res.data?.options || []);
      } catch {
        setAllOptions([]);
      } finally {
        setLoading(false);
      }
    };
    loadTeams();
  }, []);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allOptions
      .filter(
        (option) =>
          option.name &&
          option.gender &&
          option.region &&
          (!gender || option.gender === gender) &&
          (!region || option.region === region) &&
          !excludeTeams.some((excluded) =>
            isSameTeam(
              { name: option.name, gender: option.gender, region: option.region },
              excluded,
            ),
          ),
      )
      .filter((option) => {
        if (!query) return true;
        const labelText = (option.label || option.name).toLowerCase();
        return labelText.includes(query) || option.name.toLowerCase().includes(query);
      })
      .slice(0, 25);
  }, [allOptions, search, excludeTeams, gender, region]);

  const handleSelect = (option) => {
    if (!option?.name || !option.gender || !option.region) return;
    onSelect({
      name: option.name,
      gender: option.gender,
      region: option.region,
    });
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
            borderRadius: showSuggestions && filteredOptions.length > 0 ? "8px 8px 0 0" : "8px",
            border: "1px solid #d0d7de",
            fontSize: "14px",
            color: "#000",
            boxSizing: "border-box",
          }}
        />
        {showSuggestions && filteredOptions.length > 0 && (
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
            {filteredOptions.map((option) => (
              <li key={teamKey(option)}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option)}
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
                  {option.label || formatTeamLabel(option.name, option.gender, option.region)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {loading && (
        <p style={{ margin: "8px 0 0 0", color: "#7f8c8d", fontSize: "12px" }}>Loading teams...</p>
      )}
      {!loading && allOptions.length > 0 && (
        <p style={{ margin: "8px 0 0 0", color: "#7f8c8d", fontSize: "12px" }}>
          {allOptions.length} teams across all competitions
        </p>
      )}
    </div>
  );
}
