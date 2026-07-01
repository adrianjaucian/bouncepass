"use client";

import { useEffect, useRef, useState } from "react";
import { ADMIN_EMAIL } from "../lib/contact";

export default function DemoAccountBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const bannerRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return;
        const data = await response.json();
        setShowBanner((data.email || "").toLowerCase() === ADMIN_EMAIL);
      } catch {
        setShowBanner(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const updateNavOffset = () => {
      if (showBanner && bannerRef.current) {
        const height = bannerRef.current.offsetHeight;
        root.style.setProperty("--site-nav-top", `${height + 8}px`);
      } else {
        root.style.setProperty("--site-nav-top", "16px");
      }
    };

    updateNavOffset();
    window.addEventListener("resize", updateNavOffset);
    return () => {
      window.removeEventListener("resize", updateNavOffset);
      root.style.setProperty("--site-nav-top", "16px");
    };
  }, [showBanner]);

  if (!showBanner) {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      role="status"
      style={{
        backgroundColor: "#fff8e6",
        borderBottom: "1px solid #f0d78c",
        color: "#5c4a1f",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        lineHeight: 1.5,
        padding: "10px 20px",
        textAlign: "center",
      }}
    >
      <strong>Demo account.</strong> This account includes pre-synced NBL1 data as of 1/7/2026. To add
      to the database, simply action the auto-sync on the homepage when more game box scores become
      available.
    </div>
  );
}
