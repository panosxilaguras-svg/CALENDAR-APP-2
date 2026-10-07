import { NextRequest, NextResponse } from "next/server";

type NominatimPlace = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  category?: string;
  addresstype?: string;
  importance?: number;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: NextRequest) {
  const q = clean(request.nextUrl.searchParams.get("q"));
  if (q.length < 2 || q.length > 80) {
    return NextResponse.json({ results: [] });
  }

  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    addressdetails: "1",
    namedetails: "1",
    countrycodes: "gr",
    limit: "12",
    "accept-language": "el,en"
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "User-Agent": "ORIVATIS/1.0 (orivatis.com)",
        "Accept-Language": "el,en"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) throw new Error("search_failed");
    const data = (await response.json()) as NominatimPlace[];

    const mountainTypes = new Set([
      "peak", "mountain", "volcano", "ridge", "hill", "saddle",
      "natural", "locality", "village", "municipality"
    ]);

    const normalized = data
      .map((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        const displayName = clean(item.display_name);
        const name = clean(item.name) || displayName.split(",")[0]?.trim() || q;
        const type = clean(item.type || item.addresstype || item.category);
        return {
          id: String(item.place_id),
          name,
          displayName,
          type,
          lat,
          lng,
          importance: Number(item.importance || 0),
          mountainish: mountainTypes.has(type) || item.category === "natural"
        };
      })
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng) && item.displayName)
      .sort((a, b) => Number(b.mountainish) - Number(a.mountainish) || b.importance - a.importance)
      .slice(0, 7)
      .map(({ importance, mountainish, ...item }) => item);

    return NextResponse.json(
      { results: normalized },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ results: [] });
  }
}
