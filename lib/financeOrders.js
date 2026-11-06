import "server-only";
import { supabaseAdminRequest } from "./supabaseRest.js";
import { insertFinanceTransactions, isMissingTableError, listFinanceAccounts } from "./financeStore.js";

export function normalizeStatusText(value = "") {
  return String(value || "").toLowerCase().replaceAll("_", " ").replaceAll("-", " ").trim();
}

/**
 * The same status categorisation the Orders screen uses, ported server-side so
 * Finance and Orders can never disagree about what "delivered" means.
 *
 * Order of the checks matters: "Out For Delivery" contains the word "deliver"
 * and must be caught before the delivered test, or money would be counted for
 * parcels still on a rider's bike.
 */
export function postexCategory(value = "") {
  const normalized = normalizeStatusText(value).replace(/\s+/g, " ");
  if (!normalized) return "Unbooked";
  if (normalized.includes("cancel")) return "Cancelled";
  if (normalized.includes("unbook") || normalized.includes("pending") || normalized.includes("draft")) return "Unbooked";
  if (normalized.includes("warehouse")) return "PostEx Warehouse";
  if (normalized.includes("out for delivery")) return "Out For Delivery";
  if (normalized.includes("out for return")) return "Out For Return";
  if (normalized.includes("under review") || normalized.includes("review")) return "Delivery Under Review";
  if (normalized.includes("un assigned") || normalized.includes("unassigned")) return "Un-Assigned By Me";
  if (normalized.includes("attempt")) return "Attempted";
  if (normalized.includes("return")) return "Returned";
  if (normalized.includes("deliver") || normalized.includes("complete")) return "Delivered";
  if (normalized.includes("transit")) return "In-Transit";
  if (normalized.includes("transfer")) return "Transferred";
  if (normalized.includes("book")) return "Booked";
  return "Unbooked";
}

export function orderCategory(order = {}) {
  const hasTracking = Boolean(order.courier_tracking_number || order.tracking_number);
  const raw = String(order.courier_status || order.courier_normalized_status || order.status || "").trim();
  if (hasTracking && (raw.toLowerCase() === "unbooked" || raw.toLowerCase() === "pending")) {
    return "Booked";
  }
  return postexCategory(raw);
}

export function isDeliveredOrderRow(order = {}) {
  return orderCategory(order) === "Delivered";
}

export function isReturnedOrderRow(order = {}) {
  const cat = orderCategory(order);
  return cat === "Returned" || cat === "Out For Return";
}

export function isPaymentVerified(order = {}) {
  const status = String(order.payment_proof_status || order.payment_status || "").trim().toLowerCase();
  if (!status) return false;
  if (
    status.includes("unverif") ||
    status.includes("pending") ||
    status.includes("await") ||
    status.includes("due") ||
    status.includes("reject") ||
    status.includes("decline") ||
    status.includes("fail") ||
    status.includes("refund")
  ) {
    return false;
  }
  return status.includes("verif") || status === "paid" || status.includes("full paid") || status.includes("fully paid");
}

export function classifyOrderPaymentScenario(order = {}) {
  const totalPkr = Math.max(0, Math.round(Number(order.total_order_value_pkr ?? order.total_pkr ?? order.total ?? 0) * 100) / 100);
  const deliveryPkr = Math.max(0, Math.round(Number(order.delivery_charges_pkr ?? order.delivery_pkr ?? 0) * 100) / 100);
  const subtotalPkr = Math.max(0, Math.round(Number(order.product_subtotal_pkr ?? order.subtotal_pkr ?? Math.max(0, totalPkr - deliveryPkr)) * 100) / 100);
  const rawMethod = String(order.payment_method || "").trim().toLowerCase();
  const rawAdvance = Number(order.amount_payable_in_advance_pkr ?? 0);
  const isFullAdvanceMethod = rawMethod === "full_advance" || rawMethod === "bank_deposit" || rawMethod === "advance";
  const advancePkr = isFullAdvanceMethod && rawAdvance <= 0 && totalPkr > 0
    ? totalPkr
    : Math.min(totalPkr || Infinity, Math.max(0, Math.round(rawAdvance * 100) / 100));
  const codRemainingPkr = Math.max(0, Math.round((totalPkr - advancePkr) * 100) / 100);

  let scenario = "cod";
  let scenarioLabel = "Cash on Delivery (COD)";
  if (totalPkr > 0 && advancePkr >= totalPkr) {
    scenario = "full_advance";
    scenarioLabel = "Full Advance (100% Prepaid)";
  } else if (advancePkr > 0 && advancePkr < totalPkr) {
    if (advancePkr <= Math.max(deliveryPkr + 100, 500)) {
      scenario = "delivery_advance";
      scenarioLabel = "Delivery Advance + COD";
    } else {
      scenario = "partial_advance";
      scenarioLabel = "Partial Advance + COD";
    }
  }

  const rawStatus = String(order.payment_proof_status || order.payment_status || "").trim();
  const lowerStatus = rawStatus.toLowerCase();
  const isRejected = lowerStatus.includes("reject") || lowerStatus.includes("decline") || lowerStatus.includes("fail");
  const isRefunded = lowerStatus.includes("refund");
  const isProofSubmitted = lowerStatus.includes("proof") || lowerStatus.includes("submitted");
  const verified = isPaymentVerified(order);
  const orderStage = orderCategory(order);
  const isDelivered = orderStage === "Delivered";
  const isReturned = orderStage === "Returned" || orderStage === "Out For Return";
  const isCancelled = orderStage === "Cancelled";

  const needsVerification =
    !isCancelled &&
    !isReturned &&
    !verified &&
    !isRejected &&
    !isRefunded &&
    (advancePkr > 0 || isProofSubmitted || isFullAdvanceMethod);

  let paymentStatusLabel = "COD Pending";
  if (isRefunded) {
    paymentStatusLabel = "Refunded";
  } else if (isRejected) {
    paymentStatusLabel = "Payment Rejected";
  } else if (scenario === "full_advance") {
    if (verified) paymentStatusLabel = "Paid (Full Advance Verified)";
    else if (isProofSubmitted) paymentStatusLabel = "Proof Submitted (Verify Full Advance)";
    else paymentStatusLabel = "Advance Pending (Unverified)";
  } else if (scenario === "delivery_advance" || scenario === "partial_advance") {
    if (verified) {
      paymentStatusLabel = isDelivered || lowerStatus === "paid"
        ? "Paid (Advance + COD Delivered)"
        : "Advance Verified · COD Pending";
    } else if (isProofSubmitted) {
      paymentStatusLabel = "Proof Submitted (Verify Advance)";
    } else {
      paymentStatusLabel = "Advance Pending (Unverified)";
    }
  } else {
    if (verified || lowerStatus === "paid") paymentStatusLabel = "Paid (COD Verified)";
    else if (isDelivered) paymentStatusLabel = "Delivered (COD Collected)";
    else paymentStatusLabel = "COD Pending";
  }

  return {
    totalPkr,
    subtotalPkr,
    deliveryPkr,
    advancePkr,
    codRemainingPkr,
    scenario,
    scenarioLabel,
    verified,
    needsVerification,
    isProofSubmitted,
    isRejected,
    isRefunded,
    isDelivered,
    isReturned,
    isCancelled,
    orderStage,
    fulfillmentStatus: order.fulfillment_status || (isDelivered ? "Delivered" : "Unfulfilled"),
    paymentStatus: paymentStatusLabel,
    rawPaymentStatus: rawStatus || "COD Pending",
    paymentReference: order.payment_reference || "",
  };
}

// Selecting every column rather than naming them: this table's shape differs
// between deployments, and one absent column would take the whole report down.
export async function listFinanceOrders({ limit = 5000 } = {}) {
  return supabaseAdminRequest(`orders?select=*&order=created_at.desc&limit=${Math.floor(limit)}`);
}

export async function listOrderItemsFor(orderIds = []) {
  const ids = orderIds.map((id) => String(id)).filter(Boolean);
  if (!ids.length) return new Map();
  const rows = [];
  // PostgREST puts the filter in the URL, so a long id list has to be chunked.
  for (let index = 0; index < ids.length; index += 200) {
    const chunk = ids.slice(index, index + 200);
    const result = await supabaseAdminRequest(
      `order_items?select=*&order_id=in.(${chunk.join(",")})`
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
    `order_items?select=*&order_id=eq.${encodeURIComponent(orderId)}`
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
 * Turns a verified advance (full advance, delivery advance, or partial advance)
 * into real cash in finance_transactions, and keeps it updated if the verified
 * advance amount or receiving account changes.
 */
export async function recordVerifiedAdvance(order, { actor, accountId, customAmountPkr, note } = {}) {
  if (!order?.id) return { recorded: false, reason: "no_order" };
  const classified = classifyOrderPaymentScenario(order);
  const amount = customAmountPkr !== undefined && Number(customAmountPkr) > 0
    ? Math.round(Number(customAmountPkr) * 100) / 100
    : classified.advancePkr;
  if (!(amount > 0)) return { recorded: false, reason: "no_advance" };
  if (!isPaymentVerified(order)) return { recorded: false, reason: "not_verified" };

  const targetAccountId = accountId || (await advanceAccountId());
  const customer = order.shipping_full_name || order.guest_name || "Customer";
  const orderRef = order.order_number ? `#${order.order_number}` : String(order.id).slice(0, 8);
  const paymentRef = order.payment_reference ? `${orderRef} · TID: ${order.payment_reference}` : orderRef;
  const scenarioTitle = classified.scenario === "full_advance"
    ? `Full advance received: ${customer}`
    : classified.scenario === "delivery_advance"
      ? `Delivery advance received: ${customer}`
      : `Advance received: ${customer}`;

  const existing = await supabaseAdminRequest(
    `finance_transactions?select=id,account_id,amount_pkr,title,reference&order_id=eq.${encodeURIComponent(order.id)}&source=eq.order_advance&voided=is.false&limit=1`
  );
  if (existing?.[0]) {
    const patchBody = {};
    if (targetAccountId && existing[0].account_id !== targetAccountId) {
      patchBody.account_id = targetAccountId;
    }
    if (Math.abs(Number(existing[0].amount_pkr || 0) - amount) >= 0.01) {
      patchBody.amount_pkr = amount;
      patchBody.title = scenarioTitle;
    }
    if (order.payment_reference && existing[0].reference !== paymentRef) {
      patchBody.reference = paymentRef.slice(0, 160);
    }
    if (Object.keys(patchBody).length > 0) {
      await supabaseAdminRequest(`finance_transactions?id=eq.${encodeURIComponent(existing[0].id)}`, {
        method: "PATCH",
        body: patchBody,
        prefer: "return=minimal",
      });
      return {
        recorded: false,
        updated: true,
        reason: "updated_existing",
        id: existing[0].id,
        amountPkr: amount,
        accountAligned: Boolean(patchBody.account_id),
      };
    }
    return { recorded: false, reason: "already_recorded", id: existing[0].id, amountPkr: amount };
  }

  const [created] = await insertFinanceTransactions([{
    accountId: targetAccountId,
    entryType: "customer_advance",
    title: scenarioTitle,
    category: "Customer advance",
    amountPkr: amount,
    occurredOn: (order.advance_verified_at || new Date().toISOString()).slice(0, 10),
    reference: paymentRef.slice(0, 160),
    counterparty: customer,
    note: note || `Verified ${classified.scenarioLabel} for order ${orderRef}.`,
    source: "order_advance",
    orderId: order.id,
    createdBy: actor?.name || actor?.email || "",
  }]);

  await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(order.id)}`, {
    method: "PATCH",
    body: { advance_verified_at: order.advance_verified_at || new Date().toISOString() },
    prefer: "return=minimal",
  }).catch(() => {});

  return { recorded: true, transaction: created, amountPkr: amount };
}

/**
 * Voids an active order_advance transaction if an order's payment is un-verified,
 * rejected, refunded, or switched back to Full COD (0 advance).
 */
export async function voidOrderAdvanceTransaction(orderId, { actor } = {}) {
  if (!orderId) return { voided: false, count: 0 };
  const existing = await supabaseAdminRequest(
    `finance_transactions?select=id&order_id=eq.${encodeURIComponent(orderId)}&source=eq.order_advance&voided=is.false`
  ).catch(() => []);
  if (!existing?.length) return { voided: false, count: 0 };

  const actorName = String(actor?.name || actor?.email || actor?.id || "Admin").slice(0, 120);
  for (const row of existing) {
    await supabaseAdminRequest(`finance_transactions?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      body: {
        voided: true,
        voided_at: new Date().toISOString(),
        voided_by: actorName,
      },
      prefer: "return=minimal",
    }).catch(() => {});
  }

  await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    body: { advance_verified_at: null },
    prefer: "return=minimal",
  }).catch(() => {});

  return { voided: true, count: existing.length };
}

export async function backfillVerifiedAdvances({ limit = 2000 } = {}) {
  const orders = await supabaseAdminRequest(
    `orders?select=*&limit=${Math.floor(limit)}`
  );
  const eligible = (orders || []).filter((order) => {
    const c = classifyOrderPaymentScenario(order);
    return c.advancePkr > 0 && c.verified;
  });
  let recorded = 0;
  let updated = 0;
  let skipped = 0;
  const failed = [];
  const accountId = await advanceAccountId();
  for (const order of eligible) {
    try {
      const result = await recordVerifiedAdvance(
        { ...order, advance_verified_at: order.advance_verified_at || order.created_at },
        { accountId }
      );
      if (result.recorded) recorded += 1;
      else if (result.updated) updated += 1;
      else skipped += 1;
    } catch (error) {
      if (isMissingTableError(error)) throw error;
      failed.push({ orderId: order.id, reason: error?.message || "Failed." });
    }
  }
  return { scanned: eligible.length, recorded, updated, skipped, failed };
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
