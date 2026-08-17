import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getRecentPixelEvents, getPixelFunnelSummary } from "../../../../lib/pixelEvents";
import { sendMetaCapiEvent } from "../../../../lib/metaCapi";

const TEST_CUSTOMER = {
  phone: "03001234567",
  email: "ayesha.khan@gmail.com",
  firstName: "Ayesha",
  lastName: "Khan",
  city: "Lahore",
  state: "Punjab",
  country: "pk",
  fbp: "fb.1.1718000000.1234567890",
  fbc: "fb.1.1718000000.IwAR0TestAdClick1234567890",
};

const TEST_PRODUCT = {
  id: "BST-LWN-01",
  name: "Luxury Embroidered Lawn 3-Piece",
  price: 8950,
};

const VALID_TEST_EVENT_NAMES = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"];

function buildTestEventConfig(eventName, testRunId) {
  const contentsPayload = [{ id: TEST_PRODUCT.id, quantity: 1, item_price: TEST_PRODUCT.price }];
  switch (eventName) {
    case "PageView":
      return {
        eventId: `test_pv_${testRunId}`,
        eventSourceUrl: "https://bustaniya.com",
        customData: { contentName: "Home Page", contentType: "page" },
      };
    case "ViewContent":
      return {
        eventId: `test_vc_${testRunId}`,
        eventSourceUrl: `https://bustaniya.com/product/${TEST_PRODUCT.id}`,
        customData: {
          contentName: TEST_PRODUCT.name,
          contentIds: [TEST_PRODUCT.id],
          contentType: "product",
          value: TEST_PRODUCT.price,
          currency: "PKR",
        },
      };
    case "AddToCart":
      return {
        eventId: `test_atc_${testRunId}`,
        eventSourceUrl: `https://bustaniya.com/product/${TEST_PRODUCT.id}`,
        customData: {
          contentName: TEST_PRODUCT.name,
          contents: contentsPayload,
          numItems: 1,
          value: TEST_PRODUCT.price,
          currency: "PKR",
        },
      };
    case "InitiateCheckout":
      return {
        eventId: `test_ic_${testRunId}`,
        eventSourceUrl: "https://bustaniya.com/checkout",
        customData: {
          contentIds: [TEST_PRODUCT.id],
          contents: contentsPayload,
          numItems: 1,
          value: TEST_PRODUCT.price,
          currency: "PKR",
        },
      };
    case "Purchase":
    default:
      return {
        eventId: `test_pur_${testRunId}`,
        eventSourceUrl: "https://bustaniya.com/checkout",
        customData: {
          contentName: TEST_PRODUCT.name,
          contents: contentsPayload,
          numItems: 1,
          value: TEST_PRODUCT.price,
          currency: "PKR",
        },
      };
  }
}

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "dashboard");

    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get("eventName") || searchParams.get("filter") || "";
    const days = Number(searchParams.get("days")) || 7;
    const limit = Number(searchParams.get("limit")) || 150;

    const [events, summary] = await Promise.all([
      getRecentPixelEvents({ limit, eventName: eventName === "All" ? "" : eventName }),
      getPixelFunnelSummary({ days }),
    ]);

    return NextResponse.json({ events, summary });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    console.error("Admin events route error:", error?.message || error);
    return NextResponse.json({ error: "Unable to load pixel events." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await authorizeAdminSession(request, "dashboard");

    const body = await request.json().catch(() => ({}));
    const action = body.action || "load";
    const days = Number(body.days) || 7;
    const eventName = body.eventName || "";

    // Action: Dispatch a single test event of the given name (used by the
    // per-event "Test PageView / Test Cart / ..." buttons in Admin > Events).
    if (action === "test_event") {
      if (!VALID_TEST_EVENT_NAMES.includes(eventName)) {
        return NextResponse.json({ error: `Invalid eventName. Must be one of: ${VALID_TEST_EVENT_NAMES.join(", ")}` }, { status: 400 });
      }

      const testRunId = Date.now();
      const { eventId, eventSourceUrl, customData } = buildTestEventConfig(eventName, testRunId);

      const result = await sendMetaCapiEvent({
        eventName,
        eventId,
        eventSourceUrl,
        userData: TEST_CUSTOMER,
        customData,
        triggeredBy: "server",
      });

      const [events, summary] = await Promise.all([
        getRecentPixelEvents({ limit: body.limit || 150, eventName: "" }),
        getPixelFunnelSummary({ days }),
      ]);

      return NextResponse.json({
        success: result?.success === true,
        result,
        events,
        summary,
      });
    }

    // Action: 1-Click Full Funnel Test Suite
    if (action === "test_suite") {
      const suiteResults = {};
      const testRunId = Date.now();

      for (const name of VALID_TEST_EVENT_NAMES) {
        const { eventId, eventSourceUrl, customData } = buildTestEventConfig(name, testRunId);
        suiteResults[name] = await sendMetaCapiEvent({
          eventName: name,
          eventId,
          eventSourceUrl,
          userData: TEST_CUSTOMER,
          customData,
          triggeredBy: "server",
        });
      }

      const allSuccess = Object.values(suiteResults).every((r) => r?.success);

      const [events, summary] = await Promise.all([
        getRecentPixelEvents({ limit: body.limit || 150, eventName: "" }),
        getPixelFunnelSummary({ days }),
      ]);

      return NextResponse.json({
        success: allSuccess,
        results: suiteResults,
        events,
        summary,
      });
    }

    // Action: Deduplication Live Proof Test (Browser + Server paired with identical event_id)
    if (action === "test_dedup") {
      const sharedEventId = `dedup_ord_${Date.now()}`;

      // 1. Browser copy with sharedEventId
      const browserCopy = await sendMetaCapiEvent({
        eventName: "Purchase",
        eventId: sharedEventId,
        eventSourceUrl: "https://bustaniya.com/checkout",
        userData: TEST_CUSTOMER,
        customData: {
          contentName: TEST_PRODUCT.name,
          contents: [{ id: TEST_PRODUCT.id, quantity: 1, item_price: TEST_PRODUCT.price }],
          numItems: 1,
          value: TEST_PRODUCT.price,
          currency: "PKR",
        },
        clientIp: "111.119.187.1",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        triggeredBy: "browser",
      });

      // 2. Server copy with identical sharedEventId
      const serverCopy = await sendMetaCapiEvent({
        eventName: "Purchase",
        eventId: sharedEventId,
        eventSourceUrl: "https://bustaniya.com/checkout",
        userData: TEST_CUSTOMER,
        customData: {
          contentName: TEST_PRODUCT.name,
          contents: [{ id: TEST_PRODUCT.id, quantity: 1, item_price: TEST_PRODUCT.price }],
          numItems: 1,
          value: TEST_PRODUCT.price,
          currency: "PKR",
        },
        clientIp: "111.119.187.1",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        triggeredBy: "server",
      });

      const [events, summary] = await Promise.all([
        getRecentPixelEvents({ limit: body.limit || 150, eventName: "" }),
        getPixelFunnelSummary({ days }),
      ]);

      return NextResponse.json({
        success: Boolean(browserCopy?.success && serverCopy?.success),
        sharedEventId,
        browserCopy,
        serverCopy,
        events,
        summary,
      });
    }

    // Action: Re-sync / Dispatch Meta Purchase for a specific order safely and idempotently
    if (action === "sync_order_purchase") {
      const targetOrderId = body.orderId || body.orderRef;
      if (!targetOrderId) {
        return NextResponse.json({ error: "Missing orderId or orderRef." }, { status: 400 });
      }

      const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
      const userAgent = request.headers.get("user-agent") || "";
      const order = body.orderData || {};

      const fullName = order.customer || order.shipping_full_name || order.guest_name || "Customer";
      const [firstName, ...lastNameParts] = fullName.split(/\s+/);
      const lastName = lastNameParts.join(" ") || undefined;
      const phone = order.phone || order.shipping_phone || order.guest_phone || "";
      const email = order.email || order.shipping_email || order.guest_email || "";
      const city = order.city || order.shipping_city || "";
      const totalVal = Number(order.total || order.total_pkr || 0);
      const orderRef = order.order_number || String(order.id || targetOrderId).replace(/^#/, "");
      const items = Array.isArray(order.items) ? order.items : [];

      const capiResult = await sendMetaCapiEvent({
        eventName: "Purchase",
        eventId: orderRef,
        eventSourceUrl: "https://bustaniya.com/checkout",
        userData: {
          phone,
          email,
          firstName,
          lastName,
          city,
          country: "pk",
          externalId: orderRef,
        },
        customData: {
          value: totalVal,
          currency: "PKR",
          orderId: orderRef,
          contentIds: items.map((item) => String(item.article_number || item.productId || item.sku || item.id || "")),
          contents: items.map((item) => ({
            id: String(item.article_number || item.productId || item.sku || item.id || ""),
            quantity: Number(item.quantity || 1),
            item_price: Number(item.price || 0),
          })),
          numItems: items.reduce((sum, item) => sum + Number(item.quantity || 1), 0) || 1,
        },
        clientIp,
        userAgent,
        triggeredBy: "server",
      });

      const [events, summary] = await Promise.all([
        getRecentPixelEvents({ limit: body.limit || 150, eventName: "" }),
        getPixelFunnelSummary({ days }),
      ]);

      return NextResponse.json({
        success: capiResult.success,
        capiResult,
        orderRef,
        events,
        summary,
      });
    }

    // Default: Load filtered events and summary
    const [events, summary] = await Promise.all([
      getRecentPixelEvents({ limit: body.limit || 150, eventName: eventName === "All" ? "" : eventName }),
      getPixelFunnelSummary({ days }),
    ]);

    return NextResponse.json({ events, summary });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    console.error("Admin events route error:", error?.message || error);
    return NextResponse.json({ error: "Unable to load pixel events." }, { status: 500 });
  }
}
