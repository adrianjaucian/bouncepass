"use client";

import { useState } from "react";
import api from "../lib/api";

function gameKey(game) {
  return [
    game.game_date || "",
    (game.home_team_name || "").trim().toLowerCase(),
    (game.away_team_name || "").trim().toLowerCase(),
    game.gender || "",
  ].join("|");
}

function errorMessage(err, fallback) {
  const message = err?.response?.data?.detail || err?.response?.data?.error || err?.message || fallback;
  return typeof message === "string" ? message : JSON.stringify(message);
}

export default function Nbl1FixtureSync() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress("Finding the latest 20 completed NBL1 games...");

    try {
      const latestRes = await fetch("/api/nbl1-latest", { credentials: "include" });
      const latest = await latestRes.json().catch(() => ({}));
      if (!latestRes.ok) {
        throw new Error(latest.error || "Could not load the latest NBL1 games.");
      }

      const savedRes = await api.get("/games", { params: { limit: 200 } });
      const savedKeys = new Set((savedRes.data?.games || []).map(gameKey));

      const matches = latest.matches || [];
      const imported = [];
      const errors = [];
      let skippedExisting = 0;

      for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index];
        const label = match.label || `${match.home_team_name} vs ${match.away_team_name}`;
        if (savedKeys.has(gameKey(match))) {
          skippedExisting += 1;
          setProgress(`Skipped ${label} (already saved) · ${index + 1}/${matches.length}`);
          continue;
        }

        setProgress(`Importing ${index + 1}/${matches.length}: ${label}...`);
        try {
          const importedRes = await fetch("/api/nbl1-import", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(match),
          });
          const importedGame = await importedRes.json().catch(() => ({}));
          if (importedRes.status === 409 || importedGame.skipped) {
            skippedExisting += 1;
            continue;
          }
          if (!importedRes.ok) {
            throw new Error(importedGame.error || "Could not import game");
          }
          imported.push({
            id: importedGame.id,
            fixture_id: match.fixture_id,
            game_date: importedGame.game_date || match.game_date,
            home_team_name: importedGame.home_team_name || match.home_team_name,
            away_team_name: importedGame.away_team_name || match.away_team_name,
            gender: match.gender,
            region: match.region,
            label,
          });
          savedKeys.add(gameKey(match));
        } catch (err) {
          errors.push({
            fixture_id: match.fixture_id,
            label,
            error: errorMessage(err, "Could not import game"),
          });
        }
      }

      setResult({
        season_year: latest.season_year,
        discovered: latest.discovered,
        completed: latest.completed,
        skipped_existing: skippedExisting,
        deduped_count: 0,
        updated_metadata_count: 0,
        imported_count: imported.length,
        imported,
        failed_count: errors.length,
        errors,
      });
      setProgress("Sync complete.");
    } catch (err) {
      setError(errorMessage(err, "Could not sync NBL1 fixtures."));
      setProgress("");
    } finally {
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
        Pull the latest 20 completed men&apos;s and women&apos;s games from{" "}
        <a href="https://www.nbl1.com.au/fixtures" target="_blank" rel="noreferrer" style={{ color: "#3498db" }}>
          nbl1.com.au/fixtures
        </a>
        . Already-saved games are skipped. Importing box scores usually takes a few minutes.
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
          {loading ? "Syncing latest 20 NBL1 games..." : "Sync Latest 20 NBL1 Games"}
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
