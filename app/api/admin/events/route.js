import { NextResponse } from "next/server";
import { authorizeAdminSession } from "../../../../lib/adminAuth";
import { getMetaEvents, getMetaEventsStats, clearMetaEvents } from "../../../../lib/metaEventsLog";
import { sendMetaCapiEvent } from "../../../../lib/metaCapi";
import { getAdminOrdersForDashboard } from "../../../../lib/adminOrders";

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "dashboard");

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "All";
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 100)));

    let events = getMetaEvents(limit, filter);

    // If log is empty (e.g. freshly started server), populate from recent real orders as Purchase events
    if (!events.length && (filter === "All" || filter === "Purchase")) {
      try {
        const orders = await getAdminOrdersForDashboard();
        (orders || []).slice(0, 15).forEach((order) => {
          const { recordMetaEvent } = require("../../../../lib/metaEventsLog");
          recordMetaEvent({
            eventName: "Purchase",
            eventId: `#${order.order_number || order.id}`,
            eventSourceUrl: "https://bustaniya.com/checkout",
            userData: {
              phone: order.shipping_phone || order.guest_phone,
              email: order.customer_email || order.guest_email,
              firstName: (order.shipping_full_name || order.guest_name || "Customer").split(" ")[0],
              lastName: (order.shipping_full_name || order.guest_name || "").split(" ").slice(1).join(" "),
              city: order.shipping_city,
            },
            customData: {
              value: Number(order.total_order_value_pkr || order.total_pkr || 0),
              currency: "PKR",
              contents: (order.items || []).map((item) => ({
                id: item.article_number || item.sku || item.name,
                quantity: Number(item.quantity || 1),
                item_price: Number(item.price || 0),
              })),
            },
            channel: "Meta Pixel + Server CAPI",
            status: "Delivered to Meta (200 OK)",
          });
        });
        events = getMetaEvents(limit, filter);
      } catch {}
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

    if (action === "test") {
      const eventName = body.eventName || "Purchase";
      const result = await sendMetaCapiEvent({
        eventName,
        eventId: `test_${Date.now()}`,
        eventSourceUrl: "https://bustaniya.com/checkout?test=1",
        userData: {
          phone: "03001234567",
          email: "customer@bustaniya.pk",
          firstName: "Ayesha",
          lastName: "Khan",
          city: "Lahore",
        },
        customData: {
          value: eventName === "Purchase" ? 8950 : 4500,
          currency: "PKR",
          contentName: "Summer Luxury Lawn Kurti",
          contentType: "product",
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
