"use client";

import { useRouter } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import MetricDefinitionsSection from "../../components/MetricDefinitionsSection";
import UploadDual from "../../components/UploadDual";
import { ADMIN_EMAIL } from "../../lib/contact";

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Invalid email or password");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        fontFamily: "Arial, sans-serif",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            margin: "0 auto 40px auto",
            backgroundColor: "#fff",
            padding: "32px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ color: "#2c3e50", margin: "0 0 8px 0", fontSize: "1.8em", textAlign: "center" }}>
            Bounce PASS
          </h1>
          <p style={{ color: "#7f8c8d", margin: "0 0 24px 0", textAlign: "center" }}>
            Demo access is limited to <strong>{ADMIN_EMAIL}</strong>. New accounts cannot be created right now.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
              style={{
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid #d0d7de",
                fontSize: "14px",
                color: "#000",
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading || !email || !password}
              style={{
                padding: "14px 24px",
                backgroundColor: loading || !email || !password ? "#bdc3c7" : "#3498db",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: loading || !email || !password ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
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

        <main
          style={{
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <UploadDual demoMode />
          <MetricDefinitionsSection compact />
        </main>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
