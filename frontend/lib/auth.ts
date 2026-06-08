import { createHash, timingSafeEqual } from "crypto";

export const AUTH_COOKIE_NAME = "site_auth";

export function isPasswordProtectionEnabled(): boolean {
  return Boolean(process.env.ACCESS_PASSWORD);
}

export function getAuthCookieValue(): string {
  const password = process.env.ACCESS_PASSWORD || "";
  const secret = process.env.AUTH_SECRET || password;
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

export function isAuthenticated(cookieValue: string | undefined): boolean {
  if (!isPasswordProtectionEnabled()) {
    return true;
  }
  if (!cookieValue) {
    return false;
  }
  const expected = getAuthCookieValue();
  try {
    return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  if (!isPasswordProtectionEnabled()) {
    return true;
  }
  const expected = process.env.ACCESS_PASSWORD || "";
  try {
    return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function getBackendUrl(): string {
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}
