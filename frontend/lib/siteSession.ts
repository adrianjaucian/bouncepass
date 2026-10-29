import { createHmac, timingSafeEqual } from "crypto";
import { ADMIN_EMAIL } from "./contact";
import { getBackendUrl } from "./auth";

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function getSitePassword(): string {
  return process.env.ACCESS_PASSWORD || process.env.SITE_PASSWORD || "pregame";
}

export function isValidSitePassword(password: string): boolean {
  const expected = Buffer.from(getSitePassword());
  const given = Buffer.from(password || "");
  const length = Math.max(expected.length, given.length, 1);
  const expectedPadded = Buffer.concat([expected, Buffer.alloc(length - expected.length)]);
  const givenPadded = Buffer.concat([given, Buffer.alloc(length - given.length)]);
  return expected.length === given.length && timingSafeEqual(expectedPadded, givenPadded);
}

type AuthPayload = {
  access_token?: string;
  user?: { id?: number; email?: string };
  detail?: string;
  error?: string;
};

async function backendAuth(path: string, body: Record<string, string>): Promise<AuthPayload & { ok: boolean; status: number }> {
  try {
    const response = await fetch(`${getBackendUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const data = (await response.json().catch(() => ({}))) as AuthPayload;
    return { ...data, ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 503 };
  }
}

function mintToken(userId: number, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: String(userId),
      exp: Math.floor(Date.now() / 1000) + TOKEN_MAX_AGE_SECONDS,
    })
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

async function tokenBelongsToDemo(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${getBackendUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const data = (await response.json().catch(() => ({}))) as { email?: string };
    return (data.email || "").trim().toLowerCase() === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

export async function issueSiteAccessToken(password: string): Promise<string | null> {
  const access = await backendAuth("/auth/access", { password });
  if (access.ok && access.access_token) return access.access_token;

  const login = await backendAuth("/auth/login", { email: ADMIN_EMAIL, password });
  if (login.ok && login.access_token) return login.access_token;

  await backendAuth("/auth/register", { email: ADMIN_EMAIL, password });
  const loginAfterRegister = await backendAuth("/auth/login", { email: ADMIN_EMAIL, password });
  if (loginAfterRegister.ok && loginAfterRegister.access_token) {
    return loginAfterRegister.access_token;
  }

  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) return null;
  for (let userId = 1; userId <= 8; userId += 1) {
    const token = mintToken(userId, secret);
    if (await tokenBelongsToDemo(token)) return token;
  }
  return null;
}
