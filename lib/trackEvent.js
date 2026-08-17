// Shared client-side tracker: fires the browser Meta Pixel (fbq) and the
// server-side Conversions API (via /api/meta-capi) with the SAME event_id so
// Meta can de-duplicate the two. Every call also lands in the pixel_events
// table (see lib/metaCapi.js) so the admin can see it under Admin > Events
// instead of having to open Meta Events Manager.
//
// Call this only from client components ("use client"), never during SSR.

function makeEventId(eventName) {
  return `evt_${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function trackEvent(eventName, { userData = {}, customData = {}, eventSourceUrl } = {}) {
  if (typeof window === "undefined") return;

  const eventId = makeEventId(eventName);
  const sourceUrl = eventSourceUrl || window.location.href;

  try {
    window.fbq?.("track", eventName, buildFbqCustomData(customData), { eventID: eventId });
  } catch {
    // Browser pixel is best-effort; CAPI call below still logs/sends the event.
  }

  fetch("/api/meta-capi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      eventName,
      eventId,
      eventSourceUrl: sourceUrl,
      userData,
      customData,
    }),
  }).catch(() => {
    // Non-blocking: tracking must never break the shopping experience.
  });
}

function buildFbqCustomData(customData = {}) {
  return {
    currency: "PKR",
    value: Number(customData.value || 0),
    content_type: customData.contentType || "product",
    content_name: customData.contentName || undefined,
    content_category: customData.contentCategory || undefined,
    content_ids: customData.contentIds || (customData.contents ? customData.contents.map((c) => String(c.id || "")) : undefined),
    contents: customData.contents || undefined,
    num_items: customData.numItems || undefined,
  };
}
