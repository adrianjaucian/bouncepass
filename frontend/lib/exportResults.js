import { computeTeamTotals, filterPlayerRows, withTeamRole } from "./gameResultsUtils";

const formatCsvValue = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildCsvFromRows = (rows) => {
  if (!rows || !rows.length) return "";
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const header = columns.map(formatCsvValue).join(",");
  const lines = [header];
  rows.forEach((row) => {
    const line = columns.map((col) => formatCsvValue(row[col]));
    lines.push(line.join(","));
  });
  return lines.join("\n");
};

const downloadCsv = (filename, csvText) => {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function exportGameResults(data, options = {}) {
  if (!data) return;

  const sections = [];
  const dateStamp = options.dateStamp || new Date().toISOString().slice(0, 10);
  const homeLabel = withTeamRole(options.homeLabel || "Home", "Home");
  const awayLabel = withTeamRole(options.awayLabel || "Away", "Away");

  if (data.home) {
    const homeRows = filterPlayerRows(data.home.map((row) => ({ ...row })));
    const totalsRow = {
      Player: "Team Totals",
      ...computeTeamTotals(homeRows),
    };
    sections.push(`${homeLabel} — Team Results`);
    sections.push(buildCsvFromRows([...homeRows, totalsRow]));
  }

  if (data.away) {
    const awayRows = filterPlayerRows(data.away.map((row) => ({ ...row })));
    const totalsRow = {
      Player: "Team Totals",
      ...computeTeamTotals(awayRows),
    };
    sections.push(`${awayLabel} — Team Results`);
    sections.push(buildCsvFromRows([...awayRows, totalsRow]));
  }

  const slug = options.fileSlug
    ? options.fileSlug.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase()
    : "";
  const baseName = slug ? `bounce-results-${slug}-${dateStamp}` : data.away ? `advstats-results-${dateStamp}` : `advstats-home-results-${dateStamp}`;
  const fileName = `${baseName}.csv`;

  downloadCsv(fileName, sections.join("\n\n"));
}
