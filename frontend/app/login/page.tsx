"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Incorrect password");
        return;
      }

      const from = searchParams.get("from") || "/";
      router.replace(from);
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "420px", backgroundColor: "#fff", padding: "32px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <h1 style={{ color: "#2c3e50", margin: "0 0 8px 0", fontSize: "1.8em", textAlign: "center" }}>Bounce PASS</h1>
        <p style={{ color: "#7f8c8d", margin: "0 0 24px 0", textAlign: "center" }}>Enter the site password to continue.</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            style={{ padding: "12px 14px", borderRadius: "8px", border: "1px solid #d0d7de", fontSize: "14px", color: "#000" }}
          />
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              padding: "14px 24px",
              backgroundColor: loading || !password ? "#bdc3c7" : "#3498db",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading || !password ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: "16px", color: "#c0392b", backgroundColor: "#fdecea", padding: "14px", borderRadius: "8px", border: "1px solid #f5c6cb" }}>
            {error}
          </div>
        )}
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
