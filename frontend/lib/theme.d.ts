import type { CSSProperties } from "react";

export const DEFAULT_PRIMARY: string;
export const DEFAULT_SECONDARY: string;
export function normalizeHex(value: string | null | undefined, fallback?: string): string;
export function buildTheme(primary?: string | null, secondary?: string | null): Record<string, string>;
export function applyTeamTheme(primary?: string | null, secondary?: string | null): void;
export function resetTeamTheme(): void;

export const COLORS: {
  navy: string;
  navyMid: string;
  navySoft: string;
  gold: string;
  goldSoft: string;
  goldMuted: string;
  goldInk: string;
  cream: string;
  card: string;
  text: string;
  muted: string;
  grey: string;
  greyHeader: string;
  greyRow: string;
  greyAlt: string;
  greyBorder: string;
  danger: string;
  dangerBg: string;
};

export const pageShell: CSSProperties;
export const pageInner: CSSProperties;
export const cardStyle: CSSProperties;
export const pageHeader: CSSProperties;
export const pageMain: CSSProperties;
export const titleStyle: CSSProperties;
export const subtitleStyle: CSSProperties;
export function primaryButton(enabled: boolean): CSSProperties;
