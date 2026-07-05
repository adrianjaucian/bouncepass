import { encodeTeamOption } from "./gender";

export function getTeamDashboardHref(teamName, gender, region) {
  const name = String(teamName || "").trim();
  if (!name) return "/team-dashboard";

  const normalizedGender = gender === "men" || gender === "women" ? gender : "";
  const normalizedRegion = String(region || "").trim();
  if (!normalizedGender || !normalizedRegion) {
    return "/team-dashboard";
  }

  const team = encodeTeamOption(name, normalizedGender, normalizedRegion);
  return `/team-dashboard?team=${encodeURIComponent(team)}`;
}
