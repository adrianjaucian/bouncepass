import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getBackendUrl, isAuthenticated } from "../../../../lib/auth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function proxyRequest(request: NextRequest, pathParts: string[]) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!(await isAuthenticated(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backendPath = pathParts.join("/");
  const backendUrl = `${getBackendUrl()}/${backendPath}${request.nextUrl.search}`;

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

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const backendResponse = await fetch(backendUrl, init);
    const responseBody = await backendResponse.arrayBuffer();
    const responseHeaders = new Headers();
    const responseContentType = backendResponse.headers.get("content-type");
    if (responseContentType) {
      responseHeaders.set("content-type", responseContentType);
    }

    return new NextResponse(responseBody, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
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
