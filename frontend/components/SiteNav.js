"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTeam } from "./TeamProvider";

const NAV_ITEMS = [
  { href: "/saved-games", label: "Box Scores" },
  { href: "/team-dashboard", label: "Team" },
  { href: "/player-dashboard", label: "Players" },
  { href: "/metric-definitions", label: "Definitions" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { teams, currentTeam, selectTeam } = useTeam();

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const isHome = pathname === "/";

  return (
    <header className="site-nav">
      <nav className="site-nav-inner" aria-label="Site navigation">
        <Link href="/" aria-label="Bounce PASS home" aria-current={isHome ? "page" : undefined} className="site-nav-brand">
          Bounce PASS
        </Link>
        <div className="site-nav-links">
          {currentTeam && (
            <select
              aria-label="Current team"
              value={currentTeam.id}
              onChange={(event) => selectTeam(Number(event.target.value))}
              className="site-nav-link site-nav-team"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className="site-nav-link">
                {item.label}
              </Link>
            );
          })}
          <button type="button" onClick={handleLogout} className="site-nav-lock">
            Lock site
          </button>
        </div>
      </nav>
    </header>
  );
}
