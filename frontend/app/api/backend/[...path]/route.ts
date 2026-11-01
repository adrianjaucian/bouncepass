import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getBackendUrl, isAuthenticated } from "../../../../lib/auth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function exchangeBackendToken(): Promise<string | null> {
  const password = process.env.ACCESS_PASSWORD || process.env.SITE_PASSWORD || "pregame";
  try {
    const response = await fetch(`${getBackendUrl()}/auth/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ password }),
      signal: AbortSignal.timeout(25000),
    });
    const data = (await response.json().catch(() => ({}))) as { access_token?: string };
    return response.ok ? data.access_token || null : null;
  } catch {
    return null;
  }
}

async function sendToBackend(backendUrl: string, request: NextRequest, token: string, body: ArrayBuffer | null) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  headers.set("Authorization", `Bearer ${token}`);

  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (body && request.method !== "GET" && request.method !== "HEAD") {
    init.body = body;
  }
  return fetch(backendUrl, init);
}

function proxyResponse(backendResponse: Response, responseBody: ArrayBuffer) {
  const responseHeaders = new Headers();
  const responseContentType = backendResponse.headers.get("content-type");
  if (responseContentType) {
    responseHeaders.set("content-type", responseContentType);
  }
  return new NextResponse(responseBody, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}

async function proxyRequest(request: NextRequest, pathParts: string[]) {
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!(await isAuthenticated(cookieToken)) || !cookieToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backendPath = pathParts.join("/");
  const backendUrl = `${getBackendUrl()}/${backendPath}${request.nextUrl.search}`;
  const body =
    request.method !== "GET" && request.method !== "HEAD" ? await request.arrayBuffer() : null;

  try {
    let backendResponse = await sendToBackend(backendUrl, request, cookieToken, body);
    if (backendResponse.status === 401) {
      const backendToken = await exchangeBackendToken();
      if (backendToken) {
        backendResponse = await sendToBackend(backendUrl, request, backendToken, body);
      }
    }
    return proxyResponse(backendResponse, await backendResponse.arrayBuffer());
  } catch (error) {
    console.error("Backend proxy error:", backendUrl, error);
    return NextResponse.json(
      {
        error: "Backend unavailable",
        detail:
          "The API server could not be reached. Ensure the Render backend is deployed and API_URL points to it.",
      },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
