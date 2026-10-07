import { NextRequest, NextResponse } from "next/server";

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  // Keep this deliberately small. Large relation geometry queries regularly
  // time out on public Overpass instances. Nearby mapped ways are enough for
  // the organizer to select the real trail segment on the map.
  const query =
    '[out:json][timeout:12];' +
    'way(around:3000,' + lat + ',' + lng + ')[highway~"^(path|footway|track)$"];' +
    'out tags geom 80;';

  let lastError = "overpass_failed";
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "user-agent": "ORIVATIS/1.0 (trail picker; https://orivatis.com)"
        },
        body: "data=" + encodeURIComponent(query),
        cache: "no-store",
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) {
        lastError = "overpass_" + response.status;
        // Public instances may rate-limit independently. Immediately try the
        // next provider instead of surfacing a transient 429 to the client.
        continue;
      }
      const data = await response.json();
      return NextResponse.json(data, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" }
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : "overpass_failed";
    }
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
}
