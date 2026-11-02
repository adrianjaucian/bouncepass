import { BUG_REPORT_MAILTO, CONTACT_MAILTO } from "../lib/contact";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav aria-label="Support links" style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
        <a href={CONTACT_MAILTO}>
          Contact us
        </a>
        <a href={BUG_REPORT_MAILTO}>
          Report a bug
        </a>
      </nav>
    </footer>
  );
}
