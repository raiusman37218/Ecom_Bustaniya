import "server-only";
import { supabaseAdminRequest } from "./supabaseRest";
import { getCourierAdapter, postexTrackingNumber } from "./courierAdapters";
import { recordShipmentState } from "./shipments";

function text(value, maxLength = 300) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function amount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100) / 100) : 0;
}

function isoDateTime(value) {
  const raw = text(value, 80);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isoDate(value) {
  const raw = text(value, 20).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function setupError(error) {
  const message = `${error?.message || ""} ${JSON.stringify(error?.details || {})}`.toLowerCase();
  return (
    error?.status === 404 ||
    message.includes("postex_order_payments") ||
    message.includes("postex_cpr_batches") ||
    message.includes("postex_cpr_items") ||
    message.includes("schema cache")
  );
}

function paymentStatus(courierStatus, settled) {
  const status = text(courierStatus).toLowerCase();
  if (settled) return "settled";
  if (status.includes("return")) return "returned";
  if (status.includes("cancel") || status.includes("expired")) return "cancelled";
  if (status.includes("deliver")) return "awaiting";
  return "in_transit";
}

function expectedNet(payment) {
  const tracking = payment?.raw_response?.tracking?.dist || payment?.raw_response?.tracking || {};
  const paymentStatus = payment?.raw_response?.payment?.dist || payment?.raw_response?.payment || {};
  const invoice = amount(payment?.invoice_payment_pkr || tracking.invoicePayment || tracking.codAmount || tracking.cod_amount);
  const shipping = amount(tracking.shippingCharges ?? tracking.shipping_charges ?? tracking.deliveryCharges ?? tracking.transactionFee ?? payment?.transaction_fee_pkr);
  const upfrontCharges = amount(paymentStatus.upfrontCharges ?? paymentStatus.upfront_charges ?? paymentStatus.upfrontCharge);
  const gst = amount(tracking.gst ?? tracking.gstAmount ?? tracking.transactionTax ?? payment?.transaction_tax_pkr);
  const deduction4 = amount(tracking.deduction ?? tracking.deductionAmount ?? tracking.deduction4 ?? tracking.transactionDeduction ?? (invoice * 0.04));
  const reversal = amount(tracking.reversalTax ?? payment?.reversal_tax_pkr) + amount(tracking.reversalFee ?? payment?.reversal_fee_pkr);
  return amount(
    invoice -
      shipping -
      upfrontCharges -
      gst -
      deduction4 -
      reversal
  );
}

function expectedDeductions(payment) {
  const invoice = amount(payment?.invoice_payment_pkr || payment?.raw_response?.tracking?.dist?.invoicePayment || payment?.raw_response?.tracking?.invoicePayment);
  return amount(Math.max(0, invoice - expectedNet(payment)));
}

function allocatedByPayment(items = [], excludedBatchId = null) {
  const totals = new Map();
  for (const item of items) {
    if (excludedBatchId && String(item.batch_id) === String(excludedBatchId)) continue;
    const key = String(item.order_payment_id);
    totals.set(key, amount((totals.get(key) || 0) + Number(item.allocated_received_pkr || 0)));
  }
  return totals;
}

function distribute(total, weights) {
  const safeTotal = amount(total);
  const weightTotal = weights.reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
  if (!safeTotal || !weightTotal) return weights.map(() => 0);
  let assigned = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return amount(safeTotal - assigned);
    const share = amount((safeTotal * Math.max(0, Number(weight || 0))) / weightTotal);
    assigned = amount(assigned + share);
    return share;
  });
}

export function buildPostexSettlementSummary(payments = [], batches = [], items = []) {
  const allocations = allocatedByPayment(items);
  const deliveredPayments = payments.filter((payment) =>
    text(payment.courier_status).toLowerCase().includes("deliver")
  );
  const totalExpectedNetPkr = amount(
    deliveredPayments.reduce((sum, payment) => sum + Number(expectedNet(payment)), 0)
  );
  const postexSettledPkr = amount(
    deliveredPayments
      .filter((payment) => payment.postex_settled)
      .reduce((sum, payment) => sum + Number(expectedNet(payment)), 0)
  );
  const bankReceivedPkr = amount(
    batches.reduce((sum, batch) => sum + Number(batch.bank_received_pkr || 0), 0)
  );
  const outstandingPkr = amount(
    deliveredPayments.reduce((sum, payment) => {
      const expected = Number(expectedNet(payment));
      return sum + Math.max(0, expected - Number(allocations.get(String(payment.id)) || 0));
    }, 0)
  );
  const awaitingPostexPkr = amount(
    deliveredPayments
      .filter((payment) => !payment.postex_settled)
      .reduce((sum, payment) => sum + Number(expectedNet(payment)), 0)
  );
  const settledNotBankedPkr = amount(
    deliveredPayments
      .filter((payment) => payment.postex_settled)
      .reduce((sum, payment) => {
        const expected = Number(expectedNet(payment));
        return sum + Math.max(0, expected - Number(allocations.get(String(payment.id)) || 0));
      }, 0)
  );
  const carriedForwardPkr = amount(
    batches
      .filter((batch) => batch.status === "partial")
      .reduce((sum, batch) => sum + Number(batch.carried_forward_pkr || 0), 0)
  );
  return {
    // This helper receives database rows only; there is no runtime courier
    // adapter in scope here. Read the connection metadata from those rows.
    courier_account_id: payments.find((payment) => payment.courier_account_id)?.courier_account_id || null,
    courier_provider: payments.find((payment) => payment.courier_provider)?.courier_provider || "postex",
    paymentCount: payments.length,
    deliveredPaymentCount: deliveredPayments.length,
    batchCount: batches.length,
    totalExpectedNetPkr,
    postexSettledPkr,
    bankReceivedPkr,
    outstandingPkr,
    awaitingPostexPkr,
    settledNotBankedPkr,
    carriedForwardPkr,
    unreconciledBatchCount: batches.filter((batch) => batch.status !== "reconciled").length,
  };
}

export async function getPostexSettlementSnapshot() {
  try {
    const [payments, batches, items] = await Promise.all([
      supabaseAdminRequest("postex_order_payments?select=*&order=settlement_date.desc.nullslast,updated_at.desc"),
      supabaseAdminRequest("postex_cpr_batches?select=*&order=cpr_date.desc.nullslast,created_at.desc"),
      supabaseAdminRequest("postex_cpr_items?select=*&order=created_at.desc"),
    ]);
    const paymentById = new Map(payments.map((payment) => [String(payment.id), payment]));
    const itemsWithOrders = items.map((item) => ({
      ...item,
      payment: paymentById.get(String(item.order_payment_id)) || null,
    }));
    const itemsByBatch = new Map();
    for (const item of itemsWithOrders) {
      const current = itemsByBatch.get(String(item.batch_id)) || [];
      current.push(item);
      itemsByBatch.set(String(item.batch_id), current);
    }
    const batchesWithItems = batches.map((batch) => ({
      ...batch,
      items: itemsByBatch.get(String(batch.id)) || [],
    }));
    return {
      setupAvailable: true,
      payments,
      batches: batchesWithItems,
      items: itemsWithOrders,
      summary: buildPostexSettlementSummary(payments, batches, items),
    };
  } catch (error) {
    if (setupError(error)) {
      return {
        setupAvailable: false,
        payments: [],
        batches: [],
        items: [],
        summary: buildPostexSettlementSummary(),
      };
    }
    throw error;
  }
}

async function syncOneOrder(order, courier) {
  const trackingNumber = text(order.courier_tracking_number);
  if (!order?.id || !postexTrackingNumber(trackingNumber)) return null;
  const [trackingResult, paymentResult] = await Promise.all([
    courier.trackShipment(trackingNumber),
    courier.getPaymentStatus(trackingNumber),
  ]);
  const tracking = trackingResult?.dist || {};
  const payment = paymentResult?.dist || {};
  const courierStatus = text(tracking.transactionStatus || order.courier_status || order.status);
  const settled = payment.settle === true || String(payment.settle).toLowerCase() === "true";
  const now = new Date().toISOString();
  if (courierStatus && courierStatus.toLowerCase() !== text(order.courier_status).toLowerCase()) {
    await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(order.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: { courier_status: courierStatus, updated_at: now },
    });
  }
  await recordShipmentState({ orderId: order.id, courier, trackingNumber, rawStatus: courierStatus, serviceType: Number(order.total_pkr || 0) > 0 ? "COD" : "prepaid" });
  return {
    order_id: order.id,
    order_number: text(order.order_number || tracking.orderRefNumber || order.id, 120),
    tracking_number: trackingNumber,
    courier_status: courierStatus,
    invoice_payment_pkr: amount(tracking.invoicePayment ?? order.total_pkr),
    transaction_tax_pkr: amount(tracking.transactionTax),
    transaction_fee_pkr: amount(tracking.transactionFee),
    reversal_tax_pkr: amount(tracking.reversalTax),
    reversal_fee_pkr: amount(tracking.reversalFee),
    postex_settled: settled,
    settlement_date: isoDateTime(payment.settlementDate),
    cpr_number_1: text(payment.cpr1 || payment.cprNumber_1, 120) || null,
    cpr_date_1: isoDateTime(payment.cpr1Date || payment.upfrontPaymentDate),
    cpr_number_2: text(payment.cpr2 || payment.cprNumber_2, 120) || null,
    cpr_date_2: isoDateTime(payment.cpr2Date || payment.reservePaymentDate),
    payment_status: paymentStatus(courierStatus, settled),
    last_synced_at: now,
    last_error: null,
    raw_response: { tracking: trackingResult, payment: paymentResult },
    updated_at: now,
  };
}

export async function syncPostexPayments() {
  const courier = await getCourierAdapter("postex");
  if (!courier.configured) {
    throw Object.assign(new Error("PostEx API token is not configured."), { status: 503 });
  }
  const orders = await supabaseAdminRequest(
    "orders?select=id,order_number,total_pkr,status,courier_status,courier_tracking_number,created_at&courier_tracking_number=not.is.null&order=created_at.desc&limit=500"
  );
  const eligible = orders.filter((order) => postexTrackingNumber(text(order.courier_tracking_number)));
  const results = await Promise.allSettled(eligible.map((order) => syncOneOrder(order, courier)));
  const rows = results
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value);
  if (rows.length) {
    await supabaseAdminRequest(
      "postex_order_payments?on_conflict=order_id&select=*",
      {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        body: rows,
      }
    );
  }
  const failed = results
    .map((result, index) => ({ result, order: eligible[index] }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ result, order }) => ({
      orderNumber: order?.order_number,
      trackingNumber: order?.courier_tracking_number,
      message: result.reason?.message || "PostEx sync failed.",
    }));
  return {
    synced: rows.length,
    failed,
    snapshot: await getPostexSettlementSnapshot(),
  };
}

export function extractTrackingNumbers(value) {
  const matches = String(value || "").match(/(?:CX-[A-Z0-9-]{6,30}|\b\d{10,20}\b)/gi) || [];
  return [...new Set(matches.map((match) => match.trim().toUpperCase()))];
}

export async function savePostexCprBatch(input = {}) {
  const cprNumber = text(input.cprNumber, 120);
  const trackingNumbers = extractTrackingNumbers(
    Array.isArray(input.trackingNumbers) ? input.trackingNumbers.join(" ") : input.trackingNumbers
  );
  if (!cprNumber) throw Object.assign(new Error("CPR number is required."), { status: 400 });
  if (!trackingNumbers.length) {
    throw Object.assign(new Error("Add at least one valid PostEx tracking number."), { status: 400 });
  }

  const courier = await getCourierAdapter("postex");
  const snapshot = await getPostexSettlementSnapshot();
  if (!snapshot.setupAvailable) {
    throw Object.assign(new Error("PostEx settlement tables are not installed."), { status: 503 });
  }
  const selected = snapshot.payments.filter((payment) =>
    trackingNumbers.includes(text(payment.tracking_number).toUpperCase())
  );
  if (selected.length !== trackingNumbers.length) {
    const found = new Set(selected.map((payment) => text(payment.tracking_number).toUpperCase()));
    const missing = trackingNumbers.filter((tracking) => !found.has(tracking));
    throw Object.assign(
      new Error(`Sync PostEx first. Tracking not found: ${missing.join(", ")}`),
      { status: 400 }
    );
  }

  const existingBatch = snapshot.batches.find(
    (batch) => text(batch.cpr_number).toLowerCase() === cprNumber.toLowerCase()
  );
  const allocated = allocatedByPayment(snapshot.items, existingBatch?.id);
  const outstandingWeights = selected.map((payment) =>
    amount(
      Math.max(
        0,
        Number(expectedNet(payment)) -
          Number(allocated.get(String(payment.id)) || 0)
      )
    )
  );
  const outstandingTotal = amount(outstandingWeights.reduce((sum, value) => sum + value, 0));
  const statementAmount = amount(input.expectedAmountPkr || outstandingTotal);
  const additionalDeductions = amount(input.additionalDeductionsPkr);
  const expectedBank = amount(Math.max(0, statementAmount - additionalDeductions));
  const bankReceived = amount(input.bankReceivedPkr);
  const carriedForward = amount(Math.max(0, expectedBank - bankReceived));
  const status =
    bankReceived > expectedBank + 0.5
      ? "disputed"
      : bankReceived >= expectedBank - 0.5 && expectedBank > 0
        ? "reconciled"
        : bankReceived > 0
          ? "partial"
          : "open";
  const trackedDeductions = amount(
    selected.reduce(
      (sum, payment) =>
        sum +
        Number(expectedDeductions(payment)),
      0
    )
  );
  const expectedGross = amount(
    selected.reduce((sum, payment) => sum + Number(payment.invoice_payment_pkr || 0), 0)
  );
  const now = new Date().toISOString();
  const batchRows = await supabaseAdminRequest(
    "postex_cpr_batches?on_conflict=cpr_number&select=*",
    {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        courier_account_id: courier.accountId,
        courier_provider: courier.provider,
        cpr_number: cprNumber,
        cpr_date: isoDate(input.cprDate),
        period_start: isoDate(input.periodStart),
        period_end: isoDate(input.periodEnd),
        expected_gross_pkr: expectedGross,
        postex_deductions_pkr: trackedDeductions,
        additional_deductions_pkr: additionalDeductions,
        expected_bank_pkr: expectedBank,
        bank_received_pkr: bankReceived,
        bank_received_date: isoDate(input.bankReceivedDate),
        carried_forward_pkr: carriedForward,
        status,
        notes: text(input.notes, 1000) || null,
        updated_at: now,
      },
    }
  );
  const batch = batchRows?.[0];
  if (!batch?.id) throw new Error("Unable to save CPR batch.");

  await supabaseAdminRequest(
    `postex_cpr_items?batch_id=eq.${encodeURIComponent(batch.id)}`,
    { method: "DELETE", prefer: "return=minimal" }
  );
  const expectedShares = distribute(expectedBank, outstandingWeights);
  const receivedShares = distribute(Math.min(bankReceived, expectedBank), expectedShares);
  const itemRows = selected.map((payment, index) => ({
    batch_id: batch.id,
    order_payment_id: payment.id,
    expected_net_pkr: expectedShares[index],
    allocated_received_pkr: receivedShares[index],
    carried_forward_pkr: amount(Math.max(0, expectedShares[index] - receivedShares[index])),
    updated_at: now,
  }));
  if (itemRows.length) {
    await supabaseAdminRequest("postex_cpr_items?select=*", {
      method: "POST",
      prefer: "return=representation",
      body: itemRows,
    });
  }
  return await getPostexSettlementSnapshot();
}
