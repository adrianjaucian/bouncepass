"use client";

import Link from "next/link";
import UploadDual from "../components/UploadDual";

const NAV_GUIDE_ITEMS = [
  {
    href: "/saved-games",
    label: "Advanced Box Scores",
    linkColor: "#2c3e50",
    backgroundColor: "#eef1f5",
    borderColor: "#c8d0d9",
    description:
      "Browse every saved game in your database. Open a game for full advanced player stats, edit metadata, export, or delete.",
  },
  {
    href: "/team-dashboard",
    label: "Team Metrics",
    linkColor: "#8e44ad",
    backgroundColor: "#f9f4fd",
    borderColor: "#e8d4f4",
    description:
      "View league-wide team leaders, or select a team to see efficiency ratings, trends, roster leaders, and game log.",
  },
  {
    href: "/player-dashboard",
    label: "Player Metrics",
    linkColor: "#d35400",
    backgroundColor: "#fef6ee",
    borderColor: "#f5dcc8",
    description:
      "Pick any player in the database for season totals, per-game averages, advanced metrics, and league ranks.",
  },
  {
    href: "/scouting",
    label: "Player Comparison",
    linkColor: "#b8860b",
    backgroundColor: "#fff9e6",
    borderColor: "#f5d76e",
    description: "Compare one player in the database with another player side by side.",
  },
  {
    href: "/metric-definitions",
    label: "Metric Definitions",
    linkColor: "#117a65",
    backgroundColor: "#e8f8f5",
    borderColor: "#b8e6dc",
    description:
      "Full glossary of every stat shown in box scores and dashboards — formulas, how to read them, and what good/bad trends mean.",
  },
];

export default function Page() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <header
          style={{
            textAlign: "center",
            marginBottom: "24px",
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ color: "#2c3e50", margin: "0 0 10px 0", fontSize: "2.5em" }}>
            🏀 Bounce PASS - Player Analytics Systems & Storage 🏀
          </h1>
          <p style={{ color: "#7f8c8d", margin: 0, fontSize: "1.1em" }}>
            Upload box scores, calculate advanced stats, and save them to your database.
          </p>
        </header>

        <main
          style={{
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <UploadDual />

          <section style={{ marginTop: "32px", color: "#34495e", lineHeight: 1.7 }}>
            <h2 style={{ marginTop: 0, marginBottom: "16px", color: "#2c3e50" }}>How to Navigate</h2>
            <p style={{ margin: "0 0 20px 0", color: "#56616b" }}>
              Use the links along the top of the page to move between views. Saved uploads feed every dashboard.
            </p>

            <div style={{ display: "grid", gap: "20px" }}>
              {NAV_GUIDE_ITEMS.map((item) => (
                <div
                  key={item.href}
                  style={{
                    padding: "18px",
                    backgroundColor: item.backgroundColor,
                    borderRadius: "8px",
                    border: `1px solid ${item.borderColor}`,
                  }}
                >
                  <h3 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>
                    <Link href={item.href} style={{ color: item.linkColor, textDecoration: "none" }}>
                      {item.label}
                    </Link>
                  </h3>
                  <p style={{ margin: 0, fontSize: "14px" }}>{item.description}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
