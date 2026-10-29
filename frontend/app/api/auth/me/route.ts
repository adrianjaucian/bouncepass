import { NextRequest, NextResponse } from "next/server";
import { ADMIN_EMAIL } from "../../../../lib/contact";
import { AUTH_COOKIE_NAME, getBackendUrl, isAllowedAccountEmail, isAuthenticated } from "../../../../lib/auth";

const DEMO_SESSION = { id: 1, email: ADMIN_EMAIL };

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!(await isAuthenticated(token)) || !token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    const data = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      // Site-password cookies can be minted locally when Render is down or on an older SHA.
      return NextResponse.json(DEMO_SESSION);
    }
    if (!isAllowedAccountEmail(data.email)) {
      const response = NextResponse.json(
        { error: "Account access is limited to the demo account" },
        { status: 403 }
      );
      response.cookies.set(AUTH_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(DEMO_SESSION);
  }
}
