"use client";

function formatPercent(value) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatRating(value) {
  return value == null ? "—" : Number(value).toFixed(1);
}

const COMPARISON_ROWS = [
  { key: "games_played", label: "Games", format: (d) => String(d.games_played) },
  {
    key: "record",
    label: "Record",
    format: (d) => `${d.record?.wins ?? 0}-${d.record?.losses ?? 0}`,
  },
  { key: "ortg", label: "ORtg", format: (d) => formatRating(d.efficiency?.ortg) },
  { key: "drtg", label: "DRtg", format: (d) => formatRating(d.efficiency?.drtg) },
  { key: "net_rating", label: "Net Rating", format: (d) => formatRating(d.efficiency?.net_rating) },
  {
    key: "possession_ortg",
    label: "Poss ORtg",
    format: (d) => formatRating(d.efficiency?.possession_ortg),
  },
  {
    key: "possession_drtg",
    label: "Poss DRtg",
    format: (d) => formatRating(d.efficiency?.possession_drtg),
  },
  { key: "ts_pct", label: "TS%", format: (d) => formatPercent(d.efficiency?.ts_pct) },
  { key: "efg_pct", label: "eFG%", format: (d) => formatPercent(d.efficiency?.efg_pct) },
  { key: "pace", label: "Pace", format: (d) => formatRating(d.efficiency?.pace) },
  { key: "pts", label: "Total PTS", format: (d) => String(d.totals?.pts ?? "—") },
  { key: "opp_pts", label: "Opp PTS", format: (d) => String(d.totals?.opp_pts ?? "—") },
];

export default function TeamComparison({ dashboards, onRemoveTeam }) {
  if (!dashboards?.length) return null;

  return (
    <section style={{ marginBottom: "32px" }}>
      <h3 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>Head-to-Head Comparison</h3>
      <p style={{ margin: "0 0 16px 0", color: "#7f8c8d", fontSize: "14px" }}>
        Side-by-side season stats for two teams.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
            border: "1px solid #e1e8ed",
            minWidth: "480px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f1f6f9" }}>
              <th style={{ padding: "12px", textAlign: "left", color: "#000", fontWeight: "bold" }}>Metric</th>
              {dashboards.map((dashboard) => (
                <th
                  key={`${dashboard.team_name}-${dashboard.gender}-${dashboard.region}`}
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    color: "#000",
                    fontWeight: "bold",
                    minWidth: "180px",
                  }}
                >
                  <div>{dashboard.team_label || dashboard.team_name}</div>
                  {onRemoveTeam && (
                    <button
                      type="button"
                      onClick={() =>
                        onRemoveTeam({
                          name: dashboard.team_name,
                          gender: dashboard.gender,
                          region: dashboard.region,
                        })
                      }
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
                  <td
                    key={`${row.key}-${dashboard.team_name}`}
                    style={{ padding: "10px", textAlign: "center", color: "#000" }}
                  >
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
