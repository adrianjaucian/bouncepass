import api from "../lib/api";
import { parseNumber } from "../lib/gameResultsUtils";
import { useState } from "react";
import ExportResultsButton from "./ExportResultsButton";
import GameResultsView from "./GameResultsView";
import SaveGameForm from "./SaveGameForm";

export default function UploadDual() {
  const [uploadMode, setUploadMode] = useState("url"); // "url", "file", or "paste"
  const [homeFile, setHomeFile] = useState(null);
  const [awayFile, setAwayFile] = useState(null);
  const [homeCSV, setHomeCSV] = useState("");
  const [awayCSV, setAwayCSV] = useState("");
  const [gameUrl, setGameUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [gameMeta, setGameMeta] = useState(null);
  const [homeTotals, setHomeTotals] = useState(null);
  const [awayTotals, setAwayTotals] = useState(null);
  const [error, setError] = useState(null);

  const csvToFile = (csvText, filename) => {
    const blob = new Blob([csvText], { type: "text/csv" });
    return new File([blob], filename, { type: "text/csv" });
  };

  const parseCsvText = (text) => {
    const rows = [];
    let cur = "";
    let row = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];

      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if ((ch === ',' || ch === '\t') && !inQuotes) {
        row.push(cur);
        cur = '';
        continue;
      }

      if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && text[i + 1] === '\n') i += 1;
        row.push(cur);
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        cur = '';
        continue;
      }

      cur += ch;
    }

    row.push(cur);
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
  };

  const normalizeHeader = (value) =>
    String(value || '')
      .trim()
      .replace(/\ufeff/g, '')
      .toLowerCase()
      .replace(/%/g, 'pct')
      .replace(/[\s_-]/g, '');

  const buildColumnIndices = (header) => {
    const aliases = {
      PTS: ['pts', 'points', 'teampts'],
      FG: ['fg', 'fgm', 'fieldgoalsmade'],
      FGA: ['fga'],
      '3P': ['3p', '3pm', '3pointmade'],
      '3PA': ['3pa'],
      FT: ['ft', 'ftm', 'freethrowsmade'],
      FTA: ['fta'],
      ORB: ['orb', 'or', 'offensiverebounds'],
      DRB: ['drb', 'dr', 'defensiverebounds'],
      TRB: ['trb', 'reb', 'totalreb', 'totalrebounds'],
      AST: ['ast'],
      STL: ['stl'],
      BLK: ['blk'],
      TOV: ['tov', 'to', 'turnovers'],
      'FG%': ['fgpct', 'fgpercent'],
      '3P%': ['3ppct', '3ppercent'],
      'FT%': ['ftpct', 'ftpercent'],
      MP: ['mp', 'min', 'minutes', 'mpmins'],
    };

    const indices = {};
    for (const [field, names] of Object.entries(aliases)) {
      indices[field] = -1;
      for (const name of names) {
        const idx = header.findIndex((h) => h === name);
        if (idx >= 0) {
          indices[field] = idx;
          break;
        }
      }
    }
    return indices;
  };

  const computeTotalsFromCsv = (text) => {
    const rows = parseCsvText(text);
    if (!rows.length) return null;

    const isHeaderRow = (row) => {
      const normalized = row.map((cell) => normalizeHeader(cell));
      const hasScoring = normalized.includes('pts') || normalized.includes('points');
      const hasFg = normalized.includes('fg') || normalized.includes('fgm');
      const hasFga = normalized.includes('fga');
      const hasFt = normalized.includes('ft') || normalized.includes('ftm');
      const hasFta = normalized.includes('fta');
      const hasPlayerColumn =
        normalized.includes('player') ||
        normalized.includes('name') ||
        normalized.includes('playername') ||
        normalized.includes('starters');
      return hasScoring && hasFga && hasFg && hasFt && hasFta && hasPlayerColumn;
    };

    let headerIndex = rows.findIndex(isHeaderRow);
    if (headerIndex < 0) {
      headerIndex = rows.findIndex((row) => {
        const normalized = row.map((cell) => normalizeHeader(cell));
        const hasFg = normalized.includes('fg') || normalized.includes('fgm');
        const hasFga = normalized.includes('fga');
        const hasPts = normalized.includes('pts') || normalized.includes('points');
        return hasFg && hasFga && hasPts;
      });
    }

    if (headerIndex < 0) {
      console.warn('Unable to detect CSV header row for totals:', rows.slice(0, 5));
      return null;
    }

    const header = rows[headerIndex].map((cell) => normalizeHeader(cell));
    const isTotalsLabel = (value) => {
      const normalized = String(value || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();
      return normalized === 'total' || normalized === 'totals' || normalized === 'teamtotals' || normalized.startsWith('total');
    };
    const dataRows = rows.slice(headerIndex + 1).filter((row) => !isTotalsLabel(row[0]));

    const indices = buildColumnIndices(header);

    const totals = {
      PTS: 0,
      FG: 0,
      FGA: 0,
      '3P': 0,
      '3PA': 0,
      FT: 0,
      FTA: 0,
      ORB: 0,
      DRB: 0,
      TRB: 0,
      AST: 0,
      STL: 0,
      BLK: 0,
      TOV: 0,
      MP_mins: 0,
      'FG%': 0,
      '3P%': 0,
      'FT%': 0,
    };


    const parsePercent = (value) => {
      const n = parseNumber(value);
      return n > 1 ? n / 100 : n;
    };

    const getField = (row, field) => {
      const idx = indices[field] ?? -1;
      if (idx >= 0 && row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '') {
        return parseNumber(row[idx]);
      }
      return 0;
    };

    dataRows.forEach((row) => {
      const fg = getField(row, 'FG');
      const fga = getField(row, 'FGA');
      const threeP = getField(row, '3P');
      const threePA = getField(row, '3PA');
      const ft = getField(row, 'FT');
      const fta = getField(row, 'FTA');

      totals.FG += fg;
      totals.FGA += fga;
      totals['3P'] += threeP;
      totals['3PA'] += threePA;
      totals.FT += ft;
      totals.FTA += fta;
      totals.ORB += getField(row, 'ORB');
      totals.DRB += getField(row, 'DRB');
      totals.TRB += getField(row, 'TRB');
      totals.AST += getField(row, 'AST');
      totals.STL += getField(row, 'STL');
      totals.BLK += getField(row, 'BLK');
      totals.TOV += getField(row, 'TOV');
      totals.PTS += getField(row, 'PTS');
      totals.MP_mins += getField(row, 'MP');
    });

    totals['FG%'] = totals.FGA ? totals.FG / totals.FGA : 0;
    totals['3P%'] = totals['3PA'] ? totals['3P'] / totals['3PA'] : 0;
    totals['FT%'] = totals.FTA ? totals.FT / totals.FTA : 0;
    return totals;
  };

  const uploadFromUrl = async () => {
    if (!gameUrl.trim()) {
      setError("Please enter a box score URL");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setGameMeta(null);
    setHomeTotals(null);
    setAwayTotals(null);

    try {
      const res = await api.post("/upload-boxscore-url", { url: gameUrl.trim() });
      if (res.data?.home || res.data?.away) {
        setData({ home: res.data.home, away: res.data.away });
        setGameMeta(res.data.meta || null);
      } else {
        setError("Unexpected server response format.");
      }
    } catch (err) {
      if (err.response) {
        const serverMessage = err.response.data?.error || err.response.data?.details || JSON.stringify(err.response.data);
        setError(serverMessage || `Server error: ${err.response.status}`);
      } else if (err.request) {
        setError("No response from server (backend not reachable)");
      } else {
        setError(err.message || "Request setup error");
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async () => {
    let home = null;
    let away = null;

    if (uploadMode === "file") {
      if (!homeFile) {
        setError("Please select or paste a home team CSV");
        return;
      }
      home = homeFile;
      away = awayFile;
    } else {
      if (!homeCSV.trim()) {
        setError("Please paste home team CSV data");
        return;
      }
      home = csvToFile(homeCSV, "home.csv");
      away = awayCSV.trim() ? csvToFile(awayCSV, "away.csv") : null;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setGameMeta(null);
    setHomeTotals(null);
    setAwayTotals(null);

    try {
      const formData = new FormData();

      if (uploadMode === "file") {
        const homeText = await home.text();
        setHomeTotals(computeTotalsFromCsv(homeText));
        if (away) {
          const awayText = await away.text();
          setAwayTotals(computeTotalsFromCsv(awayText));
        }
      } else {
        setHomeTotals(computeTotalsFromCsv(homeCSV));
        if (awayCSV.trim()) {
          setAwayTotals(computeTotalsFromCsv(awayCSV));
        }
      }

      if (away) {
        formData.append("home", home);
        formData.append("away", away);

        const res = await api.post(
          "/upload-boxscores",
          formData
        );

        if (res.data && (res.data.home || res.data.away)) {
          // Debug: log raw response for troubleshooting key names
          if (typeof window !== 'undefined') console.debug('upload-boxscores response', res.data);
          setData(res.data);
        } else {
          setError("Unexpected server response format.");
        }
      } else {
        formData.append("file", home);

        const res = await api.post(
          "/upload-boxscore",
          formData
        );

        if (res.data && res.data.error) {
          setError(res.data.error);
        } else if (Array.isArray(res.data)) {
          if (typeof window !== 'undefined') console.debug('upload-boxscore response', res.data);
          setData({ home: res.data });
        } else {
          setError("Unexpected server response format.");
        }
      }
    } catch (err) {
      if (err.response) {
        const serverMessage = err.response.data?.error || err.response.data?.details || JSON.stringify(err.response.data);
        setError(serverMessage || `Server error: ${err.response.status}`);
      } else if (err.request) {
        setError("No response from server (backend not reachable)");
      } else {
        setError(err.message || "Request setup error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', margin: '0 0 20px 0', fontSize: '1.8em' }}>
          Upload Box Score
        </h2>
        <div style={{ backgroundColor: '#e8f4fd', padding: '15px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #bee5eb' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#000' }}>Supported Format:</h4>
          <p style={{ margin: 0, color: '#000', fontSize: '14px' }}>
            Use NBL1 Auto Sync above for league games, upload CSVs, paste data, or load a single custom game from a box score URL.
            The system will calculate advanced statistics including True Shooting %, Effective FG %, Usage Rate, and more.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setUploadMode("url")}
            style={{
              padding: '10px 20px',
              backgroundColor: uploadMode === "url" ? '#3498db' : '#ecf0f1',
              color: uploadMode === "url" ? 'white' : '#000',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            Box Score URL
          </button>
          <button
            onClick={() => setUploadMode("file")}
            style={{
              padding: '10px 20px',
              backgroundColor: uploadMode === "file" ? '#3498db' : '#ecf0f1',
              color: uploadMode === "file" ? 'white' : '#000',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            Upload Files
          </button>
          <button
            onClick={() => setUploadMode("paste")}
            style={{
              padding: '10px 20px',
              backgroundColor: uploadMode === "paste" ? '#3498db' : '#ecf0f1',
              color: uploadMode === "paste" ? 'white' : '#000',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            Paste CSV
          </button>
        </div>

        {uploadMode === "url" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxWidth: '760px' }}>
            <label style={{ fontWeight: '600', color: '#000' }}>Box Score URL</label>
            <input
              type="url"
              value={gameUrl}
              onChange={(e) => setGameUrl(e.target.value)}
              placeholder="https://www.nbl1.com.au/games/... or other supported box score page"
              style={{
                padding: '12px',
                border: '2px dashed #16a085',
                borderRadius: '5px',
                backgroundColor: '#f8f9fa',
                color: '#000',
                fontSize: '14px',
              }}
            />
            <p style={{ margin: 0, color: '#56616b', fontSize: '13px' }}>
              Load a single custom game from an NBL1 Game Centre link or other supported box score page.
            </p>
            <button
              onClick={uploadFromUrl}
              disabled={!gameUrl.trim() || loading}
              style={{
                padding: '12px 24px',
                backgroundColor: !gameUrl.trim() || loading ? '#bdc3c7' : '#16a085',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: !gameUrl.trim() || loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                alignSelf: 'flex-start',
              }}
            >
              {loading ? 'Loading box scores...' : 'Load & Calculate'}
            </button>
          </div>
        )}

        {/* File upload mode */}
        {uploadMode === "file" && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', color: '#000' }}>Home team CSV</label>
              <input type="file" accept=".csv" onChange={(e) => setHomeFile(e.target.files?.[0] || null)} style={{ padding: '10px', border: '2px dashed #3498db', borderRadius: '5px', backgroundColor: '#f8f9fa', color: '#000', cursor: 'pointer' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', color: '#000' }}>Away team CSV (optional)</label>
              <input type="file" accept=".csv" onChange={(e) => setAwayFile(e.target.files?.[0] || null)} style={{ padding: '10px', border: '2px dashed #9b59b6', borderRadius: '5px', backgroundColor: '#f8f9fa', color: '#000', cursor: 'pointer' }} />
            </div>
            <button onClick={uploadFiles} disabled={!homeFile || loading} style={{ padding: '12px 24px', backgroundColor: !homeFile || loading ? '#bdc3c7' : '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: !homeFile || loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
              {loading ? 'Processing...' : 'Upload & Calculate'}
            </button>
          </div>
        )}

        {/* Paste CSV mode */}
        {uploadMode === "paste" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <label style={{ fontWeight: '600', color: '#000' }}>Home team CSV</label>
                <textarea
                  value={homeCSV}
                  onChange={(e) => setHomeCSV(e.target.value)}
                  placeholder="Paste home team box score CSV here..."
                  style={{
                    padding: '10px',
                    border: '2px dashed #3498db',
                    borderRadius: '5px',
                    backgroundColor: '#f8f9fa',
                    color: '#000',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    minHeight: '150px',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <label style={{ fontWeight: '600', color: '#000' }}>Away team CSV (optional)</label>
                <textarea
                  value={awayCSV}
                  onChange={(e) => setAwayCSV(e.target.value)}
                  placeholder="Paste away team box score CSV here..."
                  style={{
                    padding: '10px',
                    border: '2px dashed #9b59b6',
                    borderRadius: '5px',
                    backgroundColor: '#f8f9fa',
                    color: '#000',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    minHeight: '150px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
            <button onClick={uploadFiles} disabled={!homeCSV.trim() || loading} style={{ padding: '12px 24px', backgroundColor: !homeCSV.trim() || loading ? '#bdc3c7' : '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: !homeCSV.trim() || loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold', alignSelf: 'flex-start' }}>
              {loading ? 'Processing...' : 'Calculate Stats'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ backgroundColor: '#ffeaea', color: '#e74c3c', padding: '15px', borderRadius: '5px', border: '1px solid #f5c6cb', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
        <h3 style={{ color: '#2c3e50', margin: '20px 0 10px 0' }}>Results</h3>
        <ExportResultsButton data={data} />
      </div>
          <GameResultsView
            data={data}
            homeLabel={gameMeta?.home_team_name || "Home"}
            awayLabel={gameMeta?.away_team_name || "Away"}
          />
          <SaveGameForm
            results={data}
            hasAwayTeam={Boolean(data.away)}
            initialGameDate={gameMeta?.game_date || ""}
            initialHomeTeamName={gameMeta?.home_team_name || ""}
            initialAwayTeamName={gameMeta?.away_team_name || ""}
            initialFixtureId={gameMeta?.fixture_id || ""}
            initialSourceUrl={gameMeta?.source_url || ""}
            initialProvider={gameMeta?.provider || ""}
          />
        </div>
      )}
    </div>
  );
}
