export const DEFAULT_PRIMARY = "#1b2838";
export const DEFAULT_SECONDARY = "#f1c40f";
export const BODY_TEXT = "#000000";

export const COLORS = {
  navy: "var(--navy)",
  navyMid: "var(--navy-mid)",
  navySoft: "var(--navy-soft)",
  gold: "var(--gold)",
  goldSoft: "var(--gold-soft)",
  goldMuted: "var(--gold-muted)",
  goldInk: "var(--gold-ink)",
  cream: "var(--cream)",
  card: "var(--card)",
  text: "var(--text)",
  muted: "var(--muted)",
  grey: "#6b7280",
  greyHeader: "var(--grey-header)",
  greyRow: "var(--grey-row)",
  greyAlt: "var(--grey-alt)",
  greyBorder: "var(--grey-border)",
  danger: "#9b2c2c",
  dangerBg: "#fdecea",
};

function parseHex(value) {
  const raw = String(value || "").trim();
  const short = raw.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const full = raw.match(/^#([0-9a-fA-F]{6})$/);
  return full ? `#${full[1].toLowerCase()}` : null;
}

export function normalizeHex(value, fallback = DEFAULT_PRIMARY) {
  return parseHex(value) || fallback;
}

function hexToRgb(hex) {
  const normalized = parseHex(hex) || "#000000";
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const to = (channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mixHex(left, right, amount) {
  const start = hexToRgb(left);
  const end = hexToRgb(right);
  return rgbToHex({
    r: start.r + (end.r - start.r) * amount,
    g: start.g + (end.g - start.g) * amount,
    b: start.b + (end.b - start.b) * amount,
  });
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const linear = (channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function onColor(background) {
  return luminance(background) > 0.45 ? "#1b2838" : "#f7f4ea";
}

export function buildTheme(primary, secondary) {
  const navy = normalizeHex(primary, DEFAULT_PRIMARY);
  const gold = normalizeHex(secondary, DEFAULT_SECONDARY);
  const rgb = hexToRgb(gold);
  return {
    navy,
    navyMid: mixHex(navy, "#ffffff", 0.1),
    navySoft: mixHex(navy, "#ffffff", 0.18),
    gold,
    goldSoft: mixHex(gold, "#ffffff", 0.72),
    goldMuted: mixHex(gold, "#ffffff", 0.5),
    goldInk: mixHex(gold, "#000000", 0.55),
    cream: mixHex("#f7f4ea", navy, 0.08),
    goldRgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    navFg: onColor(navy),
    navMuted: mixHex(onColor(navy), navy, 0.28),
  };
}

export function applyTeamTheme(primary, secondary) {
  if (typeof document === "undefined") return;
  const theme = buildTheme(primary, secondary);
  const root = document.documentElement;
  const next = {
    "--navy": theme.navy,
    "--navy-mid": theme.navyMid,
    "--navy-soft": theme.navySoft,
    "--gold": theme.gold,
    "--gold-soft": theme.goldSoft,
    "--gold-muted": theme.goldMuted,
    "--gold-ink": theme.goldInk,
    "--gold-rgb": theme.goldRgb,
    "--cream": theme.cream,
    "--text": BODY_TEXT,
    "--background": theme.cream,
    "--foreground": BODY_TEXT,
    "--nav-fg": theme.navFg,
    "--nav-muted": theme.navMuted,
  };
  Object.entries(next).forEach(([name, value]) => root.style.setProperty(name, value));
}

export function resetTeamTheme() {
  applyTeamTheme(DEFAULT_PRIMARY, DEFAULT_SECONDARY);
}

export const pageShell = {
  minHeight: "100vh",
  backgroundColor: COLORS.cream,
  fontFamily: "Arial, sans-serif",
};

export const pageInner = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "32px 16px",
};

export const cardStyle = {
  backgroundColor: COLORS.card,
  borderRadius: "10px",
  boxShadow: "0 2px 10px rgba(27, 40, 56, 0.08)",
  border: `1px solid ${COLORS.greyBorder}`,
};

export const pageHeader = {
  ...cardStyle,
  textAlign: "center",
  marginBottom: "24px",
  padding: "28px 24px",
};

export const pageMain = {
  ...cardStyle,
  padding: "28px 24px",
};

export const titleStyle = {
  color: COLORS.text,
  margin: "0 0 10px 0",
};

export const subtitleStyle = {
  color: COLORS.muted,
  margin: 0,
};

export const primaryButton = (enabled) => ({
  backgroundColor: enabled ? COLORS.navy : COLORS.greyAlt,
  color: enabled ? COLORS.gold : COLORS.grey,
  border: enabled ? `1px solid ${COLORS.gold}` : `1px solid ${COLORS.greyBorder}`,
  borderRadius: "8px",
  fontWeight: 700,
  cursor: enabled ? "pointer" : "not-allowed",
});
