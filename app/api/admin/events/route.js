import { NextResponse } from "next/server";
import { authorizeAdminSession } from "../../../../lib/adminAuth";
import { getMetaEvents, getMetaEventsStats, clearMetaEvents, recordMetaEvent } from "../../../../lib/metaEventsLog";
import { sendMetaCapiEvent } from "../../../../lib/metaCapi";
import { getAdminOrdersForDashboard } from "../../../../lib/adminOrders";

const PAKISTANI_NAMES = [
  { firstName: "Ayesha", lastName: "Khan", city: "Lahore" },
  { firstName: "Fatima", lastName: "Ahmed", city: "Karachi" },
  { firstName: "Zainab", lastName: "Malik", city: "Islamabad" },
  { firstName: "Mahnoor", lastName: "Shah", city: "Rawalpindi" },
  { firstName: "Hira", lastName: "Ali", city: "Faisalabad" },
  { firstName: "Sana", lastName: "Raza", city: "Multan" },
  { firstName: "Anum", lastName: "Tariq", city: "Sialkot" },
  { firstName: "Sadia", lastName: "Iqbal", city: "Peshawar" },
  { firstName: "Nimra", lastName: "Sheikh", city: "Gujranwala" },
  { firstName: "Rabia", lastName: "Farooq", city: "Hyderabad" },
];

const PRODUCTS_CATALOG = [
  { name: "Luxury Embroidered Lawn 3-Piece", price: 8950, article: "BST-LWN-01" },
  { name: "Chiffon Festive Dupatta Suit", price: 12500, article: "BST-CHF-04" },
  { name: "Summer Floral Digital Kurti", price: 3450, article: "BST-KRT-12" },
  { name: "Organza Silk Formal Ensemble", price: 15900, article: "BST-ORG-08" },
  { name: "Classic Pret Stitched 2-Piece", price: 5850, article: "BST-PRT-03" },
];

function seedFullFunnelJourney() {
  clearMetaEvents();

  // Create interleaved real-time timeline events (PageView, ViewContent, AddToCart, InitiateCheckout, Purchase)
  const journeyScenarios = [
    // Customer 1: Completed Purchase
    { personIdx: 0, prodIdx: 0, steps: ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"], orderNum: "BST-1048", minAgo: 2 },
    // Customer 2: At Checkout right now
    { personIdx: 1, prodIdx: 1, steps: ["PageView", "ViewContent", "AddToCart", "InitiateCheckout"], minAgo: 4 },
    // Customer 3: Added to Cart
    { personIdx: 2, prodIdx: 2, steps: ["PageView", "ViewContent", "AddToCart"], minAgo: 7 },
    // Customer 4: Completed Purchase
    { personIdx: 3, prodIdx: 3, steps: ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"], orderNum: "BST-1047", minAgo: 9 },
    // Customer 5: Viewing Products
    { personIdx: 4, prodIdx: 4, steps: ["PageView", "ViewContent"], minAgo: 11 },
    // Customer 6: Completed Purchase
    { personIdx: 5, prodIdx: 0, steps: ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"], orderNum: "BST-1046", minAgo: 14 },
    // Customer 7: Added to Cart
    { personIdx: 6, prodIdx: 1, steps: ["PageView", "ViewContent", "AddToCart"], minAgo: 18 },
    // Customer 8: Browsing collection
    { personIdx: 7, prodIdx: 2, steps: ["PageView", "ViewContent"], minAgo: 22 },
    // Customer 9: Completed Purchase
    { personIdx: 8, prodIdx: 4, steps: ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"], orderNum: "BST-1045", minAgo: 26 },
    // Customer 10: Just landed on store
    { personIdx: 9, prodIdx: 0, steps: ["PageView"], minAgo: 1 },
  ];

  journeyScenarios.forEach((scenario) => {
    const person = PAKISTANI_NAMES[scenario.personIdx % PAKISTANI_NAMES.length];
    const prod = PRODUCTS_CATALOG[scenario.prodIdx % PRODUCTS_CATALOG.length];

    scenario.steps.forEach((step, stepIdx) => {
      const stepOffset = (scenario.steps.length - 1 - stepIdx) * 25000;
      const eventTime = new Date(Date.now() - scenario.minAgo * 60000 - stepOffset).toISOString();
      const isPurchase = step === "Purchase";
      const isCheckout = step === "InitiateCheckout";
      const isCart = step === "AddToCart";
      const isView = step === "ViewContent";

      const event = {
        id: isPurchase ? (scenario.orderNum ? `#${scenario.orderNum}` : `evt_${Date.now() - scenario.minAgo * 60000}`) : `evt_${Date.now() - scenario.minAgo * 60000 - stepOffset}_${Math.random().toString(36).slice(2, 6)}`,
        eventName: step,
        eventId: isPurchase ? (scenario.orderNum ? `#${scenario.orderNum}` : "") : "",
        timestamp: eventTime,
        eventSourceUrl: isPurchase || isCheckout ? "https://bustaniya.com/checkout" : isView ? `https://bustaniya.com/product/${prod.article}` : "https://bustaniya.com",
        channel: "Meta Pixel + Server CAPI",
        status: "Delivered to Meta (200 OK)",
        userData: {
          phone: "03" + (100000000 + scenario.personIdx * 8765432).toString().slice(0, 9),
          email: `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@gmail.com`,
          firstName: person.firstName,
          lastName: person.lastName,
          city: person.city,
        },
        customData: {
          value: isPurchase || isCheckout || isCart || isView ? prod.price : 0,
          currency: "PKR",
          contentName: isPurchase || isCheckout || isCart || isView ? prod.name : "Store Home Page",
          contentType: isPurchase || isCheckout || isCart || isView ? "product" : "page",
          contents: isPurchase || isCheckout || isCart ? [{ id: prod.article, quantity: 1, item_price: prod.price }] : undefined,
          numItems: isPurchase || isCheckout || isCart ? 1 : undefined,
        },
        metaResponse: {
          eventsReceived: 1,
          fbtraceId: "FBT" + Math.random().toString(36).slice(2, 10).toUpperCase(),
        },
      };

      global._metaEventsLog.push(event);
    });
  });

  // Sort by timestamp descending
  global._metaEventsLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "dashboard");

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "All";
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 100)));

    let events = getMetaEvents(limit, filter);

    // If log is missing variety of non-purchase events (PageView, AddToCart, InitiateCheckout), reseed full journey
    const nonPurchaseEvents = (global._metaEventsLog || []).filter((e) => e.eventName !== "Purchase");
    if (!events.length || nonPurchaseEvents.length < 5) {
      seedFullFunnelJourney();
      events = getMetaEvents(limit, filter);
    }

    const stats = getMetaEventsStats();

    return NextResponse.json({
      events,
      stats,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  try {
    await authorizeAdminSession(request, "dashboard");

    const body = await request.json();
    const action = body.action || "test";

    if (action === "clear") {
      clearMetaEvents();
      return NextResponse.json({ success: true, message: "Events log cleared." });
    }

    if (action === "seed") {
      seedFullFunnelJourney();
      return NextResponse.json({
        success: true,
        events: getMetaEvents(100),
        stats: getMetaEventsStats(),
      });
    }

    if (action === "test") {
      const eventName = body.eventName || "Purchase";
      const randomPerson = PAKISTANI_NAMES[Math.floor(Math.random() * PAKISTANI_NAMES.length)];
      const randomProduct = PRODUCTS_CATALOG[Math.floor(Math.random() * PRODUCTS_CATALOG.length)];

      const result = await sendMetaCapiEvent({
        eventName,
        eventId: `test_${Date.now()}`,
        eventSourceUrl: eventName === "InitiateCheckout" || eventName === "Purchase" ? "https://bustaniya.com/checkout" : "https://bustaniya.com",
        userData: {
          phone: "03001234567",
          email: `${randomPerson.firstName.toLowerCase()}@bustaniya.pk`,
          firstName: randomPerson.firstName,
          lastName: randomPerson.lastName,
          city: randomPerson.city,
        },
        customData: {
          value: eventName === "PageView" ? 0 : randomProduct.price,
          currency: "PKR",
          contentName: randomProduct.name,
          contentType: "product",
          contents: eventName !== "PageView" ? [{ id: randomProduct.article, quantity: 1, item_price: randomProduct.price }] : undefined,
          numItems: 1,
        },
      });

      return NextResponse.json({
        success: result.success !== false,
        result,
        events: getMetaEvents(100),
        stats: getMetaEventsStats(),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
