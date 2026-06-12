"use client";

import Link from "next/link";
import SiteNav from "../../components/SiteNav";
import { METRIC_SECTIONS } from "../../lib/metricDefinitions";

const sectionStyle = {
  marginBottom: "40px",
};

const cardStyle = {
  backgroundColor: "#fafbfc",
  border: "1px solid #e1e8ed",
  borderRadius: "10px",
  padding: "20px 22px",
  marginBottom: "16px",
};

const labelStyle = {
  color: "#56616b",
  fontSize: "12px",
  fontWeight: "bold" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  marginBottom: "6px",
};

const jumpLinkStyle = {
  color: "#3498db",
  textDecoration: "none",
  fontSize: "14px",
};

export default function MetricDefinitionsPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}>
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
          <h1 style={{ color: "#2c3e50", margin: "0 0 10px 0", fontSize: "2.2em" }}>Metric Definitions</h1>
          <p style={{ color: "#7f8c8d", margin: 0, lineHeight: 1.5 }}>
            Reference guide for statistics shown on the Team Dashboard and in uploaded box score results.
            All minute-scaled rates use <strong>40-minute FIBA</strong> game length.
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
          <nav
            style={{
              marginBottom: "32px",
              padding: "18px 20px",
              backgroundColor: "#f4f8fb",
              borderRadius: "8px",
              border: "1px solid #d6e4f0",
            }}
          >
            <h2 style={{ margin: "0 0 12px 0", color: "#2c3e50", fontSize: "1.1em" }}>On this page</h2>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#2c3e50", lineHeight: 1.8 }}>
              {METRIC_SECTIONS.map((section) => (
                <li key={section.id}>
                  <Link href={`#${section.id}`} style={jumpLinkStyle}>
                    {section.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {METRIC_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} style={sectionStyle}>
              <h2 style={{ color: "#2c3e50", margin: "0 0 8px 0", fontSize: "1.5em" }}>{section.title}</h2>
              <p style={{ color: "#56616b", margin: "0 0 20px 0", lineHeight: 1.6 }}>{section.description}</p>

              {section.metrics.map((metric) => (
                <article key={metric.id} id={metric.id} style={cardStyle}>
                  <h3 style={{ color: "#2c3e50", margin: "0 0 12px 0", fontSize: "1.15em" }}>{metric.name}</h3>

                  <div style={{ marginBottom: "14px" }}>
                    <div style={labelStyle}>Formula</div>
                    <p style={{ margin: 0, color: "#000", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5 }}>
                      {metric.formula}
                    </p>
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <div style={labelStyle}>What it is</div>
                    <p style={{ margin: 0, color: "#000", lineHeight: 1.6 }}>{metric.summary}</p>
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <div style={labelStyle}>Why it matters</div>
                    <p style={{ margin: 0, color: "#000", lineHeight: 1.6 }}>{metric.whyItMatters}</p>
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <div style={labelStyle}>How to read it</div>
                    <p style={{ margin: 0, color: "#000", lineHeight: 1.6 }}>{metric.howToRead}</p>
                  </div>

                  <div>
                    <div style={labelStyle}>In Bounce PASS</div>
                    <p style={{ margin: 0, color: "#56616b", lineHeight: 1.6, fontSize: "14px" }}>{metric.inApp}</p>
                  </div>
                </article>
              ))}
            </section>
          ))}

          <p style={{ color: "#7f8c8d", fontSize: "14px", margin: 0, lineHeight: 1.6 }}>
            Return to the{" "}
            <Link href="/team-dashboard" style={{ color: "#3498db" }}>
              Team Dashboard
            </Link>{" "}
            or{" "}
            <Link href="/" style={{ color: "#3498db" }}>
              upload a box score
            </Link>{" "}
            to see these metrics in context.
          </p>
        </main>
      </div>
    </div>
  );
}
