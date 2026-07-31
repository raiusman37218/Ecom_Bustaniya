import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getAdminOrdersPage } from "../../../../lib/adminOrders";
import { parseOrderUpdateRequest, updateAdminOrder } from "../../../../lib/adminOrderOperations";

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

export async function PATCH(request) {
  try {
    const { user } = await authorizeAdminSession(request, "orders");
    const body = await parseOrderUpdateRequest(request);
    const result = await updateAdminOrder({ orderId: body.orderId, input: body, actor: user });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const auth = adminAuthErrorResponse(error);
      return NextResponse.json({ success: false, error: { code: auth.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: auth.error } }, { status: auth.status });
    }
    const status = [400, 404, 413, 422].includes(error?.status) ? error.status : 500;
    if (status === 500) console.error("Admin order update failed", { message: error?.message, status: error?.status });
    return NextResponse.json({ success: false, error: { code: status === 404 ? "ORDER_NOT_FOUND" : "ORDER_UPDATE_FAILED", message: status === 500 ? "Order changes could not be saved." : error.message } }, { status });
  }
}
