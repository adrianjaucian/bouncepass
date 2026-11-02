"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { applyTeamTheme, DEFAULT_PRIMARY, DEFAULT_SECONDARY, normalizeHex, resetTeamTheme } from "../lib/theme";
import {
  createLocalTeam,
  isUnavailableStatus,
  listLocalTeams,
  rememberTeamColors,
  withTeamColors,
} from "../lib/workspaceStore";

const TeamContext = createContext(null);
const STORAGE_KEY = "bounce_current_team_id";

export function TeamProvider({ children }) {
  const [teams, setTeams] = useState([]);
  const [currentTeamId, setCurrentTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pathname = usePathname();

  const applyTeams = (nextTeams) => {
    const colored = (nextTeams || []).map(withTeamColors);
    setTeams(colored);
    setCurrentTeamId((current) => {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY) || 0) || current;
      if (stored && colored.some((team) => team.id === stored)) return stored;
      return colored[0]?.id || null;
    });
  };

  const loadTeams = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/teams", { timeout: 8000 });
      const remote = res.data?.teams || [];
      applyTeams(remote.length ? remote : listLocalTeams());
    } catch (err) {
      applyTeams(listLocalTeams());
      if (!isUnavailableStatus(err?.response?.status)) {
        setError(err?.response?.data?.detail || err?.response?.data?.error || "");
      }
    } finally {
      setLoading(false);
    }
  };

  const lockedOut = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (lockedOut) return;
    loadTeams();
  }, [lockedOut]);

  useEffect(() => {
    if (currentTeamId) {
      window.localStorage.setItem(STORAGE_KEY, String(currentTeamId));
    }
  }, [currentTeamId]);

  const currentTeam = teams.find((team) => team.id === currentTeamId) || null;

  useEffect(() => {
    if (lockedOut || !currentTeam) {
      resetTeamTheme();
      return;
    }
    applyTeamTheme(
      currentTeam.primary_color || DEFAULT_PRIMARY,
      currentTeam.secondary_color || DEFAULT_SECONDARY,
    );
  }, [currentTeam, lockedOut]);

  const createTeam = async (name, colors = {}) => {
    const payload = {
      name: name.trim(),
      primary_color: normalizeHex(colors.primary_color, DEFAULT_PRIMARY),
      secondary_color: normalizeHex(colors.secondary_color, DEFAULT_SECONDARY),
    };
    try {
      const res = await api.post("/teams", payload, { timeout: 8000 });
      const team = rememberTeamColors(withTeamColors({ ...res.data, ...payload }));
      setTeams((current) => [...current.map(withTeamColors), team]);
      setCurrentTeamId(team.id);
      return team;
    } catch (err) {
      if (err?.response && !isUnavailableStatus(err.response.status) && err.response.status !== 404) {
        throw err;
      }
      const team = createLocalTeam(payload.name, payload);
      setTeams(listLocalTeams());
      setCurrentTeamId(team.id);
      return team;
    }
  };

  const value = useMemo(
    () => ({
      teams,
      currentTeam,
      currentTeamId,
      loading,
      error,
      selectTeam: setCurrentTeamId,
      createTeam,
      reloadTeams: loadTeams,
    }),
    [teams, currentTeam, currentTeamId, loading, error],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeam must be used inside TeamProvider");
  }
  return context;
}
