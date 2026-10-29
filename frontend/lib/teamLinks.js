export function getTeamDashboardHref(teamName) {
  const name = String(teamName || "").trim();
  if (!name) return "/team-dashboard";
  return `/team-dashboard?team=${encodeURIComponent(name)}`;
}
