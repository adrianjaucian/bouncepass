import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getBackendUrl, isAuthenticated } from "../../../lib/auth";
import { fetchNbl1Boxscore } from "../../../lib/nbl1Boxscore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ImportBody = {
  fixture_id?: string;
  game_date?: string;
  home_team_name?: string;
  away_team_name?: string;
  gender?: string;
  region?: string | null;
  source_url?: string;
};

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!(await isAuthenticated(token)) || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fixtureId = String(body.fixture_id || "").trim();
  if (!fixtureId) {
    return NextResponse.json({ error: "fixture_id is required" }, { status: 400 });
  }

  try {
    const boxscore = await fetchNbl1Boxscore(fixtureId);
    const payload = {
      game_date: boxscore.game_date || body.game_date || "",
      home_team_name: boxscore.home_team_name || body.home_team_name || "Home",
      away_team_name: boxscore.away_team_name || body.away_team_name || "Away",
      gender: body.gender || "men",
      region: body.region || null,
      results: { home: boxscore.home, away: boxscore.away },
      fixture_id: fixtureId,
      source_url: body.source_url || `https://www.nbl1.com.au/games/${fixtureId}`,
      provider: "nbl1",
    };
    if (!payload.game_date) {
      return NextResponse.json({ error: "Game date is missing for this fixture" }, { status: 400 });
    }

    const backendResponse = await fetch(`${getBackendUrl()}/games`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await backendResponse.json().catch(() => ({}));
    if (backendResponse.status === 409) {
      return NextResponse.json({ skipped: true, detail: data.detail || "This game is already saved" });
    }
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Could not save game" },
        { status: backendResponse.status }
      );
    }
    return NextResponse.json({
      imported: true,
      id: data.id,
      fixture_id: fixtureId,
      game_date: data.game_date || payload.game_date,
      home_team_name: data.home_team_name || payload.home_team_name,
      away_team_name: data.away_team_name || payload.away_team_name,
      gender: payload.gender,
      region: payload.region,
      label: `${payload.home_team_name} vs ${payload.away_team_name}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import NBL1 game";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
