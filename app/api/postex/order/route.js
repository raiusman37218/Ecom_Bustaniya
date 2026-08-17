import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getCatalogProducts } from "../../../../lib/catalog";
import { supabaseAdminRequest, supabaseAdminRpc } from "../../../../lib/supabaseRest";
import { sendOrderConfirmation } from "../../../../lib/orderEmail";
import { buildShippingAddress, hasStructuredShippingAddress } from "../../../../lib/shippingAddress";
import { getCourierAdapter, postexTrackingNumberFromBooking } from "../../../../lib/courierAdapters";
import { recordShipmentState } from "../../../../lib/shipments";
import { getStoreSettings } from "../../../../lib/storeSettings";
import { calculatePaymentAmounts, normalizePaymentMethod, paymentSnapshot } from "../../../../lib/paymentRules";
import { sendMetaCapiEvent } from "../../../../lib/metaCapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHECKOUT_WINDOW_MS = 10 * 60 * 1000;
const CHECKOUT_MAX_ATTEMPTS = 8;
const DUPLICATE_ORDER_WINDOW_MS = 2 * 60 * 1000;
const checkoutAttempts = new Map();
const activeCheckoutFingerprints = new Map();

function cleanupExpiringMap(map, now = Date.now()) {
  for (const [key, value] of map.entries()) {
    if (Number(value.expiresAt || 0) <= now) map.delete(key);
  }
}

function checkoutClientKey(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  return forwardedFor.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

function isCheckoutRateLimited(key) {
  const now = Date.now();
  cleanupExpiringMap(checkoutAttempts, now);
  const current = checkoutAttempts.get(key);
  if (!current || current.expiresAt <= now) {
    checkoutAttempts.set(key, { count: 1, expiresAt: now + CHECKOUT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  checkoutAttempts.set(key, current);
  return current.count > CHECKOUT_MAX_ATTEMPTS;
}

async function ensureOrderItems(orderId, items) {
  if (!orderId || !items.length) return;
  const existing = await supabaseAdminRequest(
    `order_items?select=id&order_id=eq.${encodeURIComponent(orderId)}&limit=1`
  );
  if (existing?.length) return;

  // Older Bustaniya databases use price_pkr while newer ones use
  // unit_price_pkr/line_total_pkr. Keep checkout compatible with both instead
  // of letting an optional reporting field reject the entire customer order.
  let rows = items.map((item) => {
    const unitPrice = Number(item.price || 0);
    const quantity = Number(item.quantity || 1);
    return {
      order_id: orderId,
      product_id: item.id,
      title: item.name,
      price_pkr: unitPrice,
      unit_price_pkr: unitPrice,
      quantity,
      line_total_pkr: unitPrice * quantity,
      size: item.size || null,
      color: item.color || null,
      image_url: item.image || null,
    };
  });

  for (let attempt = 0; attempt < 12 && rows[0] && Object.keys(rows[0]).length; attempt += 1) {
    try {
      await supabaseAdminRequest("order_items", {
        method: "POST",
        prefer: "return=minimal",
        body: rows,
      });
      return;
    } catch (error) {
      const column = removableColumnFromError(error);
      if (!column || !(column in rows[0])) throw error;
      rows = rows.map(({ [column]: _unsupported, ...supportedRow }) => supportedRow);
    }
  }

  throw new Error("Unable to save order items with the available order item schema.");
}

function normalizePhone(value = "") {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits || String(value).trim();
}

function isValidPakistanMobile(value = "") {
  return /^03\d{9}$/.test(normalizePhone(value));
}

function normalizeText(value = "") {
  return String(value).trim().toLowerCase();
}

function cleanText(value = "", maxLength = 160) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function isValidEmail(value = "") {
  const email = cleanText(value, 180);
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function removableColumnFromError(error) {
  const message = `${error?.message || ""} ${JSON.stringify(error?.details || {})}`;
  return (
    message.match(/'([^']+)' column/)?.[1] ||
    message.match(/column "([^"]+)"/)?.[1] ||
    message.match(/Could not find the '([^']+)'/)?.[1] ||
    ""
  );
}

// Checkout must remain available while a legacy project is catching up with
// optional finance/payment columns. We retain every supported value and remove
// only the exact column reported by PostgREST, rather than failing the order.
async function patchOrderWithAvailableColumns(orderId, updates) {
  let body = { ...updates };

  for (let attempt = 0; attempt < 20 && Object.keys(body).length; attempt += 1) {
    try {
      await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body,
      });
      return;
    } catch (error) {
      const column = removableColumnFromError(error);
      if (!column || !(column in body)) throw error;
      const { [column]: _unsupported, ...supportedBody } = body;
      body = supportedBody;
    }
  }
}

function makeCheckoutOrderNumber() {
  return `BST-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function createCheckoutOrderDirect({ customer, items, paymentAmounts, paymentDetails }) {
  let body = {
    order_number: makeCheckoutOrderNumber(),
    checkout_token: randomUUID(),
    // `pending` is supported by the original Bustaniya order enum. Newer
    // payment/fulfilment fields below add the more precise waiting state.
    status: "pending",
    courier_status: "pending",
    payment_method: paymentAmounts.paymentMethod,
    payment_status: "Awaiting Payment",
    payment_proof_status: "Awaiting Payment",
    order_confirmation_status: "Awaiting payment verification",
    fulfillment_status: "On hold",
    subtotal: paymentAmounts.productSubtotal,
    subtotal_pkr: paymentAmounts.productSubtotal,
    shipping_fee_pkr: paymentAmounts.deliveryCharges,
    delivery_pkr: paymentAmounts.deliveryCharges,
    total: paymentAmounts.totalOrderValue,
    total_pkr: paymentAmounts.totalOrderValue,
    product_subtotal_pkr: paymentAmounts.productSubtotal,
    delivery_charges_pkr: paymentAmounts.deliveryCharges,
    total_order_value_pkr: paymentAmounts.totalOrderValue,
    amount_payable_in_advance_pkr: paymentAmounts.amountPayableInAdvance,
    amount_payable_on_delivery_pkr: paymentAmounts.amountPayableOnDelivery,
    payment_details_snapshot: paymentDetails,
    shipping_full_name: customer.fullName,
    shipping_phone: customer.phone,
    // These are the established live-order fields. Keep shipping_address too
    // for newer projects; the compatibility loop below removes it when absent.
    shipping_line1: customer.address,
    shipping_line2: customer.landmark || "",
    shipping_address: customer.address,
    shipping_city: customer.city,
    shipping_region: "",
    shipping_country: "Pakistan",
    shipping_postal_code: customer.postalCode || "",
    guest_name: customer.fullName,
    guest_phone: customer.phone,
    customer_email: customer.email || "",
    guest_email: customer.email || "",
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: Number(item.price || 0),
      size: item.size || null,
      color: item.color || null,
    })),
    notes: [
      "Checkout payment verification pending.",
      `Method: ${paymentAmounts.paymentMethod === "full_advance" ? "Full advance payment" : "COD delivery charges in advance"}.`,
      `Product subtotal: Rs. ${paymentAmounts.productSubtotal}.`,
      `Delivery charges: Rs. ${paymentAmounts.deliveryCharges}.`,
      `Pay now: Rs. ${paymentAmounts.amountPayableInAdvance}.`,
      `Pay on delivery: Rs. ${paymentAmounts.amountPayableOnDelivery}.`,
    ].join(" "),
    internal_notes: [
      "Checkout payment verification pending.",
      `Method: ${paymentAmounts.paymentMethod === "full_advance" ? "Full advance payment" : "COD delivery charges in advance"}.`,
      `Product subtotal: Rs. ${paymentAmounts.productSubtotal}.`,
      `Delivery charges: Rs. ${paymentAmounts.deliveryCharges}.`,
      `Pay now: Rs. ${paymentAmounts.amountPayableInAdvance}.`,
      `Pay on delivery: Rs. ${paymentAmounts.amountPayableOnDelivery}.`,
    ].join(" "),
  };

  // Bustaniya has evolved through several order schemas. This inserts all
  // current checkout data, then gracefully removes only fields not yet present
  // in an older live database instead of abandoning the customer order.
  for (let attempt = 0; attempt < 35; attempt += 1) {
    try {
      const rows = await supabaseAdminRequest("orders?select=*", {
        method: "POST",
        prefer: "return=representation",
        body,
      });
      const order = rows?.[0];
      if (!order?.id) throw new Error("Order was not saved.");
      return {
        order_id: order.id,
        order_number: order.order_number || body.order_number,
        checkout_token: order.checkout_token || body.checkout_token,
        total: Number(order.total_pkr ?? order.total ?? paymentAmounts.totalOrderValue),
        items,
        direct: true,
      };
    } catch (error) {
      const column = removableColumnFromError(error);
      if (!column || !(column in body)) throw error;
      const { [column]: _unsupported, ...supportedBody } = body;
      body = supportedBody;
    }
  }

  throw new Error("Unable to save checkout order with the available order schema.");
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

function checkoutFingerprint({ phone, city, paymentMethod, items }) {
  const itemKey = items
    .map((item) => [
      item.articleNumber || item.sku || item.id,
      item.quantity,
      item.size || "",
      item.color || "",
    ].join(":"))
    .sort()
    .join("|");
  return `${normalizePhone(phone)}|${normalizeText(city)}|${paymentMethod}|${itemKey}`;
}

export async function POST(request) {
  let reservedOrder = null;
  let duplicateKey = "";
  let keepDuplicateGuard = false;

  try {
    const clientKey = checkoutClientKey(request);
    if (isCheckoutRateLimited(clientKey)) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

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
    const paymentMethod = normalizePaymentMethod(body?.paymentMethod);
    if (paymentMethod === "cod" && paymentSettings.codEnabled === false) {
      return NextResponse.json({ error: "Cash on Delivery is not available right now." }, { status: 400 });
    }
    if (paymentMethod === "full_advance" && paymentSettings.manualTransferEnabled === false) {
      return NextResponse.json({ error: "Full advance payment is not available right now." }, { status: 400 });
    }
    const phone = cleanText(customer.phone, 40);
    const courierPhone = normalizePhone(phone);
    const fullName = cleanText(customer.fullName || `${customer.firstName || ""} ${customer.lastName || ""}`, 120);
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
      email: cleanText(customer.email, 180),
      city: cleanText(customer.city, 80),
      postalCode: cleanText(customer.postalCode, 30),
      checkoutAttemptId: cleanText(body?.checkoutAttemptId || body?.clientRequestId, 80),
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
    if (!isValidPakistanMobile(courierPhone)) {
      return NextResponse.json(
        { error: "Please enter a valid Pakistani mobile number, for example 03XXXXXXXXX." },
        { status: 400 }
      );
    }
    if (!isValidEmail(normalizedCustomer.email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address or leave it blank." },
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
    const paymentAmounts = calculatePaymentAmounts({
      subtotal: cartTotalBeforeDelivery,
      paymentMethod,
      paymentSettings,
    });
    const paymentDetails = paymentSnapshot(paymentSettings);
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

    cleanupExpiringMap(activeCheckoutFingerprints);
    duplicateKey = checkoutFingerprint({
      phone: courierPhone,
      city: normalizedCustomer.city,
      paymentMethod,
      items: verifiedItems,
    });
    const duplicate = activeCheckoutFingerprints.get(duplicateKey);
    if (duplicate) {
      return NextResponse.json(
        duplicate.order
          ? { ...duplicate.order, duplicate: true }
          : { error: "This order is already being placed. Please wait a moment." },
        { status: duplicate.order ? 200 : 409 }
      );
    }
    activeCheckoutFingerprints.set(duplicateKey, { expiresAt: Date.now() + DUPLICATE_ORDER_WINDOW_MS });

    try {
      reservedOrder = await supabaseAdminRpc("create_checkout_order", {
        p_customer: normalizedCustomer,
        p_items: verifiedItems.map((item) => ({
          article_number: item.articleNumber,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
      });
    } catch (rpcError) {
      console.error("Checkout reservation RPC unavailable; using direct order fallback", {
        message: rpcError?.message,
        status: rpcError?.status,
      });
      reservedOrder = await createCheckoutOrderDirect({
        customer: normalizedCustomer,
        items: verifiedItems,
        paymentAmounts,
        paymentDetails,
      });
    }
    await ensureOrderItems(reservedOrder.order_id, verifiedItems);

    // Keep every amount as an immutable order snapshot. The browser never
    // supplies these values; they are calculated only from verified catalog
    // prices and the active payment settings on the server.
    await patchOrderWithAvailableColumns(reservedOrder.order_id, {
        payment_method: paymentAmounts.paymentMethod,
        // The established Bustaniya schema uses these three columns for its
        // finance totals. Update them explicitly so the immutable checkout
        // snapshot never falls back to the historic Rs. 200 delivery rule.
        subtotal_pkr: paymentAmounts.productSubtotal,
        shipping_fee_pkr: paymentAmounts.deliveryCharges,
        total_pkr: paymentAmounts.totalOrderValue,
        payment_status: "Awaiting Payment",
        payment_proof_status: "Awaiting Payment",
        order_confirmation_status: "Awaiting payment verification",
        product_subtotal_pkr: paymentAmounts.productSubtotal,
        delivery_charges_pkr: paymentAmounts.deliveryCharges,
        total_order_value_pkr: paymentAmounts.totalOrderValue,
        amount_payable_in_advance_pkr: paymentAmounts.amountPayableInAdvance,
        amount_payable_on_delivery_pkr: paymentAmounts.amountPayableOnDelivery,
        payment_details_snapshot: paymentDetails,
        fulfillment_status: "On hold",
        status: "pending",
        courier_status: "pending",
        // Older Bustaniya schemas already have internal notes. Retain the
        // payment snapshot there too when the newer dedicated columns are not
        // installed, so the admin still has a complete verification record.
        internal_notes: [
          "Checkout payment verification pending.",
          `Method: ${paymentAmounts.paymentMethod === "full_advance" ? "Full advance payment" : "COD delivery charges in advance"}.`,
          `Product subtotal: Rs. ${paymentAmounts.productSubtotal}.`,
          `Delivery charges: Rs. ${paymentAmounts.deliveryCharges}.`,
          `Pay now: Rs. ${paymentAmounts.amountPayableInAdvance}.`,
          `Pay on delivery: Rs. ${paymentAmounts.amountPayableOnDelivery}.`,
        ].join(" "),
        notes: [
          "Checkout payment verification pending.",
          `Method: ${paymentAmounts.paymentMethod === "full_advance" ? "Full advance payment" : "COD delivery charges in advance"}.`,
          `Product subtotal: Rs. ${paymentAmounts.productSubtotal}.`,
          `Delivery charges: Rs. ${paymentAmounts.deliveryCharges}.`,
          `Pay now: Rs. ${paymentAmounts.amountPayableInAdvance}.`,
          `Pay on delivery: Rs. ${paymentAmounts.amountPayableOnDelivery}.`,
        ].join(" "),
      });

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
    const userAgent = request.headers.get("user-agent") || "";
    const cookieFbp = request.cookies?.get?.("_fbp")?.value || "";
    const cookieFbc = request.cookies?.get?.("_fbc")?.value || "";

    const orderNumber = reservedOrder.order_number;
    const orderId = reservedOrder.order_id;
    const orderTotalVal = Number(paymentAmounts.totalOrderValue || reservedOrder.total || 0);

    // Send Server-Side Meta CAPI Purchase event immediately upon order creation.
    // Uses the exact same order_number as eventId so the browser's fbq Purchase event is deduplicated by Meta.
    sendMetaCapiEvent({
      eventName: "Purchase",
      eventId: orderNumber || orderId,
      eventSourceUrl: "https://bustaniya.com/checkout",
      userData: {
        phone: normalizedCustomer.phone,
        email: normalizedCustomer.email,
        firstName: normalizedCustomer.firstName,
        lastName: normalizedCustomer.lastName,
        city: normalizedCustomer.city,
        state: normalizedCustomer.state || normalizedCustomer.province,
        country: "pk",
        externalId: orderNumber || orderId,
        fbp: cookieFbp || undefined,
        fbc: cookieFbc || undefined,
      },
      customData: {
        value: orderTotalVal,
        currency: "PKR",
        orderId: orderNumber || orderId,
        contentIds: verifiedItems.map((item) => String(item.articleNumber || item.productId || item.id || "")),
        contents: verifiedItems.map((item) => ({
          id: String(item.articleNumber || item.productId || item.id || ""),
          quantity: Number(item.quantity || 1),
          item_price: Number(item.price || 0),
        })),
        numItems: verifiedItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
      },
      clientIp,
      userAgent,
      triggeredBy: "server",
    }).catch((capiErr) => {
      console.error("Meta CAPI Purchase event error:", capiErr);
    });

    // Send order confirmation email asynchronously
    sendOrderConfirmation({
      customer: normalizedCustomer,
      order: {
        id: orderId,
        order_number: orderNumber,
        total: orderTotalVal,
        subtotal: paymentAmounts.productSubtotal,
        delivery: paymentAmounts.deliveryCharges,
        payment_method: paymentAmounts.paymentMethod,
        payment_status: "Awaiting Payment",
      },
      trackingNumber: "",
      items: verifiedItems,
    }).catch((emailError) => {
      console.error("Order confirmation email failed", {
        message: emailError?.message,
      });
    });

    const responseBody = {
      success: true,
      orderRef: orderNumber,
      order_number: orderNumber,
      orderId: orderId,
      id: orderId,
      trackingNumber: "",
      paymentMethod: paymentAmounts.paymentMethod,
      paymentStatus: "Awaiting Payment",
      productSubtotal: paymentAmounts.productSubtotal,
      deliveryCharges: paymentAmounts.deliveryCharges,
      totalOrderValue: paymentAmounts.totalOrderValue,
      total: paymentAmounts.totalOrderValue,
      amountPayableInAdvance: paymentAmounts.amountPayableInAdvance,
      amountPayableOnDelivery: paymentAmounts.amountPayableOnDelivery,
      postexCollectionAmount: paymentAmounts.courierCollectionAmount,
      paymentDetails,
      courierBooked: false,
      courierMessage: "Courier booking will start after payment verification.",
      emailSent: true,
      items: verifiedItems,
      order: {
        id: orderId,
        order_number: orderNumber,
        orderRef: orderNumber,
        total: paymentAmounts.totalOrderValue,
        subtotal: paymentAmounts.productSubtotal,
        deliveryCharges: paymentAmounts.deliveryCharges,
        amountPayableInAdvance: paymentAmounts.amountPayableInAdvance,
        amountPayableOnDelivery: paymentAmounts.amountPayableOnDelivery,
        paymentMethod: paymentAmounts.paymentMethod,
        paymentStatus: "Awaiting Payment",
        customer: normalizedCustomer,
        items: verifiedItems,
      },
    };

    activeCheckoutFingerprints.set(duplicateKey, {
      expiresAt: Date.now() + DUPLICATE_ORDER_WINDOW_MS,
      order: responseBody,
    });
    keepDuplicateGuard = true;
    reservedOrder = null;
    return NextResponse.json(responseBody);
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
  } finally {
    if (duplicateKey && !keepDuplicateGuard) {
      activeCheckoutFingerprints.delete(duplicateKey);
    }
  }
}
