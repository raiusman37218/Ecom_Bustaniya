import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../lib/adminAuth";
import { supabaseAdminRpc } from "../../../../lib/supabaseRest";

export async function POST(request) {
  try {
    const { accessKey } = await authorizeAdminRequest(request, "orders");

    const orders = await supabaseAdminRpc("admin_list_orders_rpc", {
      access_key: accessKey,
    });

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
      }))
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
