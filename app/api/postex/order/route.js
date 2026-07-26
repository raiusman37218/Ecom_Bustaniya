import { NextResponse } from "next/server";
import { getCatalogProducts } from "../../../../lib/catalog";
import { supabaseAdminRequest, supabaseAdminRpc } from "../../../../lib/supabaseRest";
import { sendOrderConfirmation } from "../../../../lib/orderEmail";
import { buildShippingAddress, hasStructuredShippingAddress } from "../../../../lib/shippingAddress";
import { getCourierAdapter, postexTrackingNumberFromBooking } from "../../../../lib/courierAdapters";
import { recordShipmentState } from "../../../../lib/shipments";
import { getStoreSettings } from "../../../../lib/storeSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureOrderItems(orderId, items) {
  if (!orderId || !items.length) return;
  const existing = await supabaseAdminRequest(
    `order_items?select=id&order_id=eq.${encodeURIComponent(orderId)}&limit=1`
  );
  if (existing?.length) return;
  await supabaseAdminRequest("order_items", {
    method: "POST",
    prefer: "return=minimal",
    body: items.map((item) => ({
      order_id: orderId,
      product_id: item.id,
      title: item.name,
      unit_price_pkr: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      line_total_pkr: Number(item.price || 0) * Number(item.quantity || 1),
      size: item.size || null,
      color: item.color || null,
      image_url: item.image || null,
    })),
  });
}

function normalizePhone(value = "") {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits || String(value).trim();
}

function normalizeText(value = "") {
  return String(value).trim().toLowerCase();
}

function legacyArticleNumber(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return "";
  return `BST-${String(numericId).padStart(4, "0")}`;
}

function findCatalogProduct(products, requested) {
  const requestedId = String(requested.id || "");
  const requestedArticle = String(
    requested.articleNumber ||
    requested.article_number ||
    requested.sku ||
    legacyArticleNumber(requested.id)
  );
  const requestedName = normalizeText(requested.name);

  return products.find((item) =>
    String(item.id) === requestedId ||
    String(item.articleNumber || "") === requestedArticle ||
    String(item.sku || "") === requestedArticle ||
    (requestedName && normalizeText(item.name) === requestedName)
  );
}

function publicError(error) {
  const message = error?.message || "";
  if (message.includes("OUT_OF_STOCK")) return message.replace("OUT_OF_STOCK: ", "");
  if (message.includes("Insufficient stock")) return message;
  if (message.includes("Product unavailable")) return message;
  if (message.includes("delivery details")) return "Please complete your delivery details.";
  if (message.includes("Cart is empty")) return "Your cart is empty.";
  return "Unable to place your order right now. Please try again.";
}

async function completeManualCourierOrder(reservedOrder, reason) {
  const manualTrackingNumber = `MANUAL-${reservedOrder.order_number}`;
  const completedOrder = await supabaseAdminRpc("complete_postex_booking", {
    p_order_id: reservedOrder.order_id,
    p_checkout_token: reservedOrder.checkout_token,
    p_tracking_number: manualTrackingNumber,
    p_response: {
      manual: true,
      reason,
      message: "Order accepted without automatic courier booking.",
    },
  });

  return {
    completedOrder,
    trackingNumber: manualTrackingNumber,
  };
}

export async function POST(request) {
  let reservedOrder = null;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid checkout request." },
        { status: 400 }
      );
    }
    const customer = body?.customer || {};
    const requestedItems = Array.isArray(body?.items) ? body.items : [];
    const settings = await getStoreSettings();
    const paymentSettings = settings.paymentSettings || {};
    const paymentMethod = body?.paymentMethod === "bank_deposit" ? "bank_deposit" : "cod";
    if (paymentMethod === "cod" && paymentSettings.codEnabled === false) {
      return NextResponse.json({ error: "Cash on Delivery is not available right now." }, { status: 400 });
    }
    if (paymentMethod === "bank_deposit" && paymentSettings.manualTransferEnabled === false) {
      return NextResponse.json({ error: "Manual transfer is not available right now." }, { status: 400 });
    }
    const phone = String(customer.phone || "").trim();
    const courierPhone = normalizePhone(phone);
    const fullName = String(customer.fullName || `${customer.firstName || ""} ${customer.lastName || ""}`).trim();
    const [firstName, ...lastNameParts] = fullName.split(/\s+/);
    const lastName = lastNameParts.join(" ") || "-";
    const deliveryAddress = buildShippingAddress(customer);
    const hasAnyStructuredAddress = [customer.houseNo, customer.street, customer.block, customer.landmark]
      .some((value) => Boolean(String(value || "").trim()));
    const hasValidAddress = hasAnyStructuredAddress
      ? hasStructuredShippingAddress(customer)
      : Boolean(customer.address?.trim());
    const normalizedCustomer = {
      ...customer,
      address: deliveryAddress,
      firstName,
      lastName,
      phone,
      paymentMethod,
    };

    if (
      !fullName ||
      !hasValidAddress ||
      !deliveryAddress ||
      !customer.city?.trim() ||
      !phone ||
      requestedItems.length === 0
    ) {
      return NextResponse.json(
        { error: "Please provide valid delivery details and cart items." },
        { status: 400 }
      );
    }

    const products = await getCatalogProducts();
    const verifiedItems = requestedItems.map((requested) => {
      const product = findCatalogProduct(products, requested);
      const quantity = Math.min(Math.max(Number(requested.quantity) || 1, 1), 20);
      if (!product) throw new Error("INVALID_PRODUCT");
      const availableStock = Number(product.stock || 0);
      if (availableStock <= 0) {
        throw new Error(`OUT_OF_STOCK: ${product.name} is out of stock.`);
      }
      if (quantity > availableStock) {
        throw new Error(`OUT_OF_STOCK: Only ${availableStock} unit${availableStock === 1 ? "" : "s"} of ${product.name} are available.`);
      }
      return {
        ...product,
        quantity,
        articleNumber: product.articleNumber || `BST-${String(product.id).padStart(4, "0")}`,
        size: requested.size || null,
        color: requested.color || null,
      };
    });

    const cartTotalBeforeDelivery = verifiedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
    if (paymentMethod === "cod") {
      const minOrder = Number(paymentSettings.codMinOrderPkr || 0);
      const maxOrder = Number(paymentSettings.codMaxOrderPkr || 0);
      if (minOrder > 0 && cartTotalBeforeDelivery < minOrder) {
        return NextResponse.json({ error: `COD is available from Rs. ${minOrder.toLocaleString()} and above.` }, { status: 400 });
      }
      if (maxOrder > 0 && cartTotalBeforeDelivery > maxOrder) {
        return NextResponse.json({ error: `COD is available up to Rs. ${maxOrder.toLocaleString()}. Please select advance payment.` }, { status: 400 });
      }
    }

    reservedOrder = await supabaseAdminRpc("create_checkout_order", {
      p_customer: normalizedCustomer,
      p_items: verifiedItems.map((item) => ({
        article_number: item.articleNumber,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
    });
    await ensureOrderItems(reservedOrder.order_id, verifiedItems);

    const postexCollectionAmount = paymentMethod === "bank_deposit" ? 0 : Number(reservedOrder.total);
    const courier = await getCourierAdapter("postex");
    const courierConfigured = courier.configured;

    const postexPayload = {
      orderRefNumber: reservedOrder.order_number,
      invoicePayment: String(postexCollectionAmount),
      orderDetail: verifiedItems
        .map((item) => `${item.name} x${item.quantity}`)
        .join(", ")
        .slice(0, 500),
      customerName: fullName,
      customerPhone: courierPhone,
      deliveryAddress,
      transactionNotes: [
        paymentMethod === "bank_deposit"
          ? "Payment: Bank deposit / advance - collect Rs. 0"
          : "Payment: Cash on Delivery",
        customer.email?.trim() ? `Email: ${customer.email.trim()}` : "",
        customer.postalCode?.trim()
          ? `Postal code: ${customer.postalCode.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join(" | "),
      cityName: customer.city.trim(),
      invoiceDivision: 1,
      items: reservedOrder.items,
      orderType: "Normal",
      pickupAddressCode: courier.pickupAddressCode,
    };

    let completedOrder;
    let trackingNumber;
    let courierBooked = false;
    let courierMessage = "";

    if (courierConfigured) {
      let postexResult;
      try {
        postexResult = await courier.createShipment(postexPayload);
      } catch (courierError) {
        courierMessage = courierError.message;
      }

      trackingNumber = postexTrackingNumberFromBooking(postexResult);

      if (trackingNumber) {
        completedOrder = await supabaseAdminRpc("complete_postex_booking", {
          p_order_id: reservedOrder.order_id,
          p_checkout_token: reservedOrder.checkout_token,
          p_tracking_number: trackingNumber,
          p_response: postexResult,
        });
        await recordShipmentState({ orderId: reservedOrder.order_id, courier, trackingNumber, rawStatus: postexResult?.dist?.transactionStatus || "Booked", serviceType: paymentMethod === "bank_deposit" ? "prepaid" : "COD" });
        courierBooked = true;
      } else {
        courierMessage =
          courierMessage ||
          postexResult?.statusMessage ||
          "PostEx booking did not return a tracking number.";
      }
    } else {
      courierMessage = "PostEx API token is missing on this server.";
    }

    if (!completedOrder) {
      const manualOrder = await completeManualCourierOrder(reservedOrder, courierMessage);
      completedOrder = manualOrder.completedOrder;
      trackingNumber = manualOrder.trackingNumber;
      await recordShipmentState({ orderId: reservedOrder?.order_id, trackingNumber, rawStatus: "Manual delivery", serviceType: paymentMethod === "bank_deposit" ? "prepaid" : "COD", manual: true });
    }

    reservedOrder = null;

    const emailSent = await sendOrderConfirmation({
      customer: normalizedCustomer,
      order: completedOrder,
      trackingNumber,
      items: verifiedItems,
    }).catch((emailError) => {
      console.error("Order confirmation email failed", {
        message: emailError?.message,
      });
      return false;
    });

    return NextResponse.json({
      success: true,
      orderRef: completedOrder.order_number,
      trackingNumber: completedOrder.tracking_number,
      total: Number(completedOrder.total),
      paymentMethod,
      postexCollectionAmount,
      courierBooked,
      courierMessage,
      emailSent,
    });
  } catch (error) {
    if (reservedOrder) {
      await supabaseAdminRpc("release_checkout_order", {
        p_order_id: reservedOrder.order_id,
        p_checkout_token: reservedOrder.checkout_token,
        p_error: error.message,
      }).catch(() => {});
    }

    if (error?.message === "INVALID_PRODUCT") {
      return NextResponse.json(
        { error: "One or more cart products are invalid." },
        { status: 400 }
      );
    }
    if (error?.message?.includes("OUT_OF_STOCK")) {
      return NextResponse.json(
        { error: publicError(error) },
        { status: 400 }
      );
    }

    console.error("Checkout order error", {
      message: error?.message,
      details: error?.details,
    });
    return NextResponse.json({ error: publicError(error) }, { status: 500 });
  }
}
