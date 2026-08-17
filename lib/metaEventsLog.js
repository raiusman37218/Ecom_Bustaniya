// In-memory rolling event log for Meta Pixel and CAPI events
const MAX_EVENTS = 200;

if (!global._metaEventsLog) {
  global._metaEventsLog = [];
}

export function recordMetaEvent({
  eventName,
  eventId,
  eventSourceUrl,
  userData = {},
  customData = {},
  channel = "Meta Pixel & CAPI",
  status = "Delivered to Meta",
  metaResponse = null,
}) {
  const event = {
    id: eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    eventName: eventName || "CustomEvent",
    eventId: eventId || "",
    timestamp: new Date().toISOString(),
    eventSourceUrl: eventSourceUrl || "https://bustaniya.com",
    channel,
    status,
    userData: {
      phone: userData.phone ? String(userData.phone).slice(0, 4) + "****" + String(userData.phone).slice(-3) : undefined,
      email: userData.email ? String(userData.email).slice(0, 3) + "***@" + String(userData.email).split("@")[1] : undefined,
      firstName: userData.firstName || undefined,
      lastName: userData.lastName || undefined,
      city: userData.city || undefined,
    },
    customData: {
      value: Number(customData.value || 0),
      currency: customData.currency || "PKR",
      numItems: customData.numItems || (customData.contents ? customData.contents.reduce((sum, c) => sum + (Number(c.quantity) || 1), 0) : undefined),
      contents: customData.contents || undefined,
      contentName: customData.contentName || undefined,
      contentType: customData.contentType || "product",
    },
    metaResponse: metaResponse ? {
      eventsReceived: metaResponse.events_received,
      fbtraceId: metaResponse.fbtrace_id,
      messages: metaResponse.messages,
    } : null,
  };

  global._metaEventsLog.unshift(event);
  if (global._metaEventsLog.length > MAX_EVENTS) {
    global._metaEventsLog = global._metaEventsLog.slice(0, MAX_EVENTS);
  }

  return event;
}

export function getMetaEvents(limit = 100, eventFilter = "All") {
  let list = global._metaEventsLog || [];
  if (eventFilter && eventFilter !== "All") {
    list = list.filter((e) => e.eventName.toLowerCase() === eventFilter.toLowerCase());
  }
  return list.slice(0, limit);
}

export function clearMetaEvents() {
  global._metaEventsLog = [];
  return true;
}

export function getMetaEventsStats() {
  const list = global._metaEventsLog || [];
  const total = list.length;
  const purchases = list.filter((e) => e.eventName === "Purchase").length;
  const checkouts = list.filter((e) => e.eventName === "InitiateCheckout").length;
  const cartAdds = list.filter((e) => e.eventName === "AddToCart").length;
  const views = list.filter((e) => e.eventName === "ViewContent" || e.eventName === "PageView").length;
  const purchaseValue = list
    .filter((e) => e.eventName === "Purchase")
    .reduce((sum, e) => sum + (Number(e.customData?.value) || 0), 0);

  return {
    total,
    purchases,
    checkouts,
    cartAdds,
    views,
    purchaseValue,
  };
}
