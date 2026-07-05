"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import SiteNav from "../../components/SiteNav";
import SeasonLeadersSection from "../../components/SeasonLeadersSection";
import TeamDashboardLink from "../../components/TeamDashboardLink";
import TeamLeagueLeaders from "../../components/TeamLeagueLeaders";
import TrendCharts, { TEAM_FEATURED_TREND_STAT, TEAM_TREND_STATS } from "../../components/TrendCharts";
import api from "../../lib/api";
import { getMetricAnchor } from "../../lib/metricDefinitions";
import { GENDER_TABS, REGION_OPTIONS, decodeTeamOption, encodeTeamOption, formatGenderLabel, formatRegionLabel, genderBadgeStyle, regionBadgeStyle } from "../../lib/gender";

type TeamOption = {
  name: string;
  gender?: string | null;
  region?: string | null;
  label: string;
};

type DashboardPlayer = {
  player: string;
  games: number;
  pts: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  mp_mins: number;
  ortg?: number | null;
  drtg?: number | null;
  usg_pct?: number | null;
  usg_avg?: number | null;
  fga?: number;
  fg3a?: number;
  efg_pct?: number | null;
  efg_avg?: number | null;
  fg3_pct?: number | null;
  fg3par?: number | null;
  fg3_avg?: number | null;
  bpm?: number | null;
  bpm_avg?: number | null;
};

type TeamDashboard = {
  team_name: string;
  team_label: string;
  gender?: string | null;
  region?: string | null;
  query: string;
  games_played: number;
  record: { wins: number; losses: number };
  efficiency: {
    ortg?: number | null;
    drtg?: number | null;
    net_rating?: number | null;
    possession_ortg?: number | null;
    possession_drtg?: number | null;
    possession_net_rating?: number | null;
    ts_pct?: number | null;
    efg_pct?: number | null;
    pace?: number | null;
  };
  efficiency_trends?: Record<string, string | null>;
  totals: { pts: number; opp_pts: number; possessions: number };
  leaders: {
    scorers: DashboardPlayer[];
    rebounders: DashboardPlayer[];
    assists: DashboardPlayer[];
    steals: DashboardPlayer[];
    blocks: DashboardPlayer[];
    usage: DashboardPlayer[];
  };
  players: DashboardPlayer[];
  leader_players?: DashboardPlayer[];
  games: {
    id: number;
    game_date: string;
    opponent?: string | null;
    team_score?: number | null;
    opponent_score?: number | null;
    side: string;
  }[];
  trend_charts?: {
    last_5: TrendPoint[];
    last_10: TrendPoint[];
    season: TrendPoint[];
  };
};

type TrendPoint = {
  game_date: string;
  label: string;
  pts?: number | null;
  trb?: number | null;
  ast?: number | null;
  ts_pct?: number | null;
  usg_pct?: number | null;
  net_rating?: number | null;
  ortg?: number | null;
  drtg?: number | null;
};

const BLANK_TEAM_SELECTION = "";

const tableHeaderStyle: React.CSSProperties = {
  padding: "10px",
  color: "#000",
  fontWeight: "bold",
};

const LOWER_IS_BETTER_TRENDS = new Set(["drtg", "possession-drtg"]);

function trendColor(trend?: string | null, definitionId?: string) {
  if (!trend) return "#7f8c8d";
  const lowerIsBetter = definitionId ? LOWER_IS_BETTER_TRENDS.has(definitionId) : false;
  if (trend.startsWith("↑")) return lowerIsBetter ? "#c0392b" : "#1e7e34";
  if (trend.startsWith("↓")) return lowerIsBetter ? "#1e7e34" : "#c0392b";
  return "#7f8c8d";
}

function MetricCard({
  label,
  value,
  trend,
  subtitle,
  definitionId,
}: {
  label: string;
  value: string;
  trend?: string | null;
  subtitle?: string;
  definitionId?: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 180px",
        backgroundColor: "#f4f8fb",
        border: "1px solid #d6e4f0",
        borderRadius: "10px",
        padding: "18px",
        textAlign: "center",
      }}
    >
      <div style={{ color: "#56616b", fontSize: "13px", marginBottom: "8px" }}>
        {definitionId ? (
          <Link href={getMetricAnchor(definitionId)} style={{ color: "#3498db", textDecoration: "none" }}>
            {label}
          </Link>
        ) : (
          label
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: "10px",
          flexWrap: "wrap",
          lineHeight: 1.1,
        }}
      >
        <div style={{ color: "#2c3e50", fontSize: "2em", fontWeight: "bold" }}>{value}</div>
        {trend && (
          <div style={{ color: trendColor(trend, definitionId), fontSize: "12px", fontWeight: 600, maxWidth: "140px" }}>
            {trend}
          </div>
        )}
      </div>
      {subtitle && <div style={{ color: "#7f8c8d", fontSize: "12px", marginTop: "8px" }}>{subtitle}</div>}
    </div>
  );
}

function TeamDashboardContent() {
  const searchParams = useSearchParams();
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [teamSelection, setTeamSelection] = useState(BLANK_TEAM_SELECTION);
  const [genderFilter, setGenderFilter] = useState("men");
  const [regionFilter, setRegionFilter] = useState("");
  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const teamParam = searchParams.get("team");
  const pendingDeepLink = Boolean(teamParam);

  const selectedTeam = decodeTeamOption(teamSelection);
  const hasTeamSelected = Boolean(selectedTeam.name.trim() && selectedTeam.gender && selectedTeam.region);

  const fetchTeamDashboard = useCallback(
    async (team: { name: string; gender: string; region: string }) => {
      const res = await api.get("/teams/dashboard", {
        params: {
          team_name: team.name.trim(),
          gender: team.gender,
          region: team.region,
        },
      });
      return res.data as TeamDashboard;
    },
    [],
  );

  useEffect(() => {
    const teamParam = searchParams.get("team");
    if (!teamParam) return;

    const decoded = decodeTeamOption(teamParam);
    if (!decoded.name || !decoded.gender || !decoded.region) return;

    if (decoded.gender === "men" || decoded.gender === "women") {
      setGenderFilter(decoded.gender);
    }
    setRegionFilter(decoded.region);
    setTeamSelection(encodeTeamOption(decoded.name, decoded.gender, decoded.region));
  }, [searchParams]);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await api.get("/teams", {
          params: { gender: genderFilter, region: regionFilter },
        });
        const options: TeamOption[] = res.data?.options || [];
        setTeamOptions(options);

        if (!teamSelection) {
          return;
        }

        const current = decodeTeamOption(teamSelection);
        if (!current.name.trim()) {
          return;
        }

        const stillValid = options.some(
          (option) =>
            option.name === current.name &&
            option.gender === current.gender &&
            option.region === current.region,
        );
        if (!stillValid) {
          setTeamSelection(BLANK_TEAM_SELECTION);
        }
      } catch {
        setTeamOptions([]);
      }
    };
    loadTeams();
  }, [genderFilter, regionFilter]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!hasTeamSelected) {
        setDashboard(null);
        setLoading(false);
        setError("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await fetchTeamDashboard({
          name: selectedTeam.name.trim(),
          gender: selectedTeam.gender!,
          region: selectedTeam.region!,
        });
        setDashboard(data);
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not load team dashboard.";
        setError(typeof message === "string" ? message : JSON.stringify(message));
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [teamSelection, hasTeamSelected, selectedTeam.name, selectedTeam.gender, selectedTeam.region, fetchTeamDashboard]);

  const handleSelectTeamFromLeaders = (team: {
    team_name: string;
    gender?: string | null;
    region?: string | null;
  }) => {
    if (!team.team_name || !team.gender || !team.region) return;
    if (team.gender === "men" || team.gender === "women") {
      setGenderFilter(team.gender);
    }
    setRegionFilter(team.region || "");
    setTeamSelection(encodeTeamOption(team.team_name, team.gender, team.region));
  };

  const formatRating = (value?: number | null) => (value == null ? "—" : value.toFixed(1));
  const formatPercent = (value?: number | null) => (value == null ? "—" : `${(value * 100).toFixed(1)}%`);
  const metricTrend = (key: string) => dashboard?.efficiency_trends?.[key] ?? null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <header
          style={{
            textAlign: "center",
            marginBottom: "24px",
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ color: "#2c3e50", margin: "0 0 10px 0", fontSize: "2.2em" }}>Team Metrics</h1>
          <p style={{ color: "#7f8c8d", margin: 0 }}>
            Season leaders across the league, or drill into one men&apos;s or women&apos;s team in a specific NBL1 region
          </p>
        </header>

        <SiteNav />

        <main
          style={{
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ marginBottom: "24px", display: "grid", gap: "16px", maxWidth: "520px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {GENDER_TABS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGenderFilter(option.value)}
                  style={{
                    padding: "8px 14px",
                    backgroundColor: genderFilter === option.value ? "#3498db" : "#ecf0f1",
                    color: genderFilter === option.value ? "#fff" : "#2c3e50",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {REGION_OPTIONS.map((option) => (
                <button
                  key={option.value || "all"}
                  type="button"
                  onClick={() => setRegionFilter(option.value)}
                  style={{
                    padding: "8px 14px",
                    backgroundColor: regionFilter === option.value ? "#27ae60" : "#ecf0f1",
                    color: regionFilter === option.value ? "#fff" : "#2c3e50",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label style={{ display: "grid", gap: "8px", color: "#000", fontSize: "14px" }}>
              Team
              <select
                value={teamSelection}
                onChange={(e) => setTeamSelection(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid #d0d7de",
                  color: "#000",
                  backgroundColor: "#fff",
                }}
              >
                <option value={BLANK_TEAM_SELECTION}>Season Leaders</option>
                {teamOptions.map((option) => (
                  <option
                    key={encodeTeamOption(option.name, option.gender || genderFilter, option.region || regionFilter)}
                    value={encodeTeamOption(option.name, option.gender || genderFilter, option.region || regionFilter)}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!hasTeamSelected && !pendingDeepLink && (
            <TeamLeagueLeaders
              gender={genderFilter}
              region={regionFilter}
              onSelectTeam={handleSelectTeamFromLeaders}
            />
          )}

          {hasTeamSelected && loading && <p style={{ color: "#56616b" }}>Loading dashboard...</p>}
          {hasTeamSelected && error && (
            <div
              style={{
                color: "#c0392b",
                backgroundColor: "#fdecea",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #f5c6cb",
              }}
            >
              {error}
            </div>
          )}

          {hasTeamSelected && dashboard && !loading && (
            <>
              <div style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
                  <h1 style={{ margin: 0, color: "#2c3e50", fontSize: "2.2em", fontWeight: "bold", lineHeight: 1.15 }}>
                    {dashboard.team_name}
                  </h1>
                  {dashboard.gender && (
                    <span
                      style={{
                        ...genderBadgeStyle(dashboard.gender),
                        fontSize: "12px",
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: "999px",
                      }}
                    >
                      {formatGenderLabel(dashboard.gender)}
                    </span>
                  )}
                  {dashboard.region && (
                    <span
                      style={{
                        ...regionBadgeStyle(dashboard.region),
                        fontSize: "12px",
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: "999px",
                      }}
                    >
                      {formatRegionLabel(dashboard.region)}
                    </span>
                  )}
                  <Link
                    href={`/scouting?tab=team&team=${encodeURIComponent(
                      encodeTeamOption(dashboard.team_name, dashboard.gender || "", dashboard.region || ""),
                    )}`}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#fff9e6",
                      color: "#b8860b",
                      border: "1px solid #f5d76e",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Add to compare
                  </Link>
                </div>
                <p style={{ margin: 0, color: "#56616b" }}>
                  {dashboard.games_played} saved game{dashboard.games_played === 1 ? "" : "s"} · Record{" "}
                  {dashboard.record.wins}-{dashboard.record.losses}
                </p>
              </div>

              <section style={{ marginBottom: "32px" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>Team Efficiency</h3>
                <p style={{ margin: "0 0 16px 0", color: "#7f8c8d", fontSize: "14px" }}>
                  <Link href="/metric-definitions#team-efficiency" style={{ color: "#3498db" }}>
                    See metric definitions
                  </Link>{" "}
                  for formulas, how to read each stat, and what trends mean.
                </p>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <MetricCard
                    label="Offensive Rating (ORtg)"
                    definitionId="ortg"
                    value={formatRating(dashboard.efficiency.ortg)}
                    trend={metricTrend("ortg")}
                  />
                  <MetricCard
                    label="Defensive Rating (DRtg)"
                    definitionId="drtg"
                    value={formatRating(dashboard.efficiency.drtg)}
                    trend={metricTrend("drtg")}
                  />
                  <MetricCard
                    label="Net Rating"
                    definitionId="net-rating"
                    value={formatRating(dashboard.efficiency.net_rating)}
                    trend={metricTrend("net_rating")}
                  />
                  <MetricCard
                    label="Possession ORtg"
                    definitionId="possession-ortg"
                    value={formatRating(dashboard.efficiency.possession_ortg)}
                    trend={metricTrend("possession_ortg")}
                    subtitle={`${dashboard.totals.pts} pts / ${dashboard.totals.possessions.toFixed(0)} poss`}
                  />
                  <MetricCard
                    label="Possession DRtg"
                    definitionId="possession-drtg"
                    value={formatRating(dashboard.efficiency.possession_drtg)}
                    trend={metricTrend("possession_drtg")}
                    subtitle={`${dashboard.totals.opp_pts} opp pts`}
                  />
                </div>
              </section>

              <section style={{ marginBottom: "32px" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>Shooting &amp; Pace</h3>
                <p style={{ margin: "0 0 16px 0", color: "#7f8c8d", fontSize: "14px" }}>
                  <Link href="/metric-definitions#shooting-pace" style={{ color: "#3498db" }}>
                    See metric definitions
                  </Link>{" "}
                  for shooting efficiency and tempo.
                </p>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <MetricCard
                    label="True Shooting % (TS%)"
                    definitionId="ts-pct"
                    value={formatPercent(dashboard.efficiency.ts_pct)}
                    trend={metricTrend("ts_pct")}
                  />
                  <MetricCard
                    label="Effective FG% (eFG%)"
                    definitionId="efg-pct"
                    value={formatPercent(dashboard.efficiency.efg_pct)}
                    trend={metricTrend("efg_pct")}
                  />
                  <MetricCard
                    label="Pace"
                    definitionId="pace"
                    value={formatRating(dashboard.efficiency.pace)}
                    trend={metricTrend("pace")}
                  />
                </div>
              </section>

              <TrendCharts
                trendCharts={dashboard.trend_charts}
                title="Team Performance Trends"
                statConfig={TEAM_TREND_STATS}
                featuredStat={TEAM_FEATURED_TREND_STAT}
                description="Net rating leads the view, with game-by-game scoring, rebounding, playmaking, shooting efficiency, and ratings below. Hover a point for game details. Oldest game left, most recent right."
              />

              <SeasonLeadersSection
                players={dashboard.leader_players?.length ? dashboard.leader_players : dashboard.players}
                description="Players need at least 50% of team games played (with minutes) to qualify. See metric definitions"
              />

              <section style={{ marginBottom: "32px" }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#2c3e50" }}>Games Included</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: "1px solid #e1e8ed" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f1f6f9" }}>
                        <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Date</th>
                        <th style={{ ...tableHeaderStyle, textAlign: "left" }}>Opponent</th>
                        <th style={{ ...tableHeaderStyle, textAlign: "center" }}>Result</th>
                        <th style={{ ...tableHeaderStyle, textAlign: "center" }}>Side</th>
                        <th style={{ ...tableHeaderStyle, textAlign: "left" }}>View game</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.games.map((game, index) => {
                        const won =
                          game.team_score != null &&
                          game.opponent_score != null &&
                          game.team_score > game.opponent_score;
                        const lost =
                          game.team_score != null &&
                          game.opponent_score != null &&
                          game.team_score < game.opponent_score;
                        const result =
                          game.team_score != null && game.opponent_score != null
                            ? `${game.team_score}-${game.opponent_score}${won ? " W" : lost ? " L" : ""}`
                            : "—";
                        return (
                          <tr key={game.id} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc" }}>
                            <td style={{ padding: "10px", color: "#000" }}>{game.game_date}</td>
                            <td style={{ padding: "10px", color: "#000" }}>
                              {game.opponent ? (
                                <TeamDashboardLink
                                  teamName={game.opponent}
                                  gender={dashboard.gender}
                                  region={dashboard.region}
                                  label={game.opponent}
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                textAlign: "center",
                                fontWeight: "bold",
                                color: won ? "#1e7e34" : lost ? "#c0392b" : "#000",
                              }}
                            >
                              {result}
                            </td>
                            <td style={{ padding: "10px", textAlign: "center", color: "#000" }}>
                              {game.side === "home" ? "Home" : "Away"}
                            </td>
                            <td style={{ padding: "10px" }}>
                              <Link href={`/saved-games/${game.id}`} style={{ color: "#3498db", textDecoration: "none", fontWeight: 500 }}>
                                View game
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <p style={{ color: "#7f8c8d", fontSize: "13px", margin: 0 }}>
                Data comes from{" "}
                <Link href="/saved-games" style={{ color: "#3498db" }}>
                  Advanced Box Scores
                </Link>
                . Save more box scores to grow this dashboard.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function TeamDashboardPage() {
  return (
    <Suspense>
      <TeamDashboardContent />
    </Suspense>
  );
}
