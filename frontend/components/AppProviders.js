"use client";

import { TeamProvider } from "./TeamProvider";

export default function AppProviders({ children }) {
  return <TeamProvider>{children}</TeamProvider>;
}
