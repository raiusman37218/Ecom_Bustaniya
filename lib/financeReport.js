import "server-only";
import { supabaseAdminRequest } from "./supabaseRest.js";
import { getPostexSettlementSnapshot } from "./postexSettlements.js";
import {
  getFinanceSettings,
  listFinanceAccounts,
  listFinanceTransactions,
  listMarketingCampaigns,
  listSupplierBills,
  isMissingTableError,
} from "./financeStore.js";
import {
  listFinanceOrders,
  listOrderItemsFor,
  isDeliveredOrderRow,
  isReturnedOrderRow,
  isPaymentVerified,
} from "./financeOrders.js";

const DAY_MS = 86400000;

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function dateOnly(value) {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Turns a period name into concrete dates. Every part of the report uses the
 * same window, so a month's revenue can never be compared against all-time
 * expenses.
 */
export function resolvePeriod({ period = "all", from = "", to = "" } = {}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const iso = (date) => date.toISOString().slice(0, 10);

  if (period === "custom") {
    return { period, from: dateOnly(from), to: dateOnly(to) || todayDateOnly(), label: "Custom range" };
  }
  if (period === "today") {
    return { period, from: iso(now), to: iso(now), label: "Today" };
  }
  if (period === "month") {
    return { period, from: iso(new Date(year, month, 1)), to: iso(new Date(year, month + 1, 0)), label: "This month" };
  }
  if (period === "lastMonth") {
    return { period, from: iso(new Date(year, month - 1, 1)), to: iso(new Date(year, month, 0)), label: "Last month" };
  }
  if (period === "year") {
    return { period, from: iso(new Date(year, 0, 1)), to: iso(new Date(year, 11, 31)), label: "This year" };
  }
  return { period: "all", from: "", to: "", label: "All time" };
}

function withinPeriod(dateValue, { from, to }) {
  const value = dateOnly(dateValue);
  if (!value) return !from && !to;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

// A balance is a point in time, not a range: everything up to the end date.
function upToPeriodEnd(dateValue, { to }) {
  const value = dateOnly(dateValue);
  if (!value) return true;
  return !to || value <= to;
}

function parseCategory(value) {
  if (!value) return "Uncategorised";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{")) return trimmed || "Uncategorised";
    try {
      const parsed = JSON.parse(trimmed);
      return String(parsed?.category || parsed?.name || "Uncategorised");
    } catch {
      return trimmed;
    }
  }
  if (typeof value === "object") return String(value.category || value.name || "Uncategorised");
  return "Uncategorised";
}

// ---------------------------------------------------------------------------
// PostEx amounts (moved server-side so P&L and the UI can never disagree)
// ---------------------------------------------------------------------------

function postexRawTracking(payment) {
  return payment?.raw_response?.tracking?.dist || {};
}

function firstValue(source, keys, fallback = "") {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function postexNumber(source, keys, fallback = 0) {
  const value = Number(firstValue(source, keys, fallback));
  return Number.isFinite(value) ? value : Number(fallback || 0);
}

export function postexSettlementAmounts(payment = {}) {
  const tracking = postexRawTracking(payment);
  const invoice = Number(payment.invoice_payment_pkr || postexNumber(tracking, ["invoicePayment", "codAmount", "amount"], 0));
  const shipping = postexNumber(tracking, ["shippingCharges", "shipping_charges", "deliveryCharges", "transactionFee"], Number(payment.transaction_fee_pkr || 0));
  const upfrontCharges = postexNumber(tracking, ["upfrontCharges", "upfront_charges", "upfrontCharge"], 0);
  const gst = postexNumber(tracking, ["gst", "gstAmount", "transactionTax"], Number(payment.transaction_tax_pkr || 0));
  const deduction4 = postexNumber(tracking, ["deduction", "deductionAmount", "deduction4", "transactionDeduction"], Math.round(invoice * 4) / 100);
  const returnFee = Number(payment.reversal_fee_pkr || 0) + Number(payment.reversal_tax_pkr || 0);
  const calculatedNet = money(invoice - shipping - upfrontCharges - gst - deduction4 - returnFee);
  const rawNet = firstValue(tracking, ["netAmount", "net_amount", "payableAmount"], "");
  const net = rawNet !== "" ? Number(rawNet) : calculatedNet;
  return {
    invoice,
    shipping,
    upfrontCharges,
    gst,
    deduction4,
    returnFee,
    net: Number.isFinite(net) ? net : calculatedNet,
    totalDeductions: money(shipping + upfrontCharges + gst + deduction4 + returnFee),
  };
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

export async function buildFinanceReport(options = {}) {
  const data = await loadFinanceData();
  return computeFinanceReport(data, resolvePeriod(options));
}

/**
 * Every dataset the report needs, fetched once. Kept separate from the maths so
 * the twelve-month trend can reuse a single load instead of hitting the
 * database twelve times.
 */
export async function loadFinanceData() {
  const settingsRow = await getFinanceSettings();
  if (!settingsRow) {
    const error = new Error("Finance tables are not set up yet.");
    error.status = 409;
    error.setupRequired = true;
    throw error;
  }

  const [accounts, transactions, supplierBills, campaigns, orders, products, inventory, postex] = await Promise.all([
    listFinanceAccounts(),
    listFinanceTransactions({}),
    listSupplierBills(),
    listMarketingCampaigns({}),
    listFinanceOrders(),
    supabaseAdminRequest("products?select=id,name,category,subcategory,price,cost_total_pkr,instock,article_number"),
    supabaseAdminRequest("inventory?select=product_id,stock_quantity,low_stock_threshold"),
    getPostexSettlementSnapshot().catch((error) => {
      if (isMissingTableError(error)) return { setupAvailable: false, payments: [], batches: [], items: [], summary: {} };
      throw error;
    }),
  ]);

  const itemsByOrder = await listOrderItemsFor(orders.filter(isDeliveredOrderRow).map((order) => order.id));

  return { settingsRow, accounts, transactions, supplierBills, campaigns, orders, products, inventory, postex, itemsByOrder };
}

export function computeFinanceReport(data, window) {
  const { settingsRow, accounts, transactions, supplierBills, campaigns, orders, products, inventory, postex, itemsByOrder } = data;

  const settings = {
    marketingPercent: Number(settingsRow.marketing_percent || 0),
    ownerPercent: Number(settingsRow.owner_percent || 0),
    stockPercent: Math.max(0, 100 - Number(settingsRow.marketing_percent || 0) - Number(settingsRow.owner_percent || 0)),
    monthlyFixedCostsPkr: Number(settingsRow.monthly_fixed_costs_pkr || 0),
    packagingExpensePkr: Number(settingsRow.packaging_expense_pkr || 0),
    deliveryExpensePkr: Number(settingsRow.delivery_expense_pkr || 0),
    lowCashThresholdPkr: Number(settingsRow.low_cash_threshold_pkr || 0),
    supplierDueAlertDays: Number(settingsRow.supplier_due_alert_days || 3),
    receivableStuckAlertDays: Number(settingsRow.receivable_stuck_alert_days || 15),
    legacyMigratedAt: settingsRow.legacy_migrated_at,
  };

  const activeTransactions = transactions.filter((entry) => entry.voided !== true);

  // -- Cash -----------------------------------------------------------------
  const balanceTransactions = activeTransactions.filter((entry) => upToPeriodEnd(entry.occurred_on, window));
  const signed = (entry) => (entry.cash_direction === "in" ? 1 : -1) * Number(entry.amount_pkr || 0);

  const accountBalances = accounts.map((account) => {
    const rows = balanceTransactions.filter((entry) => entry.account_id === account.id);
    return {
      id: account.id,
      slug: account.slug,
      name: account.name,
      kind: account.kind,
      holder: account.holder,
      note: account.note,
      openingBalancePkr: Number(account.opening_balance_pkr || 0),
      balancePkr: money(Number(account.opening_balance_pkr || 0) + rows.reduce((sum, entry) => sum + signed(entry), 0)),
      movementCount: rows.length,
    };
  });
  const unassignedRows = balanceTransactions.filter((entry) => !entry.account_id);
  const unassignedBalancePkr = money(unassignedRows.reduce((sum, entry) => sum + signed(entry), 0));
  const availableCashPkr = money(
    accountBalances.reduce((sum, account) => sum + account.balancePkr, 0) + unassignedBalancePkr
  );

  const periodTransactions = activeTransactions.filter((entry) => withinPeriod(entry.occurred_on, window));
  const sumWhere = (rows, predicate) => money(rows.filter(predicate).reduce((sum, entry) => sum + Number(entry.amount_pkr || 0), 0));
  const byType = (type) => (entry) => entry.entry_type === type;

  const cashIn = sumWhere(periodTransactions, (entry) => entry.cash_direction === "in");
  const cashOut = sumWhere(periodTransactions, (entry) => entry.cash_direction === "out");

  const INVENTORY_CATEGORIES = new Set([
    "fabric / stock", "stock purchase", "tailoring / stitching",
    "lace / embellishment", "inventory production",
  ]);
  const isInventorySpend = (entry) =>
    entry.entry_type === "business_expense" &&
    INVENTORY_CATEGORIES.has(String(entry.category || "").trim().toLowerCase());

  const operatingExpenses = sumWhere(
    periodTransactions,
    (entry) => entry.entry_type === "business_expense" && !isInventorySpend(entry)
  );
  const inventorySpend = sumWhere(periodTransactions, isInventorySpend);
  const supplierPayments = sumWhere(periodTransactions, byType("supplier_payment"));
  const ownerInvestments = sumWhere(periodTransactions, byType("owner_investment"));
  const ownerWithdrawals = sumWhere(periodTransactions, byType("owner_withdrawal"));
  const otherIncome = sumWhere(periodTransactions, byType("other_income"));
  const postexReceipts = sumWhere(periodTransactions, byType("postex_bank_receipt"));
  const advanceReceipts = sumWhere(periodTransactions, byType("customer_advance"));

  const expenseByCategory = [...periodTransactions
    .filter((entry) => entry.cash_direction === "out" && entry.entry_type !== "transfer_out")
    .reduce((map, entry) => {
      const key = String(entry.category || "Other").trim() || "Other";
      map.set(key, money((map.get(key) || 0) + Number(entry.amount_pkr || 0)));
      return map;
    }, new Map())]
    .map(([category, amountPkr]) => ({ category, amountPkr }))
    .sort((left, right) => right.amountPkr - left.amountPkr);

  // -- Orders ---------------------------------------------------------------
  const deliveredAll = orders.filter(isDeliveredOrderRow);
  const returnedAll = orders.filter(isReturnedOrderRow);
  const orderDate = (order) => order.delivered_at || order.created_at;
  const delivered = deliveredAll.filter((order) => withinPeriod(orderDate(order), window));
  const returned = returnedAll.filter((order) => withinPeriod(order.returned_at || order.created_at, window));
  const pipeline = orders.filter(
    (order) => !isDeliveredOrderRow(order) && !isReturnedOrderRow(order) && withinPeriod(order.created_at, window)
  );

  const productById = new Map(products.map((product) => [String(product.id), product]));
  const stockByProduct = new Map((inventory || []).map((row) => [String(row.product_id), row]));

  const paymentByOrderId = new Map(
    (postex.payments || []).filter((payment) => payment.order_id).map((payment) => [String(payment.order_id), payment])
  );

  /**
   * Cost of goods for one delivered order. The snapshot taken at delivery is
   * authoritative; only orders delivered before snapshots existed fall back to
   * the product's current cost, and those are reported separately so the owner
   * knows which figures are estimates.
   */
  function orderCogs(order) {
    if (order.cogs_snapshot_at && order.cogs_snapshot_pkr !== null && order.cogs_snapshot_pkr !== undefined) {
      return { costPkr: money(order.cogs_snapshot_pkr), estimated: false };
    }
    const items = itemsByOrder.get(String(order.id)) || [];
    const costPkr = items.reduce((sum, item) => {
      const product = productById.get(String(item.product_id));
      return sum + Number(item.quantity || 0) * Number(product?.cost_total_pkr || 0);
    }, 0);
    return { costPkr: money(costPkr), estimated: true };
  }

  const orderRows = delivered.map((order) => {
    const items = itemsByOrder.get(String(order.id)) || [];
    const revenuePkr = money(order.total_pkr || order.total_order_value_pkr || 0);
    const { costPkr, estimated } = orderCogs(order);
    const payment = paymentByOrderId.get(String(order.id));
    const amounts = payment ? postexSettlementAmounts(payment) : null;
    const courierCostPkr = amounts ? money(amounts.shipping + amounts.upfrontCharges) : 0;
    const gstPkr = amounts ? money(amounts.gst) : 0;
    const taxPkr = amounts ? money(amounts.deduction4) : 0;
    const netProfitPkr = money(revenuePkr - costPkr - courierCostPkr - gstPkr - taxPkr);
    return {
      id: order.id,
      orderNumber: order.order_number || "",
      customer: order.shipping_full_name || order.guest_name || "Guest",
      city: order.shipping_city || "",
      deliveredAt: order.delivered_at || order.created_at,
      units: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      revenuePkr,
      costPkr,
      costEstimated: estimated,
      courierCostPkr,
      gstPkr,
      taxPkr,
      netProfitPkr,
      marginPercent: revenuePkr ? Math.round((netProfitPkr / revenuePkr) * 100) : 0,
      advancePkr: money(order.amount_payable_in_advance_pkr || 0),
      trackingNumber: order.courier_tracking_number || "",
    };
  }).sort((left, right) => String(right.deliveredAt).localeCompare(String(left.deliveredAt)));

  const grossRevenue = money(orderRows.reduce((sum, row) => sum + row.revenuePkr, 0));
  const totalCogs = money(orderRows.reduce((sum, row) => sum + row.costPkr, 0));
  const estimatedCogsOrders = orderRows.filter((row) => row.costEstimated);
  const unitsSold = orderRows.reduce((sum, row) => sum + row.units, 0);
  const productRevenue = money(delivered.reduce((sum, order) => {
    const items = itemsByOrder.get(String(order.id)) || [];
    return sum + items.reduce((line, item) => line + Number(item.quantity || 0) * Number(item.unit_price_pkr || 0), 0);
  }, 0));

  // -- PostEx costs, restricted to the same window --------------------------
  const deliveredPayments = delivered.map((order) => paymentByOrderId.get(String(order.id))).filter(Boolean);
  const returnedPayments = returned.map((order) => paymentByOrderId.get(String(order.id))).filter(Boolean);
  const deliveredAmounts = deliveredPayments.map(postexSettlementAmounts);
  const returnedAmounts = returnedPayments.map(postexSettlementAmounts);
  const sumField = (rows, key) => money(rows.reduce((sum, row) => sum + Number(row[key] || 0), 0));

  const gstPkr = sumField(deliveredAmounts, "gst");
  const taxPkr = sumField(deliveredAmounts, "deduction4");
  const courierCostPkr = money(sumField(deliveredAmounts, "shipping") + sumField(deliveredAmounts, "upfrontCharges"));
  const returnLossPkr = money(returnedAmounts.reduce((sum, row) => sum + row.totalDeductions + Math.max(0, -Number(row.net || 0)), 0));
  const expectedNetPkr = sumField(deliveredAmounts, "net");

  // Cash only counts once the owner has confirmed it landed in the bank.
  const postexReceivedAllTime = money(
    activeTransactions
      .filter((entry) => entry.entry_type === "postex_bank_receipt" && upToPeriodEnd(entry.occurred_on, window))
      .reduce((sum, entry) => sum + Number(entry.amount_pkr || 0), 0)
  );
  const expectedNetAllTime = money(
    deliveredAll
      .map((order) => paymentByOrderId.get(String(order.id)))
      .filter(Boolean)
      .map(postexSettlementAmounts)
      .reduce((sum, row) => sum + Number(row.net || 0), 0)
  );
  const receivablePkr = money(Math.max(0, expectedNetAllTime - postexReceivedAllTime));

  const stuckThreshold = Date.now() - settings.receivableStuckAlertDays * DAY_MS;
  const stuckReceivables = deliveredAll
    .filter((order) => {
      const payment = paymentByOrderId.get(String(order.id));
      if (!payment) return false;
      if (payment.postex_settled === true) return false;
      const when = new Date(order.delivered_at || order.created_at).getTime();
      return Number.isFinite(when) && when < stuckThreshold;
    })
    .map((order) => ({
      id: order.id,
      orderNumber: order.order_number || "",
      customer: order.shipping_full_name || order.guest_name || "Guest",
      amountPkr: money(order.total_pkr || 0),
      deliveredAt: order.delivered_at || order.created_at,
      daysWaiting: Math.floor((Date.now() - new Date(order.delivered_at || order.created_at).getTime()) / DAY_MS),
    }))
    .sort((left, right) => right.daysWaiting - left.daysWaiting);

  // -- Advances -------------------------------------------------------------
  const advanceOrders = orders.filter((order) => Number(order.amount_payable_in_advance_pkr || 0) > 0);
  const advanceRows = advanceOrders
    .filter((order) => withinPeriod(order.advance_verified_at || order.created_at, window))
    .map((order) => {
      const advancePkr = money(order.amount_payable_in_advance_pkr || 0);
      const totalPkr = money(order.total_pkr || order.total_order_value_pkr || 0);
      return {
        id: order.id,
        orderNumber: order.order_number || "",
        customer: order.shipping_full_name || order.guest_name || "Guest",
        phone: order.shipping_phone || order.guest_phone || "",
        city: order.shipping_city || "",
        advancePkr,
        codRemainingPkr: money(Math.max(0, totalPkr - advancePkr)),
        verified: isPaymentVerified(order),
        verifiedAt: order.advance_verified_at || null,
        paymentStatus: order.payment_proof_status || order.payment_status || "Awaiting Payment",
        createdAt: order.created_at,
      };
    })
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));

  const advanceVerifiedPkr = money(advanceRows.filter((row) => row.verified).reduce((sum, row) => sum + row.advancePkr, 0));
  const advancePendingPkr = money(advanceRows.filter((row) => !row.verified).reduce((sum, row) => sum + row.advancePkr, 0));
  // An advance is only cash once a receipt exists; this flags the gap.
  const advanceOrderIdsWithCash = new Set(
    activeTransactions.filter((entry) => entry.source === "order_advance" && entry.order_id).map((entry) => String(entry.order_id))
  );
  const advanceNotInCash = advanceRows.filter((row) => row.verified && !advanceOrderIdsWithCash.has(String(row.id)));

  // -- Suppliers ------------------------------------------------------------
  const today = todayDateOnly();
  const dueSoonCutoff = new Date(Date.now() + settings.supplierDueAlertDays * DAY_MS).toISOString().slice(0, 10);
  const openBills = supplierBills.filter((bill) => bill.status !== "paid" && Number(bill.remaining_pkr || 0) > 0);
  const supplierPayablePkr = money(openBills.reduce((sum, bill) => sum + Number(bill.remaining_pkr || 0), 0));
  const overdueBills = openBills.filter((bill) => bill.due_date && bill.due_date < today);
  const dueSoonBills = openBills.filter((bill) => bill.due_date && bill.due_date >= today && bill.due_date <= dueSoonCutoff);
  const payableDueIn30Days = money(
    openBills
      .filter((bill) => !bill.due_date || bill.due_date <= new Date(Date.now() + 30 * DAY_MS).toISOString().slice(0, 10))
      .reduce((sum, bill) => sum + Number(bill.remaining_pkr || 0), 0)
  );

  // -- Marketing ------------------------------------------------------------
  const periodCampaigns = campaigns.filter((campaign) => withinPeriod(campaign.occurred_on, window));
  const marketingSpend = money(periodCampaigns.reduce((sum, row) => sum + Number(row.spend_pkr || 0), 0));
  const marketingSales = money(periodCampaigns.reduce((sum, row) => sum + Number(row.attributed_sales_pkr || 0), 0));
  const marketingCustomers = periodCampaigns.reduce((sum, row) => sum + Number(row.new_customers || 0), 0);

  // -- Product / category profit -------------------------------------------
  const productStats = new Map();
  for (const order of delivered) {
    const items = itemsByOrder.get(String(order.id)) || [];
    const snapshotLines = new Map(
      (order.cogs_snapshot_breakdown?.lines || []).map((line) => [String(line.productId), Number(line.unitCostPkr || 0)])
    );
    for (const item of items) {
      const key = String(item.product_id || item.product_name || "unknown");
      const product = productById.get(String(item.product_id));
      const unitCost = snapshotLines.has(String(item.product_id))
        ? snapshotLines.get(String(item.product_id))
        : Number(product?.cost_total_pkr || 0);
      const quantity = Number(item.quantity || 0);
      const revenue = quantity * Number(item.unit_price_pkr || 0);
      const current = productStats.get(key) || {
        productId: String(item.product_id || ""),
        name: product?.name || item.product_name || "Unknown product",
        sku: product?.article_number || item.article_number || "",
        category: parseCategory(product?.category),
        units: 0,
        revenuePkr: 0,
        costPkr: 0,
        stock: Number(stockByProduct.get(String(item.product_id))?.stock_quantity ?? 0),
        costKnown: unitCost > 0,
      };
      current.units += quantity;
      current.revenuePkr += revenue;
      current.costPkr += quantity * unitCost;
      if (unitCost > 0) current.costKnown = true;
      productStats.set(key, current);
    }
  }
  const productProfit = [...productStats.values()]
    .map((row) => {
      const revenuePkr = money(row.revenuePkr);
      const costPkr = money(row.costPkr);
      const profitPkr = money(revenuePkr - costPkr);
      return {
        ...row,
        revenuePkr,
        costPkr,
        profitPkr,
        marginPercent: revenuePkr ? Math.round((profitPkr / revenuePkr) * 100) : 0,
      };
    })
    .sort((left, right) => right.profitPkr - left.profitPkr);

  const categoryProfit = [...productProfit.reduce((map, row) => {
    const current = map.get(row.category) || { category: row.category, units: 0, revenuePkr: 0, costPkr: 0 };
    current.units += row.units;
    current.revenuePkr = money(current.revenuePkr + row.revenuePkr);
    current.costPkr = money(current.costPkr + row.costPkr);
    map.set(row.category, current);
    return map;
  }, new Map()).values()]
    .map((row) => ({
      ...row,
      profitPkr: money(row.revenuePkr - row.costPkr),
      marginPercent: row.revenuePkr ? Math.round(((row.revenuePkr - row.costPkr) / row.revenuePkr) * 100) : 0,
    }))
    .sort((left, right) => right.profitPkr - left.profitPkr);

  // -- Inventory ------------------------------------------------------------
  const soldUnitsByProduct = new Map(productProfit.map((row) => [row.productId, row.units]));
  const inventoryRows = products.map((product) => {
    const stock = Number(stockByProduct.get(String(product.id))?.stock_quantity ?? 0);
    const threshold = Number(stockByProduct.get(String(product.id))?.low_stock_threshold ?? 5);
    const unitCost = Number(product.cost_total_pkr || 0);
    return {
      productId: String(product.id),
      name: product.name,
      category: parseCategory(product.category),
      stock,
      lowStock: stock <= threshold,
      unitCostPkr: unitCost,
      retailValuePkr: money(stock * Number(product.price || 0)),
      costValuePkr: money(stock * unitCost),
      unitsSoldInPeriod: soldUnitsByProduct.get(String(product.id)) || 0,
    };
  });
  const inventoryRetailValue = money(inventoryRows.reduce((sum, row) => sum + row.retailValuePkr, 0));
  const inventoryCostValue = money(inventoryRows.reduce((sum, row) => sum + row.costValuePkr, 0));
  const deadStock = inventoryRows
    .filter((row) => row.stock > 0 && row.unitsSoldInPeriod === 0 && row.costValuePkr > 0)
    .sort((left, right) => right.costValuePkr - left.costValuePkr);
  const missingCostProducts = products.filter((product) => !Number(product.cost_total_pkr || 0) && product.instock);

  // -- P&L ------------------------------------------------------------------
  const manualOperatingPkr = money(settings.packagingExpensePkr + settings.deliveryExpensePkr);
  const totalOperatingPkr = money(operatingExpenses + manualOperatingPkr);
  const grossProfit = money(grossRevenue - totalCogs);
  const netProfit = money(grossProfit - gstPkr - taxPkr - courierCostPkr - returnLossPkr - totalOperatingPkr);
  const marginPercent = grossRevenue ? Math.round((netProfit / grossRevenue) * 100) : 0;
  const contributionPerOrder = orderRows.length
    ? money(Math.max(0, (grossRevenue - totalCogs - gstPkr - taxPkr - courierCostPkr) / orderRows.length))
    : 0;
  const breakEvenOrders = contributionPerOrder ? Math.ceil(settings.monthlyFixedCostsPkr / contributionPerOrder) : 0;
  const allocatable = Math.max(0, netProfit);
  const marketingAllocation = money(allocatable * settings.marketingPercent / 100);
  const ownerAllocation = money(allocatable * settings.ownerPercent / 100);

  // -- Alerts ---------------------------------------------------------------
  const lossMakingOrders = orderRows.filter((row) => row.netProfitPkr < 0);
  const alerts = [];
  if (availableCashPkr < settings.lowCashThresholdPkr) {
    alerts.push({
      id: "low_cash",
      level: "danger",
      title: "Available cash is low",
      detail: `Balance Rs. ${availableCashPkr.toLocaleString()} — aap ki set ki hui limit Rs. ${settings.lowCashThresholdPkr.toLocaleString()} se neeche hai.`,
    });
  }
  if (availableCashPkr < 0) {
    alerts.push({
      id: "negative_cash",
      level: "danger",
      title: "Cash balance is negative",
      detail: "Kuch receipts record nahi hue ya koi expense do baar chala gaya. Cashbook check karein.",
    });
  }
  if (overdueBills.length) {
    alerts.push({
      id: "supplier_overdue",
      level: "danger",
      title: `${overdueBills.length} supplier bill${overdueBills.length === 1 ? "" : "s"} overdue`,
      detail: overdueBills.map((bill) => `${bill.supplier} Rs. ${Number(bill.remaining_pkr).toLocaleString()}`).join(" · "),
    });
  }
  if (dueSoonBills.length) {
    alerts.push({
      id: "supplier_due_soon",
      level: "warning",
      title: `${dueSoonBills.length} supplier bill${dueSoonBills.length === 1 ? "" : "s"} due soon`,
      detail: dueSoonBills.map((bill) => `${bill.supplier} — ${bill.due_date}`).join(" · "),
    });
  }
  if (stuckReceivables.length) {
    alerts.push({
      id: "receivable_stuck",
      level: "warning",
      title: `${stuckReceivables.length} delivered order${stuckReceivables.length === 1 ? "" : "s"} still unpaid by PostEx`,
      detail: `Sab se purana ${stuckReceivables[0].daysWaiting} din se pending hai.`,
    });
  }
  if (lossMakingOrders.length) {
    alerts.push({
      id: "loss_orders",
      level: "warning",
      title: `${lossMakingOrders.length} order${lossMakingOrders.length === 1 ? "" : "s"} ne loss diya`,
      detail: `Total loss Rs. ${Math.abs(lossMakingOrders.reduce((sum, row) => sum + row.netProfitPkr, 0)).toLocaleString()}.`,
    });
  }
  if (advanceNotInCash.length) {
    alerts.push({
      id: "advance_not_in_cash",
      level: "warning",
      title: `${advanceNotInCash.length} verified advance abhi cash mein nahi aaya`,
      detail: "Payments tab se 'Import verified advances' chalayein.",
    });
  }
  if (missingCostProducts.length) {
    alerts.push({
      id: "missing_cost",
      level: "warning",
      title: `${missingCostProducts.length} active product${missingCostProducts.length === 1 ? "" : "s"} ki cost missing hai`,
      detail: "Cost ke baghair profit asal se zyada dikhta hai.",
    });
  }
  if (estimatedCogsOrders.length) {
    alerts.push({
      id: "estimated_cogs",
      level: "info",
      title: `${estimatedCogsOrders.length} delivered order ki cost estimate hai`,
      detail: "Ye orders snapshot se pehle deliver hue the. 'Backfill costs' chala kar lock kar dein.",
    });
  }
  if (unassignedBalancePkr !== 0) {
    alerts.push({
      id: "unassigned_cash",
      level: "info",
      title: "Kuch entries kisi account se linked nahi",
      detail: `Rs. ${Math.abs(unassignedBalancePkr).toLocaleString()} "Unassigned" mein hai. Total cash sahi hai, sirf account breakdown adhoora hai.`,
    });
  }

  return {
    period: window,
    settings,
    accounts: accountBalances,
    cash: {
      availableCashPkr,
      unassignedBalancePkr,
      inPkr: cashIn,
      outPkr: cashOut,
      netPkr: money(cashIn - cashOut),
      postexReceiptsPkr: postexReceipts,
      advanceReceiptsPkr: advanceReceipts,
      otherIncomePkr: otherIncome,
      ownerInvestmentsPkr: ownerInvestments,
      ownerWithdrawalsPkr: ownerWithdrawals,
      operatingExpensesPkr: operatingExpenses,
      inventorySpendPkr: inventorySpend,
      supplierPaymentsPkr: supplierPayments,
      expenseByCategory,
      expectedClosingCashPkr: money(availableCashPkr + receivablePkr - payableDueIn30Days),
    },
    sales: {
      deliveredOrders: orderRows.length,
      returnedOrders: returned.length,
      pipelineOrders: pipeline.length,
      pipelineValuePkr: money(pipeline.reduce((sum, order) => sum + Number(order.total_pkr || 0), 0)),
      unitsSold,
      grossRevenuePkr: grossRevenue,
      productRevenuePkr: productRevenue,
      deliveryCollectedPkr: money(grossRevenue - productRevenue),
      averageOrderValuePkr: orderRows.length ? money(grossRevenue / orderRows.length) : 0,
      returnRatePercent: orderRows.length + returned.length
        ? Math.round((returned.length / (orderRows.length + returned.length)) * 100)
        : 0,
    },
    pnl: {
      revenuePkr: grossRevenue,
      cogsPkr: totalCogs,
      grossProfitPkr: grossProfit,
      gstPkr,
      taxPkr,
      courierCostPkr,
      returnLossPkr,
      operatingExpensesPkr: totalOperatingPkr,
      manualOperatingPkr,
      netProfitPkr: netProfit,
      marginPercent,
      contributionPerOrderPkr: contributionPerOrder,
      breakEvenOrders,
      estimatedCogsOrderCount: estimatedCogsOrders.length,
      allocation: {
        allocatablePkr: allocatable,
        marketingPkr: marketingAllocation,
        ownerPkr: ownerAllocation,
        stockPkr: money(Math.max(0, allocatable - marketingAllocation - ownerAllocation)),
      },
    },
    postex: {
      setupAvailable: postex.setupAvailable !== false,
      expectedNetPkr,
      expectedNetAllTimePkr: expectedNetAllTime,
      receivedPkr: postexReceivedAllTime,
      receivablePkr,
      stuckReceivables,
      batches: postex.batches || [],
      payments: postex.payments || [],
    },
    advances: {
      verifiedPkr: advanceVerifiedPkr,
      pendingPkr: advancePendingPkr,
      rows: advanceRows,
      notInCashCount: advanceNotInCash.length,
    },
    suppliers: {
      payablePkr: supplierPayablePkr,
      dueIn30DaysPkr: payableDueIn30Days,
      overdue: overdueBills,
      dueSoon: dueSoonBills,
      bills: supplierBills,
    },
    marketing: {
      spendPkr: marketingSpend,
      attributedSalesPkr: marketingSales,
      newCustomers: marketingCustomers,
      roas: marketingSpend ? Math.round((marketingSales / marketingSpend) * 100) / 100 : 0,
      cacPkr: marketingCustomers ? money(marketingSpend / marketingCustomers) : 0,
      campaigns: periodCampaigns,
    },
    products: productProfit,
    categories: categoryProfit,
    orders: orderRows,
    inventory: {
      retailValuePkr: inventoryRetailValue,
      costValuePkr: inventoryCostValue,
      lowStockValuePkr: money(inventoryRows.filter((row) => row.lowStock).reduce((sum, row) => sum + row.retailValuePkr, 0)),
      productsTracked: products.length,
      lowStockCount: inventoryRows.filter((row) => row.lowStock).length,
      missingCostCount: missingCostProducts.length,
      deadStock: deadStock.slice(0, 25),
      deadStockValuePkr: money(deadStock.reduce((sum, row) => sum + row.costValuePkr, 0)),
    },
    transactions: periodTransactions,
    alerts,
  };
}

/**
 * Twelve month-by-month totals for the trend chart. Computed from the same
 * primitives as the main report so the two can never disagree.
 */
export async function buildMonthlyTrend({ months = 12, data } = {}) {
  const loaded = data || (await loadFinanceData());
  const now = new Date();
  const results = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const report = computeFinanceReport(loaded, {
      period: "custom",
      from: start.toISOString().slice(0, 10),
      to: new Date(start.getFullYear(), start.getMonth() + 1, 0).toISOString().slice(0, 10),
      label: start.toISOString().slice(0, 7),
    });
    results.push({
      month: start.toISOString().slice(0, 7),
      revenuePkr: report.pnl.revenuePkr,
      cogsPkr: report.pnl.cogsPkr,
      expensesPkr: report.pnl.operatingExpensesPkr,
      netProfitPkr: report.pnl.netProfitPkr,
      deliveredOrders: report.sales.deliveredOrders,
    });
  }
  return results;
}
