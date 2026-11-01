import type { ReactNode } from "react";

export type WorkspaceTeam = {
  id: number;
  name: string;
  game_count: number;
  player_count: number;
  created_at?: string;
};

export type TeamContextValue = {
  teams: WorkspaceTeam[];
  currentTeam: WorkspaceTeam | null;
  currentTeamId: number | null;
  loading: boolean;
  error: string;
  selectTeam: (id: number) => void;
  createTeam: (name: string) => Promise<WorkspaceTeam>;
  reloadTeams: () => Promise<void>;
};

export function TeamProvider(props: { children: ReactNode }): JSX.Element;
export function useTeam(): TeamContextValue;
