import { createHmac, timingSafeEqual } from "crypto";
import { getBackendUrl, isAllowedAccountEmail, isAuthenticated } from "./auth";

const BACKEND_TIMEOUT_MS = 8000;

function siteTokenSecret(): string {
  return process.env.AUTH_SECRET || process.env.JWT_SECRET || "dev-insecure-jwt-secret-change-me";
}

function isSignedSiteToken(token: string): boolean {
  const secret = siteTokenSecret();
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signature);
  if (expectedBuf.length !== givenBuf.length || !timingSafeEqual(expectedBuf, givenBuf)) {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: number };
    return !data.exp || data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function isDemoSession(token: string | undefined): Promise<boolean> {
  if (!(await isAuthenticated(token)) || !token) {
    return false;
  }
  // A site-password cookie is enough. Do not 401 team/save calls just because
  // Render is asleep or signed the token with a different secret.
  if (isSignedSiteToken(token)) {
    return true;
  }
  try {
    const backendResponse = await fetch(`${getBackendUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
    if (!backendResponse.ok) {
      return true;
    }
    const data = await backendResponse.json().catch(() => ({}));
    return isAllowedAccountEmail((data as { email?: string }).email);
  } catch {
    return true;
  }
}
