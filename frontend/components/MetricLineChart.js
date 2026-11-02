"use client";

import { COLORS } from "../lib/theme";
import { formatMetricValue } from "../lib/metricOptions";

export default function MetricLineChart({ points, kind = "count", height = 220 }) {
  const values = (points || []).map((point) => Number(point.value));
  const hasValues = values.some((value) => Number.isFinite(value));
  if (!points?.length || !hasValues) {
    return <p style={{ color: COLORS.muted, margin: "12px 0 0 0" }}>No game data for this metric yet.</p>;
  }

  const width = 720;
  const padding = { top: 16, right: 16, bottom: 36, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const finite = values.filter((value) => Number.isFinite(value));
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  const yMin = min - span * 0.08;
  const yMax = max + span * 0.08;
  const ySpan = yMax - yMin || 1;
  const xFor = (index) => padding.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const yFor = (value) => padding.top + innerH - ((Number(value) - yMin) / ySpan) * innerH;
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(1)} ${yFor(point.value).toFixed(1)}`)
    .join(" ");
  const ticks = [yMax, (yMin + yMax) / 2, yMin];

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" style={{ width: "100%", minWidth: "520px", height: `${height}px` }}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke={COLORS.greyAlt}
            />
            <text x={padding.left - 8} y={yFor(tick) + 4} textAnchor="end" fontSize="11" fill={COLORS.muted}>
              {formatMetricValue(tick, kind)}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={COLORS.navy} strokeWidth="2.5" />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={xFor(index)} cy={yFor(point.value)} r="4" fill={COLORS.gold} stroke={COLORS.navy} strokeWidth="1.5">
              <title>
                {point.label}
                {point.opponent ? ` vs ${point.opponent}` : ""}: {formatMetricValue(point.value, kind)}
              </title>
            </circle>
            {points.length <= 12 && (
              <text x={xFor(index)} y={height - 12} textAnchor="middle" fontSize="10" fill={COLORS.muted}>
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
