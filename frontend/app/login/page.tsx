"use client";

import { useRouter } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function SitePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(25000),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Invalid password");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to unlock the site. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--cream)",
        fontFamily: "Arial, sans-serif",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            margin: "0 auto",
            backgroundColor: "#fff",
            padding: "32px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ color: "var(--text)", margin: "0 0 8px 0", fontSize: "1.8em", textAlign: "center" }}>
            Bounce PASS
          </h1>
          <p style={{ color: "#5d6d7e", margin: "0 0 24px 0", textAlign: "center" }}>
            Enter the site password to open the platform.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            <input
              type="password"
              placeholder="Site password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              style={{
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid #d0d7de",
                fontSize: "14px",
                color: "#000",
              }}
            />
            <button
              type="submit"
              disabled={loading || !password}
              style={{
                padding: "14px 24px",
                backgroundColor: loading || !password ? "#e5e7eb" : "var(--navy)",
                border: loading || !password ? "1px solid #d1d5db" : "1px solid var(--gold)",
                color: loading || !password ? "#5d6d7e" : "var(--gold)",
                borderRadius: "8px",
                cursor: loading || !password ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              {loading ? "Unlocking..." : "Unlock"}
            </button>
          </form>

          {error && (
            <div
              style={{
                marginTop: "16px",
                color: "#c0392b",
                backgroundColor: "#fdecea",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #f5c6cb",
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <SitePasswordForm />
    </Suspense>
  );
}
