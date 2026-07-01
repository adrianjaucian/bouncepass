export const AUTH_COOKIE_NAME = "bounce_auth";

export function isAuthRequired(): boolean {
  return true;
}

export function getBackendUrl(): string {
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

export async function isAuthenticated(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) {
    return false;
  }
  const parts = cookieValue.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}
