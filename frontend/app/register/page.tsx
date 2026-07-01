"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Could not create account");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Arial, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "420px", backgroundColor: "#fff", padding: "32px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <h1 style={{ color: "#2c3e50", margin: "0 0 8px 0", fontSize: "1.8em", textAlign: "center" }}>Create account</h1>
        <p style={{ color: "#7f8c8d", margin: "0 0 24px 0", textAlign: "center" }}>
          Your saved games and dashboards stay tied to this account across devices.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="email"
            style={{ padding: "12px 14px", borderRadius: "8px", border: "1px solid #d0d7de", fontSize: "14px", color: "#000" }}
          />
          <input
            type="password"
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            style={{ padding: "12px 14px", borderRadius: "8px", border: "1px solid #d0d7de", fontSize: "14px", color: "#000" }}
          />
          <button
            type="submit"
            disabled={loading || !email || password.length < 8}
            style={{
              padding: "14px 24px",
              backgroundColor: loading || !email || password.length < 8 ? "#bdc3c7" : "#3498db",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading || !email || password.length < 8 ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p style={{ margin: "20px 0 0 0", textAlign: "center", color: "#56616b", fontSize: "14px" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#3498db", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>

        {error && (
          <div style={{ marginTop: "16px", color: "#c0392b", backgroundColor: "#fdecea", padding: "14px", borderRadius: "8px", border: "1px solid #f5c6cb" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
