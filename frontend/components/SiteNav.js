"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Home", color: "#3498db" },
  { href: "/saved-games", label: "Saved Games", color: "#2c3e50" },
  { href: "/team-dashboard", label: "Team Dashboard", color: "#9b59b6" },
  { href: "/player-dashboard", label: "Player Dashboard", color: "#e67e22" },
  { href: "/metric-definitions", label: "Metric Definitions", color: "#16a085" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return;
        const data = await response.json();
        setUserEmail(data.email || "");
      } catch {
        setUserEmail("");
      }
    };
    loadUser();
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.replace("/login");
    router.refresh();
  };

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 1000,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
        style={{
          padding: "12px 18px",
          backgroundColor: "#2c3e50",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold",
          fontSize: "14px",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)",
        }}
      >
        {open ? "Close Menu" : "Menu"}
      </button>

      {open && (
        <nav
          id={menuId}
          aria-label="Site navigation"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            minWidth: "220px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "12px",
            backgroundColor: "#fff",
            border: "1px solid #d6e4f0",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.14)",
          }}
        >
          {userEmail && (
            <div style={{ padding: "8px 10px", color: "#56616b", fontSize: "13px", borderBottom: "1px solid #eef2f6" }}>
              Signed in as<br />
              <strong style={{ color: "#2c3e50" }}>{userEmail}</strong>
            </div>
          )}
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive ? "page" : undefined}
                style={{
                  padding: "12px 14px",
                  backgroundColor: item.color,
                  color: "#fff",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: "14px",
                  outline: isActive ? "2px solid #f1c40f" : "none",
                  outlineOffset: "2px",
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "12px 14px",
              backgroundColor: "#ecf0f1",
              color: "#2c3e50",
              border: "1px solid #d0d7de",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </nav>
      )}
    </div>
  );
}
