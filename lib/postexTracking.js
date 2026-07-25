import "server-only";
import { supabaseAdminRequest } from "./supabaseRest";

const POSTEX_TRACK_ORDER_URL =
  "https://api.postex.pk/services/integration/api/order/v1/track-order";
const TERMINAL_STATUSES = new Set(["delivered", "returned", "cancelled", "expired"]);

function cleanText(value, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function trackingNumberFor(order) {
  return cleanText(order?.courier_tracking_number || order?.tracking_number);
}

function isPostexTrackingNumber(value) {
  return /^\d{10,20}$/.test(value) || /^CX-[A-Z0-9-]{6,30}$/i.test(value);
}

function isTerminalStatus(value) {
  return TERMINAL_STATUSES.has(cleanText(value).toLowerCase());
}

export function postexStatusFromResponse(result) {
  return cleanText(
    result?.dist?.transactionStatus ||
      result?.dist?.orderStatus ||
      result?.transactionStatus ||
      result?.orderStatus
  );
}

async function fetchPostexStatus(trackingNumber) {
  const response = await fetch(
    `${POSTEX_TRACK_ORDER_URL}/${encodeURIComponent(trackingNumber)}`,
    {
      headers: { token: process.env.POSTEX_API_TOKEN },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    }
  );
  const result = await response.json().catch(() => null);
  const statusCode = Number(result?.statusCode || response.status || 0);
  if (!response.ok || statusCode !== 200) {
    throw new Error(result?.statusMessage || `PostEx HTTP ${response.status}`);
  }
  return postexStatusFromResponse(result);
}

async function refreshOneOrder(order) {
  const trackingNumber = trackingNumberFor(order);
  const savedStatus = cleanText(order?.courier_status || order?.status);
  if (
    !process.env.POSTEX_API_TOKEN ||
    !order?.id ||
    !isPostexTrackingNumber(trackingNumber) ||
    isTerminalStatus(savedStatus)
  ) {
    return order;
  }

  try {
    const latestStatus = await fetchPostexStatus(trackingNumber);
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
  if (!Array.isArray(orders) || !orders.length || !process.env.POSTEX_API_TOKEN) {
    return Array.isArray(orders) ? orders : [];
  }
  return Promise.all(orders.map(refreshOneOrder));
}
