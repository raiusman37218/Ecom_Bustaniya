import "server-only";
import { getCourierAdapter, postexTrackingNumber, postexTrackingStatus } from "./courierAdapters";
import { normalizeCourierStatus, recordShipmentState, recordShipmentSyncError } from "./shipments";
import { supabaseAdminRequest } from "./supabaseRest";

const TRACKED_STATUSES = new Set(["booked", "picked_up", "in_transit", "out_for_delivery", "attempted", "on_hold"]);

function courierProvider(order, accountById) {
  return accountById.get(String(order.courier_account_id))?.provider || (String(order.courier || "").toLowerCase().includes("postex") ? "postex" : "manual");
}

export async function getCourierOperations() {
  const [orders, accounts] = await Promise.all([
    supabaseAdminRequest("orders?select=id,order_number,shipping_full_name,guest_name,shipping_city,created_at,courier,status,courier_status,courier_tracking_number,courier_service_type,courier_raw_status,courier_normalized_status,courier_last_synced_at,courier_sync_error,courier_account_id&order=created_at.desc&limit=500"),
    supabaseAdminRequest("courier_accounts?select=id,name,provider,status&order=name.asc"),
  ]);
  const accountById = new Map(accounts.map((account) => [String(account.id), account]));
  const now = Date.now();
  return {
    couriers: accounts,
    shipments: orders.filter((order) => {
      const trackingNumber = order.courier_tracking_number;
      const rawStatus = order.courier_raw_status || order.courier_status || order.status;
      return trackingNumber || order.courier_account_id || normalizeCourierStatus(rawStatus, { hasTracking: Boolean(trackingNumber) }) !== "unassigned";
    }).map((order) => {
      const account = accountById.get(String(order.courier_account_id));
      const trackingNumber = order.courier_tracking_number || "";
      const rawStatus = order.courier_raw_status || order.courier_status || order.status || "";
      const normalizedStatus = order.courier_normalized_status || normalizeCourierStatus(rawStatus, { hasTracking: Boolean(trackingNumber) });
      const referenceTime = new Date(order.courier_last_synced_at || order.created_at).getTime();
      return { ...order, courier_tracking_number: trackingNumber, courier_raw_status: rawStatus, courier_normalized_status: normalizedStatus, provider: courierProvider(order, accountById), courierName: account?.name || order.courier || "Manual / unassigned", isDelayed: TRACKED_STATUSES.has(normalizedStatus) && now - referenceTime > 5 * 86400000 };
    }),
  };
}

export async function syncCourierShipment(orderId) {
  const rows = await supabaseAdminRequest(`orders?select=*&id=eq.${encodeURIComponent(orderId)}&limit=1`);
  const order = rows?.[0];
  if (!order) throw Object.assign(new Error("Shipment not found."), { status: 404 });
  const trackingNumber = order.courier_tracking_number;
  if (!postexTrackingNumber(trackingNumber)) throw Object.assign(new Error("This shipment does not have a supported tracking number yet."), { status: 400 });
  try {
    const courier = await getCourierAdapter("postex");
    const result = await courier.trackShipment(trackingNumber);
    const rawStatus = postexTrackingStatus(result) || order.courier_raw_status || order.courier_status || "Booked";
    await recordShipmentState({ orderId: order.id, courier, trackingNumber, rawStatus, serviceType: order.courier_service_type || "COD" });
    return { orderId: order.id, rawStatus };
  } catch (error) {
    await recordShipmentSyncError(order.id, error).catch(() => {});
    throw error;
  }
}

export async function syncAllActiveShipments() {
  const rows = await supabaseAdminRequest(
    `orders?select=id,order_number,courier_tracking_number,tracking_number,courier_status,courier_raw_status,status,courier_service_type&order=created_at.desc&limit=150`
  );
  const activeOrders = (rows || []).filter((o) => {
    const tracking = String(o.courier_tracking_number || o.tracking_number || "").trim();
    const status = String(o.courier_status || o.status || "").toLowerCase();
    return postexTrackingNumber(tracking) &&
      !tracking.startsWith("MANUAL-") &&
      !status.includes("deliver") &&
      !status.includes("cancel") &&
      !status.includes("return");
  });

  if (!activeOrders.length) {
    return { totalChecked: 0, updatedCount: 0, results: [] };
  }

  const results = [];
  let courier;
  try {
    courier = await getCourierAdapter("postex");
  } catch (adapterErr) {
    throw new Error(adapterErr.message || "PostEx adapter unavailable");
  }

  for (let i = 0; i < activeOrders.length; i += 4) {
    const chunk = activeOrders.slice(i, i + 4);
    await Promise.all(
      chunk.map(async (order) => {
        try {
          const tracking = String(order.courier_tracking_number || order.tracking_number || "").trim();
          const trackResult = await courier.trackShipment(tracking);
          const rawStatus = postexTrackingStatus(trackResult);
          const currentStatus = String(order.courier_raw_status || order.courier_status || order.status || "").trim();
          if (rawStatus && rawStatus.toLowerCase() !== currentStatus.toLowerCase()) {
            await recordShipmentState({
              orderId: order.id,
              courier,
              trackingNumber: tracking,
              rawStatus,
              serviceType: order.courier_service_type || "COD",
            });
            results.push({ orderId: order.id, orderNumber: order.order_number, oldStatus: currentStatus, newStatus: rawStatus, updated: true });
          } else {
            results.push({ orderId: order.id, orderNumber: order.order_number, status: rawStatus || currentStatus, updated: false });
          }
        } catch (err) {
          await recordShipmentSyncError(order.id, err).catch(() => {});
          results.push({ orderId: order.id, orderNumber: order.order_number, error: err.message, updated: false });
        }
      })
    );
  }

  return {
    totalChecked: activeOrders.length,
    updatedCount: results.filter((r) => r.updated).length,
    results,
  };
}
