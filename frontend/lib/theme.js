export const COLORS = {
  navy: "#1b2838",
  navyMid: "#243447",
  navySoft: "#2f4256",
  gold: "#f1c40f",
  goldSoft: "#fff3b0",
  goldMuted: "#f7e08a",
  goldInk: "#7a5d00",
  cream: "#f7f4ea",
  card: "#ffffff",
  text: "#1b2838",
  muted: "#5d6d7e",
  grey: "#6b7280",
  greyHeader: "#4b5563",
  greyRow: "#f3f4f6",
  greyAlt: "#e5e7eb",
  greyBorder: "#d1d5db",
  danger: "#9b2c2c",
  dangerBg: "#fdecea",
};

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
  color: COLORS.navy,
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
