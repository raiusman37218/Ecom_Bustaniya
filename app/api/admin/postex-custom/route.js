import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../../lib/adminAuth";
import { getCatalogProducts } from "../../../../lib/catalog";
import { supabaseAdminRequest, supabaseAdminRpc } from "../../../../lib/supabaseRest";
import { getCourierAdapter, postexTrackingNumberFromBooking } from "../../../../lib/courierAdapters";
import { recordShipmentState } from "../../../../lib/shipments";

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
      product_id: item.product_id || item.id || null,
      title: item.product_name || item.name || "Product",
      unit_price_pkr: Number(item.unit_price_pkr || 0),
      quantity: Number(item.quantity || 1),
      line_total_pkr: Number(item.total_pkr || 0),
      size: item.size || null,
      color: item.color || null,
      image_url: item.image_url || null,
    })),
  });
}

function normalizePhone(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits || String(value || "").trim();
}

function isValidPakistanMobile(value = "") {
  return /^03\d{9}$/.test(normalizePhone(value));
}

function validationError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function postexErrorMessage(result, status) {
  if (!result) return `PostEx HTTP ${status || "unavailable"}`;
  const parts = [
    result.statusMessage,
    result.message,
    result.error,
    result?.dist?.message,
    Array.isArray(result.errors) ? result.errors.join(", ") : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : `PostEx HTTP ${status}`;
}

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function legacyArticleNumber(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return "";
  return `BST-${String(numericId).padStart(4, "0")}`;
}

function resolveCatalogProduct(products, item) {
  const requestedId = String(item.productId || item.id || "");
  const requestedSku = String(item.articleNumber || item.article_number || item.sku || legacyArticleNumber(item.id));
  const requestedName = normalizeText(item.name);

  return products.find((product) =>
    String(product.id) === requestedId ||
    String(product.articleNumber || "") === requestedSku ||
    String(product.sku || "") === requestedSku ||
    (requestedName && normalizeText(product.name) === requestedName)
  );
}

function makeCustomOrderNumber() {
  return `BST-${Date.now().toString().slice(-6)}`;
}

function normalizeMoney(value, fallback = 0) {
  const amount = Number(value ?? fallback);
  if (!Number.isFinite(amount) || amount < 0 || amount > 10000000) {
    throw validationError("Order item price must be a valid amount.");
  }
  return amount;
}

function limitText(value = "", max = 500) {
  return String(value || "").trim().slice(0, max);
}

function normalizeCustomItems(items, products) {
  if (!items.length) throw validationError("Add at least one order item.");
  if (items.length > 25) throw validationError("A custom order can contain up to 25 line items.");
  return items.map((item, index) => {
    const product = resolveCatalogProduct(products, item);
    const quantity = Number(item.quantity || 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw validationError("Each order item quantity must be between 1 and 20.");
    }
    const price = product ? Number(product.price || 0) : normalizeMoney(item.price, 0);
    const articleNumber =
      product?.articleNumber ||
      item.articleNumber ||
      item.article_number ||
      item.sku ||
      `CUSTOM-${String(index + 1).padStart(2, "0")}`;

    return {
      id: product?.id || item.productId || item.id || `custom-${index + 1}`,
      product_id: product?.id || item.productId || null,
      product_name: product?.name || limitText(item.name, 120) || "Custom item",
      name: product?.name || limitText(item.name, 120) || "Custom item",
      article_number: articleNumber,
      sku: articleNumber,
      quantity,
      unit_price_pkr: price,
      price,
      total_pkr: price * quantity,
      size: item.size ? limitText(item.size, 60) : null,
      color: item.color ? limitText(item.color, 60) : null,
      custom: !product,
    };
  });
}

function removableColumnFromError(error) {
  const details = JSON.stringify(error?.details || {});
  const message = `${error?.message || ""} ${details}`;
  return (
    message.match(/'([^']+)' column/)?.[1] ||
    message.match(/column "([^"]+)"/)?.[1] ||
    message.match(/Could not find the '([^']+)'/)?.[1] ||
    ""
  );
}

async function createCustomOrderDirect(record) {
  let body = { ...record };

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const rows = await supabaseAdminRequest("orders?select=*", {
        method: "POST",
        prefer: "return=representation",
        body,
      });
      return rows?.[0];
    } catch (error) {
      const column = removableColumnFromError(error);
      if (!column || !(column in body)) throw error;
      const { [column]: _removed, ...nextBody } = body;
      body = nextBody;
    }
  }

  throw new Error("Unable to save custom order with the available orders schema.");
}

async function patchCustomOrder(orderId, updates) {
  if (!orderId) return null;
  let body = { ...updates };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const rows = await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(orderId)}&select=*`, {
        method: "PATCH",
        prefer: "return=representation",
        body,
      });
      return rows?.[0] || null;
    } catch (error) {
      const column = removableColumnFromError(error);
      if (!column || !(column in body)) throw error;
      const { [column]: _removed, ...nextBody } = body;
      body = nextBody;
    }
  }

  return null;
}

export async function POST(request) {
  let reservedOrder = null;

  try {
    await authorizeAdminRequest(request, "orders");

    const body = await request.json().catch(() => null);
    const customer = body?.customer || {};
    const items = Array.isArray(body?.items) ? body.items : [];
    const shouldBookPostex = Boolean(body?.bookPostex);
    if (!customer.name?.trim() || !customer.phone?.trim() || !customer.address?.trim() || !customer.city?.trim() || !items.length) {
      return NextResponse.json({ error: "Please complete customer, address and item details before saving the order." }, { status: 400 });
    }
    if (String(customer.name || "").trim().length > 120) {
      throw validationError("Customer name is too long.");
    }
    if (String(customer.address || "").trim().length > 500) {
      throw validationError("Delivery address is too long.");
    }
    if (String(customer.city || "").trim().length > 80) {
      throw validationError("City name is too long.");
    }

    const products = await getCatalogProducts();
    const customItems = normalizeCustomItems(items, products);
    const paymentMethod = body?.paymentStatus === "Paid" ? "bank_deposit" : "cod";
    const productSubtotal = normalizeMoney(
      customItems.reduce((sum, item) => sum + Number(item.total_pkr || 0), 0)
    );
    const deliveryFee = 200;
    const total = normalizeMoney(productSubtotal + deliveryFee);
    const orderNumber = makeCustomOrderNumber();
    const allItemsInCatalog = customItems.every((item) => !item.custom);
    let completedOrder;
    const courierPhone = normalizePhone(customer.phone);
    if (!isValidPakistanMobile(courierPhone)) {
      throw validationError("Please enter a valid Pakistani mobile number, for example 03XXXXXXXXX.");
    }

    const rawOrderId = String(body?.orderId || body?.orderRef || "").trim();
    const cleanOrderId = rawOrderId.replace(/^#/, "").trim();
    let existingOrder = null;

    if (cleanOrderId) {
      try {
        const rowsById = await supabaseAdminRequest(`orders?select=*&id=eq.${encodeURIComponent(cleanOrderId)}&limit=1`).catch(() => []);
        if (rowsById?.[0]) {
          existingOrder = rowsById[0];
        } else {
          const rowsByNumber = await supabaseAdminRequest(`orders?select=*&order_number=eq.${encodeURIComponent(cleanOrderId)}&limit=1`).catch(() => []);
          if (rowsByNumber?.[0]) {
            existingOrder = rowsByNumber[0];
          } else if (rawOrderId) {
            const rowsByRaw = await supabaseAdminRequest(`orders?select=*&order_number=eq.${encodeURIComponent(rawOrderId)}&limit=1`).catch(() => []);
            if (rowsByRaw?.[0]) existingOrder = rowsByRaw[0];
          }
        }
      } catch {}
    }

    if (existingOrder) {
      completedOrder = existingOrder;
    } else if (allItemsInCatalog) {
      const [firstName, ...lastNameParts] = customer.name.trim().split(/\s+/);
      reservedOrder = await supabaseAdminRpc("create_checkout_order", {
        p_customer: {
          firstName,
          lastName: lastNameParts.join(" ") || "-",
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          email: "",
          postalCode: "",
          paymentMethod,
        },
        p_items: customItems.map((item) => ({
          article_number: item.article_number,
          quantity: item.quantity,
          size: item.size || null,
          color: item.color || null,
        })),
      });
      await ensureOrderItems(reservedOrder.order_id, customItems);
      completedOrder = {
        id: reservedOrder.order_id,
        order_number: reservedOrder.order_number,
        total_pkr: reservedOrder.total,
        total: reservedOrder.total,
        items: reservedOrder.items || customItems,
      };
    } else {
      completedOrder = await createCustomOrderDirect({
        order_number: orderNumber,
        checkout_token: randomUUID(),
        status: body?.status || "custom_order",
        payment_status: body?.paymentStatus || "COD pending",
        payment_method: paymentMethod,
        fulfillment_status: shouldBookPostex ? "PostEx booking pending" : "Manual delivery",
        subtotal: productSubtotal,
        subtotal_pkr: productSubtotal,
        delivery: deliveryFee,
        delivery_pkr: deliveryFee,
        total,
        total_pkr: total,
        shipping_full_name: customer.name.trim(),
        shipping_phone: customer.phone.trim(),
        shipping_address: customer.address.trim(),
        shipping_city: customer.city.trim(),
        shipping_postal_code: "",
        guest_name: customer.name.trim(),
        guest_phone: customer.phone.trim(),
        customer_email: "",
        guest_email: "",
        items: customItems,
        tags: ["Custom order", body?.source, body?.deliveryMethod].filter(Boolean),
        internal_notes: limitText(body?.notes, 2000),
      });
    }

    const postexCollectionAmount = paymentMethod === "bank_deposit" ? 0 : Number(reservedOrder?.total ?? total);
    const postexItems = reservedOrder?.items || customItems.map((item) => ({
      name: item.name || "Custom item",
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
    }));

    const courier = await getCourierAdapter("postex");
    const payload = {
      orderRefNumber: completedOrder.order_number || orderNumber,
      invoicePayment: String(postexCollectionAmount),
      orderDetail: customItems
        .map((item) => `${item.name || "Custom item"} x${Number(item.quantity || 1)}`)
        .join(", ")
        .slice(0, 500),
      customerName: customer.name.trim(),
      customerPhone: courierPhone,
      deliveryAddress: customer.address.trim(),
      transactionNotes: [
        body?.paymentStatus ? `Payment: ${body.paymentStatus}` : "Payment: COD pending",
        body?.source ? `Source: ${body.source}` : "Source: Custom order",
        body?.notes ? `Notes: ${limitText(body.notes, 300)}` : "",
      ].filter(Boolean).join(" | "),
      cityName: customer.city.trim(),
      invoiceDivision: 1,
      items: postexItems,
      orderType: "Normal",
      pickupAddressCode: courier.pickupAddressCode,
    };

    let trackingNumber = `MANUAL-${completedOrder.order_number || orderNumber}`;
    let courierStatus = body?.status || "Un-Assigned By Me";
    let postexResponse = {
      manual: true,
      deliveryMethod: body?.deliveryMethod || "Manual",
      source: body?.source || "Custom order",
    };
    let courierBooked = false;
    let courierMessage = "";

    if (shouldBookPostex) {
      if (courier.configured) {
        try {
          const result = await courier.createShipment(payload);
          const postexTrackingNumber = postexTrackingNumberFromBooking(result);

          if (postexTrackingNumber) {
            trackingNumber = postexTrackingNumber;
            courierStatus = result?.dist?.transactionStatus || "Booked";
            postexResponse = result;
            courierBooked = true;
          } else {
            courierMessage = postexErrorMessage(result, 502);
            console.error("Custom PostEx booking failed", {
              status: 502,
              result,
              payload: { ...payload, customerPhone: "***" },
            });
          }
        } catch (courierError) {
          courierMessage = courierError?.message || "PostEx booking failed.";
        }
      } else {
        courierMessage = "PostEx API token is missing on this server.";
      }
    }

    if (shouldBookPostex && !courierBooked) {
      throw new Error(courierMessage || "PostEx booking failed.");
    }

    if (reservedOrder) {
      completedOrder = await supabaseAdminRpc("complete_postex_booking", {
        p_order_id: reservedOrder.order_id,
        p_checkout_token: reservedOrder.checkout_token,
        p_tracking_number: trackingNumber,
        p_response: postexResponse,
      });
      reservedOrder = null;
    } else {
      const updatedOrder = await patchCustomOrder(completedOrder.id, {
        courier_tracking_number: trackingNumber,
        tracking_number: trackingNumber,
        courier_status: courierStatus,
        fulfillment_status: courierBooked ? "Booked with PostEx" : (shouldBookPostex ? "PostEx booking failed" : "Manual delivery"),
        courier_response: postexResponse,
        postex_response: postexResponse,
        internal_notes: [body?.notes, courierMessage ? `PostEx: ${courierMessage}` : ""].filter(Boolean).join("\n"),
      }).catch(() => null);
      completedOrder = updatedOrder || { ...completedOrder, courier_tracking_number: trackingNumber, courier_status: courierStatus };
    }

    await recordShipmentState({ orderId: completedOrder?.id, courier: courierBooked ? courier : null, trackingNumber, rawStatus: courierStatus, serviceType: paymentMethod === "bank_deposit" ? "prepaid" : "COD", manual: !courierBooked });

    // Courier status is persisted above. Do not call the legacy RPC here: it
    // required a browser-supplied access key, which is no longer accepted.

    return NextResponse.json({
      success: true,
      orderRef: completedOrder.order_number,
      supabaseOrder: completedOrder,
      trackingNumber,
      courierStatus,
      courierBooked,
      courierMessage,
      postexResponse,
    });
  } catch (error) {
    if (reservedOrder) {
      await supabaseAdminRpc("release_checkout_order", {
        p_order_id: reservedOrder.order_id,
        p_checkout_token: reservedOrder.checkout_token,
        p_error: error.message,
      }).catch(() => {});
    }

    if (error?.status === 401 || error?.status === 403 || error?.status === 400 || error?.status === 422) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Custom admin order failed", {
      message: error?.message,
      status: error?.status,
      details: error?.details,
    });
    return NextResponse.json({ error: error?.message || "Unable to create PostEx booking." }, { status: 500 });
  }
}
