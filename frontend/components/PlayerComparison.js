"use client";

function formatPercent(value) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatRating(value) {
  return value == null ? "—" : Number(value).toFixed(1);
}

function formatUsg(value) {
  return value == null ? "—" : `${Number(value).toFixed(1)}%`;
}

const COMPARISON_ROWS = [
  { key: "games_played", label: "Games", format: (d) => String(d.games_played) },
  { key: "mp_mins", label: "Minutes", format: (d) => d.stats?.mp_mins?.toFixed(1) ?? "—" },
  { key: "pts", label: "PTS", format: (d) => String(d.stats?.pts ?? "—") },
  { key: "trb", label: "REB", format: (d) => String(d.stats?.trb ?? "—") },
  { key: "ast", label: "AST", format: (d) => String(d.stats?.ast ?? "—") },
  { key: "stl", label: "STL", format: (d) => String(d.stats?.stl ?? "—") },
  { key: "blk", label: "BLK", format: (d) => String(d.stats?.blk ?? "—") },
  { key: "pts_pg", label: "PTS/G", format: (d) => formatRating(d.stats?.pts_pg) },
  { key: "trb_pg", label: "REB/G", format: (d) => formatRating(d.stats?.trb_pg) },
  { key: "ast_pg", label: "AST/G", format: (d) => formatRating(d.stats?.ast_pg) },
  { key: "ts_pct", label: "TS%", format: (d) => formatPercent(d.stats?.ts_pct) },
  { key: "efg_pct", label: "eFG%", format: (d) => formatPercent(d.stats?.efg_pct) },
  { key: "fg3_pct", label: "3P%", format: (d) => formatPercent(d.stats?.fg3_pct) },
  { key: "ortg", label: "ORtg", format: (d) => formatRating(d.stats?.ortg) },
  { key: "drtg", label: "DRtg", format: (d) => formatRating(d.stats?.drtg) },
  { key: "usg_pct", label: "USG%", format: (d) => formatUsg(d.stats?.usg_pct) },
  { key: "bpm", label: "BPM", format: (d) => formatRating(d.stats?.bpm) },
];

export default function PlayerComparison({ dashboards, onRemovePlayer }) {
  if (!dashboards?.length) return null;

  return (
    <section style={{ marginBottom: "32px" }}>
      <h3 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>Player Comparison</h3>
      <p style={{ margin: "0 0 16px 0", color: "#7f8c8d", fontSize: "14px" }}>
        Side-by-side season stats for selected players (up to 5).
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: "1px solid #e1e8ed", minWidth: "520px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f1f6f9" }}>
              <th style={{ padding: "12px", textAlign: "left", color: "#000", fontWeight: "bold" }}>Metric</th>
              {dashboards.map((dashboard) => (
                <th key={dashboard.player_name} style={{ padding: "12px", textAlign: "center", color: "#000", fontWeight: "bold", minWidth: "160px" }}>
                  <div>{dashboard.player_name}</div>
                  <div style={{ fontSize: "11px", color: "#7f8c8d", fontWeight: 500, marginTop: "4px" }}>
                    {(dashboard.teams || []).join(", ") || "—"}
                  </div>
                  {onRemovePlayer && (
                    <button
                      type="button"
                      onClick={() => onRemovePlayer(dashboard.player_name)}
                      style={{
                        marginTop: "8px",
                        padding: "4px 10px",
                        fontSize: "11px",
                        border: "1px solid #d0d7de",
                        borderRadius: "4px",
                        backgroundColor: "#fff",
                        color: "#c0392b",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, index) => (
              <tr key={row.key} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc" }}>
                <td style={{ padding: "10px", color: "#2c3e50", fontWeight: 600 }}>{row.label}</td>
                {dashboards.map((dashboard) => (
                  <td key={`${dashboard.player_name}-${row.key}`} style={{ padding: "10px", textAlign: "center", color: "#000" }}>
                    {row.format(dashboard)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
