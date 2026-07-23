import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getAdminOrdersForDashboard } from "../../../../lib/adminOrders";
import { supabaseAdminRequest } from "../../../../lib/supabaseRest";

function isDeliveredStatus(value = "") {
  const status = String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
  return status.includes("deliver") || status.includes("complete");
}

export async function POST(request) {
  try {
    await authorizeAdminSession(request, "dashboard");

    const [orders, products, inventory] = await Promise.all([
      getAdminOrdersForDashboard(),
      supabaseAdminRequest("products?select=id,name,instock"),
      supabaseAdminRequest("inventory?select=product_id,stock_quantity,low_stock_threshold"),
    ]);

    const completedOrders = (orders || []).filter((order) =>
      isDeliveredStatus(order.courier_status || order.status)
    );
    const totalSales = completedOrders.reduce((sum, order) => sum + Number(order.total_pkr || 0), 0);
    const customerKeys = new Set(
      (orders || []).map((order) =>
        (order.customer_email || order.guest_email || order.shipping_full_name || order.guest_name || "").toLowerCase()
      ).filter(Boolean)
    );
    const lowStock = (inventory || []).filter(
      (item) => Number(item.stock_quantity) <= Number(item.low_stock_threshold || 5)
    ).length;

    return NextResponse.json({
      metrics: {
        totalSales,
        orders: (orders || []).length,
        customers: customerKeys.size,
        products: (products || []).length,
        lowStock,
      },
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    return NextResponse.json({ error: "Unable to load dashboard metrics." }, { status: 500 });
  }
}
