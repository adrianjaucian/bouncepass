import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "../../../../lib/auth";
import { isValidSitePassword, issueSiteAccessToken } from "../../../../lib/siteSession";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const password = body.password || "";
  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }
  if (!isValidSitePassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  try {
    const token = await issueSiteAccessToken(password);
    if (!token) {
      return NextResponse.json(
        { error: "Could not unlock the demo workspace. Try again in a moment." },
        { status: 502 }
      );
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to reach authentication server" }, { status: 502 });
  }
}
