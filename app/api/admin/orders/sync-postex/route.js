import { NextResponse } from "next/server";
import { adminAuthErrorResponse, authorizeAdminSession } from "../../../../../lib/adminAuth";
import { syncCourierShipment, syncAllActiveShipments } from "../../../../../lib/courierOperations";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await authorizeAdminSession(request, "orders");
    const body = await request.json().catch(() => ({}));

    if (body.orderId) {
      const singleResult = await syncCourierShipment(body.orderId);
      return NextResponse.json({ success: true, mode: "single", ...singleResult });
    }

    const batchResult = await syncAllActiveShipments();
    return NextResponse.json({ success: true, mode: "batch", ...batchResult });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const auth = adminAuthErrorResponse(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.error("PostEx sync API failed", { message: error?.message, status: error?.status });
    return NextResponse.json({
      error: error?.message || "Failed to sync order status with PostEx."
    }, { status: error?.status || 500 });
  }
}
