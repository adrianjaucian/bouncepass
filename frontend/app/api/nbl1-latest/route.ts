import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isDemoSession } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ROSETTA_BASE = "https://prod.rosetta.nbl.com.au/get/nbl1";
const CONFERENCES = ["north", "south", "east", "west", "central"] as const;
const COMPLETED = new Set(["complete", "completed", "final"]);
const REGIONS = ["north", "south", "east", "west", "central"] as const;
const DEMO_LIMIT = 20;

type JsonMap = Record<string, unknown>;

function asRecord(value: unknown): JsonMap | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonMap)
    : null;
}

function divisionName(team: unknown): string {
  const record = asRecord(team);
  const division = asRecord(record?.division);
  return String(division?.name || "");
}

function extractGender(match: JsonMap): "men" | "women" {
  for (const key of ["home_team", "away_team"]) {
    const lowered = divisionName(match[key]).toLowerCase();
    if (lowered.includes("women") || lowered.includes("female") || lowered.endsWith(" w")) {
      return "women";
    }
    if (lowered.includes(" men") || lowered.endsWith(" men") || lowered.includes("male")) {
      return "men";
    }
  }
  const slug = String(match.match_slug || match.match_title || "").toLowerCase();
  if (/\bwomen\b/.test(slug)) return "women";
  if (/\bmen\b/.test(slug)) return "men";
  return "men";
}

function extractRegion(match: JsonMap): string | null {
  for (const key of ["home_team", "away_team"]) {
    const team = asRecord(match[key]);
    if (!team) continue;
    const conference = asRecord(team.conference);
    const confName = String(conference?.name || "")
      .trim()
      .toLowerCase();
    if ((REGIONS as readonly string[]).includes(confName)) return confName;
    const lowered = divisionName(team).trim().toLowerCase();
    for (const region of REGIONS) {
      if (lowered === region || lowered.startsWith(`${region} `)) return region;
    }
  }
  return null;
}

function fixtureId(match: JsonMap): string | null {
  const value = match.external_id || match.id;
  return value ? String(value) : null;
}

function parseGameDate(match: JsonMap): string {
  const raw = String(match.start_time_datetime || match.start_time || "");
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

async function fetchRosetta(path: string, params?: Record<string, string>): Promise<JsonMap> {
  const url = new URL(`${ROSETTA_BASE}/${path.replace(/^\//, "")}`);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; BouncePass/1.0)",
      Origin: "https://www.nbl1.com.au",
      Referer: "https://www.nbl1.com.au/fixtures",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`NBL1 fixtures request failed (${response.status})`);
  }
  const payload = await response.json();
  if (payload && typeof payload === "object" && "data" in payload) return payload as JsonMap;
  if (Array.isArray(payload)) return { data: payload, count: payload.length };
  return { data: [], count: 0 };
}

async function currentSeasonYear(): Promise<string> {
  for (const path of ["seasons/current", "seasons"]) {
    const payload = await fetchRosetta(path);
    const seasons = Array.isArray(payload.data) ? payload.data : [];
    const years = seasons
      .map((season) => {
        const record = asRecord(season);
        return record?.year ? String(record.year).trim() : "";
      })
      .filter(Boolean);
    if (years.length) return years.reduce((latest, year) => (year > latest ? year : latest));
  }
  return String(new Date().getUTCFullYear());
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!(await isDemoSession(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const year = await currentSeasonYear();
    const merged = new Map<string, JsonMap>();
    for (const conference of CONFERENCES) {
      const payload = await fetchRosetta(`matches/in/season/${year}/regular/${conference}`, {
        limit: "2000",
      });
      const matches = Array.isArray(payload.data) ? payload.data : [];
      for (const item of matches) {
        const match = asRecord(item);
        if (!match) continue;
        const id = fixtureId(match);
        if (id) merged.set(id, match);
      }
    }

    const all = Array.from(merged.values());
    const completed = all.filter((match) =>
      COMPLETED.has(String(match.match_status || "").trim().toLowerCase())
    );
    completed.sort((a, b) =>
      String(b.start_time_datetime || "").localeCompare(String(a.start_time_datetime || ""))
    );
    const latest = completed.slice(0, DEMO_LIMIT).map((match) => {
      const id = fixtureId(match) || "";
      const home = asRecord(match.home_team);
      const away = asRecord(match.away_team);
      return {
        fixture_id: id,
        game_date: parseGameDate(match),
        home_team_name: String(home?.name || ""),
        away_team_name: String(away?.name || ""),
        gender: extractGender(match),
        region: extractRegion(match),
        source_url: `https://www.nbl1.com.au/games/${id}`,
        label: `${home?.name || "Home"} vs ${away?.name || "Away"}`,
      };
    });

    return NextResponse.json({
      season_year: year,
      discovered: all.length,
      completed: completed.length,
      matches: latest,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load NBL1 fixtures";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
