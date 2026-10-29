"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import ScoutingPlayerCompare from "../../components/ScoutingPlayerCompare";

export default function ScoutingPage() {
  return (
    <Suspense>
      <ScoutingContent />
    </Suspense>
  );
}

function ScoutingContent() {
  const searchParams = useSearchParams();
  const initialComparePlayers = useMemo(() => {
    const fromList = searchParams.get("players");
    if (fromList) {
      return fromList
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, 2);
    }
    const single = searchParams.get("player");
    return single?.trim() ? [single.trim()] : [];
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
          <h1 style={{ color: "#b8860b", margin: "0 0 10px 0", fontSize: "2.2em" }}>Player Comparison</h1>
          <p style={{ color: "#7f8c8d", margin: 0 }}>
            Compare one player in the database with another player from your saved box scores.
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
          <ScoutingPlayerCompare initialComparePlayers={initialComparePlayers} />
        </main>
      </div>
    </div>
  );
}
