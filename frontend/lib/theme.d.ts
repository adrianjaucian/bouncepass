import type { CSSProperties } from "react";

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
