import { NextRequest, NextResponse } from "next/server";

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  // Tiny OSM lookup: only named peaks around the tapped point. This is much
  // lighter than the old trail-routing discovery and is used only for a label.
  const query =
    "[out:json][timeout:8];" +
    "node(around:900," + lat + "," + lng + ")[natural=peak][name];" +
    "out body 12;";

  try {
    const response = await fetch("https://overpass.kumi.systems/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: "data=" + encodeURIComponent(query),
      cache: "no-store",
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok) return NextResponse.json({ name: null });

    const data = await response.json();
    const peaks = Array.isArray(data?.elements) ? data.elements : [];
    const rad = (n: number) => n * Math.PI / 180;
    const distance = (p: any) => {
      const plat = Number(p.lat), plng = Number(p.lon);
      const dLat = rad(plat - lat), dLng = rad(plng - lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(plat)) * Math.sin(dLng / 2) ** 2;
      return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    peaks.sort((a: any, b: any) => distance(a) - distance(b));
    const peak = peaks[0];
    const name = cleanName(peak?.tags?.["name:el"]) || cleanName(peak?.tags?.name);
    return NextResponse.json({ name: name || null });
  } catch {
    return NextResponse.json({ name: null });
  }
}
