import { NextResponse } from "next/server";
import { syncPostexPayments } from "../../../../lib/postexSettlements";
export const runtime = "nodejs";
export async function POST(request) {
  const secret = process.env.COURIER_SYNC_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try { const result = await syncPostexPayments(); return NextResponse.json({ success: true, provider: "postex", synced: result.synced, failed: result.failed }); }
  catch (error) { return NextResponse.json({ error: error?.message || "Courier sync failed." }, { status: error?.status || 500 }); }
}
