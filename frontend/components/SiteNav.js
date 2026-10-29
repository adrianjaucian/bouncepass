"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/saved-games", label: "Advanced Box Scores" },
  { href: "/team-dashboard", label: "Team Metrics" },
  { href: "/player-dashboard", label: "Player Metrics" },
  { href: "/scouting", label: "Player Comparison" },
  { href: "/metric-definitions", label: "Metric Definitions" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();

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
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        backgroundColor: "#1b2838",
        borderBottom: "3px solid #f1c40f",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <nav
        aria-label="Site navigation"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          flexWrap: "nowrap",
          padding: "10px 28px",
          width: "100%",
          boxSizing: "border-box",
          overflowX: "auto",
        }}
      >
        <Link
          href="/"
          aria-label="Bounce PASS home"
          aria-current={isHome ? "page" : undefined}
          style={{
            color: "#f1c40f",
            textDecoration: "none",
            fontWeight: 800,
            fontSize: "22px",
            letterSpacing: "0.02em",
            lineHeight: 1.1,
            padding: "6px 12px",
            borderRadius: "6px",
            backgroundColor: "rgba(241, 196, 15, 0.18)",
            boxShadow: "inset 0 0 0 1px #f1c40f",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Bounce PASS
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "4px",
            flexWrap: "nowrap",
            marginLeft: "auto",
            flexShrink: 0,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                style={{
                  color: isActive ? "#f1c40f" : "#ecf0f1",
                  textDecoration: "none",
                  fontWeight: isActive ? 700 : 600,
                  fontSize: "14px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  backgroundColor: isActive ? "rgba(241, 196, 15, 0.14)" : "transparent",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              marginLeft: "8px",
              padding: "8px 12px",
              backgroundColor: "transparent",
              color: "#bdc3c7",
              border: "1px solid #4a5a6a",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Lock site
          </button>
        </div>
      </nav>
    </header>
  );
}
