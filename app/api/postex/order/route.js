import { NextResponse } from "next/server";
import { getCatalogProducts } from "../../../../lib/catalog";
import { supabaseAdminRpc } from "../../../../lib/supabaseRest";
import { sendOrderConfirmation } from "../../../../lib/orderEmail";

const POSTEX_CREATE_ORDER_URL =
  "https://api.postex.pk/services/integration/api/order/v3/create-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const paymentMethod = body?.paymentMethod === "bank_deposit" ? "bank_deposit" : "cod";
    const phone = String(customer.phone || "").trim();
    const courierPhone = normalizePhone(phone);

    if (
      !customer.firstName?.trim() ||
      !customer.lastName?.trim() ||
      !customer.address?.trim() ||
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

    reservedOrder = await supabaseAdminRpc("create_checkout_order", {
      p_customer: { ...customer, phone, paymentMethod },
      p_items: verifiedItems.map((item) => ({
        article_number: item.articleNumber,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
    });

    const postexCollectionAmount = paymentMethod === "bank_deposit" ? 0 : Number(reservedOrder.total);
    const courierConfigured = Boolean(process.env.POSTEX_API_TOKEN);

    const postexPayload = {
      orderRefNumber: reservedOrder.order_number,
      invoicePayment: String(postexCollectionAmount),
      orderDetail: verifiedItems
        .map((item) => `${item.name} x${item.quantity}`)
        .join(", ")
        .slice(0, 500),
      customerName: `${customer.firstName.trim()} ${customer.lastName.trim()}`,
      customerPhone: courierPhone,
      deliveryAddress: customer.address.trim(),
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
      pickupAddressCode: process.env.POSTEX_PICKUP_ADDRESS_CODE,
    };

    let completedOrder;
    let trackingNumber;
    let courierBooked = false;
    let courierMessage = "";

    if (courierConfigured) {
      let postexResponse;
      let postexResult;
      try {
        postexResponse = await fetch(POSTEX_CREATE_ORDER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: process.env.POSTEX_API_TOKEN,
          },
          body: JSON.stringify(postexPayload),
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        });
        postexResult = await postexResponse.json().catch(() => null);
      } catch (courierError) {
        courierMessage = courierError.message;
      }

      const statusCode = Number(postexResult?.statusCode || postexResponse?.status || 0);
      trackingNumber = postexResult?.dist?.trackingNumber;

      if (postexResponse?.ok && statusCode === 200 && trackingNumber) {
        completedOrder = await supabaseAdminRpc("complete_postex_booking", {
          p_order_id: reservedOrder.order_id,
          p_checkout_token: reservedOrder.checkout_token,
          p_tracking_number: trackingNumber,
          p_response: postexResult,
        });
        courierBooked = true;
      } else {
        courierMessage =
          courierMessage ||
          postexResult?.statusMessage ||
          `PostEx HTTP ${postexResponse?.status || "unavailable"}`;
      }
    } else {
      courierMessage = "PostEx API token is missing on this server.";
    }

    if (!completedOrder) {
      const manualOrder = await completeManualCourierOrder(reservedOrder, courierMessage);
      completedOrder = manualOrder.completedOrder;
      trackingNumber = manualOrder.trackingNumber;
    }

    reservedOrder = null;

    const emailSent = await sendOrderConfirmation({
      customer,
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
