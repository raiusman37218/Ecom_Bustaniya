import { NextResponse } from "next/server";
import { adminAuthErrorResponse, authorizeAdminSession } from "../../../../lib/adminAuth";
import { getCourierOperations, syncCourierShipment } from "../../../../lib/courierOperations";

function errorResponse(error) {
  if (error?.status === 401 || error?.status === 403) { const auth = adminAuthErrorResponse(error); return NextResponse.json({ error: auth.error }, { status: auth.status }); }
  return NextResponse.json({ error: error?.message || "Unable to manage courier operations." }, { status: [400, 404].includes(error?.status) ? error.status : 500 });
}
export async function GET(request) { try { await authorizeAdminSession(request, "orders"); return NextResponse.json(await getCourierOperations()); } catch (error) { return errorResponse(error); } }
export async function POST(request) {
  try {
    await authorizeAdminSession(request, "orders"); const body = await request.json();
    if (body.action !== "sync_shipment" || !body.orderId) return NextResponse.json({ error: "Unsupported courier action." }, { status: 400 });
    await syncCourierShipment(body.orderId); return NextResponse.json({ success: true, ...(await getCourierOperations()) });
  } catch (error) { return errorResponse(error); }
}
