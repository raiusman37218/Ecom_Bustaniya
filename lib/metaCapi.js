import crypto from "crypto";

const DEFAULT_PIXEL_ID = "5621950704696012";
const DEFAULT_ACCESS_TOKEN = "EAANI2qNM92sBSP1sEuMUuMc8qulAJ2UpYMxtmcw0xSxIMalWajZAMyznKbvzrIZB2kd5eXeArZCzqfZCNvLgteffJbDrz8zWNJksaBZBZB4r12Eu3nMu7dhvAPGGDJAuuVYk7lI0MZCmboAqtMFVgzdTQVOoj2pVhcLojfT7F1BhGNZCZAgBG1bFwZA5cRC94hinmfvQZDZD";

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

export async function sendMetaCapiEvent({
  eventName,
  eventId,
  eventSourceUrl = "https://bustaniya.com",
  userData = {},
  customData = {},
  clientIp,
  userAgent,
}) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN || DEFAULT_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn("Meta CAPI skipped: Missing Pixel ID or Access Token");
    return { success: false, reason: "missing_credentials" };
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
          content_ids: customData.contentIds || (customData.contents ? customData.contents.map(c => String(c.id || c.article_number || "")) : undefined),
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
    const result = await res.json();
    if (!res.ok) {
      console.error("Meta CAPI response error:", result);
    }
    return { success: res.ok, result };
  } catch (error) {
    console.error("Meta CAPI exception:", error);
    return { success: false, error: error.message };
  }
}
