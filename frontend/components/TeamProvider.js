"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { createLocalTeam, isUnavailableStatus, listLocalTeams } from "../lib/workspaceStore";

const TeamContext = createContext(null);
const STORAGE_KEY = "bounce_current_team_id";

export function TeamProvider({ children }) {
  const [teams, setTeams] = useState([]);
  const [currentTeamId, setCurrentTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pathname = usePathname();

  const applyTeams = (nextTeams) => {
    setTeams(nextTeams);
    setCurrentTeamId((current) => {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY) || 0) || current;
      if (stored && nextTeams.some((team) => team.id === stored)) return stored;
      return nextTeams[0]?.id || null;
    });
  };

  const loadTeams = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/teams");
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

  const createTeam = async (name) => {
    try {
      const res = await api.post("/teams", { name: name.trim() });
      const team = res.data;
      setTeams((current) => [...current, team]);
      setCurrentTeamId(team.id);
      return team;
    } catch (err) {
      if (!isUnavailableStatus(err?.response?.status) && err?.response?.status !== 404) {
        throw err;
      }
      const team = createLocalTeam(name);
      setTeams(listLocalTeams());
      setCurrentTeamId(team.id);
      return team;
    }
  };

  const currentTeam = teams.find((team) => team.id === currentTeamId) || null;

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
