import Link from "next/link";
import { getPlayerDashboardHref } from "../lib/playerLinks";

export default function PlayerLink({ name, style = {} }) {
  if (!name) return null;

  return (
    <Link
      href={getPlayerDashboardHref(name)}
      style={{
        color: "#1b2838",
        textDecoration: "none",
        fontWeight: 500,
        ...style,
      }}
    >
      {name}
    </Link>
  );
}
