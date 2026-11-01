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
  const [homeFile, setHomeFile] = useState(null);
  const [awayFile, setAwayFile] = useState(null);
  const [homeCSV, setHomeCSV] = useState("");
  const [awayCSV, setAwayCSV] = useState("");
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
      const homeText = uploadMode === "file" ? await homeFile.text() : homeCSV;
      const awayText = uploadMode === "file" ? (awayFile ? await awayFile.text() : "") : awayCSV;
      setData(calculateBoxScoresFromCsv(homeText, awayText));
    } catch (err) {
      setError(err.message || "Could not calculate stats from the uploaded CSV.");
    } finally {
      setLoading(false);
    }
  };

  const canCalculateFiles = uploadMode === "file" ? Boolean(homeFile) : Boolean(homeCSV.trim());
  const homeLabel = currentTeam?.name || "Your team";

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
            Upload or paste CSV box scores for <strong>{homeLabel}</strong>. Advanced stats are calculated here.
            Saving stores this team&apos;s players so their metrics can be tracked over time.
          </p>
        </div>

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
              <label style={{ fontWeight: 600, color: COLORS.navy }}>{homeLabel} CSV</label>
              <input type="file" accept=".csv" onChange={(e) => setHomeFile(e.target.files?.[0] || null)} />
            </div>
            <div className="upload-box">
              <label style={{ fontWeight: 600, color: COLORS.navy }}>Opponent CSV (optional)</label>
              <input type="file" accept=".csv" onChange={(e) => setAwayFile(e.target.files?.[0] || null)} />
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
              <label style={{ fontWeight: 600, color: COLORS.navy }}>{homeLabel} CSV</label>
              <textarea
                value={homeCSV}
                onChange={(e) => setHomeCSV(e.target.value)}
                placeholder={`Paste ${homeLabel} box score CSV here...`}
              />
            </div>
            <div className="upload-box">
              <label style={{ fontWeight: 600, color: COLORS.navy }}>Opponent CSV (optional)</label>
              <textarea
                value={awayCSV}
                onChange={(e) => setAwayCSV(e.target.value)}
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
            <h3 style={{ color: COLORS.navy, margin: "20px 0 10px 0" }}>Results</h3>
            <ExportResultsButton data={data} homeLabel={homeLabel} awayLabel="Opponent" />
          </div>
          <GameResultsView data={data} homeLabel={homeLabel} awayLabel="Opponent" />
          <SaveGameForm results={data} hasAwayTeam={Boolean(data.away)} />
        </div>
      )}
    </div>
  );
}
