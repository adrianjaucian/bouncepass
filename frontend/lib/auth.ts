import { ADMIN_EMAIL } from "./contact";

export const AUTH_COOKIE_NAME = "bounce_auth";

export function isAuthRequired(): boolean {
  return true;
}

export function getBackendUrl(): string {
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

export function isAllowedAccountEmail(email: string | undefined | null): boolean {
  return (email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

export async function isAuthenticated(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) {
    return false;
  }
  const parts = cookieValue.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export async function isDemoSession(token: string | undefined): Promise<boolean> {
  if (!(await isAuthenticated(token)) || !token) {
    return false;
  }
  try {
    const backendResponse = await fetch(`${getBackendUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!backendResponse.ok) {
      return false;
    }
    const data = await backendResponse.json().catch(() => ({}));
    return isAllowedAccountEmail((data as { email?: string }).email);
  } catch {
    return false;
  }
}
