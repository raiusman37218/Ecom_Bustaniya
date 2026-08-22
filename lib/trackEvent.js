// Shared client-side tracker: fires the browser Meta Pixel (fbq) and the
// server-side Conversions API (via /api/meta-capi) with the SAME event_id so
// Meta can de-duplicate the two instead of double-counting every action.
// Automatically includes first-party browser identifiers (_fbp, _fbc) and
// consented customer identifiers to maximize Event Match Quality (EMQ).

function makeEventId(eventName) {
  return `evt_${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : "";
}

function setCookie(name, value, days = 90) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getOrSetFbc() {
  if (typeof window === "undefined") return "";
  let fbc = getCookie("_fbc");
  if (fbc) return fbc;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get("fbclid");
    if (fbclid) {
      fbc = `fb.1.${Date.now()}.${fbclid}`;
      setCookie("_fbc", fbc, 90);
    }
  } catch {}

  return fbc || "";
}

function getStoredCustomerData() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("bustaniya_customer_data");
    if (raw) {
      const data = JSON.parse(raw);
      if (typeof data === "object" && data !== null) return data;
    }
  } catch {}
  return {};
}

export function saveConsentedCustomerData(data = {}) {
  if (typeof window === "undefined") return;
  try {
    const existing = getStoredCustomerData();
    const updated = {
      ...existing,
      ...(data.phone ? { phone: String(data.phone).trim() } : {}),
      ...(data.email ? { email: String(data.email).trim() } : {}),
      ...(data.name ? {
        firstName: String(data.name).trim().split(" ")[0] || "",
        lastName: String(data.name).trim().split(" ").slice(1).join(" ") || "",
      } : {}),
      ...(data.firstName ? { firstName: String(data.firstName).trim() } : {}),
      ...(data.lastName ? { lastName: String(data.lastName).trim() } : {}),
      ...(data.city ? { city: String(data.city).trim() } : {}),
      country: "pk",
    };
    localStorage.setItem("bustaniya_customer_data", JSON.stringify(updated));
  } catch {}
}

export function trackEvent(eventName, { userData = {}, customData = {}, eventSourceUrl, eventId } = {}) {
  if (typeof window === "undefined") return;

  const runTracking = () => {
    try {
      const resolvedEventId = eventId || makeEventId(eventName);
      const sourceUrl = eventSourceUrl || window.location.href;
      const storedUser = getStoredCustomerData();
      const fbp = getCookie("_fbp");
      const fbc = getOrSetFbc();

      // Merge explicitly passed user data with cookies and remembered customer profile
      const mergedUserData = {
        ...storedUser,
        ...userData,
        ...(fbp ? { fbp } : {}),
        ...(fbc ? { fbc } : {}),
        country: "pk",
      };

      try {
        window.fbq?.("track", eventName, buildFbqCustomData(customData), { eventID: resolvedEventId });
      } catch {
        // Browser pixel is best-effort
      }

      fetch("/api/meta-capi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          eventName,
          eventId: resolvedEventId,
          eventSourceUrl: sourceUrl,
          userData: mergedUserData,
          customData,
        }),
      }).catch(() => {
        // Non-blocking: tracking must never break the shopping experience.
      });
    } catch {}
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(runTracking, { timeout: 1000 });
  } else {
    setTimeout(runTracking, 0);
  }
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
