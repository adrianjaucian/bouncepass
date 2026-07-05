export const METRIC_SECTIONS = [
  {
    id: "team-efficiency",
    title: "Team efficiency (dashboard)",
    description:
      "Season-level team metrics on the Team Metrics page, aggregated from saved box scores. Trends compare the most recent 5 games to all earlier games in the sample.",
    metrics: [
      {
        id: "ortg",
        name: "Offensive Rating (ORtg)",
        formula: "Minutes-weighted average of each player's ORtg across all appearances.",
        summary:
          "Estimates how many points a player produces per 100 possessions they use while on the floor.",
        whyItMatters:
          "ORtg captures scoring efficiency in context. A player can score a lot on poor efficiency; ORtg shows whether their shot diet and decision-making are actually helping the offense. At team level, a rising ORtg usually means better shot quality, free-throw pressure, or ball movement.",
        howToRead:
          "Rough benchmarks: below ~100 is struggling, ~105–110 is solid, above ~115 is excellent (context varies by league and pace). Compare teammates with similar roles rather than cross-position snapshots.",
        inApp:
          "On the dashboard, team ORtg is the minutes-weighted mean of player ORtg values from every saved game for the selected team.",
      },
      {
        id: "drtg",
        name: "Defensive Rating (DRtg)",
        formula:
          "Minutes-weighted average of each player's DRtg. Player DRtg is approximated from DRB%, STL%, and BLK% (box-score estimate).",
        summary: "Estimates points allowed per 100 possessions while a player is on the floor.",
        whyItMatters:
          "Defense is hard to measure from box scores alone, but DRtg still helps flag lineups and players associated with stops, rebounding, and disruption. Lower is better. Falling DRtg often tracks with improved rim protection, activity on the ball, or better team scheme.",
        howToRead:
          "Treat as directional, not definitive. Pair with film and opponent quality. A big man with strong DRB% and BLK% tends to drive DRtg down; guards can help via STL% and keeping the ball in front.",
        inApp:
          "Because full play-by-play isn't available, Bounce PASS uses a box-score approximation rather than true on/off defensive impact.",
      },
      {
        id: "net-rating",
        name: "Net Rating",
        formula: "ORtg − DRtg",
        summary: "Single-number view of whether a player or team is outscoring opponents per possession.",
        whyItMatters:
          "Net rating is one of the cleanest 'are we winning the minutes?' indicators. Positive net rating means the offense is outpacing what the defense gives up, relative to the estimates used.",
        howToRead:
          "+5 is a strong player or lineup; +10 is elite over a meaningful sample. Small samples (a few games) can swing wildly.",
        inApp: "Displayed on the Team Metrics page as the difference between the team's weighted ORtg and DRtg.",
      },
      {
        id: "possession-ortg",
        name: "Possession ORtg",
        formula: "100 × (team points) ÷ (estimated team possessions)",
        summary: "True team offensive efficiency in points per 100 possessions.",
        whyItMatters:
          "Unlike player-weighted ORtg, this is built from actual team scoring totals. It answers: when our team has the ball, how many points do we score per 100 trips? Useful for tracking offensive identity over a season.",
        howToRead:
          "Compare to possession DRtg. If possession ORtg is 108 and DRtg is 102, you're roughly a +6 team over the sample.",
        inApp: "Possessions are estimated as FGA + 0.44×FTA + TOV for each game, then summed across saved games.",
      },
      {
        id: "possession-drtg",
        name: "Possession DRtg",
        formula: "100 × (opponent points) ÷ (estimated team possessions)",
        summary: "Points allowed per 100 opponent possessions.",
        whyItMatters:
          "Shows defensive results in the same possession framework as offense. Helps separate 'we allowed a lot of points because the game was fast' from 'we allowed a lot of points because we couldn't get stops.'",
        howToRead: "Lower is better. Pair with pace — high pace can inflate raw points allowed even when DRtg is fine.",
        inApp: "Uses opponent scoring totals from saved box scores and the same possession estimate as possession ORtg.",
      },
      {
        id: "efficiency-trends",
        name: "Last 5 games trend",
        formula: "Recent 5 games metric − earlier games metric",
        summary: "Shows whether a team stat is trending up or down in recent form.",
        whyItMatters:
          "Season totals hide hot and cold stretches. A team can be below average overall but improving — or vice versa. Trends help coaches and fans spot momentum before the full season average moves.",
        howToRead:
          "↑ (green) means the last 5 games are higher than earlier games; ↓ (red) means lower. For DRtg, lower is better — an increase shows red and a decrease shows green.",
        inApp: "Requires at least 6 saved games for the selected team. Percentage stats show point changes (e.g. 2.7%); ratings show point changes (e.g. 6.7).",
      },
    ],
  },
  {
    id: "shooting-pace",
    title: "Shooting & pace (dashboard)",
    description: "Team shooting efficiency and tempo metrics aggregated across saved games. Pace uses FIBA 40-minute game length.",
    metrics: [
      {
        id: "ts-pct",
        name: "True Shooting % (TS%)",
        formula: "PTS ÷ (2 × (FGA + 0.44 × FTA))",
        summary: "Overall scoring efficiency including 2s, 3s, and free throws in one number.",
        whyItMatters:
          "FG% treats every field goal equally; TS% does not. A player who gets to the line and hits threes efficiently will beat a high-FG% mid-range scorer on TS%. It's the best single shooting efficiency stat for total scoring impact.",
        howToRead:
          "League-average is often near 52–56% depending on level. Elite scorers often sit above 60%. Team TS% reveals whether you win the efficiency battle even on nights when the 3-ball doesn't fall.",
        inApp: "Team dashboard TS% uses season totals of points, FGA, and FTA from all saved games for the selected team.",
      },
      {
        id: "efg-pct",
        name: "Effective Field Goal % (eFG%)",
        formula: "(FG + 0.5 × 3P) ÷ FGA",
        summary: "Field-goal percentage adjusted so made threes count as 1.5 field goals.",
        whyItMatters:
          "Rewards the extra value of threes without including free throws. Good for comparing shot profiles: two teams with similar FG% can have very different eFG% if one takes more threes.",
        howToRead:
          "50% eFG% is roughly break-even scoring from the field at many levels; above 55% is strong. If eFG% lags TS%, free-throw generation or finishing may be the lever.",
        inApp: "Calculated from cumulative FG, 3P, and FGA across saved games.",
      },
      {
        id: "pace",
        name: "Pace",
        formula: "40 × 5 × (average team & opponent possessions per game) ÷ (team minutes played)",
        summary: "Estimated possessions per 40 minutes (FIBA regulation length).",
        whyItMatters:
          "Pace tells you how fast a team plays. High pace creates more possessions — and more raw counting stats — for both teams. Comparing per-game points without pace context can mislead: 90 points in a slow game may be excellent; 90 in a track meet may not.",
        howToRead:
          "Typical senior men's community or semi-pro games often land roughly in the 75–95 pace range depending on league rules and style. Compare within your own competition set.",
        inApp:
          "Uses FIBA 40-minute normalization. Possessions per team per game are estimated from FGA, FTA, and TOV; opponent possessions are included in the pace calculation.",
      },
    ],
  },
  {
    id: "season-leaders",
    title: "Season leaders (dashboard)",
    description:
      "Counting stats and rates rolled up across every saved appearance for the selected team. AVG is per game played in the sample.",
    metrics: [
      {
        id: "pts",
        name: "Points (PTS)",
        formula: "Sum of points across all saved games.",
        summary: "Total scoring output.",
        whyItMatters: "Identifies primary scoring threats and whether scoring is concentrated or distributed.",
        howToRead: "Check AVG alongside totals — a high total with low GP means a short burst; high GP with strong AVG shows durable production.",
        inApp: "Totals and per-game averages from player rows in saved box scores.",
      },
      {
        id: "reb",
        name: "Rebounds (REB / TRB)",
        formula: "Sum of total rebounds (offensive + defensive).",
        summary: "Finishing possessions on the glass.",
        whyItMatters:
          "Rebounding swings extra possessions. Team rebounding leaders often signal who secures defensive boards to start transition or who creates second-chance points.",
        howToRead: "Bigs usually lead; if a guard is high on the list, they may be crashing hard or the team may be small.",
        inApp: "Uses TRB from each saved game for the selected team.",
      },
      {
        id: "ast",
        name: "Assists (AST)",
        formula: "Sum of assists across saved games.",
        summary: "Passes that directly lead to made baskets.",
        whyItMatters:
          "Ball movement and playmaking drive offense. Assist leaders show who creates for others — not just who scores.",
        howToRead: "High assists with high usage may indicate a primary creator; high assists on low usage may mean a pass-first guard.",
        inApp: "Summed from saved box scores.",
      },
      {
        id: "stl",
        name: "Steals (STL)",
        formula: "Sum of steals across saved games.",
        summary: "Disruptive defensive plays that take the ball away.",
        whyItMatters:
          "Steals create transition chances and reflect on-ball pressure. They are volatile but valuable for identifying high-activity defenders.",
        howToRead: "Foul-prone gambling can inflate STL; pair with watching whether steals come from good reads vs reaching.",
        inApp: "Season total and per-game AVG on the dashboard leaders table.",
      },
      {
        id: "blk",
        name: "Blocks (BLK)",
        formula: "Sum of blocks across saved games.",
        summary: "Shots deflected or rejected at the rim.",
        whyItMatters:
          "Rim protection deters drives and alters shot selection. Block totals highlight interior defensive presence.",
        howToRead: "Blocks can be low even for good rim protectors if opponents avoid the paint — context matters.",
        inApp: "Season total and per-game AVG on the dashboard leaders table.",
      },
      {
        id: "usg-pct",
        name: "Usage Rate (USG%)",
        formula:
          "100 × (player FGA + 0.44×FTA + TOV) × 40 ÷ (player minutes × team possessions per game). Minutes-weighted on the leaders table.",
        summary: "Share of team possessions a player 'uses' while on the floor.",
        whyItMatters:
          "Shows who the offense runs through. High usage with strong efficiency is star production; high usage with poor efficiency may mean forced shots. Low usage with high efficiency can mean elite role-player value.",
        howToRead:
          "Rough guide: ~20% is moderate, ~25%+ is high, ~30%+ is very high (star level). The dashboard shows minutes-weighted USG% plus a simple per-appearance average in AVG.",
        inApp:
          "Calculated per game when box scores are analyzed; dashboard aggregates with minutes weighting for the USG% column.",
      },
      {
        id: "efg-pct-leaders",
        name: "Effective FG% (eFG%)",
        formula: "(FG + 0.5 × 3P) ÷ FGA across all saved games.",
        summary: "Shooting efficiency from the field, crediting the extra value of threes.",
        whyItMatters:
          "Separates efficient scorers from high-volume shooters. Season leaders use total makes and attempts, not a simple average of game percentages.",
        howToRead:
          "Total sorts by season eFG%; Per game sorts by the average of each game's eFG%. AVG shows the per-game average column.",
        inApp: "Season leaders table on the team dashboard.",
      },
      {
        id: "fg3-pct-leaders",
        name: "3-Point % (3P%) & 3PAr",
        formula: "3P% = 3P ÷ 3PA; 3PAr = 3PA ÷ FGA.",
        summary: "Three-point accuracy plus how often a player shoots threes.",
        whyItMatters:
          "3P% alone can mislead on low volume. 3PAr shows shot diet — a high 3P% on tiny volume differs from a strong rate on high 3PAr.",
        howToRead:
          "Requires at least one 3PA in the sample. 3PAr is always the season attempt rate; Total vs Per game changes sort order for 3P%.",
        inApp: "Season leaders table with 3P% and 3PAr columns.",
      },
      {
        id: "bpm-leaders",
        name: "Box Plus/Minus (BPM)",
        formula: "Minutes-weighted average of per-game BPM from saved box scores.",
        summary: "All-in-one estimated impact from box score contributions.",
        whyItMatters:
          "Ranks who is driving winning contributions across scoring, playmaking, rebounding, and defense in one number.",
        howToRead:
          "Positive is above average for that game model. Total uses minutes-weighted BPM; Per game uses the simple average across appearances.",
        inApp: "Requires advanced stats on saved games. Season leaders table on the team dashboard.",
      },
    ],
  },
  {
    id: "box-score-advanced",
    title: "Advanced box score stats (upload results)",
    description:
      "Shown on each uploaded or saved game in the advanced columns. All rate stats that scale by minutes use a 40-minute FIBA game length.",
    metrics: [
      {
        id: "box-ts-efg",
        name: "TS% & eFG%",
        formula: "See Shooting & pace section.",
        summary: "Per-player shooting efficiency within a single game.",
        whyItMatters: "Spot who was efficient in a specific game, not just who took the most shots.",
        howToRead: "One cold shooting night shows up immediately in TS% and eFG% even if points look okay.",
        inApp: "Computed in stats_engine when a box score is uploaded.",
      },
      {
        id: "3par-ftr",
        name: "3PAr & FTr",
        formula: "3PAr = 3PA÷FGA; FTr = FTA÷FGA",
        summary: "Shot profile indicators — three-point rate and free-throw rate.",
        whyItMatters:
          "3PAr shows how often a player or team shoots threes relative to all field goals. FTr shows how often they get to the line. Modern efficient offenses usually combine reasonable 3PAr with a solid FTr.",
        howToRead: "Extreme 3PAr with low eFG% may mean too many long shots; low FTr can mean settled jump shots instead of attacking.",
        inApp: "Displayed as decimals converted to percentages in the results table.",
      },
      {
        id: "reb-pct",
        name: "ORB%, DRB%, TRB%",
        formula: "Rebounds × 40 ÷ (minutes × available rebound opportunities)",
        summary: "Percentage of available rebounds a player collected while on the floor.",
        whyItMatters:
          "Better than raw rebounds for comparing players with different minutes. ORB% highlights second-chance creation; DRB% highlights ending opponent possessions.",
        howToRead: "DRB% above ~20% is often strong for a big; guards typically have lower raw rebound % but can still help on the glass.",
        inApp: "Opponent rebound totals from the other team in dual box score uploads improve accuracy.",
      },
      {
        id: "ast-pct",
        name: "AST%",
        formula: "100 × AST × 40 ÷ (minutes × (team FG − player FG))",
        summary: "Percentage of teammate field goals a player assisted while on the floor.",
        whyItMatters: "Separates passers from scorers. High AST% identifies primary facilitators even if assist totals are moderate.",
        howToRead: "Guards often lead; bigs with high AST% may be hub passers in a motion offense.",
        inApp: "Requires team shooting context from the same game.",
      },
      {
        id: "stl-blk-pct",
        name: "STL% & BLK%",
        formula: "Steals or blocks × 40 ÷ (minutes × team possessions)",
        summary: "Disruptive events per defensive opportunity.",
        whyItMatters: "Normalizes stocks for playing time and pace so you can compare a starter to a rim-protecting sub.",
        howToRead: "One-game spikes happen; look for repeat leaders across saved games.",
        inApp: "Uses estimated team possessions for the game.",
      },
      {
        id: "tov-pct",
        name: "TOV%",
        formula: "TOV ÷ (FGA + 0.44×FTA + TOV)",
        summary: "Turnovers per possession used.",
        whyItMatters: "Ball security fuels offense. High usage with high TOV% is a red flag; low TOV% with creation role is valuable.",
        howToRead: "Below ~12% is generally solid for guards; bigs handling the ball may run higher.",
        inApp: "Shown as a percentage in game results.",
      },
      {
        id: "bpm",
        name: "Box Plus/Minus (BPM)",
        formula: "Weighted blend of TS%, AST%, TRB%, STL%, BLK%, TOV%, USG%, ORB%, DRB%",
        summary: "Estimated per-100-possession contribution above average from box score data only.",
        whyItMatters:
          "Single-game all-in-one impact estimate. Positive BPM suggests a player did more good than harm relative to average in that game.",
        howToRead: "Approximate — not the same as official BPM or plus/minus. Use for quick comparison within a game, not as gospel.",
        inApp: "Approximation in stats_engine; no play-by-play or lineup data used.",
      },
    ],
  },
];

export function getMetricAnchor(metricId) {
  return `/metric-definitions#${metricId}`;
}
