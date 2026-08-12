import { NextResponse } from "next/server";
import { getCatalogProducts } from "../../../../lib/catalog";
import { supabaseAdminRequest, supabaseAdminRpc } from "../../../../lib/supabaseRest";
import { sendOrderConfirmation } from "../../../../lib/orderEmail";
import { buildShippingAddress, hasStructuredShippingAddress } from "../../../../lib/shippingAddress";
import { getCourierAdapter, postexTrackingNumberFromBooking } from "../../../../lib/courierAdapters";
import { recordShipmentState } from "../../../../lib/shipments";
import { getStoreSettings } from "../../../../lib/storeSettings";
import { calculatePaymentAmounts, normalizePaymentMethod, paymentSnapshot } from "../../../../lib/paymentRules";

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

    // Keep every amount as an immutable order snapshot. The browser never
    // supplies these values; they are calculated only from verified catalog
    // prices and the active payment settings on the server.
    const paymentDetails = paymentSnapshot(paymentSettings);
    await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(reservedOrder.order_id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: {
        payment_method: paymentAmounts.paymentMethod,
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
        status: "Unbooked",
        courier_status: "Unbooked",
      },
    });

    const responseBody = {
      success: true,
      orderRef: reservedOrder.order_number,
      trackingNumber: "",
      paymentMethod: paymentAmounts.paymentMethod,
      paymentStatus: "Awaiting Payment",
      productSubtotal: paymentAmounts.productSubtotal,
      deliveryCharges: paymentAmounts.deliveryCharges,
      totalOrderValue: paymentAmounts.totalOrderValue,
      amountPayableInAdvance: paymentAmounts.amountPayableInAdvance,
      amountPayableOnDelivery: paymentAmounts.amountPayableOnDelivery,
      postexCollectionAmount: paymentAmounts.courierCollectionAmount,
      paymentDetails,
      courierBooked: false,
      courierMessage: "Courier booking will start after payment verification.",
      emailSent: false,
    };
    activeCheckoutFingerprints.set(duplicateKey, {
      expiresAt: Date.now() + DUPLICATE_ORDER_WINDOW_MS,
      order: responseBody,
    });
    keepDuplicateGuard = true;
    reservedOrder = null;
    return NextResponse.json(responseBody);

    const postexCollectionAmount = paymentMethod === "full_advance" ? 0 : Number(reservedOrder.total);
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
        paymentMethod === "full_advance"
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
        await recordShipmentState({ orderId: reservedOrder.order_id, courier, trackingNumber, rawStatus: postexResult?.dist?.transactionStatus || "Booked", serviceType: paymentMethod === "full_advance" ? "prepaid" : "COD" });
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
      await recordShipmentState({ orderId: reservedOrder?.order_id, trackingNumber, rawStatus: "Manual delivery", serviceType: paymentMethod === "full_advance" ? "prepaid" : "COD", manual: true });
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

    const courierResponseBody = {
      success: true,
      orderRef: completedOrder.order_number,
      trackingNumber: completedOrder.tracking_number,
      total: Number(completedOrder.total),
      paymentMethod,
      postexCollectionAmount,
      courierBooked,
      courierMessage,
      emailSent,
    };
    activeCheckoutFingerprints.set(duplicateKey, {
      expiresAt: Date.now() + DUPLICATE_ORDER_WINDOW_MS,
      order: courierResponseBody,
    });
    keepDuplicateGuard = true;

    return NextResponse.json(courierResponseBody);
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
