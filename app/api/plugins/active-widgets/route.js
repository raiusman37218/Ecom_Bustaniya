import { NextResponse } from "next/server";
import { getActiveStorefrontWidgets } from "../../../../lib/plugins/engine.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const widgets = await getActiveStorefrontWidgets();
    return NextResponse.json({ ok: true, widgets });
  } catch (error) {
    return NextResponse.json({ ok: false, widgets: [] });
  }
}
