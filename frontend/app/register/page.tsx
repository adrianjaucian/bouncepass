"use client";

import Link from "next/link";
import { ADMIN_EMAIL } from "../../lib/contact";

export default function RegisterPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#fff",
          padding: "32px",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#2c3e50", margin: "0 0 8px 0", fontSize: "1.8em" }}>Registration closed</h1>
        <p style={{ color: "#7f8c8d", margin: "0 0 24px 0" }}>
          New accounts cannot be created right now. Sign in with the demo account{" "}
          <strong>{ADMIN_EMAIL}</strong>.
        </p>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            padding: "14px 24px",
            backgroundColor: "#3498db",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
