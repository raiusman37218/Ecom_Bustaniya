import "server-only";
import { supabaseAdminRequest } from "./supabaseRest";
import { getCourierAdapter, postexTrackingNumber, postexTrackingStatus } from "./courierAdapters";
import { recordShipmentState } from "./shipments";
const TERMINAL_STATUSES = new Set(["delivered", "returned", "cancelled", "expired"]);

function cleanText(value, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function trackingNumberFor(order) {
  return cleanText(order?.courier_tracking_number || order?.tracking_number);
}

function isTerminalStatus(value) {
  return TERMINAL_STATUSES.has(cleanText(value).toLowerCase());
}

export function postexStatusFromResponse(result) {
  return postexTrackingStatus(result);
}

async function fetchPostexStatus(trackingNumber, courier) {
  return postexStatusFromResponse(await courier.trackShipment(trackingNumber));
}

async function refreshOneOrder(order) {
  const trackingNumber = trackingNumberFor(order);
  const savedStatus = cleanText(order?.courier_status || order?.status);
  if (
    !order?.id ||
    !postexTrackingNumber(trackingNumber) ||
    isTerminalStatus(savedStatus)
  ) {
    return order;
  }

  try {
    const latestStatus = await fetchPostexStatus(trackingNumber, await getCourierAdapter("postex"));
    if (!latestStatus || latestStatus.toLowerCase() === savedStatus.toLowerCase()) {
      return order;
    }

    await supabaseAdminRequest(
      `orders?id=eq.${encodeURIComponent(order.id)}`,
      {
        method: "PATCH",
        prefer: "return=minimal",
        body: {
          courier_status: latestStatus,
          updated_at: new Date().toISOString(),
        },
      }
    );
    await recordShipmentState({ orderId: order.id, courier: await getCourierAdapter("postex"), trackingNumber, rawStatus: latestStatus });
    return { ...order, courier_status: latestStatus };
  } catch (error) {
    console.warn("PostEx status refresh skipped", {
      orderId: order.id,
      trackingNumber,
      message: error?.message,
    });
    return order;
  }
}

export async function refreshPostexOrderStatuses(orders = []) {
  if (!Array.isArray(orders) || !orders.length) {
    return Array.isArray(orders) ? orders : [];
  }
  return Promise.all(orders.map(refreshOneOrder));
}
