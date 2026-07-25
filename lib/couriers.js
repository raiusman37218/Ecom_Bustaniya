import "server-only";
import { supabaseAdminRequest } from "./supabaseRest";

export const COURIER_PROVIDERS = [
  ["postex", "PostEx"], ["leopards", "Leopards Courier"], ["tcs", "TCS"],
  ["mnp", "M&P"], ["trax", "Trax"], ["callcourier", "Call Courier"],
  ["blueex", "BlueEx"], ["manual", "Manual / rider"], ["custom", "Custom API"],
];

const PROVIDER_IDS = new Set(COURIER_PROVIDERS.map(([id]) => id));
const CAPABILITIES = ["booking", "tracking", "settlements", "cities", "webhooks"];

function text(value, max = 300) { return String(value || "").trim().slice(0, max); }
function code(value) { return text(value, 50).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, ""); }
function bool(value) { return value === true || value === "true"; }

function safeCapabilities(value = {}) {
  return Object.fromEntries(CAPABILITIES.map((key) => [key, bool(value?.[key])]));
}

function masked(value) {
  const secret = text(value, 1000);
  return secret ? `${"•".repeat(Math.max(0, secret.length - 4))}${secret.slice(-4)}` : "";
}

export function safeCourierAccount(row = {}) {
  const credentials = row.credentials && typeof row.credentials === "object" ? row.credentials : {};
  return {
    id: row.id, code: row.code, name: row.name, provider: row.provider, status: row.status,
    isDefault: Boolean(row.is_default), apiBaseUrl: row.api_base_url || "", merchantId: row.merchant_id || "",
    pickupAddressCode: row.pickup_address_code || "", settings: row.settings || {},
    capabilities: safeCapabilities(row.capabilities), lastSyncedAt: row.last_synced_at || null,
    lastError: row.last_error || "", credentialState: {
      apiToken: Boolean(credentials.apiToken), apiKey: Boolean(credentials.apiKey), apiSecret: Boolean(credentials.apiSecret), webhookSecret: Boolean(credentials.webhookSecret),
    }, credentialPreview: { apiToken: masked(credentials.apiToken), apiKey: masked(credentials.apiKey) },
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function setupError(error) {
  const message = `${error?.message || ""} ${JSON.stringify(error?.details || {})}`.toLowerCase();
  return error?.status === 404 || message.includes("courier_accounts") || message.includes("schema cache");
}

export async function listCourierAccounts() {
  try {
    const rows = await supabaseAdminRequest("courier_accounts?select=*&order=is_default.desc,name.asc");
    return { setupAvailable: true, couriers: rows.map(safeCourierAccount) };
  } catch (error) {
    if (setupError(error)) return { setupAvailable: false, couriers: [] };
    throw error;
  }
}

export async function saveCourierAccount(input = {}) {
  const name = text(input.name, 100);
  const provider = text(input.provider, 50).toLowerCase();
  const accountCode = code(input.code || name);
  if (!name || !accountCode || !PROVIDER_IDS.has(provider)) throw Object.assign(new Error("Courier name, code and provider are required."), { status: 400 });
  const id = text(input.id, 100);
  const existingRows = id ? await supabaseAdminRequest(`courier_accounts?select=*&id=eq.${encodeURIComponent(id)}&limit=1`) : [];
  if (id && !existingRows?.[0]) throw Object.assign(new Error("Courier account not found."), { status: 404 });
  const existing = existingRows?.[0] || {};
  const previousCredentials = existing.credentials && typeof existing.credentials === "object" ? existing.credentials : {};
  const incomingCredentials = input.credentials && typeof input.credentials === "object" ? input.credentials : {};
  const credentials = { ...previousCredentials };
  for (const key of ["apiToken", "apiKey", "apiSecret", "webhookSecret"]) {
    if (typeof incomingCredentials[key] === "string" && incomingCredentials[key].trim()) credentials[key] = text(incomingCredentials[key], 1000);
  }
  const record = {
    ...(id ? { id } : {}), code: accountCode, name, provider,
    status: ["active", "paused", "disconnected"].includes(input.status) ? input.status : "active",
    is_default: bool(input.isDefault), api_base_url: text(input.apiBaseUrl, 500) || null,
    merchant_id: text(input.merchantId, 200) || null, pickup_address_code: text(input.pickupAddressCode, 200) || null,
    settings: input.settings && typeof input.settings === "object" ? input.settings : (existing.settings || {}), credentials,
    capabilities: safeCapabilities(input.capabilities), last_error: null,
  };
  if (record.is_default) await supabaseAdminRequest("courier_accounts?is_default=eq.true", { method: "PATCH", prefer: "return=minimal", body: { is_default: false } });
  const rows = await supabaseAdminRequest("courier_accounts?on_conflict=code&select=*", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: record });
  return safeCourierAccount(rows?.[0] || record);
}
