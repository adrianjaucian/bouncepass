"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_EMAIL } from "../lib/contact";

export default function DemoAccountBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          setShowBanner(false);
          return;
        }
        const data = await response.json();
        setShowBanner((data.email || "").toLowerCase() === ADMIN_EMAIL);
      } catch {
        setShowBanner(false);
      }
    };
    loadUser();
  }, [pathname]);

  if (!showBanner) {
    return null;
  }

  return (
    <div
      role="status"
      style={{
        backgroundColor: "var(--gold-soft)",
        borderBottom: "1px solid var(--gold)",
        color: "var(--navy)",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        lineHeight: 1.5,
        padding: "10px 20px",
        textAlign: "center",
      }}
    >
      <strong>Demo.</strong> Upload a box score on Home and save it to Advanced Box Scores.
    </div>
  );
}
