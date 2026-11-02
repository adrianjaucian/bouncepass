import { useState } from "react";
import { calculateBoxScoresFromCsv } from "../lib/statsEngine";
import { COLORS } from "../lib/theme";
import { useTeam } from "./TeamProvider";
import ExportResultsButton from "./ExportResultsButton";
import GameResultsView from "./GameResultsView";
import SaveGameForm from "./SaveGameForm";

export default function UploadDual() {
  const { currentTeam } = useTeam();
  const [uploadMode, setUploadMode] = useState("file");
  const [teamIsHome, setTeamIsHome] = useState(true);
  const [teamFile, setTeamFile] = useState(null);
  const [opponentFile, setOpponentFile] = useState(null);
  const [teamCSV, setTeamCSV] = useState("");
  const [opponentCSV, setOpponentCSV] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const resetResults = () => {
    setError(null);
    setData(null);
  };

  const uploadFiles = async () => {
    setLoading(true);
    resetResults();
    try {
      const teamText = uploadMode === "file" ? await teamFile.text() : teamCSV;
      const opponentText = uploadMode === "file" ? (opponentFile ? await opponentFile.text() : "") : opponentCSV;
      const teamSide = teamIsHome ? "home" : "away";
      let calculated;
      if (teamIsHome) {
        calculated = calculateBoxScoresFromCsv(teamText, opponentText);
      } else if (opponentText.trim()) {
        calculated = calculateBoxScoresFromCsv(opponentText, teamText);
      } else {
        const teamOnly = calculateBoxScoresFromCsv(teamText, "");
        calculated = { away: teamOnly.home };
      }
      setData({ ...calculated, team_side: teamSide });
    } catch (err) {
      setError(err.message || "Could not calculate stats from the uploaded CSV.");
    } finally {
      setLoading(false);
    }
  };

  const canCalculateFiles = uploadMode === "file" ? Boolean(teamFile) : Boolean(teamCSV.trim());
  const teamLabel = currentTeam?.name || "Your team";
  const opponentLabel = "Opponent";
  const homeLabel = teamIsHome ? teamLabel : opponentLabel;
  const awayLabel = teamIsHome ? opponentLabel : teamLabel;
  const hasOpponent = Boolean(data?.home?.length && data?.away?.length);

  return (
    <div>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ color: COLORS.navy, margin: "0 0 20px 0", fontSize: "clamp(1.4em, 2.4vw, 1.8em)" }}>
          Upload & Calculate
        </h2>
        <div
          style={{
            backgroundColor: COLORS.goldSoft,
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: `1px solid ${COLORS.gold}`,
          }}
        >
          <p style={{ margin: 0, color: COLORS.navy, fontSize: "14px" }}>
            Upload or paste CSV box scores for <strong>{teamLabel}</strong>. Advanced stats are calculated here.
            Saving stores this team&apos;s players so their metrics can be tracked over time, whether they played home or away.
          </p>
        </div>

        <label className="home-team-check">
          <input
            type="checkbox"
            checked={teamIsHome}
            onChange={(event) => {
              setTeamIsHome(event.target.checked);
              resetResults();
            }}
          />
          <span>
            <strong>{teamLabel}</strong> is the home team for this game
          </span>
        </label>

        <div className="mode-tabs">
          {[
            { id: "file", label: "Upload Files" },
            { id: "paste", label: "Paste CSV" },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setUploadMode(mode.id)}
              aria-pressed={uploadMode === mode.id}
              className="mode-tab"
            >
              {mode.label}
            </button>
          ))}
        </div>

        {uploadMode === "file" && (
          <div className="upload-row">
            <div className="upload-box">
              <label style={{ fontWeight: 600, color: COLORS.navy }}>{teamLabel} CSV</label>
              <input type="file" accept=".csv" onChange={(e) => setTeamFile(e.target.files?.[0] || null)} />
            </div>
            <div className="upload-box">
              <label style={{ fontWeight: 600, color: COLORS.navy }}>Opponent CSV (optional)</label>
              <input type="file" accept=".csv" onChange={(e) => setOpponentFile(e.target.files?.[0] || null)} />
            </div>
            <button
              type="button"
              className="upload-calculate"
              onClick={uploadFiles}
              disabled={!canCalculateFiles || loading}
            >
              {loading ? "Processing..." : "Upload & Calculate"}
            </button>
          </div>
        )}

        {uploadMode === "paste" && (
          <div className="upload-row">
            <div className="upload-box">
              <label style={{ fontWeight: 600, color: COLORS.navy }}>{teamLabel} CSV</label>
              <textarea
                value={teamCSV}
                onChange={(e) => setTeamCSV(e.target.value)}
                placeholder={`Paste ${teamLabel} box score CSV here...`}
              />
            </div>
            <div className="upload-box">
              <label style={{ fontWeight: 600, color: COLORS.navy }}>Opponent CSV (optional)</label>
              <textarea
                value={opponentCSV}
                onChange={(e) => setOpponentCSV(e.target.value)}
                placeholder="Paste opponent box score CSV here..."
              />
            </div>
            <button
              type="button"
              className="upload-calculate"
              onClick={uploadFiles}
              disabled={!canCalculateFiles || loading}
            >
              {loading ? "Processing..." : "Calculate Stats"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            backgroundColor: COLORS.dangerBg,
            color: COLORS.danger,
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #f5c6cb",
            marginBottom: "20px",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "16px" }}>
            <h3 style={{ color: COLORS.navy, margin: "20px 0 10px 0" }}>
              Results · {teamLabel} ({teamIsHome ? "Home" : "Away"})
            </h3>
            <ExportResultsButton data={data} homeLabel={homeLabel} awayLabel={awayLabel} />
          </div>
          <GameResultsView data={data} homeLabel={homeLabel} awayLabel={awayLabel} />
          <SaveGameForm results={data} teamSide={teamIsHome ? "home" : "away"} hasOpponent={hasOpponent} />
        </div>
      )}
    </div>
  );
}
