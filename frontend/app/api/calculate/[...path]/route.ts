import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "../../../../lib/auth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function proxyRequest(request: NextRequest, pathParts: string[]) {
  const backendPath = `calculate/${pathParts.join("/")}`;
  const backendUrl = `${getBackendUrl()}/${backendPath}${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

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
    console.error("Calculate proxy error:", backendUrl, error);
    return NextResponse.json(
      {
        error: "Backend unavailable",
        detail: "The API server could not be reached.",
      },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
