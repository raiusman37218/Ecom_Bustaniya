import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getAdminOrdersPage } from "../../../../lib/adminOrders";
import { parseOrderUpdateRequest, updateAdminOrder, deleteAdminOrder } from "../../../../lib/adminOrderOperations";
import { syncCourierShipment, syncAllActiveShipments } from "../../../../lib/courierOperations";

export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { invalidateCatalogCache } from "../../../../lib/catalog";
import { supabaseAdminRequest } from "../../../../lib/supabaseRest";

let lastAutoPostexSyncTime = 0;

function normalizePhoneTail(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function GET(request) {
  try {
    const search = String(request.nextUrl.searchParams.get("search") || "").trim();
    const limit = Math.max(1, Math.min(10, Number(request.nextUrl.searchParams.get("limit") || 5)));

    if (!search || search.length < 3) {
      return NextResponse.json({ orders: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const qLower = search.toLowerCase().replace(/^#/, "").trim();
    const qPhone = normalizePhoneTail(search);

    const rows = await supabaseAdminRequest("orders?select=*&order=created_at.desc&limit=500", {
      cache: "no-store",
    });

    const matches = (Array.isArray(rows) ? rows : []).filter((row) => {
      const orderNum = String(row.order_number || "").toLowerCase();
      const rowId = String(row.id || "").toLowerCase();
      const tracking = String(row.courier_tracking_number || row.tracking_number || "").toLowerCase();
      const phone1 = normalizePhoneTail(row.shipping_phone || "");
      const phone2 = normalizePhoneTail(row.guest_phone || "");

      if (orderNum && (orderNum === qLower || orderNum.includes(qLower))) return true;
      if (tracking && (tracking === qLower || tracking.includes(qLower))) return true;
      if (rowId && (rowId === qLower || rowId.startsWith(qLower))) return true;
      if (qPhone.length >= 10 && (phone1 === qPhone || phone2 === qPhone)) return true;
      return false;
    });

    const formatted = matches.slice(0, limit).map((order) => {
      const orderNumber = order.order_number || String(order.id || "").slice(0, 8);
      const trackingNumber = order.courier_tracking_number || order.tracking_number || "";
      const status = order.status || order.courier_status || "Pending";
      const courierStatus = order.courier_status || order.status || "Pending";
      return {
        id: order.id,
        orderNumber,
        order_number: orderNumber,
        status,
        courierStatus,
        courier_status: courierStatus,
        trackingNumber,
        tracking_number: trackingNumber,
        createdAt: order.created_at,
        created_at: order.created_at,
        total: Number(order.total_order_value_pkr ?? order.total_pkr ?? order.total ?? 0),
        paymentMethod: order.payment_method || "cod",
        customer: {
          fullName: order.shipping_full_name || order.guest_name || "Customer",
          name: order.shipping_full_name || order.guest_name || "Customer",
          city: order.shipping_city || "Pakistan",
        },
      };
    });

    return NextResponse.json({ orders: formatted }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Order lookup error:", error?.message);
    return NextResponse.json({ orders: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request) {
  try {
    await authorizeAdminSession(request, "orders");
    const body = await request.json().catch(() => ({}));

    if (body?.action === "sync_postex") {
      if (body.orderId) {
        const singleResult = await syncCourierShipment(body.orderId);
        return NextResponse.json({ success: true, mode: "single", ...singleResult });
      }
      const batchResult = await syncAllActiveShipments();
      lastAutoPostexSyncTime = Date.now();
      return NextResponse.json({ success: true, mode: "batch", ...batchResult });
    }

    // Automatically check & sync active PostEx parcels whenever orders are loaded (every 30s)
    const now = Date.now();
    if (now - lastAutoPostexSyncTime > 30000) {
      lastAutoPostexSyncTime = now;
      try {
        // Run PostEx sync non-blocking in background so orders load instantly
        syncAllActiveShipments().catch((e) => console.warn("PostEx auto-sync warning:", e?.message));
      } catch (autoSyncErr) {
        console.warn("PostEx auto-sync warning:", autoSyncErr?.message);
      }
    }

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
    invalidateCatalogCache();
    try {
      revalidatePath("/", "layout");
      revalidatePath("/", "page");
      revalidatePath("/track-order", "page");
    } catch {}
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const auth = adminAuthErrorResponse(error);
      return NextResponse.json({ success: false, error: { code: auth.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: auth.error } }, { status: auth.status });
    }
    const status = [400, 404, 413, 422].includes(error?.status) ? error.status : 500;
    if (status === 500) console.error("Admin order update failed", { message: error?.message, status: error?.status });
    return NextResponse.json({ success: false, error: { code: status === 404 ? "ORDER_NOT_FOUND" : "ORDER_UPDATE_FAILED", message: error?.message || "Order changes could not be saved." } }, { status });
  }
}

export async function DELETE(request) {
  try {
    const { user } = await authorizeAdminSession(request, "orders");
    const body = await request.json().catch(() => ({}));
    const orderId = body?.orderId || request.nextUrl.searchParams.get("orderId") || request.nextUrl.searchParams.get("id");
    if (!orderId) {
      return NextResponse.json({ success: false, error: { code: "ORDER_ID_REQUIRED", message: "Order ID is required." } }, { status: 400 });
    }
    const result = await deleteAdminOrder({ orderId, actor: user });
    invalidateCatalogCache();
    try {
      revalidatePath("/", "layout");
      revalidatePath("/", "page");
      revalidatePath("/track-order", "page");
    } catch {}
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const auth = adminAuthErrorResponse(error);
      return NextResponse.json({ success: false, error: { code: auth.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: auth.error } }, { status: auth.status });
    }
    const status = error?.status === 404 ? 404 : 500;
    console.error("Admin order deletion failed", { message: error?.message, status: error?.status });
    return NextResponse.json({ success: false, error: { code: status === 404 ? "ORDER_NOT_FOUND" : "ORDER_DELETE_FAILED", message: error?.message || "Order could not be deleted from Supabase." } }, { status });
  }
}

