import api from "../lib/api";
import { useState } from "react";

export default function UploadDual() {
  const [uploadMode, setUploadMode] = useState("file"); // "file" or "paste"
  const [homeFile, setHomeFile] = useState(null);
  const [awayFile, setAwayFile] = useState(null);
  const [homeCSV, setHomeCSV] = useState("");
  const [awayCSV, setAwayCSV] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
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

  const parseNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const raw = String(value).trim();
    if (raw === '' || /^dnp$/i.test(raw) || /^didnotplay$/i.test(raw)) return 0;
    const cleaned = raw.replace(/,/g, '').replace(/%/g, '').trim();
    const match = cleaned.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  };

  const formatMp = (value) => {
    if (value === null || value === undefined) return '0:00';
    const raw = String(value).trim();
    if (raw === '' || /^dnp$/i.test(raw) || /^didnotplay$/i.test(raw)) return '0:00';

    const colon = raw.match(/^(\d+):([0-5]?\d)$/);
    if (colon) {
      const mins = Number(colon[1]);
      const secs = Number(colon[2]);
      return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    const num = parseNumber(raw);
    if (Number.isNaN(num)) return '0:00';

    const minutes = Math.floor(num);
    const seconds = Math.round((num - minutes) * 60);
    const normalizedSeconds = seconds === 60 ? 0 : seconds;
    const normalizedMinutes = seconds === 60 ? minutes + 1 : minutes;
    return `${normalizedMinutes}:${String(normalizedSeconds).padStart(2, '0')}`;
  };

  const normalizeHeader = (value) =>
    String(value || '')
      .trim()
      .replace(/\ufeff/g, '')
      .toLowerCase()
      .replace(/%/g, 'pct')
      .replace(/[\s_-]/g, '');

  const normalizePlayerName = (value) =>
    String(value || '')
      .trim()
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();

  const isTotalsRowName = (value) => {
    const normalized = normalizePlayerName(value);
    if (!normalized) return true;
    if (
      normalized === 'total' ||
      normalized === 'totals' ||
      normalized === 'team' ||
      normalized === 'teamtotals' ||
      normalized === 'teamtotal' ||
      normalized === 'starters' ||
      normalized === 'bench' ||
      normalized === 'teamcoach' ||
      normalized === 'dnp' ||
      normalized === 'didnotplay'
    ) {
      return true;
    }
    if (normalized.startsWith('total')) return true;
    if (normalized.includes('teamtotal')) return true;
    return false;
  };

  const getRowPlayerName = (row) =>
    row?.Player || row?.Name || row?.PLAYER || row?.player || Object.values(row || {})[0] || '';

  const filterPlayerRows = (rows) =>
    (rows || []).filter((row) => !isTotalsRowName(getRowPlayerName(row)));

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
    const dataRows = rows.slice(headerIndex + 1).filter((row) => !isTotalsRowName(row[0]));

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

  const formatCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const buildCsvFromRows = (rows) => {
    if (!rows || !rows.length) return '';
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const header = columns.map(formatCsvValue).join(',');
    const lines = [header];
    rows.forEach((row) => {
      const line = columns.map((col) => formatCsvValue(row[col]));
      lines.push(line.join(','));
    });
    return lines.join('\n');
  };

  const downloadCsv = (filename, csvText) => {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportResults = () => {
    if (!data) return;

    const sections = [];
    const dateStamp = new Date().toISOString().slice(0, 10);

    if (data.home) {
      const homeRows = filterPlayerRows(data.home.map((row) => ({ ...row })));
      const totalsRow = {
        Player: 'Team Totals',
        ...computeTeamTotals(homeRows),
      };
      sections.push('Home Team Results');
      sections.push(buildCsvFromRows([...homeRows, totalsRow]));
    }

    if (data.away) {
      const awayRows = filterPlayerRows(data.away.map((row) => ({ ...row })));
      const totalsRow = {
        Player: 'Team Totals',
        ...computeTeamTotals(awayRows),
      };
      sections.push('Away Team Results');
      sections.push(buildCsvFromRows([...awayRows, totalsRow]));
    }

    const fileName = data.away ? `advstats-results-${dateStamp}.csv` : `advstats-home-results-${dateStamp}.csv`;
    downloadCsv(fileName, sections.join('\n\n'));
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

  const renderTable = (rows) => (
    <div style={{ overflowX: 'auto', maxWidth: '100%', marginBottom: '24px' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px', border: '1px solid #ddd', borderRadius: '5px', minWidth: '1400px' }}>
        <thead>
          <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
            <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 'bold' }}>Player</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>MP</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FG</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FGA</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FG%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>3P</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>3PA</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>3P%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FT</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FTA</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>FT%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>ORB</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>DRB</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>TRB</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>AST</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>STL</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>BLK</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>TOV</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>PTS</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>TS%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>eFG%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>3PAr</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>FTr</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>ORB%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>DRB%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>TRB%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>AST%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>STL%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>BLK%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>TOV%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>USG%</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>ORtg</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>DRtg</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>BPM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((player, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 4px', fontWeight: '500', color: '#000' }}>{player.Player || player.Name || player.PLAYER || player.player || Object.values(player)[0] || `Player ${i+1}`}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{formatMp(player.MP || player.MP_mins || player.mp || '0:00')}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.FG || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.FGA || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{((player['FG%'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player['3P'] || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player['3PA'] || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{((player['3P%'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.FT || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.FTA || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{((player['FT%'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.ORB || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.DRB || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.TRB || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.AST || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.STL || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.BLK || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', color: '#000' }}>{player.TOV || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '600', color: '#000' }}>{player.PTS || 0}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{((player['TS%'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{((player['eFG%'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{((player['3PAr'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{((player['FTr'] || 0) * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['ORB%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['DRB%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['TRB%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['AST%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['STL%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['BLK%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{(player['TOV%'] || 0).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{((player['USG%'] || 0) * 1).toFixed(1)}%</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{Number(player['ORtg'] || 0).toFixed(1)}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{Number(player['DRtg'] || 0).toFixed(1)}</td>
              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: '#000', backgroundColor: '#d5f4e6' }}>{Number(player['BPM'] || 0).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const computeTeamTotals = (rows) => {
    const playerRows = filterPlayerRows(rows);
    const totals = {
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
      PTS: 0,
      MP_mins: 0,
      'FG%': 0,
      '3P%': 0,
      'FT%': 0,
    };

    let fgPctSum = 0;
    let fgPctCount = 0;
    let threePPctSum = 0;
    let threePPctCount = 0;
    let ftPctSum = 0;
    let ftPctCount = 0;

    const parseNumber = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === 'number') return v;
      const s = String(v).replace(/,/g, '').trim();
      const m = s.match(/-?\d+(?:\.\d+)?/);
      return m ? Number(m[0]) : 0;
    };

    const parsePercent = (v) => {
      const n = parseNumber(v);
      return n > 1 ? n / 100 : n;
    };

    const normalize = (s) => String(s).replace(/[^a-z0-9]/gi, '').toLowerCase();
    const getField = (p, names) => {
      for (const n of names) {
        if (n in p && p[n] !== undefined && p[n] !== null && String(p[n]).trim() !== '') return parseNumber(p[n]);
      }
      const keys = Object.keys(p || {});
      for (const n of names) {
        const normN = normalize(n);
        const found = keys.find(k => normalize(k) === normN);
        if (found) return parseNumber(p[found]);
      }
      return 0;
    };

    playerRows.forEach((p) => {
      const fg = getField(p, ['FG', 'FGM']);
      const fga = getField(p, ['FGA']);
      const threeP = getField(p, ['3P', '3PM']);
      const threePA = getField(p, ['3PA']);
      const ft = getField(p, ['FT', 'FTM']);
      const fta = getField(p, ['FTA']);

      const fgPct = getField(p, ['FG%', 'FG_PCT', 'FGP']) || (fga ? fg / fga : 0);
      const threePPct = getField(p, ['3P%', '3P_PCT', '3PP']) || (threePA ? threeP / threePA : 0);
      const ftPct = getField(p, ['FT%', 'FT_PCT', 'FTP']) || (fta ? ft / fta : 0);

      totals.FG += fg;
      totals.FGA += fga;
      totals['3P'] += threeP;
      totals['3PA'] += threePA;
      totals.FT += ft;
      totals.FTA += fta;
      totals.ORB += getField(p, ['ORB', 'OR']);
      totals.DRB += getField(p, ['DRB', 'DR']);
      totals.TRB += getField(p, ['TRB', 'REB', 'TOTAL_REB']);
      totals.AST += getField(p, ['AST']);
      totals.STL += getField(p, ['STL']);
      totals.BLK += getField(p, ['BLK']);
      totals.TOV += getField(p, ['TOV', 'TO']);
      totals.PTS += getField(p, ['PTS', 'POINTS']);
      totals.MP_mins += getField(p, ['MP_mins', 'MP']);

    });

    totals['FG%'] = totals.FGA ? totals.FG / totals.FGA : 0;
    totals['3P%'] = totals['3PA'] ? totals['3P'] / totals['3PA'] : 0;
    totals['FT%'] = totals.FTA ? totals.FT / totals.FTA : 0;
    return totals;
  };

  const renderTeamSummary = (totals, title) => {
    const t = totals || {
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
      'FG%': 0,
      '3P%': 0,
      'FT%': 0,
    };
    return (
      <div style={{ marginTop: '12px', marginBottom: '20px' }}>
        <h4 style={{ margin: '8px 0', color: '#000' }}>{title} — Team Totals</h4>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px', border: '1px solid #ddd', borderRadius: '5px', color: '#000' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f6f9', color: '#000' }}>
              <th style={{ padding: '8px' }}>PTS</th>
              <th style={{ padding: '8px' }}>FG</th>
              <th style={{ padding: '8px' }}>FGA</th>
              <th style={{ padding: '8px' }}>FG%</th>
              <th style={{ padding: '8px' }}>3P</th>
              <th style={{ padding: '8px' }}>3PA</th>
              <th style={{ padding: '8px' }}>3P%</th>
              <th style={{ padding: '8px' }}>FT</th>
              <th style={{ padding: '8px' }}>FTA</th>
              <th style={{ padding: '8px' }}>FT%</th>
              <th style={{ padding: '8px' }}>ORB</th>
              <th style={{ padding: '8px' }}>DRB</th>
              <th style={{ padding: '8px' }}>TRB</th>
              <th style={{ padding: '8px' }}>AST</th>
              <th style={{ padding: '8px' }}>STL</th>
              <th style={{ padding: '8px' }}>BLK</th>
              <th style={{ padding: '8px' }}>TOV</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#fff' }}>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.PTS}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.FG}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.FGA}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{(t['FG%'] * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t['3P']}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t['3PA']}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{(t['3P%'] * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.FT}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.FTA}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{(t['FT%'] * 100).toFixed(1)}%</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.ORB}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.DRB}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.TRB}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.AST}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.STL}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.BLK}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{t.TOV}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', margin: '0 0 20px 0', fontSize: '1.8em' }}>
          Upload Box Score CSV
        </h2>
        <div style={{ backgroundColor: '#e8f4fd', padding: '15px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #bee5eb' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#000' }}>Supported Format:</h4>
          <p style={{ margin: 0, color: '#000', fontSize: '14px' }}>
            Upload a CSV file with standard basketball box score columns: Player, PTS, FGA, FG, 3PA, 3P, FTA, etc.
            The system will automatically calculate advanced statistics including True Shooting %, Effective FG %, Usage Rate, and more.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
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
        <button
          onClick={exportResults}
          disabled={!data}
          style={{
            padding: '10px 18px',
            backgroundColor: '#2ecc71',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: data ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          Bounce Results
        </button>
      </div>
      {data.home && (
            <div>
              <h3 style={{ color: '#2c3e50', margin: '20px 0 10px 0' }}>Home Team Results</h3>
              {renderTeamSummary(computeTeamTotals(data.home), 'Home')}
              {renderTable(filterPlayerRows(data.home))}
            </div>
          )}
          {data.away && (
            <div>
              <h3 style={{ color: '#2c3e50', margin: '20px 0 10px 0' }}>Away Team Results</h3>
              {renderTeamSummary(computeTeamTotals(data.away), 'Away')}
              {renderTable(filterPlayerRows(data.away))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
