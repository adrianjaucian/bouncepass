"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import PlayerDashboardDetail from "../../components/PlayerDashboardDetail";
import PlayerLeagueLeaders from "../../components/PlayerLeagueLeaders";
import SiteNav from "../../components/SiteNav";
import api from "../../lib/api";
import { GENDER_OPTIONS, REGION_OPTIONS, decodeTeamOption, encodeTeamOption } from "../../lib/gender";

type PlayerDashboard = {
  player_name: string;
  query: string;
  games_played: number;
  teams: string[];
  stats: Record<string, any> | null;
  games: Record<string, any>[];
  trend_charts?: Record<string, any>;
  league_players: number;
  league_games: number;
};

const BLANK_TEAM_FILTER = "";

function PlayerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlayer = searchParams.get("player") || "";

  const [players, setPlayers] = useState<string[]>([]);
  const [teamOptions, setTeamOptions] = useState<
    { name: string; gender?: string | null; region?: string | null; label: string }[]
  >([]);
  const [teamFilter, setTeamFilter] = useState(BLANK_TEAM_FILTER);
  const [genderFilter, setGenderFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [search, setSearch] = useState(initialPlayer);
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer);
  const [dashboard, setDashboard] = useState<PlayerDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (genderFilter) params.gender = genderFilter;
    if (regionFilter) params.region = regionFilter;
    return params;
  }, [genderFilter, regionFilter]);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const res = await api.get("/players", { params: filterParams });
        setPlayers(res.data?.players || []);
      } catch {
        setPlayers([]);
      }
    };
    loadPlayers();
  }, [filterParams]);

  const selectedTeamFilter = useMemo(() => decodeTeamOption(teamFilter), [teamFilter]);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const params: Record<string, string> = {};
        if (genderFilter) params.gender = genderFilter;
        if (regionFilter) params.region = regionFilter;
        const res = await api.get("/teams", { params });
        const options = res.data?.options || [];
        setTeamOptions(options);
        if (teamFilter) {
          const current = decodeTeamOption(teamFilter);
          const stillValid = options.some(
            (option: { name: string; gender?: string | null; region?: string | null }) =>
              option.name === current.name &&
              (option.gender || "") === current.gender &&
              (option.region || "") === current.region,
          );
          if (!stillValid) {
            setTeamFilter(BLANK_TEAM_FILTER);
          }
        }
      } catch {
        setTeamOptions([]);
      }
    };
    loadTeams();
  }, [genderFilter, regionFilter]);

  useEffect(() => {
    const query = initialPlayer.trim();
    if (!query) return;
    setSearch(query);
    setSelectedPlayer(query);
  }, [initialPlayer]);

  const fetchDashboard = useCallback(
    async (playerName: string) => {
      const res = await api.get("/players/dashboard", {
        params: { player_name: playerName.trim(), ...filterParams },
      });
      return res.data as PlayerDashboard;
    },
    [filterParams],
  );

  useEffect(() => {
    const loadDashboard = async () => {
      if (!selectedPlayer.trim()) {
        setDashboard(null);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await fetchDashboard(selectedPlayer);
        setDashboard(data);
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not load player dashboard.";
        setError(typeof message === "string" ? message : JSON.stringify(message));
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [selectedPlayer, fetchDashboard]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return players.slice(0, 15);
    return players.filter((name) => name.toLowerCase().includes(query)).slice(0, 20);
  }, [players, search]);

  const selectPlayer = (name: string) => {
    const next = name.trim();
    if (!next) return;
    setSearch(next);
    setSelectedPlayer(next);
    setShowSuggestions(false);
    router.replace(`/player-dashboard?player=${encodeURIComponent(next)}`);
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;

    const exact = players.find((name) => name.toLowerCase() === query.toLowerCase());
    if (exact) {
      selectPlayer(exact);
      return;
    }

    if (filteredPlayers.length > 0) {
      selectPlayer(filteredPlayers[0]);
    }
  };

  const clearResults = () => {
    setSearch("");
    setSelectedPlayer("");
    setDashboard(null);
    setError("");
    setShowSuggestions(false);
    router.replace("/player-dashboard");
  };

  const hasResults = Boolean(selectedPlayer.trim() || dashboard);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <header
          style={{
            textAlign: "center",
            marginBottom: "24px",
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ color: "#2c3e50", margin: "0 0 10px 0", fontSize: "2.2em" }}>Player Metrics</h1>
          <p style={{ color: "#7f8c8d", margin: 0 }}>
            Season totals, per-game averages, advanced metrics, and league ranks across all saved box scores.
          </p>
        </header>

        <SiteNav />

        <main
          style={{
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            {GENDER_OPTIONS.map((option) => (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => setGenderFilter(option.value)}
                style={{
                  padding: "8px 14px",
                  backgroundColor: genderFilter === option.value ? "#3498db" : "#ecf0f1",
                  color: genderFilter === option.value ? "#fff" : "#2c3e50",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            {REGION_OPTIONS.map((option) => (
              <button
                key={option.value || "all-regions"}
                type="button"
                onClick={() => setRegionFilter(option.value)}
                style={{
                  padding: "8px 14px",
                  backgroundColor: regionFilter === option.value ? "#27ae60" : "#ecf0f1",
                  color: regionFilter === option.value ? "#fff" : "#2c3e50",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: "20px", maxWidth: "360px" }}>
            <label htmlFor="team-leaders-filter" style={{ display: "block", marginBottom: "8px", color: "#2c3e50", fontWeight: "bold", fontSize: "14px" }}>
              Filter season leaders by team
            </label>
            <select
              id="team-leaders-filter"
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #d0d7de",
                color: "#000",
                backgroundColor: "#fff",
                fontSize: "14px",
              }}
            >
              <option value={BLANK_TEAM_FILTER}>All teams</option>
              {teamOptions.map((option) => {
                const value = encodeTeamOption(
                  option.name,
                  option.gender || genderFilter,
                  option.region || regionFilter,
                );
                return (
                  <option key={value} value={value}>
                    {option.label || option.name}
                  </option>
                );
              })}
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ marginBottom: "16px" }}>
            <label htmlFor="player-search" style={{ display: "block", marginBottom: "8px", color: "#2c3e50", fontWeight: "bold" }}>
              Search players
            </label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ position: "relative", flex: "1 1 260px" }}>
                <input
                  id="player-search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    window.setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  placeholder="Type a player name..."
                  autoComplete="off"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
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
                      maxHeight: "240px",
                      overflowY: "auto",
                      zIndex: 20,
                    }}
                  >
                    {filteredPlayers.map((name) => (
                      <li key={name}>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectPlayer(name)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 14px",
                            border: "none",
                            borderBottom: "1px solid #f0f3f6",
                            backgroundColor: selectedPlayer === name ? "#ebf5fb" : "#fff",
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
              {hasResults && (
                <button
                  type="button"
                  onClick={clearResults}
                  style={{
                    padding: "12px 20px",
                    backgroundColor: "#ecf0f1",
                    color: "#2c3e50",
                    border: "1px solid #d0d7de",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Clear results
                </button>
              )}
            </div>
            {players.length > 0 && (
              <p style={{ margin: "10px 0 0 0", color: "#7f8c8d", fontSize: "13px" }}>
                {players.length} player{players.length === 1 ? "" : "s"} in league database · select a name to load instantly
              </p>
            )}
          </form>

          {loading && <p style={{ color: "#56616b", marginBottom: "24px" }}>Loading player data...</p>}

          {error && (
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
          )}

          {dashboard && !loading && (
            <div style={{ marginBottom: "32px", paddingBottom: "8px" }}>
              <PlayerDashboardDetail dashboard={dashboard} />
            </div>
          )}

          {!selectedPlayer.trim() && !loading && !error && (
            <p style={{ color: "#7f8c8d", margin: "0 0 24px 0" }}>Search for a player to view their dashboard.</p>
          )}

          {!selectedPlayer.trim() && (
            <PlayerLeagueLeaders
              gender={genderFilter}
              region={regionFilter}
              teamName={selectedTeamFilter.name}
              teamGender={selectedTeamFilter.gender}
              teamRegion={selectedTeamFilter.region}
              onSelectPlayer={selectPlayer}
              selectedPlayer={selectedPlayer}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function PlayerDashboardPage() {
  return (
    <Suspense>
      <PlayerDashboardContent />
    </Suspense>
  );
}
