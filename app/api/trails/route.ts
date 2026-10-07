import { NextRequest, NextResponse } from "next/server";

type Point = [number, number];

function validPoint(value: unknown): value is Point {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === "number" && typeof value[1] === "number" &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 90 && Math.abs(value[1]) <= 180;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "routing_not_configured" }, { status: 503 });

  let body: { start?: unknown; end?: unknown; auto?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  // One-tap mode: the tapped summit is the destination. Discover a nearby
  // accessible trailhead automatically, then let ORS route on hiking paths.
  if (body.auto === true && validPoint(body.end) && !validPoint(body.start)) {
    const [endLat, endLng] = body.end;
    const radii = [2500, 5000, 9000];
    let candidates: Point[] = [];

    for (const radius of radii) {
      const query =
        '[out:json][timeout:12];(' +
        'node(around:' + radius + ',' + endLat + ',' + endLng + ')[amenity=parking];' +
        'node(around:' + radius + ',' + endLat + ',' + endLng + ')[tourism=information][information=trailhead];' +
        'node(around:' + radius + ',' + endLat + ',' + endLng + ')[highway=trailhead];' +
        ');out center 30;';
      try {
        const overpass = await fetch("https://overpass.kumi.systems/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: "data=" + encodeURIComponent(query),
          cache: "no-store",
          signal: AbortSignal.timeout(12000)
        });
        if (overpass.ok) {
          const osm = await overpass.json();
          candidates = (osm?.elements || [])
            .map((el: any) => [Number(el.lat ?? el.center?.lat), Number(el.lon ?? el.center?.lon)] as Point)
            .filter(validPoint);
        }
      } catch {}
      if (candidates.length) break;
    }

    if (!candidates.length) {
      return NextResponse.json({ error: "trailhead_not_found" }, { status: 404 });
    }

    // Try nearby trailheads in order of straight-line distance. ORS validates
    // which candidate is actually connected to a walkable hiking network.
    const rad = (n: number) => n * Math.PI / 180;
    const distance = (p: Point) => {
      const dLat = rad(p[0] - endLat), dLng = rad(p[1] - endLng);
      const x = Math.sin(dLat/2) ** 2 + Math.cos(rad(endLat)) * Math.cos(rad(p[0])) * Math.sin(dLng/2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
    };
    candidates.sort((x, y) => distance(x) - distance(y));

    for (const start of candidates.slice(0, 8)) {
      try {
        const response = await fetch("https://api.heigit.org/openrouteservice/v2/directions/foot-hiking/geojson", {
          method: "POST",
          headers: { Authorization: apiKey, "Content-Type": "application/json", Accept: "application/geo+json, application/json" },
          body: JSON.stringify({ coordinates: [[start[1], start[0]], [endLng, endLat]] }),
          cache: "no-store",
          signal: AbortSignal.timeout(15000)
        });
        const data = await response.json().catch(() => null);
        const feature = data?.features?.[0];
        const coordinates = feature?.geometry?.coordinates;
        if (!response.ok || !Array.isArray(coordinates) || coordinates.length < 2) continue;
        const route: Point[] = coordinates
          .filter((point: unknown) => Array.isArray(point) && point.length >= 2)
          .map((point: number[]) => [point[1], point[0]] as Point);
        const distanceMeters = Number(feature?.properties?.summary?.distance);
        return NextResponse.json({
          route,
          start,
          distanceKm: Number.isFinite(distanceMeters) ? distanceMeters / 1000 : null,
          automaticTrailhead: true
        });
      } catch {}
    }
    return NextResponse.json({ error: "route_not_found" }, { status: 404 });
  }

  if (!validPoint(body.start) || !validPoint(body.end)) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  const [startLat, startLng] = body.start;
  const [endLat, endLng] = body.end;

  try {
    const response = await fetch("https://api.heigit.org/openrouteservice/v2/directions/foot-hiking/geojson", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/geo+json, application/json"
      },
      body: JSON.stringify({ coordinates: [[startLng, startLat], [endLng, endLat]] }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000)
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error?.message || data?.message || ("routing_" + response.status);
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const feature = data?.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return NextResponse.json({ error: "route_not_found" }, { status: 404 });
    }

    const route: Point[] = coordinates
      .filter((point: unknown) => Array.isArray(point) && point.length >= 2)
      .map((point: number[]) => [point[1], point[0]] as Point);

    const distanceMeters = Number(feature?.properties?.summary?.distance);
    return NextResponse.json({
      route,
      distanceKm: Number.isFinite(distanceMeters) ? distanceMeters / 1000 : null
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "routing_failed"
    }, { status: 502 });
  }
}


// Compatibility for older cached map clients. Do not return 405: tell the
// client that trail discovery has moved to the two-point POST routing flow.
export async function GET() {
  return NextResponse.json(
    { error: "route_requires_start_and_end", upgrade: "two_point_routing" },
    {
      status: 409,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
