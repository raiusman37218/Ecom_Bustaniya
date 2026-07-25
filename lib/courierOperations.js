import "server-only";
import { getCourierAdapter, postexTrackingNumber, postexTrackingStatus } from "./courierAdapters";
import { recordShipmentState, recordShipmentSyncError } from "./shipments";
import { supabaseAdminRequest } from "./supabaseRest";

const TRACKED_STATUSES = new Set(["booked", "picked_up", "in_transit", "out_for_delivery", "attempted", "on_hold"]);

function courierProvider(order, accountById) {
  return accountById.get(String(order.courier_account_id))?.provider || (String(order.courier || "").toLowerCase().includes("postex") ? "postex" : "manual");
}

export async function getCourierOperations() {
  const [orders, accounts] = await Promise.all([
    supabaseAdminRequest("orders?select=id,order_number,shipping_full_name,guest_name,shipping_city,created_at,courier,courier_tracking_number,courier_service_type,courier_raw_status,courier_normalized_status,courier_last_synced_at,courier_sync_error,courier_account_id&order=created_at.desc&limit=500"),
    supabaseAdminRequest("courier_accounts?select=id,name,provider,status&order=name.asc"),
  ]);
  const accountById = new Map(accounts.map((account) => [String(account.id), account]));
  const now = Date.now();
  return {
    couriers: accounts,
    shipments: orders.filter((order) => order.courier_tracking_number || order.courier_account_id || order.courier_normalized_status !== "unassigned").map((order) => {
      const account = accountById.get(String(order.courier_account_id));
      const normalizedStatus = order.courier_normalized_status || "unassigned";
      const referenceTime = new Date(order.courier_last_synced_at || order.created_at).getTime();
      return { ...order, provider: courierProvider(order, accountById), courierName: account?.name || order.courier || "Manual / unassigned", isDelayed: TRACKED_STATUSES.has(normalizedStatus) && now - referenceTime > 5 * 86400000 };
    }),
  };
}

export async function syncCourierShipment(orderId) {
  const rows = await supabaseAdminRequest(`orders?select=*&id=eq.${encodeURIComponent(orderId)}&limit=1`);
  const order = rows?.[0];
  if (!order) throw Object.assign(new Error("Shipment not found."), { status: 404 });
  if (!postexTrackingNumber(order.courier_tracking_number)) throw Object.assign(new Error("This shipment does not have a supported tracking number yet."), { status: 400 });
  try {
    const courier = await getCourierAdapter("postex");
    const result = await courier.trackShipment(order.courier_tracking_number);
    const rawStatus = postexTrackingStatus(result) || order.courier_raw_status || order.courier_status || "Booked";
    await recordShipmentState({ orderId: order.id, courier, trackingNumber: order.courier_tracking_number, rawStatus, serviceType: order.courier_service_type || "COD" });
    await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(order.id)}`, { method: "PATCH", prefer: "return=minimal", body: { courier_status: rawStatus, updated_at: new Date().toISOString() } });
    return { orderId: order.id, rawStatus };
  } catch (error) {
    await recordShipmentSyncError(order.id, error).catch(() => {});
    throw error;
  }
}
