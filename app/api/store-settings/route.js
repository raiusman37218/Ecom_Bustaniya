import { NextResponse } from "next/server";
import { getStoreSettings } from "../../../lib/storeSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getStoreSettings();
    return NextResponse.json({
      paymentSettings: settings.paymentSettings,
    });
  } catch {
    return NextResponse.json({ paymentSettings: null });
  }
}
