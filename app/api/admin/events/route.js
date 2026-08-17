import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getRecentPixelEvents, getPixelFunnelSummary } from "../../../../lib/pixelEvents";
import { sendMetaCapiEvent } from "../../../../lib/metaCapi";

const TEST_CUSTOMER = {
  phone: "03001234567",
  email: "test.shopper@bustaniya.pk",
  firstName: "Ayesha",
  lastName: "Khan",
  city: "Lahore",
};

const TEST_PRODUCT = {
  id: "BST-LWN-01",
  name: "Luxury Embroidered Lawn 3-Piece",
  price: 8950,
};

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

    // Action: 1-Click Full Funnel Test Suite
    if (action === "test_suite") {
      const suiteResults = {};
      const testRunId = Date.now();

      // 1. PageView
      suiteResults.PageView = await sendMetaCapiEvent({
        eventName: "PageView",
        eventId: `test_pv_${testRunId}`,
        eventSourceUrl: "https://bustaniya.com",
        userData: TEST_CUSTOMER,
        customData: { contentName: "Home Page", contentType: "page" },
        triggeredBy: "server",
      });

      // 2. ViewContent
      suiteResults.ViewContent = await sendMetaCapiEvent({
        eventName: "ViewContent",
        eventId: `test_vc_${testRunId}`,
        eventSourceUrl: `https://bustaniya.com/product/${TEST_PRODUCT.id}`,
        userData: TEST_CUSTOMER,
        customData: {
          contentName: TEST_PRODUCT.name,
          contentIds: [TEST_PRODUCT.id],
          contentType: "product",
          value: TEST_PRODUCT.price,
          currency: "PKR",
        },
        triggeredBy: "server",
      });

      // 3. AddToCart
      suiteResults.AddToCart = await sendMetaCapiEvent({
        eventName: "AddToCart",
        eventId: `test_atc_${testRunId}`,
        eventSourceUrl: `https://bustaniya.com/product/${TEST_PRODUCT.id}`,
        userData: TEST_CUSTOMER,
        customData: {
          contentName: TEST_PRODUCT.name,
          contents: [{ id: TEST_PRODUCT.id, quantity: 1, item_price: TEST_PRODUCT.price }],
          numItems: 1,
          value: TEST_PRODUCT.price,
          currency: "PKR",
        },
        triggeredBy: "server",
      });

      // 4. InitiateCheckout
      suiteResults.InitiateCheckout = await sendMetaCapiEvent({
        eventName: "InitiateCheckout",
        eventId: `test_ic_${testRunId}`,
        eventSourceUrl: "https://bustaniya.com/checkout",
        userData: TEST_CUSTOMER,
        customData: {
          contentIds: [TEST_PRODUCT.id],
          contents: [{ id: TEST_PRODUCT.id, quantity: 1, item_price: TEST_PRODUCT.price }],
          numItems: 1,
          value: TEST_PRODUCT.price,
          currency: "PKR",
        },
        triggeredBy: "server",
      });

      // 5. Purchase
      suiteResults.Purchase = await sendMetaCapiEvent({
        eventName: "Purchase",
        eventId: `test_pur_${testRunId}`,
        eventSourceUrl: "https://bustaniya.com/checkout",
        userData: TEST_CUSTOMER,
        customData: {
          contentName: TEST_PRODUCT.name,
          contents: [{ id: TEST_PRODUCT.id, quantity: 1, item_price: TEST_PRODUCT.price }],
          numItems: 1,
          value: TEST_PRODUCT.price,
          currency: "PKR",
        },
        triggeredBy: "server",
      });

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

    // Action: Single Event Test
    if (action === "test_event" && eventName) {
      const testRunId = Date.now();
      const isPurchase = eventName === "Purchase";
      const isCheckout = eventName === "InitiateCheckout";
      const isCart = eventName === "AddToCart";
      const isView = eventName === "ViewContent";

      const testResult = await sendMetaCapiEvent({
        eventName,
        eventId: `test_${eventName.toLowerCase()}_${testRunId}`,
        eventSourceUrl: isPurchase || isCheckout ? "https://bustaniya.com/checkout" : isView ? `https://bustaniya.com/product/${TEST_PRODUCT.id}` : "https://bustaniya.com",
        userData: TEST_CUSTOMER,
        customData: {
          contentName: eventName === "PageView" ? "Home Page" : TEST_PRODUCT.name,
          contentType: eventName === "PageView" ? "page" : "product",
          contentIds: isPurchase || isCheckout || isCart || isView ? [TEST_PRODUCT.id] : undefined,
          contents: isPurchase || isCheckout || isCart ? [{ id: TEST_PRODUCT.id, quantity: 1, item_price: TEST_PRODUCT.price }] : undefined,
          numItems: isPurchase || isCheckout || isCart ? 1 : undefined,
          value: isPurchase || isCheckout || isCart || isView ? TEST_PRODUCT.price : 0,
          currency: "PKR",
        },
        triggeredBy: "server",
      });

      const [events, summary] = await Promise.all([
        getRecentPixelEvents({ limit: body.limit || 150, eventName: "" }),
        getPixelFunnelSummary({ days }),
      ]);

      return NextResponse.json({
        success: Boolean(testResult?.success),
        result: testResult,
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
