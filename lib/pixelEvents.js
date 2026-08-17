import { supabaseAdminRequest } from "./supabaseRest";

const FUNNEL_EVENT_NAMES = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"];

/**
 * Recent pixel/CAPI events for the Admin > Events live log.
 */
export async function getRecentPixelEvents({ limit = 100, eventName = "" } = {}) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const select = "id,event_name,event_id,source,success,http_status,fbtrace_id,event_source_url,value,currency,content_ids,em_hash,ph_hash,error_message,created_at";
  const eventFilter = eventName ? `&event_name=eq.${encodeURIComponent(eventName)}` : "";

  const rows = await supabaseAdminRequest(
    `pixel_events?select=${select}&order=created_at.desc&limit=${cappedLimit}${eventFilter}`
  );
  return Array.isArray(rows) ? rows : [];
}

/**
 * Real funnel counts (not estimates) for the selected number of days, plus
 * overall CAPI health (success rate, match quality) for the same window.
 */
export async function getPixelFunnelSummary({ days = 7 } = {}) {
  const since = new Date(Date.now() - Math.max(1, Number(days) || 7) * 24 * 60 * 60 * 1000).toISOString();

  let rows = [];
  try {
    rows = await supabaseAdminRequest(
      `pixel_events?select=event_name,success,em_hash,ph_hash&created_at=gte.${encodeURIComponent(since)}&limit=50000`
    );
  } catch (error) {
    console.error("getPixelFunnelSummary failed:", error?.message || error);
    rows = [];
  }
  rows = Array.isArray(rows) ? rows : [];

  const counts = Object.fromEntries(FUNNEL_EVENT_NAMES.map((name) => [name, 0]));
  let successCount = 0;
  let matchedCount = 0;

  rows.forEach((row) => {
    if (counts[row.event_name] !== undefined) counts[row.event_name] += 1;
    if (row.success) successCount += 1;
    if (row.em_hash || row.ph_hash) matchedCount += 1;
  });

  const total = rows.length;
  return {
    since,
    total,
    counts,
    successRate: total ? Math.round((successCount / total) * 100) : null,
    matchRate: total ? Math.round((matchedCount / total) * 100) : null,
  };
}
