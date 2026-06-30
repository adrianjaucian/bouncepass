"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import PlayerComparison from "../../components/PlayerComparison";
import PlayerDashboardDetail from "../../components/PlayerDashboardDetail";
import PlayerLeagueLeaders from "../../components/PlayerLeagueLeaders";
import SiteNav from "../../components/SiteNav";
import api from "../../lib/api";
import { GENDER_OPTIONS, REGION_OPTIONS } from "../../lib/gender";

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

const MAX_COMPARE_PLAYERS = 3;

function PlayerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlayer = searchParams.get("player") || "";

  const [players, setPlayers] = useState<string[]>([]);
  const [genderFilter, setGenderFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [search, setSearch] = useState(initialPlayer);
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer);
  const [dashboard, setDashboard] = useState<PlayerDashboard | null>(null);
  const [comparePlayers, setComparePlayers] = useState<string[]>([]);
  const [compareDashboards, setCompareDashboards] = useState<PlayerDashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
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
      setDashboard(null);
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
    setComparePlayers([]);
    setCompareDashboards([]);
    setError("");
    setShowSuggestions(false);
    router.replace("/player-dashboard");
  };

  const addToCompare = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setComparePlayers((current) => {
      if (current.includes(trimmed)) return current;
      if (current.length >= MAX_COMPARE_PLAYERS) return current;
      return [...current, trimmed];
    });
  };

  const removeFromCompare = (name: string) => {
    setComparePlayers((current) => current.filter((player) => player !== name));
  };

  const hasResults = Boolean(selectedPlayer.trim() || comparePlayers.length > 0 || dashboard || compareDashboards.length > 0);
  const currentPlayerName = dashboard?.player_name ?? "";
  const canAddCurrentToCompare =
    currentPlayerName !== "" &&
    !comparePlayers.includes(currentPlayerName) &&
    comparePlayers.length < MAX_COMPARE_PLAYERS;

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
          <h1 style={{ color: "#2c3e50", margin: "0 0 10px 0", fontSize: "2.2em" }}>Player Dashboard</h1>
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
              <button
                type="button"
                onClick={() => dashboard?.player_name && addToCompare(dashboard.player_name)}
                disabled={!canAddCurrentToCompare}
                style={{
                  padding: "12px 20px",
                  backgroundColor: canAddCurrentToCompare ? "#8e44ad" : "#bdc3c7",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: canAddCurrentToCompare ? "pointer" : "not-allowed",
                }}
              >
                {canAddCurrentToCompare ? "Add to compare" : "Compare full (3 max)"}
              </button>
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

          {comparePlayers.length > 0 && (
            <div
              style={{
                marginBottom: "24px",
                padding: "14px 16px",
                backgroundColor: "#f9f4fd",
                border: "1px solid #e8d4f4",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                <p style={{ margin: 0, color: "#56616b", fontSize: "14px" }}>
                  Comparing {comparePlayers.length} of {MAX_COMPARE_PLAYERS} players
                  {comparePlayers.length < 2 ? " — add at least one more to see side-by-side stats" : ""}
                </p>
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
                    border: "1px solid #e8d4f4",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Clear comparison
                </button>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                {comparePlayers.map((name) => (
                  <span
                    key={name}
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
            </div>
          )}

          {(loading || compareLoading) && <p style={{ color: "#56616b", marginBottom: "24px" }}>Loading player data...</p>}

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

          {comparePlayers.length >= 2 && compareDashboards.length >= 2 && !compareLoading && (
            <PlayerComparison dashboards={compareDashboards} onRemovePlayer={removeFromCompare} />
          )}

          {dashboard && !loading && (
            <div style={{ marginBottom: "32px", paddingBottom: "8px", borderBottom: comparePlayers.length >= 2 ? "1px solid #e1e8ed" : "none" }}>
              <PlayerDashboardDetail dashboard={dashboard} />
            </div>
          )}

          {!selectedPlayer.trim() && !loading && !error && !comparePlayers.length && (
            <p style={{ color: "#7f8c8d", margin: "0 0 24px 0" }}>Search for a player to view their dashboard.</p>
          )}

          <PlayerLeagueLeaders gender={genderFilter} region={regionFilter} />
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
