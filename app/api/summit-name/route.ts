import { NextRequest, NextResponse } from "next/server";

type Peak = { lat: number; lon: number; tags?: Record<string, string> };

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function distanceMeters(lat: number, lng: number, p: Peak) {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(p.lat - lat);
  const dLng = rad(p.lon - lng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat)) * Math.cos(rad(p.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function queryOverpass(endpoint: string, query: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: "data=" + encodeURIComponent(query),
    cache: "no-store",
    signal: AbortSignal.timeout(6500)
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data?.elements) ? data.elements : [];
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  // Peak names are a tiny lookup. Try multiple OSM mirrors so a busy public
  // endpoint never makes the UI lose the summit label.
  const query =
    "[out:json][timeout:6];(" +
    "node(around:1000," + lat + "," + lng + ")[natural=peak];" +
    "node(around:1000," + lat + "," + lng + ")[natural=volcano];" +
    ");out body 30;";

  const endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter"
  ];

  for (const endpoint of endpoints) {
    try {
      const elements = await queryOverpass(endpoint, query);
      const peaks: Peak[] = elements
        .map((el: any) => ({ lat: Number(el.lat), lon: Number(el.lon), tags: el.tags || {} }))
        .filter((p: Peak) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
      peaks.sort((a, b) => distanceMeters(lat, lng, a) - distanceMeters(lat, lng, b));

      for (const peak of peaks) {
        const meters = distanceMeters(lat, lng, peak);
        // Never guess a summit from a nearby mountain. The tap must be close
        // to the actual OSM peak node, otherwise return no name.
        if (meters > 850) continue;
        const name =
          cleanName(peak.tags?.["name:el"]) ||
          cleanName(peak.tags?.["name:en"]) ||
          cleanName(peak.tags?.name) ||
          cleanName(peak.tags?.alt_name);
        if (name) {
          return NextResponse.json(
            { name, distanceMeters: Math.round(meters) },
            { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
          );
        }
      }
    } catch {
      // Continue with the next mirror.
    }
  }

  // Final fallback is intentionally strict: reverse geocoding may return a
  // nearby mountain name, so only accept results explicitly classified as a peak.
  try {
    const response = await fetch(
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=" +
        encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lng),
      {
        headers: {
          "User-Agent": "ORIVATIS/1.0 (orivatis.com)",
          "Accept-Language": "el,en"
        },
        cache: "no-store",
        signal: AbortSignal.timeout(6500)
      }
    );
    if (response.ok) {
      const data = await response.json();
      const address = data?.address || {};
      const category = cleanName(data?.category || data?.class);
      const type = cleanName(data?.type);
      const naturalFeature = category === "natural" || type === "peak" || type === "volcano";
      const name = naturalFeature
        ? (cleanName(address.peak) || cleanName(data?.name) || cleanName(address.volcano))
        : "";
      if (name) return NextResponse.json({ name });
    }
  } catch {}

  return NextResponse.json({ name: null });
}
