import "server-only";
import { supabaseAdminRequest } from "./supabaseRest";

const POSTEX = {
  createOrderUrl: "https://api.postex.pk/services/integration/api/order/v3/create-order",
  citiesUrl: "https://api.postex.pk/services/integration/api/order/v2/get-operational-city",
  trackingUrl: "https://api.postex.pk/services/integration/api/order/v1/track-order",
  paymentUrl: "https://api.postex.pk/services/integration/api/order/v1/payment-status",
};

function text(value, max = 500) { return String(value || "").trim().slice(0, max); }

async function configuredCourier(provider) {
  try {
    const rows = await supabaseAdminRequest(`courier_accounts?select=*&provider=eq.${encodeURIComponent(provider)}&status=eq.active&order=is_default.desc,updated_at.desc&limit=1`);
    return rows?.[0] || null;
  } catch (error) {
    const message = `${error?.message || ""} ${JSON.stringify(error?.details || {})}`.toLowerCase();
    if (error?.status === 404 || message.includes("courier_accounts") || message.includes("schema cache")) return null;
    throw error;
  }
}

async function postexRuntime() {
  const account = await configuredCourier("postex");
  const token = text(account?.credentials?.apiToken) || text(process.env.POSTEX_API_TOKEN);
  return {
    provider: "postex", accountId: account?.id || null, accountName: account?.name || "PostEx",
    pickupAddressCode: text(account?.pickup_address_code) || text(process.env.POSTEX_PICKUP_ADDRESS_CODE),
    token, configured: Boolean(token), source: account ? "admin" : (token ? "environment" : "missing"),
  };
}

async function postexRequest(runtime, url, options = {}) {
  if (!runtime.configured) throw Object.assign(new Error("PostEx API token is not configured."), { status: 503 });
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", token: runtime.token, ...(options.headers || {}) },
    cache: "no-store", signal: AbortSignal.timeout(options.timeoutMs || 15000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || Number(result?.statusCode || response.status) !== 200) {
    throw Object.assign(new Error(result?.statusMessage || `PostEx HTTP ${response.status}`), { status: response.status, result });
  }
  return result;
}

function postexAdapter(runtime) {
  return {
    ...runtime,
    async createShipment(payload) { return postexRequest(runtime, POSTEX.createOrderUrl, { method: "POST", body: JSON.stringify({ ...payload, pickupAddressCode: payload.pickupAddressCode || runtime.pickupAddressCode }), timeoutMs: 20000 }); },
    async getCities() {
      const result = await postexRequest(runtime, POSTEX.citiesUrl);
      return [...new Set((result.dist || []).filter((city) => String(city.isDeliveryCity).toLowerCase() !== "false").map((city) => text(city.operationalCityName)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    },
    async trackShipment(trackingNumber) { return postexRequest(runtime, `${POSTEX.trackingUrl}/${encodeURIComponent(trackingNumber)}`); },
    async getPaymentStatus(trackingNumber) { return postexRequest(runtime, `${POSTEX.paymentUrl}/${encodeURIComponent(trackingNumber)}`); },
  };
}

export async function getCourierAdapter(provider) {
  if (provider === "postex") return postexAdapter(await postexRuntime());
  throw Object.assign(new Error(`Courier adapter is not available for ${provider}.`), { status: 501 });
}

export function postexTrackingNumber(value) { return /^\d{10,20}$/.test(text(value)) || /^CX-[A-Z0-9-]{6,30}$/i.test(text(value)); }
export function postexTrackingStatus(result) { return text(result?.dist?.transactionStatus || result?.dist?.orderStatus || result?.transactionStatus || result?.orderStatus, 120); }
export function postexTrackingNumberFromBooking(result) { return text(result?.dist?.trackingNumber, 120); }
