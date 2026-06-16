export type TrendStatConfig = {
  key: string;
  label: string;
  scale: (value: number) => number;
  format: (value: number) => string;
};

export const PLAYER_TREND_STATS: TrendStatConfig[];
export const TEAM_FEATURED_TREND_STAT: TrendStatConfig;
export const TEAM_TREND_STATS: TrendStatConfig[];

type TrendPoint = Record<string, unknown>;

type TrendChartsProps = {
  trendCharts?: {
    last_5?: TrendPoint[];
    last_10?: TrendPoint[];
    season?: TrendPoint[];
  };
  title?: string;
  statConfig?: TrendStatConfig[];
  featuredStat?: TrendStatConfig | null;
  description?: string;
};

export default function TrendCharts(props: TrendChartsProps): React.JSX.Element | null;
