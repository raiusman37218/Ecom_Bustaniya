import "server-only";
import { supabaseAdminRequest } from "./supabaseRest.js";
import { insertFinanceTransactions, isMissingTableError, listFinanceAccounts } from "./financeStore.js";

const ORDER_FINANCE_COLUMNS = [
  "id", "order_number", "total_pkr", "total_order_value_pkr", "product_subtotal_pkr",
  "delivery_charges_pkr", "status", "courier_status", "payment_status", "payment_method",
  "payment_proof_status", "amount_payable_in_advance_pkr", "amount_payable_on_delivery_pkr",
  "shipping_full_name", "guest_name", "shipping_city", "shipping_phone", "guest_phone",
  "customer_email", "guest_email", "created_at", "delivered_at", "returned_at",
  "cogs_snapshot_pkr", "cogs_snapshot_at", "cogs_snapshot_breakdown",
  "advance_verified_at", "returned_restocked_at", "courier_tracking_number",
].join(",");

export function normalizeStatusText(value = "") {
  return String(value || "").toLowerCase().replaceAll("_", " ").replaceAll("-", " ").trim();
}

export function isDeliveredOrderRow(order = {}) {
  const status = `${normalizeStatusText(order.courier_status)} ${normalizeStatusText(order.status)}`;
  if (status.includes("return")) return false;
  return status.includes("deliver") || status.includes("complete");
}

export function isReturnedOrderRow(order = {}) {
  const status = `${normalizeStatusText(order.courier_status)} ${normalizeStatusText(order.status)}`;
  return status.includes("return") || status.includes("refus");
}

export function isPaymentVerified(order = {}) {
  const status = String(order.payment_proof_status || order.payment_status || "").toLowerCase();
  return status.includes("verified") || status === "paid";
}

export async function listFinanceOrders({ limit = 5000 } = {}) {
  return supabaseAdminRequest(
    `orders?select=${ORDER_FINANCE_COLUMNS}&order=created_at.desc&limit=${Math.floor(limit)}`
  );
}

export async function listOrderItemsFor(orderIds = []) {
  const ids = orderIds.map((id) => String(id)).filter(Boolean);
  if (!ids.length) return new Map();
  const rows = [];
  // PostgREST puts the filter in the URL, so a long id list has to be chunked.
  for (let index = 0; index < ids.length; index += 200) {
    const chunk = ids.slice(index, index + 200);
    const result = await supabaseAdminRequest(
      `order_items?select=order_id,product_id,product_name,article_number,quantity,unit_price_pkr,total_pkr&order_id=in.(${chunk.join(",")})`
    );
    rows.push(...(result || []));
  }
  const byOrder = new Map();
  for (const item of rows) {
    const current = byOrder.get(String(item.order_id)) || [];
    current.push(item);
    byOrder.set(String(item.order_id), current);
  }
  return byOrder;
}

// ---------------------------------------------------------------------------
// COGS snapshot
// ---------------------------------------------------------------------------

/**
 * Freezes the product cost onto the order the moment it is delivered. Without
 * this, editing a product's cost silently rewrites the profit of every order
 * that ever contained it.
 */
export async function snapshotOrderCogs(orderId, { force = false } = {}) {
  const rows = await supabaseAdminRequest(
    `orders?select=id,cogs_snapshot_pkr,cogs_snapshot_at&id=eq.${encodeURIComponent(orderId)}&limit=1`
  );
  const order = rows?.[0];
  if (!order) return null;
  if (order.cogs_snapshot_at && !force) return order;

  const items = await supabaseAdminRequest(
    `order_items?select=product_id,product_name,quantity&order_id=eq.${encodeURIComponent(orderId)}`
  );
  const productIds = [...new Set((items || []).map((item) => item.product_id).filter(Boolean))];
  const products = productIds.length
    ? await supabaseAdminRequest(
        `products?select=id,name,cost_total_pkr&id=in.(${productIds.map((id) => `"${id}"`).join(",")})`
      )
    : [];
  const costById = new Map((products || []).map((product) => [String(product.id), Number(product.cost_total_pkr || 0)]));

  const lines = (items || []).map((item) => {
    const unitCost = costById.get(String(item.product_id)) ?? 0;
    const quantity = Math.max(0, Number(item.quantity || 0));
    return {
      productId: String(item.product_id || ""),
      productName: item.product_name || "",
      quantity,
      unitCostPkr: unitCost,
      lineCostPkr: Math.round(unitCost * quantity * 100) / 100,
      costKnown: costById.has(String(item.product_id)) && unitCost > 0,
    };
  });
  const total = lines.reduce((sum, line) => sum + line.lineCostPkr, 0);
  const missingCost = lines.filter((line) => !line.costKnown).map((line) => line.productName || line.productId);

  const updated = await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    body: {
      cogs_snapshot_pkr: Math.round(total * 100) / 100,
      cogs_snapshot_at: new Date().toISOString(),
      cogs_snapshot_breakdown: { lines, missingCost },
    },
    prefer: "return=representation",
  });
  return updated?.[0] || null;
}

/**
 * Snapshots every delivered order that does not have one yet. Used once after
 * the migration, and safe to re-run.
 */
export async function backfillDeliveredOrderCogs({ limit = 2000 } = {}) {
  const orders = await supabaseAdminRequest(
    `orders?select=id,status,courier_status,cogs_snapshot_at&cogs_snapshot_at=is.null&limit=${Math.floor(limit)}`
  );
  const delivered = (orders || []).filter(isDeliveredOrderRow);
  let done = 0;
  const failed = [];
  for (const order of delivered) {
    try {
      await snapshotOrderCogs(order.id);
      done += 1;
    } catch (error) {
      failed.push({ orderId: order.id, reason: error?.message || "Snapshot failed." });
    }
  }
  return { scanned: (orders || []).length, delivered: delivered.length, snapshotted: done, failed };
}

// ---------------------------------------------------------------------------
// Customer advance receipts
// ---------------------------------------------------------------------------

async function advanceAccountId() {
  try {
    const accounts = await listFinanceAccounts();
    return accounts.find((account) => account.slug === "nayapay_amina")?.id || null;
  } catch {
    return null;
  }
}

/**
 * Turns a verified advance into real cash exactly once. The database carries a
 * partial unique index on (order_id) for source='order_advance', so a repeated
 * verification cannot double-count even if two requests race.
 */
export async function recordVerifiedAdvance(order, { actor, accountId } = {}) {
  if (!order?.id) return { recorded: false, reason: "no_order" };
  const amount = Number(order.amount_payable_in_advance_pkr || 0);
  if (!(amount > 0)) return { recorded: false, reason: "no_advance" };
  if (!isPaymentVerified(order)) return { recorded: false, reason: "not_verified" };

  const existing = await supabaseAdminRequest(
    `finance_transactions?select=id&order_id=eq.${encodeURIComponent(order.id)}&source=eq.order_advance&voided=is.false&limit=1`
  );
  if (existing?.[0]) return { recorded: false, reason: "already_recorded", id: existing[0].id };

  const customer = order.shipping_full_name || order.guest_name || "Customer";
  const reference = order.order_number ? `#${order.order_number}` : String(order.id).slice(0, 8);
  const [created] = await insertFinanceTransactions([{
    accountId: accountId || (await advanceAccountId()),
    entryType: "customer_advance",
    title: `Advance received: ${customer}`,
    category: "Customer advance",
    amountPkr: amount,
    occurredOn: (order.advance_verified_at || new Date().toISOString()).slice(0, 10),
    reference,
    counterparty: customer,
    note: "Created automatically when the advance payment was verified.",
    source: "order_advance",
    orderId: order.id,
    createdBy: actor?.name || actor?.email || "",
  }]);

  await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(order.id)}`, {
    method: "PATCH",
    body: { advance_verified_at: new Date().toISOString() },
    prefer: "return=minimal",
  }).catch(() => {});

  return { recorded: true, transaction: created };
}

export async function backfillVerifiedAdvances({ limit = 2000 } = {}) {
  const orders = await supabaseAdminRequest(
    `orders?select=id,order_number,shipping_full_name,guest_name,amount_payable_in_advance_pkr,payment_status,payment_proof_status,advance_verified_at,created_at&amount_payable_in_advance_pkr=gt.0&limit=${Math.floor(limit)}`
  );
  let recorded = 0;
  let skipped = 0;
  const failed = [];
  const accountId = await advanceAccountId();
  for (const order of orders || []) {
    try {
      const result = await recordVerifiedAdvance(
        { ...order, advance_verified_at: order.advance_verified_at || order.created_at },
        { accountId }
      );
      if (result.recorded) recorded += 1; else skipped += 1;
    } catch (error) {
      if (isMissingTableError(error)) throw error;
      failed.push({ orderId: order.id, reason: error?.message || "Failed." });
    }
  }
  return { scanned: (orders || []).length, recorded, skipped, failed };
}

// ---------------------------------------------------------------------------
// Delivery / return timestamps
// ---------------------------------------------------------------------------

export async function stampOrderLifecycleDate(orderId, { delivered = false, returned = false } = {}) {
  const body = {};
  if (delivered) body.delivered_at = new Date().toISOString();
  if (returned) body.returned_at = new Date().toISOString();
  if (!Object.keys(body).length) return null;
  return supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    body,
    prefer: "return=minimal",
  });
}
