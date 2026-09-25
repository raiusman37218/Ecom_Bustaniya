import { NextResponse } from "next/server";
import { supabaseAdminRequest } from "../../../lib/supabaseRest";

export const runtime = "nodejs";

function generateOrderNumber() {
  const date = new Date();
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `BST-CD-${year}${month}-${randomPart}`;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const customerName = String(body.customerName || "").trim();
    const customerPhone = String(body.customerPhone || "").trim();
    const customerEmail = String(body.customerEmail || "").trim();
    const customerCity = String(body.customerCity || "").trim();
    const customerAddress = String(body.customerAddress || "").trim();
    const dressType = String(body.dressType || "Kurti").trim();
    const sizePreference = String(body.sizePreference || "custom").trim();
    const standardSize = body.standardSize ? String(body.standardSize).trim() : null;
    const designNotes = String(body.designNotes || "").trim();
    const fabricDetails = String(body.fabricDetails || "").trim();
    const colorPreference = String(body.colorPreference || "").trim();
    const measurements = typeof body.measurements === "object" && body.measurements !== null ? body.measurements : {};
    const referenceImages = Array.isArray(body.referenceImages) ? body.referenceImages : [];

    if (!customerName) {
      return NextResponse.json({ error: "Please provide your name." }, { status: 400 });
    }
    if (!customerPhone || customerPhone.replace(/\D/g, "").length < 9) {
      return NextResponse.json({ error: "Please provide a valid WhatsApp phone number." }, { status: 400 });
    }

    const orderNumber = generateOrderNumber();

    const orderPayload = {
      order_number: orderNumber,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      customer_city: customerCity || null,
      customer_address: customerAddress || null,
      dress_type: dressType,
      size_preference: sizePreference,
      standard_size: standardSize,
      measurements,
      design_notes: designNotes || null,
      fabric_details: fabricDetails || null,
      color_preference: colorPreference || null,
      reference_images: referenceImages,
      status: "pending",
      quoted_price: 0,
      advance_paid: 0,
      admin_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const inserted = await supabaseAdminRequest("custom_dress_orders", {
      method: "POST",
      body: orderPayload,
      prefer: "return=representation",
    });

    const createdOrder = Array.isArray(inserted) ? inserted[0] : inserted;

    return NextResponse.json({
      success: true,
      orderNumber,
      order: createdOrder || orderPayload,
    });
  } catch (error) {
    console.error("Failed to submit custom dress order:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit custom dress order. Please try again." },
      { status: 500 }
    );
  }
}
