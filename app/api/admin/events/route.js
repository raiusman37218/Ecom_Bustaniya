import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getRecentPixelEvents, getPixelFunnelSummary } from "../../../../lib/pixelEvents";

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "dashboard");

    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get("eventName") || searchParams.get("filter") || "";
    const days = Number(searchParams.get("days")) || 7;
    const limit = Number(searchParams.get("limit")) || 150;

    const [events, summary] = await Promise.all([
      getRecentPixelEvents({ limit, eventName: eventName === "All" ? "" : eventName }),
      getPixelFunnelSummary({ days }),
    ]);

    return NextResponse.json({ events, summary });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    console.error("Admin events route error:", error?.message || error);
    return NextResponse.json({ error: "Unable to load pixel events." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await authorizeAdminSession(request, "dashboard");

    const body = await request.json().catch(() => ({}));
    const days = Number(body.days) || 7;
    const eventName = body.eventName || "";

    const [events, summary] = await Promise.all([
      getRecentPixelEvents({ limit: body.limit || 150, eventName: eventName === "All" ? "" : eventName }),
      getPixelFunnelSummary({ days }),
    ]);

    return NextResponse.json({ events, summary });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    console.error("Admin events route error:", error?.message || error);
    return NextResponse.json({ error: "Unable to load pixel events." }, { status: 500 });
  }
}
