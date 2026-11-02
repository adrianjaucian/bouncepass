"use client";

import { useMemo, useState } from "react";
import { TEAM_CHART_METRICS, buildChartPoints, formatMetricValue, metricKind } from "../lib/metricOptions";
import MetricLineChart from "./MetricLineChart";

export default function TeamMetricChart({ series }) {
  const [metricId, setMetricId] = useState("pts");
  const [mode, setMode] = useState("per_game");
  const metric = TEAM_CHART_METRICS.find((item) => item.id === metricId) || TEAM_CHART_METRICS[0];
  const points = useMemo(() => buildChartPoints(series, metric.id, mode), [series, metric.id, mode]);
  const latest = points.length ? points[points.length - 1] : null;

  return (
    <section className="metric-chart-panel">
      <div className="chart-toolbar">
        <label className="chart-control">
          Metric
          <select value={metric.id} onChange={(event) => setMetricId(event.target.value)} aria-label="Team metric">
            {TEAM_CHART_METRICS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="window-tabs" role="group" aria-label="Per game or season totals">
          {[
            { id: "per_game", label: "Per game" },
            { id: "season", label: "Season totals" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              className="window-tab"
              aria-pressed={mode === option.id}
              onClick={() => setMode(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {latest && (
          <div className="chart-latest">
            <span>{mode === "season" ? "Season" : "Latest"}</span>
            <strong>{formatMetricValue(latest.value, metricKind(metric.id))}</strong>
          </div>
        )}
      </div>
      <MetricLineChart points={points} kind={metricKind(metric.id)} />
    </section>
  );
}
