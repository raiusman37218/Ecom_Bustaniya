import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { recommendCourier } from "../../../../lib/courierRouting";
export async function POST(request) { try { await authorizeAdminSession(request, "orders"); return NextResponse.json(await recommendCourier(await request.json())); } catch (error) { const auth = error?.status === 401 || error?.status === 403 ? adminAuthErrorResponse(error) : null; return NextResponse.json({ error: auth?.error || error?.message || "Unable to recommend a courier." }, { status: auth?.status || 500 }); } }
