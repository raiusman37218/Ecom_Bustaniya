import { NextResponse } from "next/server";

const POSTEX_CITIES_URL =
  "https://api.postex.pk/services/integration/api/order/v2/get-operational-city";

export async function GET() {
  try {
    if (!process.env.POSTEX_API_TOKEN) {
      return NextResponse.json(
        { error: "Courier service is not configured." },
        { status: 503 }
      );
    }

    const response = await fetch(POSTEX_CITIES_URL, {
      headers: { token: process.env.POSTEX_API_TOKEN },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || Number(result?.statusCode) !== 200) {
      return NextResponse.json(
        { error: result?.statusMessage || "Unable to load delivery cities." },
        { status: 502 }
      );
    }

    const cities = [
      ...new Set(
        (result.dist || [])
          .filter((city) => String(city.isDeliveryCity).toLowerCase() !== "false")
          .map((city) => city.operationalCityName?.trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ cities });
  } catch {
    return NextResponse.json(
      { error: "Unable to load delivery cities." },
      { status: 502 }
    );
  }
}
