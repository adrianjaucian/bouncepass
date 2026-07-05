"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { decodeTeamOption } from "../../lib/gender";
import SiteNav from "../../components/SiteNav";
import ScoutingPlayerCompare from "../../components/ScoutingPlayerCompare";
import ScoutingTeamCompare from "../../components/ScoutingTeamCompare";

type ScoutingTab = "team" | "player";

const tabButtonStyle = (active: boolean) => ({
  padding: "12px 24px",
  backgroundColor: active ? "#d4a017" : "#ecf0f1",
  color: active ? "#fff" : "#2c3e50",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold" as const,
  fontSize: "15px",
  cursor: "pointer",
});

export default function ScoutingPage() {
  return (
    <Suspense>
      <ScoutingContent />
    </Suspense>
  );
}

function ScoutingContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<ScoutingTab>(tabParam === "player" ? "player" : "team");

  useEffect(() => {
    if (tabParam === "player" || tabParam === "team") {
      setTab(tabParam);
    }
  }, [tabParam]);

  const initialComparePlayers = useMemo(() => {
    const fromList = searchParams.get("players");
    if (fromList) {
      return fromList
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
    }
    const single = searchParams.get("player");
    return single?.trim() ? [single.trim()] : [];
  }, [searchParams]);

  const initialCompareTeams = useMemo(() => {
    const teamParam = searchParams.get("team");
    if (teamParam) {
      const decoded = decodeTeamOption(teamParam);
      if (decoded.name && decoded.gender && decoded.region) {
        return [{ name: decoded.name, gender: decoded.gender, region: decoded.region }];
      }
    }

    const teamsList = searchParams.get("teams");
    if (!teamsList) return [];

    return teamsList
      .split(",")
      .map((value) => decodeTeamOption(value.trim()))
      .filter((team) => team.name && team.gender && team.region)
      .map((team) => ({ name: team.name, gender: team.gender, region: team.region }));
  }, [searchParams]);

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
          <h1 style={{ color: "#b8860b", margin: "0 0 10px 0", fontSize: "2.2em" }}>Head-To-Head Scouting</h1>
          <p style={{ color: "#7f8c8d", margin: 0 }}>
            Head-to-head team matchups and side-by-side player comparisons across your saved box scores.
          </p>
        </header>

        <SiteNav />

        <main
          style={{
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setTab("team")} style={tabButtonStyle(tab === "team")}>
              Team
            </button>
            <button type="button" onClick={() => setTab("player")} style={tabButtonStyle(tab === "player")}>
              Player
            </button>
          </div>

          {tab === "team" ? (
            <ScoutingTeamCompare initialCompareTeams={initialCompareTeams} />
          ) : (
            <ScoutingPlayerCompare initialComparePlayers={initialComparePlayers} />
          )}
        </main>
      </div>
    </div>
  );
}
