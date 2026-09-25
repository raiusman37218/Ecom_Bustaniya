import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { supabaseAdminRequest, supabaseAdminRequestWithCount } from "../../../../lib/supabaseRest";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "orders");

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "all";
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    // Fetch all counts for quick badges
    const allOrders = await supabaseAdminRequest(
      "custom_dress_orders?select=id,status&order=created_at.desc"
    ).catch(() => []);

    const counts = {
      total: allOrders.length,
      pending: 0,
      contacted: 0,
      confirmed: 0,
      in_stitching: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const item of allOrders) {
      const s = String(item.status || "pending").toLowerCase();
      if (counts[s] !== undefined) {
        counts[s] += 1;
      }
    }

    // Build filter query
    let queryPath = `custom_dress_orders?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;

    if (status && status !== "all") {
      queryPath += `&status=eq.${encodeURIComponent(status)}`;
    }

    if (search) {
      // Supabase or filter across customer_name, customer_phone, order_number, customer_city
      queryPath += `&or=(customer_name.ilike.*${encodeURIComponent(search)}*,customer_phone.ilike.*${encodeURIComponent(search)}*,order_number.ilike.*${encodeURIComponent(search)}*,customer_city.ilike.*${encodeURIComponent(search)}*)`;
    }

    const { data: orders, total } = await supabaseAdminRequestWithCount(queryPath).catch(async () => {
      const fallback = await supabaseAdminRequest(queryPath).catch(() => []);
      return { data: Array.isArray(fallback) ? fallback : [], total: fallback.length };
    });

    return NextResponse.json({
      success: true,
      orders,
      counts,
      pagination: {
        page,
        limit,
        total: total || orders.length,
        totalPages: Math.ceil((total || orders.length) / limit),
      },
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      return adminAuthErrorResponse(error);
    }
    console.error("Failed to load custom orders:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load custom orders." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    await authorizeAdminSession(request, "orders");
    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) updates.status = String(body.status);
    if (body.quoted_price !== undefined) updates.quoted_price = Number(body.quoted_price || 0);
    if (body.advance_paid !== undefined) updates.advance_paid = Number(body.advance_paid || 0);
    if (body.admin_notes !== undefined) updates.admin_notes = String(body.admin_notes || "");

    const updated = await supabaseAdminRequest(`custom_dress_orders?id=eq.${encodeURIComponent(body.id)}`, {
      method: "PATCH",
      body: updates,
      prefer: "return=representation",
    });

    const result = Array.isArray(updated) ? updated[0] : updated;

    return NextResponse.json({
      success: true,
      order: result,
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      return adminAuthErrorResponse(error);
    }
    console.error("Failed to update custom order:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update custom order." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    await authorizeAdminSession(request, "orders");
    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    await supabaseAdminRequest(`custom_dress_orders?id=eq.${encodeURIComponent(body.id)}`, {
      method: "DELETE",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      return adminAuthErrorResponse(error);
    }
    console.error("Failed to delete custom order:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete custom order." },
      { status: 500 }
    );
  }
}
