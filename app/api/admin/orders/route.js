import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../lib/adminAuth";
import {
  supabaseAdminRequest,
  supabaseAdminRpc,
} from "../../../../lib/supabaseRest";

async function attachOrderItems(orders) {
  const orderItems = await supabaseAdminRequest("order_items?select=*&order=id.asc").catch(() => []);

  const itemsByOrderId = new Map();
  for (const item of orderItems || []) {
    const orderId = item.order_id;
    if (!itemsByOrderId.has(orderId)) itemsByOrderId.set(orderId, []);
    itemsByOrderId.get(orderId).push(item);
  }

  return (orders || []).map((order) => {
    const items = itemsByOrderId.get(order.id) || [];
    return {
      ...order,
      // The legacy RPC can return placeholder items without product IDs.
      // Prefer relational order_items whenever present so Finance can match cost.
      items: items.length ? items : (Array.isArray(order.items) ? order.items : []),
      order_items: items,
    };
  });
}

async function listOrdersDirectly() {
  const orders = await supabaseAdminRequest("orders?select=*&order=created_at.desc");
  return attachOrderItems(orders);
}

async function loadOrders(accessKey) {
  try {
    const orders = await supabaseAdminRpc("admin_list_orders_rpc", {
      access_key: accessKey,
    });
    return attachOrderItems(orders);
  } catch (error) {
    console.error("Admin orders RPC failed; using direct Supabase fallback", {
      message: error?.message,
      status: error?.status,
      details: error?.details,
    });
    return listOrdersDirectly();
  }
}

export async function POST(request) {
  try {
    const { accessKey } = await authorizeAdminRequest(request, "orders");

    const orders = await loadOrders(accessKey);

    const ordersToSync = (orders || []).slice(0, 25);
    const syncedOrdersById = new Map(
      await Promise.all(
        ordersToSync.map(async (order) => {
          if (!order.courier_tracking_number || !process.env.POSTEX_API_TOKEN) {
            return [order.id, order];
          }

          try {
            const trackingResponse = await fetch(
              `https://api.postex.pk/services/integration/api/order/v1/track-order/${encodeURIComponent(order.courier_tracking_number)}`,
              {
                headers: { token: process.env.POSTEX_API_TOKEN },
                cache: "no-store",
                signal: AbortSignal.timeout(12000),
              }
            );
            const trackingResult = await trackingResponse.json().catch(() => null);
            const courierStatus = trackingResult?.dist?.transactionStatus;

            if (
              trackingResponse.ok &&
              Number(trackingResult?.statusCode) === 200 &&
              courierStatus
            ) {
              if (courierStatus !== order.courier_status) {
                await supabaseAdminRpc("admin_sync_courier_status_rpc", {
                  access_key: accessKey,
                  p_order_id: order.id,
                  p_courier_status: courierStatus,
                  p_response: trackingResult,
                });
              }
              return [order.id, { ...order, courier_status: courierStatus }];
            }
          } catch {
            // Keep the last saved status if PostEx is temporarily unavailable.
          }
          return [order.id, order];
        })
      )
    );
    const syncedOrders = (orders || []).map((order) => syncedOrdersById.get(order.id) || order);

    return NextResponse.json({ orders: syncedOrders });
  } catch (error) {
    console.error("Admin orders load failed", {
      message: error?.message,
      status: error?.status,
      details: error?.details,
    });
    const unauthorized =
      error?.status === 401 ||
      error?.status === 403 ||
      error?.message?.toLowerCase().includes("unauthorized");
    return NextResponse.json(
      { error: unauthorized ? "Invalid admin access key." : "Unable to load orders." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
