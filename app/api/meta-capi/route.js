import { NextResponse } from "next/server";
import { sendMetaCapiEvent } from "../../../lib/metaCapi";

export async function POST(req) {
  try {
    const body = await req.json();
    const { eventName, eventId, eventSourceUrl, userData = {}, customData = {} } = body;

    if (!eventName) {
      return NextResponse.json({ error: "Missing eventName" }, { status: 400 });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";
    const cookieFbp = req.cookies.get("_fbp")?.value || "";
    const cookieFbc = req.cookies.get("_fbc")?.value || "";

    const enrichedUserData = {
      ...userData,
      fbp: userData.fbp || cookieFbp || undefined,
      fbc: userData.fbc || cookieFbc || undefined,
      country: userData.country || "pk",
    };

    const result = await sendMetaCapiEvent({
      eventName,
      eventId,
      eventSourceUrl: eventSourceUrl || req.headers.get("referer") || "https://bustaniya.com",
      userData: enrichedUserData,
      customData,
      clientIp,
      userAgent,
      triggeredBy: "browser",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Meta CAPI Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
