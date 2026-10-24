import { NextResponse } from "next/server";
import { getActiveStorefrontWidgets } from "../../../../lib/plugins/engine.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const widgets = await getActiveStorefrontWidgets();
    return NextResponse.json({ ok: true, widgets }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json({ ok: false, widgets: [] }, { headers: NO_CACHE_HEADERS });
  }
}
