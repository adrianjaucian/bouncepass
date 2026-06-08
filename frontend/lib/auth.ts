export const AUTH_COOKIE_NAME = "site_auth";

export function isPasswordProtectionEnabled(): boolean {
  return Boolean(process.env.ACCESS_PASSWORD);
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function getAuthCookieValue(): Promise<string> {
  const password = process.env.ACCESS_PASSWORD || "";
  const secret = process.env.AUTH_SECRET || password;
  return sha256Hex(`${password}:${secret}`);
}

export async function isAuthenticated(cookieValue: string | undefined): Promise<boolean> {
  if (!isPasswordProtectionEnabled()) {
    return true;
  }
  if (!cookieValue) {
    return false;
  }
  const expected = await getAuthCookieValue();
  return timingSafeEqualStrings(cookieValue, expected);
}

export async function verifyPassword(password: string): Promise<boolean> {
  if (!isPasswordProtectionEnabled()) {
    return true;
  }
  const expected = process.env.ACCESS_PASSWORD || "";
  return timingSafeEqualStrings(password, expected);
}

export function getBackendUrl(): string {
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}
