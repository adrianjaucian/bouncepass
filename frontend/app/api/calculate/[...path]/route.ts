import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "../../../../lib/auth";
import { calculateBoxScoresFromCsv } from "../../../../lib/statsEngine";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function readUploadText(file: FormDataEntryValue | null) {
  if (!file || typeof file === "string") return "";
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    return buffer.toString("utf-8");
  } catch {
    return buffer.toString("latin1");
  }
}

async function calculateFromFormData(request: NextRequest, dual: boolean) {
  const formData = await request.formData();
  try {
    if (dual) {
      const homeText = await readUploadText(formData.get("home"));
      const awayText = await readUploadText(formData.get("away"));
      if (!homeText.trim() || !awayText.trim()) {
        return NextResponse.json({ error: "Home and away CSVs are required" }, { status: 400 });
      }
      return NextResponse.json(calculateBoxScoresFromCsv(homeText, awayText));
    }

    const fileText = await readUploadText(formData.get("file") || formData.get("home"));
    if (!fileText.trim()) {
      return NextResponse.json({ error: "A CSV file is required" }, { status: 400 });
    }
    const result = calculateBoxScoresFromCsv(fileText);
    return NextResponse.json(result.home);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not calculate stats";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function proxyUrlCalculate(request: NextRequest) {
  const backendUrl = `${getBackendUrl()}/calculate/boxscore-url`;
  try {
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") || "application/json" },
      body: await request.arrayBuffer(),
      signal: AbortSignal.timeout(20000),
    });
    const responseBody = await backendResponse.arrayBuffer();
    const responseHeaders = new Headers();
    const responseContentType = backendResponse.headers.get("content-type");
    if (responseContentType) responseHeaders.set("content-type", responseContentType);
    return new NextResponse(responseBody, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Box score URL lookup needs the API server. Upload or paste CSVs to calculate without it.",
      },
      { status: 502 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const route = path.join("/");
  if (route === "boxscores") return calculateFromFormData(request, true);
  if (route === "boxscore") return calculateFromFormData(request, false);
  if (route === "boxscore-url") return proxyUrlCalculate(request);
  return NextResponse.json({ error: "Unknown calculate path" }, { status: 404 });
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
