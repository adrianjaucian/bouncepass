import { BUG_REPORT_MAILTO, CONTACT_MAILTO } from "../lib/contact";

const linkStyle = {
  color: "#56616b",
  textDecoration: "none",
  fontSize: "13px",
};

export default function SiteFooter() {
  return (
    <footer
      style={{
        marginTop: "auto",
        padding: "16px 20px",
        textAlign: "center",
        fontFamily: "Arial, sans-serif",
        borderTop: "1px solid #e8edf2",
        backgroundColor: "#f8f9fa",
      }}
    >
      <nav aria-label="Support links" style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
        <a href={CONTACT_MAILTO} style={linkStyle}>
          Contact us
        </a>
        <a href={BUG_REPORT_MAILTO} style={linkStyle}>
          Report a bug
        </a>
      </nav>
    </footer>
  );
}
