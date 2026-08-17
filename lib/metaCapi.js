import crypto from "crypto";
import { getStoreSettings } from "./storeSettings";
import { supabaseAdminRequest } from "./supabaseRest";

export function sha256(value) {
  if (!value) return undefined;
  const clean = String(value).trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash("sha256").update(clean).digest("hex");
}

export function formatPhoneForMeta(phone) {
  if (!phone) return undefined;
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "92" + digits.slice(1);
  } else if (!digits.startsWith("92") && digits.length === 10) {
    digits = "92" + digits;
  }
  return sha256(digits);
}

// Fire-and-forget: never let a logging failure break the actual CAPI call
// or the request that triggered it (order placement, add-to-cart, etc).
async function logPixelEvent(row) {
  try {
    await supabaseAdminRequest("pixel_events", {
      method: "POST",
      prefer: "return=minimal",
      body: row,
    });
  } catch (error) {
    console.error("pixel_events logging failed:", error?.message || error);
  }
}

async function resolveCredentials() {
  try {
    const storeSettings = await getStoreSettings();
    const pixelId = storeSettings?.domainSettings?.metaPixelId
      || process.env.NEXT_PUBLIC_META_PIXEL_ID
      || process.env.META_PIXEL_ID
      || "";
    const accessToken = storeSettings?.domainSettings?.metaCapiAccessToken
      || process.env.META_CAPI_ACCESS_TOKEN
      || "";
    return { pixelId, accessToken };
  } catch {
    return {
      pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID || "",
      accessToken: process.env.META_CAPI_ACCESS_TOKEN || "",
    };
  }
}

export async function sendMetaCapiEvent({
  eventName,
  eventId,
  eventSourceUrl = "https://bustaniya.com",
  userData = {},
  customData = {},
  clientIp,
  userAgent,
  triggeredBy = "server",
}) {
  const { pixelId, accessToken } = await resolveCredentials();
  const resolvedEventId = eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const emHash = Boolean(userData.email);
  const phHash = Boolean(userData.phone);
  const contentIds = customData.contentIds || (customData.contents ? customData.contents.map((c) => String(c.id || c.article_number || "")) : undefined);

  if (!pixelId || !accessToken) {
    console.warn("Meta CAPI skipped: Missing Pixel ID or Access Token (set them in Admin > Settings > Tracking, or NEXT_PUBLIC_META_PIXEL_ID / META_CAPI_ACCESS_TOKEN env vars)");
    logPixelEvent({
      event_name: eventName,
      event_id: resolvedEventId,
      source: triggeredBy,
      success: false,
      event_source_url: eventSourceUrl,
      value: Number(customData.value || 0) || null,
      content_ids: contentIds || null,
      em_hash: emHash,
      ph_hash: phHash,
      error_message: "missing_credentials",
      client_ip: clientIp || null,
      user_agent: userAgent || null,
    });
    return { success: false, reason: "missing_credentials" };
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: resolvedEventId,
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data: {
          ph: userData.phone ? [formatPhoneForMeta(userData.phone)] : undefined,
          em: userData.email ? [sha256(userData.email)] : undefined,
          fn: userData.firstName ? [sha256(userData.firstName)] : undefined,
          ln: userData.lastName ? [sha256(userData.lastName)] : undefined,
          ct: userData.city ? [sha256(userData.city)] : undefined,
          client_ip_address: clientIp || userData.clientIp || undefined,
          client_user_agent: userAgent || userData.userAgent || undefined,
        },
        custom_data: {
          currency: "PKR",
          value: Number(customData.value || 0),
          content_type: customData.contentType || "product",
          content_name: customData.contentName || undefined,
          content_category: customData.contentCategory || undefined,
          content_ids: contentIds,
          contents: customData.contents || undefined,
          num_items: customData.numItems || (customData.contents ? customData.contents.reduce((sum, c) => sum + (Number(c.quantity) || 1), 0) : undefined),
        },
      },
    ],
  };

  try {
    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("Meta CAPI response error:", result);
    }

    logPixelEvent({
      event_name: eventName,
      event_id: resolvedEventId,
      source: triggeredBy,
      success: res.ok,
      http_status: res.status,
      fbtrace_id: result?.fbtrace_id || null,
      events_received: result?.events_received ?? null,
      event_source_url: eventSourceUrl,
      value: Number(customData.value || 0) || null,
      content_ids: contentIds || null,
      em_hash: emHash,
      ph_hash: phHash,
      error_message: res.ok ? null : (result?.error?.message || "capi_error"),
      client_ip: clientIp || null,
      user_agent: userAgent || null,
    });

    return { success: res.ok, result };
  } catch (error) {
    console.error("Meta CAPI exception:", error);
    logPixelEvent({
      event_name: eventName,
      event_id: resolvedEventId,
      source: triggeredBy,
      success: false,
      event_source_url: eventSourceUrl,
      value: Number(customData.value || 0) || null,
      content_ids: contentIds || null,
      em_hash: emHash,
      ph_hash: phHash,
      error_message: error.message,
      client_ip: clientIp || null,
      user_agent: userAgent || null,
    });
    return { success: false, error: error.message };
  }
}
