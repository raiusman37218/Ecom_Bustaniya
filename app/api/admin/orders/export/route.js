import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../../lib/adminAuth";
import { getAdminOrdersForExport } from "../../../../../lib/adminOrders";

function csvCell(value = "") {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function POST(request) {
  try {
    await authorizeAdminSession(request, "orders.export");
    const orders = await getAdminOrdersForExport();
    const rows = [
      ["Order", "Customer", "City", "Date", "Total", "Status", "Payment", "Fulfillment", "Tracking", "Tags", "Notes"],
      ...orders.map((order) => [
        `#${order.order_number || ""}`,
        order.shipping_full_name || order.guest_name || "Guest",
        order.shipping_city || "",
        order.created_at || "",
        order.total_pkr || 0,
        order.courier_status || order.status || "",
        order.payment_status || "",
        order.fulfillment_status || "",
        order.courier_tracking_number || order.tracking_number || "",
        Array.isArray(order.tags) ? order.tags.join(" | ") : "",
        order.internal_notes || "",
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bustaniya-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const auth = adminAuthErrorResponse(error);
      return NextResponse.json({ success: false, error: { code: auth.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: auth.error } }, { status: auth.status });
    }
    console.error("Admin orders export failed", { message: error?.message, status: error?.status, details: error?.details });
    return NextResponse.json({ success: false, error: { code: "ORDERS_EXPORT_FAILED", message: "Orders could not be exported." } }, { status: 500 });
  }
}
