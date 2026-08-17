import { supabaseAdminRequest } from "./supabaseRest";
import { getMetaCredentialsSummary } from "./metaCapi";

const FUNNEL_EVENT_NAMES = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"];

/**
 * Recent pixel/CAPI events for the Admin > Events live log.
 */
export async function getRecentPixelEvents({ limit = 100, eventName = "" } = {}) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const select = "id,event_name,event_id,source,success,http_status,fbtrace_id,event_source_url,value,currency,content_ids,em_hash,ph_hash,error_message,created_at";
  const eventFilter = eventName ? `&event_name=eq.${encodeURIComponent(eventName)}` : "";

  try {
    const rows = await supabaseAdminRequest(
      `pixel_events?select=${select}&order=created_at.desc&limit=${cappedLimit}${eventFilter}`
    );
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error("getRecentPixelEvents failed:", error?.message || error);
    return [];
  }
}

/**
 * Real funnel counts, per-event delivery breakdown, and Meta CAPI health status.
 */
export async function getPixelFunnelSummary({ days = 7 } = {}) {
  const since = new Date(Date.now() - Math.max(1, Number(days) || 7) * 24 * 60 * 60 * 1000).toISOString();

  let rows = [];
  try {
    rows = await supabaseAdminRequest(
      `pixel_events?select=event_name,success,em_hash,ph_hash,error_message,http_status,created_at&created_at=gte.${encodeURIComponent(since)}&limit=50000`
    );
  } catch (error) {
    console.error("getPixelFunnelSummary failed:", error?.message || error);
    rows = [];
  }
  rows = Array.isArray(rows) ? rows : [];

  const credentials = await getMetaCredentialsSummary();

  const counts = Object.fromEntries(FUNNEL_EVENT_NAMES.map((name) => [name, 0]));
  const perEvent = Object.fromEntries(
    FUNNEL_EVENT_NAMES.map((name) => [
      name,
      { total: 0, success: 0, failed: 0, successRate: 100 },
    ])
  );

  let successCount = 0;
  let matchedCount = 0;
  const recentErrors = [];

  rows.forEach((row) => {
    const name = row.event_name;
    if (counts[name] !== undefined) counts[name] += 1;

    if (perEvent[name]) {
      perEvent[name].total += 1;
      if (row.success) {
        perEvent[name].success += 1;
      } else {
        perEvent[name].failed += 1;
        if (row.error_message && recentErrors.length < 5 && !recentErrors.includes(row.error_message)) {
          recentErrors.push(row.error_message);
        }
      }
    }

    if (row.success) successCount += 1;
    if (row.em_hash || row.ph_hash) matchedCount += 1;
  });

  // Calculate per-event success rates
  FUNNEL_EVENT_NAMES.forEach((name) => {
    const item = perEvent[name];
    item.successRate = item.total > 0 ? Math.round((item.success / item.total) * 100) : 100;
  });

  const total = rows.length;
  const overallSuccessRate = total ? Math.round((successCount / total) * 100) : null;
  const matchRate = total ? Math.round((matchedCount / total) * 100) : null;

  // Determine Meta CAPI Health status: Connected | Warning | Failed
  let healthStatus = "Connected";
  let healthReason = "Meta Pixel and Conversions API configured & active.";

  if (!credentials.hasPixelId && !credentials.hasAccessToken) {
    healthStatus = "Failed";
    healthReason = "Missing both Meta Pixel ID and CAPI Access Token.";
  } else if (!credentials.hasAccessToken) {
    healthStatus = "Warning";
    healthReason = "Meta Pixel ID active, but CAPI Access Token is missing (Browser-only mode).";
  } else if (recentErrors.some((e) => e.includes("missing_credentials") || e.includes("OAuthException") || e.includes("auth"))) {
    healthStatus = "Failed";
    healthReason = "Authentication / credential errors detected in recent dispatches.";
  } else if (overallSuccessRate !== null && overallSuccessRate < 75) {
    healthStatus = "Failed";
    healthReason = `Low Meta delivery success rate (${overallSuccessRate}%). Check error details.`;
  } else if (overallSuccessRate !== null && overallSuccessRate < 90) {
    healthStatus = "Warning";
    healthReason = `Meta delivery success is ${overallSuccessRate}%. Some events were rejected or dropped.`;
  }

  return {
    since,
    total,
    counts,
    perEvent,
    successCount,
    failedCount: total - successCount,
    successRate: overallSuccessRate,
    matchRate,
    health: {
      status: healthStatus,
      reason: healthReason,
      pixelId: credentials.pixelId,
      hasPixelId: credentials.hasPixelId,
      hasAccessToken: credentials.hasAccessToken,
      maskedAccessToken: credentials.maskedAccessToken,
      source: credentials.source,
      recentErrors,
    },
  };
}
