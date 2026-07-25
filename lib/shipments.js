import "server-only";
import { supabaseAdminRequest } from "./supabaseRest";

export const COURIER_SHIPMENT_STATUSES = [
  "unassigned", "pending_booking", "booked", "picked_up", "in_transit", "out_for_delivery",
  "delivered", "attempted", "on_hold", "returned", "cancelled", "exception", "manual_delivery",
];

export function normalizeCourierStatus(value = "", { hasTracking = false, manual = false } = {}) {
  const status = String(value || "").trim().toLowerCase();
  if (manual) return "manual_delivery";
  if (status.includes("deliver")) return "delivered";
  if (status.includes("return")) return "returned";
  if (status.includes("cancel") || status.includes("expired")) return "cancelled";
  if (status.includes("out for delivery")) return "out_for_delivery";
  if (status.includes("attempt")) return "attempted";
  if (status.includes("hold")) return "on_hold";
  if (status.includes("pickup") || status.includes("picked")) return "picked_up";
  if (status.includes("transit") || status.includes("warehouse") || status.includes("rider assigned")) return "in_transit";
  if (status.includes("book") || hasTracking) return "booked";
  if (status.includes("pending")) return "pending_booking";
  return "unassigned";
}

export async function recordShipmentState({ orderId, courier, trackingNumber = "", rawStatus = "", serviceType = "COD", manual = false }) {
  if (!orderId) return;
  const normalizedStatus = normalizeCourierStatus(rawStatus, { hasTracking: Boolean(trackingNumber), manual });
  await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH", prefer: "return=minimal",
    body: {
      courier: courier?.provider || (manual ? "manual" : "postex"),
      courier_account_id: courier?.accountId || null,
      courier_service_type: String(serviceType || "").slice(0, 100) || null,
      courier_raw_status: String(rawStatus || "").slice(0, 200) || null,
      courier_normalized_status: normalizedStatus,
      courier_last_synced_at: new Date().toISOString(),
      courier_sync_error: null,
      updated_at: new Date().toISOString(),
    },
  });
}

export async function recordShipmentSyncError(orderId, error) {
  if (!orderId) return;
  await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH", prefer: "return=minimal",
    body: { courier_sync_error: String(error?.message || error || "Courier sync failed.").slice(0, 500), courier_last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  });
}
