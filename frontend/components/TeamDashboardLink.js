import Link from "next/link";
import { getTeamDashboardHref } from "../lib/teamLinks";

export default function TeamDashboardLink({
  teamName,
  gender,
  region,
  label,
  style = {},
}) {
  const display = label || teamName;
  if (!display) return <>—</>;

  const href = getTeamDashboardHref(teamName, gender, region);
  if (href === "/team-dashboard" && teamName) {
    return <span style={{ color: "#000", ...style }}>{display}</span>;
  }

  return (
    <Link
      href={href}
      style={{
        color: "#3498db",
        textDecoration: "none",
        fontWeight: 500,
        ...style,
      }}
    >
      {display}
    </Link>
  );
}
