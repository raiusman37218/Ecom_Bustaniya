import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getAdminOrdersPage } from "../../../../lib/adminOrders";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await authorizeAdminSession(request, "orders");
    const body = await request.json().catch(() => ({}));
    const result = await getAdminOrdersPage(body);
    return NextResponse.json({ success: true, data: result.orders, pagination: result.pagination });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const auth = adminAuthErrorResponse(error);
      return NextResponse.json({ success: false, error: { code: auth.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: auth.error } }, { status: auth.status });
    }
    console.error("Admin orders fetch failed", { message: error?.message, status: error?.status, details: error?.details });
    return NextResponse.json({ success: false, error: { code: "ORDERS_FETCH_FAILED", message: "Orders could not be loaded." } }, { status: 500 });
  }
}
