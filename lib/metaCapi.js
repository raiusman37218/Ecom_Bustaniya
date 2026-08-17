import crypto from "crypto";
import { getStoreSettings } from "./storeSettings";
import { supabaseAdminRequest } from "./supabaseRest";

// In-memory credentials cache with 60-second TTL to avoid database bottlenecks
// on high-volume PageView and ViewContent requests.
let _cachedCredentials = null;
let _cacheExpiresAt = 0;
const CACHE_TTL_MS = 60 * 1000;

function cleanString(val) {
  if (!val) return "";
  return String(val)
    .replace(/[\r\n\t]/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function maskSecret(secret = "") {
  const str = cleanString(secret);
  if (!str) return "—";
  if (str.length <= 8) return "***";
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}

export function maskPhone(phone = "") {
  const str = cleanString(phone).replace(/\D/g, "");
  if (!str) return undefined;
  if (str.length < 7) return "***";
  return `${str.slice(0, 4)}****${str.slice(-3)}`;
}

export function maskEmail(email = "") {
  const str = cleanString(email).toLowerCase();
  if (!str || !str.includes("@")) return undefined;
  const [local, domain] = str.split("@");
  const maskedLocal = local.length <= 2 ? `${local.charAt(0)}*` : `${local.slice(0, 2)}***`;
  return `${maskedLocal}@${domain}`;
}

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
  return digits.length >= 10 ? sha256(digits) : undefined;
}

export function resolvePakistaniProvince(city = "") {
  const c = String(city || "").trim().toLowerCase();
  if (!c) return "punjab";
  if (
    c.includes("lahore") || c.includes("rawalpindi") || c.includes("faisalabad") ||
    c.includes("multan") || c.includes("sialkot") || c.includes("gujranwala") ||
    c.includes("gujrat") || c.includes("sargodha") || c.includes("bahawalpur") ||
    c.includes("sheikhupura") || c.includes("jhang") || c.includes("kasur") ||
    c.includes("sahiwal") || c.includes("okara") || c.includes("jhelum") ||
    c.includes("rahim yar khan") || c.includes("attock") || c.includes("dera ghazi khan")
  ) {
    return "punjab";
  }
  if (
    c.includes("karachi") || c.includes("hyderabad") || c.includes("sukkur") ||
    c.includes("larkana") || c.includes("nawabshah") || c.includes("mirpurkhas") ||
    c.includes("badin") || c.includes("khairpur") || c.includes("jacobabad") ||
    c.includes("shikarpur") || c.includes("dadu") || c.includes("tando adam")
  ) {
    return "sindh";
  }
  if (
    c.includes("peshawar") || c.includes("mardan") || c.includes("abbottabad") ||
    c.includes("swat") || c.includes("kohat") || c.includes("mansehra") ||
    c.includes("nowshera") || c.includes("swabi") || c.includes("charsadda") ||
    c.includes("haripur") || c.includes("bannu") || c.includes("dera ismail khan")
  ) {
    return "khyber pakhtunkhwa";
  }
  if (
    c.includes("quetta") || c.includes("gwadar") || c.includes("turbat") ||
    c.includes("hub") || c.includes("khuzdar") || c.includes("chaman") ||
    c.includes("sibi") || c.includes("zhob")
  ) {
    return "balochistan";
  }
  if (c.includes("islamabad")) {
    return "islamabad capital territory";
  }
  if (c.includes("muzaffarabad") || c.includes("mirpur") || c.includes("kotli") || c.includes("rawalakot")) {
    return "azad kashmir";
  }
  if (c.includes("gilgit") || c.includes("skardu") || c.includes("hunza")) {
    return "gilgit-baltistan";
  }
  return "punjab";
}

/**
 * Normalizes customer identifiers according to Meta Conversions API specifications
 * and generates SHA-256 hashes for all available PII keys.
 */
export function normalizeUserDataForMeta(userData = {}, clientIp = "", userAgent = "") {
  const cleanEmail = cleanString(userData.email).toLowerCase();
  const cleanPhone = cleanString(userData.phone).replace(/\D/g, "");
  const cleanFirstName = cleanString(userData.firstName).toLowerCase().replace(/[^a-z]/g, "");
  const cleanLastName = cleanString(userData.lastName).toLowerCase().replace(/[^a-z]/g, "");
  const cleanCity = cleanString(userData.city).toLowerCase().replace(/[^a-z]/g, "");
  const provinceRaw = cleanString(userData.state || userData.province || (userData.city ? resolvePakistaniProvince(userData.city) : ""));
  const cleanProvince = provinceRaw.toLowerCase();
  const cleanCountry = cleanString(userData.country || "pk").toLowerCase();
  const cleanExternalId = cleanString(userData.externalId || userData.customerId || userData.orderId);
  const cleanFbp = cleanString(userData.fbp);
  const cleanFbc = cleanString(userData.fbc);
  const ip = cleanString(clientIp || userData.clientIp);
  const ua = cleanString(userAgent || userData.userAgent);

  const metaUserData = {};
  const matchedPills = [];
  let emqScore = 0;

  // 1. Email (High weight)
  if (cleanEmail && cleanEmail.includes("@")) {
    metaUserData.em = [sha256(cleanEmail)];
    matchedPills.push("Email");
    emqScore += 2.5;
  }

  // 2. Phone (High weight)
  if (cleanPhone) {
    const formattedPhone = formatPhoneForMeta(cleanPhone);
    if (formattedPhone) {
      metaUserData.ph = [formattedPhone];
      matchedPills.push("Phone");
      emqScore += 2.5;
    }
  }

  // 3. Browser ID & Click ID (_fbp, _fbc) (High weight)
  if (cleanFbp && /^fb\.[0-9]+(\.[0-9]+)+$/i.test(cleanFbp)) {
    metaUserData.fbp = cleanFbp;
    matchedPills.push("fbp");
    emqScore += 1.5;
  }
  if (cleanFbc && /^fb\.[0-9]+(\.[0-9]+)*\..+$/i.test(cleanFbc)) {
    metaUserData.fbc = cleanFbc;
    matchedPills.push("fbc");
    emqScore += 1.0;
  }

  // 4. First Name & Last Name
  if (cleanFirstName) {
    metaUserData.fn = [sha256(cleanFirstName)];
    matchedPills.push("FirstName");
    emqScore += 0.5;
  }
  if (cleanLastName) {
    metaUserData.ln = [sha256(cleanLastName)];
    matchedPills.push("LastName");
    emqScore += 0.25;
  }

  // 5. City & Province/State (Pakistan geo)
  if (cleanCity) {
    metaUserData.ct = [sha256(cleanCity)];
    matchedPills.push("City");
    emqScore += 0.5;
  }
  if (cleanProvince) {
    metaUserData.st = [sha256(cleanProvince)];
    matchedPills.push("State");
    emqScore += 0.25;
  }

  // 6. Country (pk)
  if (cleanCountry) {
    metaUserData.country = [sha256(cleanCountry)];
    matchedPills.push("Country");
    emqScore += 0.25;
  }

  // 7. External ID
  if (cleanExternalId) {
    metaUserData.external_id = [sha256(cleanExternalId)];
    matchedPills.push("ExternalID");
    emqScore += 0.5;
  }

  // 8. Client IP & User Agent
  if (ip) {
    metaUserData.client_ip_address = ip;
    matchedPills.push("IP");
    emqScore += 0.25;
  }
  if (ua) {
    metaUserData.client_user_agent = ua;
    matchedPills.push("UA");
    emqScore += 0.25;
  }

  // Cap EMQ score between 1.0 and 10.0
  const normalizedScore = Math.min(10.0, Math.max(1.0, Number(emqScore.toFixed(1))));

  return {
    metaUserData,
    matchedPills,
    emqScore: normalizedScore,
    emHash: Boolean(metaUserData.em),
    phHash: Boolean(metaUserData.ph),
    fbp: metaUserData.fbp || null,
    fbc: metaUserData.fbc || null,
    maskedEmail: maskEmail(cleanEmail),
    maskedPhone: maskPhone(cleanPhone),
    maskedCity: cleanCity ? cleanCity.charAt(0).toUpperCase() + cleanCity.slice(1) : undefined,
  };
}

export function invalidateCredentialsCache() {
  _cachedCredentials = null;
  _cacheExpiresAt = 0;
}

// Fire-and-forget logging: never let logging fail the user's shopping flow
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

/**
 * Multi-tier resolution for Meta Pixel ID & CAPI Access Token:
 * 1. Database (store_settings.domainSettings)
 * 2. Environment variables (all standard key variants)
 * 3. In-memory cache fallback
 */
export async function resolveCredentials() {
  const now = Date.now();
  if (_cachedCredentials && now < _cacheExpiresAt) {
    return _cachedCredentials;
  }

  let dbPixelId = "";
  let dbAccessToken = "";
  let source = "environment";

  try {
    const storeSettings = await getStoreSettings();
    const domainSettings = storeSettings?.domainSettings || {};
    dbPixelId = cleanString(domainSettings.metaPixelId);
    dbAccessToken = cleanString(domainSettings.metaCapiAccessToken);
    if (dbPixelId || dbAccessToken) {
      source = "database";
    }
  } catch (err) {
    console.warn("Could not load database store_settings for CAPI, falling back to environment:", err?.message);
  }

  const envPixelId = cleanString(
    process.env.NEXT_PUBLIC_META_PIXEL_ID ||
    process.env.META_PIXEL_ID ||
    process.env.FB_PIXEL_ID ||
    process.env.NEXT_PUBLIC_FB_PIXEL_ID ||
    process.env.META_DATASET_ID
  );

  const envAccessToken = cleanString(
    process.env.META_CAPI_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    process.env.FB_ACCESS_TOKEN ||
    process.env.FACEBOOK_ACCESS_TOKEN ||
    process.env.META_CAPI_TOKEN
  );

  const testEventCode = cleanString(
    process.env.META_TEST_EVENT_CODE ||
    process.env.META_CAPI_TEST_CODE
  );

  const pixelId = dbPixelId || envPixelId || "5621950704696012";
  const accessToken = dbAccessToken || envAccessToken || "";

  const resolved = {
    pixelId,
    accessToken,
    testEventCode: testEventCode || undefined,
    source: (dbPixelId && dbAccessToken) ? "database" : (envPixelId || envAccessToken) ? "environment" : "default",
    hasPixelId: Boolean(pixelId),
    hasAccessToken: Boolean(accessToken),
  };

  _cachedCredentials = resolved;
  _cacheExpiresAt = now + CACHE_TTL_MS;

  return resolved;
}

export async function getMetaCredentialsSummary() {
  const creds = await resolveCredentials();
  return {
    pixelId: creds.pixelId,
    hasPixelId: creds.hasPixelId,
    hasAccessToken: creds.hasAccessToken,
    maskedAccessToken: maskSecret(creds.accessToken),
    source: creds.source,
    isConfigured: creds.hasPixelId && creds.hasAccessToken,
  };
}

/**
 * Execute Meta Graph API POST with 1 backoff retry for transient network/5xx errors.
 * Never retries invalid credentials or client bad requests.
 */
async function fetchWithRetry(url, payload, maxRetries = 1) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    attempt += 1;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const result = await res.json().catch(() => null);

      // 4xx client errors (400, 401, 403, 404): permanent, do not retry
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { res, result, retried: attempt > 1 };
      }

      // 429 or 5xx server errors: retry if attempts remain
      if (!res.ok && attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }

      return { res, result, retried: attempt > 1 };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }
    }
  }

  throw lastError || new Error("Meta CAPI network request failed");
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
  const credentials = await resolveCredentials();
  const { pixelId, accessToken, testEventCode } = credentials;
  const resolvedEventId = eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  
  // Normalization and EMQ evaluation
  const {
    metaUserData,
    matchedPills,
    emqScore,
    emHash,
    phHash,
  } = normalizeUserDataForMeta(userData, clientIp, userAgent);

  const contentIds = customData.contentIds || (customData.contents ? customData.contents.map((c) => String(c.id || c.article_number || "")) : undefined);

  if (!pixelId || !accessToken) {
    console.warn("Meta CAPI skipped: Missing Pixel ID or Access Token (set them in Admin > Settings > Tracking, or META_CAPI_ACCESS_TOKEN env var)");
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
    return { success: false, reason: "missing_credentials", emqScore, matchedPills };
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: resolvedEventId,
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data: metaUserData,
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
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  try {
    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
    const { res, result } = await fetchWithRetry(url, payload, 1);

    if (!res.ok) {
      console.error("Meta CAPI response error:", result?.error?.message || res.statusText);
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
      error_message: res.ok ? null : (result?.error?.message || `capi_http_${res.status}`),
      client_ip: clientIp || null,
      user_agent: userAgent || null,
    });

    return {
      success: res.ok,
      result,
      emqScore,
      matchedPills,
    };
  } catch (error) {
    const isTimeout = error.name === "AbortError" || error.message.includes("abort");
    const errorMsg = isTimeout ? "capi_timeout" : (error.message || "capi_network_error");
    console.error("Meta CAPI exception:", errorMsg);

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
      error_message: errorMsg,
      client_ip: clientIp || null,
      user_agent: userAgent || null,
    });

    return {
      success: false,
      error: errorMsg,
      emqScore,
      matchedPills,
    };
  }
}
