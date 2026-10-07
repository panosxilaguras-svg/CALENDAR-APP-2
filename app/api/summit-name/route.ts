import { NextRequest, NextResponse } from "next/server";

type Peak = { lat: number; lon: number; tags?: Record<string, string> };

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function distanceMeters(lat: number, lng: number, p: Peak) {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(p.lat - lat), dLng = rad(p.lon - lng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat)) * Math.cos(rad(p.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function queryMirror(endpoint: string, query: string): Promise<Peak[]> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: "data=" + encodeURIComponent(query),
    cache: "no-store",
    signal: AbortSignal.timeout(4500)
  });
  if (!response.ok) throw new Error("mirror_" + response.status);
  const data = await response.json();
  const peaks = (Array.isArray(data?.elements) ? data.elements : [])
    .map((el: any) => ({ lat: Number(el.lat ?? el.center?.lat), lon: Number(el.lon ?? el.center?.lon), tags: el.tags || {} }))
    .filter((p: Peak) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (!peaks.length) throw new Error("no_peaks");
  return peaks;
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  const query =
    "[out:json][timeout:4];(" +
    "nwr(around:1000," + lat + "," + lng + ")[natural=peak];" +
    "nwr(around:1000," + lat + "," + lng + ")[natural=volcano];" +
    ");out center tags 40;";

  const endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
  ];

  try {
    // IMPORTANT: mirrors run in parallel. The previous sequential retries could
    // consume the whole serverless request time before a working mirror ran.
    const peaks = await Promise.any(endpoints.map((endpoint) => queryMirror(endpoint, query)));
    peaks.sort((a, b) => distanceMeters(lat, lng, a) - distanceMeters(lat, lng, b));
    const peak = peaks.find((p) => distanceMeters(lat, lng, p) <= 850);
    if (peak) {
      const name =
        cleanName(peak.tags?.["name:el"]) ||
        cleanName(peak.tags?.name) ||
        cleanName(peak.tags?.["name:en"]) ||
        cleanName(peak.tags?.alt_name);
      if (name) {
        return NextResponse.json(
          { name, distanceMeters: Math.round(distanceMeters(lat, lng, peak)) },
          { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
        );
      }
    }
  } catch {}

  return NextResponse.json({ name: null });
}
