"use client";

import { useState } from "react";

const WINDOW_OPTIONS = [
  { id: "last_5", label: "Last 5 games" },
  { id: "last_10", label: "Last 10 games" },
  { id: "season", label: "Season" },
];

export const PLAYER_TREND_STATS = [
  { key: "pts", label: "Points", scale: (value) => value, format: (value) => value.toFixed(0) },
  { key: "trb", label: "Rebounds", scale: (value) => value, format: (value) => value.toFixed(0) },
  { key: "ast", label: "Assists", scale: (value) => value, format: (value) => value.toFixed(0) },
  {
    key: "ts_pct",
    label: "TS%",
    scale: (value) => value * 100,
    format: (value) => `${value.toFixed(1)}%`,
  },
  {
    key: "usg_pct",
    label: "USG%",
    scale: (value) => value,
    format: (value) => `${value.toFixed(1)}%`,
  },
  { key: "bpm", label: "BPM", scale: (value) => value, format: (value) => value.toFixed(1) },
  {
    key: "fg3par",
    label: "3PAr",
    scale: (value) => value * 100,
    format: (value) => `${value.toFixed(1)}%`,
  },
  {
    key: "trb_pct",
    label: "TRB%",
    scale: (value) => value,
    format: (value) => `${value.toFixed(1)}%`,
  },
  {
    key: "blk_pct",
    label: "BLK%",
    scale: (value) => value,
    format: (value) => `${value.toFixed(1)}%`,
  },
];

export const TEAM_FEATURED_TREND_STAT = {
  key: "net_rating",
  label: "Net Rating",
  scale: (value) => value,
  format: (value) => (value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)),
};

export const TEAM_TREND_STATS = [
  { key: "pts", label: "Points", scale: (value) => value, format: (value) => value.toFixed(0) },
  { key: "trb", label: "Rebounds", scale: (value) => value, format: (value) => value.toFixed(0) },
  { key: "ast", label: "Assists", scale: (value) => value, format: (value) => value.toFixed(0) },
  {
    key: "ts_pct",
    label: "TS%",
    scale: (value) => value * 100,
    format: (value) => `${value.toFixed(1)}%`,
  },
  { key: "ortg", label: "ORtg", scale: (value) => value, format: (value) => value.toFixed(1) },
  { key: "drtg", label: "DRtg", scale: (value) => value, format: (value) => value.toFixed(1) },
];

const cardStyle = {
  backgroundColor: "#f9fbfd",
  border: "1px solid #d6e4f0",
  borderRadius: "10px",
  padding: "14px",
  minWidth: "0",
};

const featuredCardStyle = {
  ...cardStyle,
  padding: "20px",
};

const toggleStyle = (active) => ({
  padding: "8px 14px",
  fontSize: "13px",
  border: "1px solid #d6e4f0",
  borderRadius: "6px",
  cursor: "pointer",
  backgroundColor: active ? "#3498db" : "#fff",
  color: active ? "#fff" : "#2c3e50",
  fontWeight: active ? 600 : 400,
});

function formatGameTooltip(point) {
  if (!point) return "";
  const lines = [point.game_date || "Unknown date"];
  if (point.team_name && point.opponent) {
    lines.push(`${point.team_name} vs ${point.opponent}`);
  } else if (point.opponent) {
    lines.push(`vs ${point.opponent}`);
  } else if (point.team_name) {
    lines.push(point.team_name);
  }
  return lines;
}

function LineChart({ title, points, statKey, scale, formatValue, large = false }) {
  const [tooltip, setTooltip] = useState(null);
  const width = large ? 960 : 320;
  const height = large ? 260 : 180;
  const pad = large
    ? { top: 24, right: 20, bottom: 20, left: 52 }
    : { top: 18, right: 12, bottom: 16, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const axisFontSize = large ? 11 : 9;
  const strokeWidth = large ? 3 : 2.5;
  const dotRadius = large ? 4.5 : 3.5;
  const hitRadius = large ? 12 : 10;

  const scaledValues = points.map((point) =>
    point[statKey] != null && point[statKey] !== "" ? scale(point[statKey]) : null,
  );
  const validValues = scaledValues.filter((value) => value != null);

  if (validValues.length === 0) {
    return (
      <div style={large ? featuredCardStyle : cardStyle}>
        <div style={{ fontWeight: "bold", marginBottom: 8, color: "#2c3e50", fontSize: large ? "1.1em" : "1em" }}>
          {title}
        </div>
        <div style={{ color: "#95a5a6", fontSize: 13 }}>No data for this window</div>
      </div>
    );
  }

  let minY = Math.min(...validValues);
  let maxY = Math.max(...validValues);
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const yPadding = (maxY - minY) * 0.12 || 1;
  minY -= yPadding;
  maxY += yPadding;

  const count = points.length;
  const xAt = (index) => pad.left + (count <= 1 ? innerW / 2 : (index / (count - 1)) * innerW);
  const yAt = (value) => pad.top + innerH - ((value - minY) / (maxY - minY)) * innerH;

  let pathD = "";
  scaledValues.forEach((value, index) => {
    if (value == null) return;
    pathD += `${pathD ? "L" : "M"}${xAt(index).toFixed(1)},${yAt(value).toFixed(1)} `;
  });

  const chartColor = statKey === "net_rating" ? "#9b59b6" : "#3498db";

  const showTooltip = (index, x, y, value) => {
    setTooltip({ index, x, y, value });
  };

  return (
    <div style={large ? featuredCardStyle : cardStyle}>
      <div style={{ marginBottom: large ? 12 : 8 }}>
        <span style={{ fontWeight: "bold", color: "#2c3e50", fontSize: large ? "1.15em" : "1em" }}>{title}</span>
      </div>
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          role="img"
          aria-label={`${title} trend`}
          onMouseLeave={() => setTooltip(null)}
        >
        <line
          x1={pad.left}
          y1={pad.top + innerH}
          x2={pad.left + innerW}
          y2={pad.top + innerH}
          stroke="#e1e8ed"
        />
        {statKey === "net_rating" && minY < 0 && maxY > 0 && (
          <line
            x1={pad.left}
            y1={yAt(0)}
            x2={pad.left + innerW}
            y2={yAt(0)}
            stroke="#dfe6e9"
            strokeDasharray="4 4"
          />
        )}
        <path
          d={pathD}
          fill="none"
          stroke={chartColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {scaledValues.map((value, index) =>
          value == null ? null : (
            <g key={`${statKey}-${index}`}>
              <circle
                cx={xAt(index)}
                cy={yAt(value)}
                r={hitRadius}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => showTooltip(index, xAt(index), yAt(value), value)}
              />
              <circle
                cx={xAt(index)}
                cy={yAt(value)}
                r={tooltip?.index === index ? dotRadius + 1.5 : dotRadius}
                fill={chartColor}
                style={{ pointerEvents: "none" }}
              />
            </g>
          ),
        )}
        <text x={pad.left - 8} y={pad.top + 6} textAnchor="end" fontSize={axisFontSize} fill="#95a5a6">
          {formatValue(maxY)}
        </text>
        <text x={pad.left - 8} y={pad.top + innerH} textAnchor="end" fontSize={axisFontSize} fill="#95a5a6">
          {formatValue(minY)}
        </text>
        </svg>
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: `${(tooltip.x / width) * 100}%`,
              top: `${(tooltip.y / height) * 100}%`,
              transform: "translate(-50%, calc(-100% - 10px))",
              backgroundColor: "#2c3e50",
              color: "#fff",
              padding: "8px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              lineHeight: 1.4,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)",
              zIndex: 2,
            }}
          >
            {formatGameTooltip(points[tooltip.index]).map((line) => (
              <div key={line}>{line}</div>
            ))}
            <div style={{ marginTop: "4px", fontWeight: 700 }}>{formatValue(tooltip.value)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrendCharts({
  trendCharts,
  title = "Performance Trends",
  statConfig = PLAYER_TREND_STATS,
  featuredStat = null,
  description = "Game-by-game lines for points, rebounding, playmaking, shooting efficiency, usage, and ratings. Hover a point for game details. Oldest game left, most recent right.",
}) {
  const [windowKey, setWindowKey] = useState("last_5");

  if (!trendCharts?.season?.length) {
    return null;
  }

  const points = trendCharts[windowKey] || [];

  return (
    <section style={{ marginBottom: "32px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ margin: 0, color: "#2c3e50" }}>{title}</h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {WINDOW_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setWindowKey(option.id)}
              style={toggleStyle(windowKey === option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p style={{ margin: "0 0 16px 0", color: "#7f8c8d", fontSize: "14px" }}>{description}</p>

      {featuredStat && (
        <div style={{ marginBottom: "16px" }}>
          <LineChart
            title={featuredStat.label}
            points={points}
            statKey={featuredStat.key}
            scale={featuredStat.scale}
            formatValue={featuredStat.format}
            large
          />
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {statConfig.map((stat) => (
          <LineChart
            key={stat.key}
            title={stat.label}
            points={points}
            statKey={stat.key}
            scale={stat.scale}
            formatValue={stat.format}
          />
        ))}
      </div>
    </section>
  );
}
