import { NextResponse } from "next/server";
import { getCourierAdapter } from "../../../../lib/courierAdapters";
import { POSTEX_OPERATIONAL_CITIES } from "../../../../lib/postexCities";

let cachedCitiesPayload = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function GET() {
  const now = Date.now();
  if (cachedCitiesPayload && now - lastFetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedCitiesPayload, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  try {
    const courier = await getCourierAdapter("postex");
    const cities = await courier.getCities();
    const finalCities = Array.isArray(cities) && cities.length > 0 ? cities : POSTEX_OPERATIONAL_CITIES;

    cachedCitiesPayload = {
      cities: finalCities,
      courier: courier.accountName || "PostEx",
      total: finalCities.length,
    };
    lastFetchedAt = now;

    return NextResponse.json(cachedCitiesPayload, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.warn("Live PostEx cities fetch warning, serving verified static PostEx cities:", error?.message);
    const fallbackPayload = {
      cities: POSTEX_OPERATIONAL_CITIES,
      courier: "PostEx",
      total: POSTEX_OPERATIONAL_CITIES.length,
      fallback: true,
    };
    return NextResponse.json(fallbackPayload, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      },
    });
  }
}
