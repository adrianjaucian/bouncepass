import Link from "next/link";

export default function MetricDefinitionsSection({ compact = false }) {
  return (
    <section style={{ marginTop: compact ? "24px" : "32px", color: "#34495e", lineHeight: 1.6 }}>
      <h2 style={{ marginTop: compact ? 0 : "8px", marginBottom: "12px", color: "#2c3e50", fontSize: compact ? "1.3em" : "1.5em" }}>
        Metric Definitions
      </h2>
      <div style={{ fontSize: "14px" }}>
        <p><strong>TS% (True Shooting %):</strong> Efficiency that accounts for field goals, 3-pointers and free throws. Formula: <em>PTS / (2 × (FGA + 0.44 × FTA))</em>.</p>
        <p><strong>eFG% (Effective Field Goal %):</strong> Adjusts field goal percentage to value 3-pointers higher. Formula: <em>(FG + 0.5 × 3P) / FGA</em>.</p>
        <p><strong>3PAr (3-Point Attempt Rate):</strong> Share of shots that are 3-pointers. Formula: <em>3PA / FGA</em>.</p>
        <p><strong>FTr (Free Throw Rate):</strong> Free throw attempts per field goal attempt. Formula: <em>FTA / FGA</em>.</p>
        <p><strong>ORB%, DRB%, TRB% (Rebound %):</strong> Estimate of percentage of available rebounds a player grabbed while on court.</p>
        <p><strong>AST% (Assist %):</strong> Percentage of teammate field goals a player assisted while on court.</p>
        <p><strong>STL%, BLK% (Steal/Block %):</strong> Rate stats estimating the percent of opponent possessions ending in a steal or block by the player while on court.</p>
        <p><strong>TOV% (Turnover %):</strong> Estimate of turnovers per possessions used.</p>
        <p><strong>USG% (Usage %):</strong> Estimate of how often a player uses team possessions while on court.</p>
        <p><strong>ORtg / DRtg (Off/Def Rating):</strong> Offensive / Defensive points produced per 100 possessions.</p>
        <p><strong>BPM (Box Plus/Minus):</strong> A box-score based estimate of a player&apos;s contribution to team point differential per 100 possessions.</p>
      </div>
    </section>
  );
}
