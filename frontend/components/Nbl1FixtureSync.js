"use client";

import { useEffect, useState } from "react";
import { syncApi } from "../lib/api";

export default function Nbl1FixtureSync() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const pollStatus = async () => {
    const res = await syncApi.get("/sync/nbl1-fixtures/status");
    const status = res.data;
    setProgress(status.progress || (status.running ? "Syncing..." : ""));

    if (status.error) {
      setError(status.error);
      setLoading(false);
      return;
    }

    if (status.result) {
      setResult(status.result);
    }

    if (status.running) {
      window.setTimeout(pollStatus, 2000);
      return;
    }

    setLoading(false);
    if (status.result) {
      setProgress("Sync complete.");
    }
  };

  const runSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress("Starting sync...");

    try {
      const res = await syncApi.post("/sync/nbl1-fixtures", {});
      if (!res.data?.started) {
        setError(res.data?.message || "Could not start sync.");
        setLoading(false);
        return;
      }
      setProgress(res.data.message || "Sync started in the background.");
      window.setTimeout(pollStatus, 1500);
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Could not sync NBL1 fixtures.";
      setError(typeof message === "string" ? message : JSON.stringify(message));
      setProgress("");
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        marginBottom: "32px",
        padding: "20px",
        borderRadius: "10px",
        border: "1px solid #d6e4f0",
        backgroundColor: "#f9fbfd",
      }}
    >
      <h2 style={{ color: "#2c3e50", margin: "0 0 12px 0", fontSize: "1.5em" }}>NBL1 Auto Sync</h2>
      <p style={{ margin: "0 0 16px 0", color: "#56616b", fontSize: "14px", lineHeight: 1.5 }}>
        Pull completed men&apos;s and women&apos;s games from{" "}
        <a href="https://www.nbl1.com.au/fixtures" target="_blank" rel="noreferrer" style={{ color: "#3498db" }}>
          nbl1.com.au/fixtures
        </a>
        . Sync runs in the background so you can keep browsing saved games and dashboards while it works.
      </p>

      <div style={{ marginBottom: "16px" }}>
        <button
          type="button"
          onClick={runSync}
          disabled={loading}
          style={{
            padding: "12px 20px",
            backgroundColor: loading ? "#bdc3c7" : "#16a085",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Syncing NBL1 current season fixtures..." : "Sync NBL1 Current Season Fixtures"}
        </button>
      </div>

      {progress && <p style={{ color: "#56616b", margin: "0 0 12px 0" }}>{progress}</p>}

      {error && (
        <div
          style={{
            color: "#c0392b",
            backgroundColor: "#fdecea",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #f5c6cb",
            marginBottom: "12px",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #e1e8ed",
            borderRadius: "8px",
            padding: "16px",
            color: "#000",
          }}
        >
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>Season {result.season_year}</strong>
          </p>
          <p style={{ margin: "0 0 4px 0" }}>Discovered: {result.discovered}</p>
          <p style={{ margin: "0 0 4px 0" }}>Completed: {result.completed}</p>
          <p style={{ margin: "0 0 4px 0" }}>Skipped (already saved): {result.skipped_existing}</p>
          <p style={{ margin: "0 0 4px 0" }}>Duplicates removed: {result.deduped_count ?? 0}</p>
          <p style={{ margin: "0 0 4px 0" }}>Updated gender/region: {result.updated_metadata_count ?? 0}</p>
          <p style={{ margin: "0 0 4px 0" }}>Imported: {result.imported_count}</p>
          <p style={{ margin: "0 0 12px 0" }}>Failed: {result.failed_count}</p>

          {result.imported?.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <strong>Latest imports</strong>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
                {result.imported.slice(-8).map((game) => (
                  <li key={game.fixture_id}>
                    {game.game_date} — {game.home_team_name} vs {game.away_team_name}
                    {game.gender || game.region
                      ? ` (${[
                          game.gender === "women" ? "Women" : game.gender === "men" ? "Men" : "",
                          game.region ? game.region.charAt(0).toUpperCase() + game.region.slice(1) : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")})`
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors?.length > 0 && (
            <div>
              <strong>Errors</strong>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", color: "#c0392b" }}>
                {result.errors.slice(0, 8).map((item) => (
                  <li key={`${item.fixture_id}-${item.error}`}>
                    {item.label}: {item.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
