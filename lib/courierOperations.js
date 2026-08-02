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
    await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(order.id)}`, { method: "PATCH", prefer: "return=minimal", body: { courier_status: rawStatus, updated_at: new Date().toISOString() } });
    return { orderId: order.id, rawStatus };
  } catch (error) {
    await recordShipmentSyncError(order.id, error).catch(() => {});
    throw error;
  }
}
