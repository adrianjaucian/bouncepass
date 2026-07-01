import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getBackendUrl } from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Not authenticated" },
        { status: backendResponse.status }
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unable to reach authentication server" }, { status: 502 });
  }
}
