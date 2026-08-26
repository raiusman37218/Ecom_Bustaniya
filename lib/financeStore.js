import { supabaseAdminRequest } from "./supabaseRest.js";
import { getStoreSettings } from "./storeSettings.js";

// Every cash movement is one row in finance_transactions. The direction is
// stored rather than derived at read time so cash maths never has to branch.
export const ENTRY_TYPES = {
  business_expense: { direction: "out", label: "Expense paid" },
  owner_withdrawal: { direction: "out", label: "Owner withdrawal" },
  owner_investment: { direction: "in", label: "Owner funds added" },
  supplier_payment: { direction: "out", label: "Supplier payment" },
  postex_bank_receipt: { direction: "in", label: "PostEx bank receipt" },
  customer_advance: { direction: "in", label: "Customer advance" },
  other_income: { direction: "in", label: "Other income" },
  cash_reset: { direction: "out", label: "Opening balance adjustment" },
  transfer_in: { direction: "in", label: "Transfer in" },
  transfer_out: { direction: "out", label: "Transfer out" },
};

export function entryDirection(entryType, fallback = "out") {
  return ENTRY_TYPES[entryType]?.direction || fallback;
}

export function entryLabel(entryType) {
  return ENTRY_TYPES[entryType]?.label || "Finance entry";
}

function encode(value) {
  return encodeURIComponent(String(value));
}

function toDateOnly(value, fallback = "") {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * PostgREST returns 404/PGRST205 while the finance tables do not exist yet.
 * Finance must still render (with a setup notice) instead of erroring out.
 */
export function isMissingTableError(error) {
  const code = error?.details?.code || "";
  const message = String(error?.message || "");
  return code === "PGRST205" || code === "42P01" || /does not exist/i.test(message);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listFinanceAccounts() {
  return supabaseAdminRequest("finance_accounts?select=*&order=sort_order.asc,name.asc");
}

/**
 * Date filtering happens in the database so a long ledger never has to be
 * pulled into the browser just to show one month.
 */
export async function listFinanceTransactions({ from = "", to = "", includeVoided = true, limit = 0 } = {}) {
  const filters = ["select=*", "order=occurred_on.desc,created_at.desc"];
  const fromDate = toDateOnly(from);
  const toDate = toDateOnly(to);
  if (fromDate) filters.push(`occurred_on=gte.${fromDate}`);
  if (toDate) filters.push(`occurred_on=lte.${toDate}`);
  if (!includeVoided) filters.push("voided=is.false");
  if (limit > 0) filters.push(`limit=${Math.floor(limit)}`);
  return supabaseAdminRequest(`finance_transactions?${filters.join("&")}`);
}

export async function listSupplierBills() {
  return supabaseAdminRequest(
    "finance_supplier_bill_balances?select=*&order=due_date.asc.nullslast,bill_date.desc"
  );
}

export async function listMarketingCampaigns({ from = "", to = "" } = {}) {
  const filters = ["select=*", "order=occurred_on.desc"];
  const fromDate = toDateOnly(from);
  const toDate = toDateOnly(to);
  if (fromDate) filters.push(`occurred_on=gte.${fromDate}`);
  if (toDate) filters.push(`occurred_on=lte.${toDate}`);
  return supabaseAdminRequest(`finance_marketing_campaigns?${filters.join("&")}`);
}

export async function getFinanceSettings() {
  const rows = await supabaseAdminRequest("finance_settings?select=*&limit=1");
  return rows?.[0] || null;
}

export async function updateFinanceSettings(patch = {}) {
  const allowed = [
    "marketing_percent",
    "owner_percent",
    "monthly_fixed_costs_pkr",
    "packaging_expense_pkr",
    "delivery_expense_pkr",
    "low_cash_threshold_pkr",
    "supplier_due_alert_days",
    "receivable_stuck_alert_days",
    "legacy_migrated_at",
  ];
  const body = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(body).length) return getFinanceSettings();
  const rows = await supabaseAdminRequest("finance_settings?id=is.true", {
    method: "PATCH",
    body,
    prefer: "return=representation",
  });
  return rows?.[0] || null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function insertFinanceTransactions(entries = []) {
  const rows = (Array.isArray(entries) ? entries : [entries])
    .map((entry) => normalizeTransactionInput(entry))
    .filter(Boolean);
  if (!rows.length) return [];
  return supabaseAdminRequest("finance_transactions", {
    method: "POST",
    body: rows,
    prefer: "return=representation",
  });
}

export function normalizeTransactionInput(entry = {}) {
  const entryType = ENTRY_TYPES[entry.entryType] ? entry.entryType : "business_expense";
  const amount = Math.round(Number(entry.amountPkr ?? entry.amount ?? 0) * 100) / 100;
  if (!(amount > 0)) return null;
  return {
    ...(entry.legacyId ? { legacy_id: String(entry.legacyId) } : {}),
    account_id: entry.accountId || null,
    entry_type: entryType,
    cash_direction: entry.cashDirection === "in" || entry.cashDirection === "out"
      ? entry.cashDirection
      : entryDirection(entryType),
    title: String(entry.title || entryLabel(entryType)).trim().slice(0, 200),
    category: String(entry.category || "Other").trim().slice(0, 120),
    amount_pkr: amount,
    occurred_on: toDateOnly(entry.occurredOn ?? entry.date, todayDateOnly()),
    reference: String(entry.reference || "").trim().slice(0, 160),
    counterparty: String(entry.counterparty || "").trim().slice(0, 160),
    note: String(entry.note || "").trim().slice(0, 500),
    source: [
      "manual", "order_advance", "production_batch", "supplier_bill",
      "postex_receipt", "transfer", "migration",
    ].includes(entry.source) ? entry.source : "manual",
    order_id: entry.orderId || null,
    supplier_bill_id: entry.supplierBillId || null,
    production_batch_id: String(entry.productionBatchId || "").slice(0, 120),
    transfer_group_id: entry.transferGroupId || null,
    created_by: String(entry.createdBy || "").slice(0, 120),
  };
}

export async function voidFinanceTransaction(id, { voidedBy = "" } = {}) {
  const rows = await supabaseAdminRequest(`finance_transactions?id=eq.${encode(id)}`, {
    method: "PATCH",
    body: { voided: true, voided_at: new Date().toISOString(), voided_by: String(voidedBy).slice(0, 120) },
    prefer: "return=representation",
  });
  return rows?.[0] || null;
}

export async function getFinanceTransaction(id) {
  const rows = await supabaseAdminRequest(`finance_transactions?select=*&id=eq.${encode(id)}&limit=1`);
  return rows?.[0] || null;
}

export async function insertSupplierBill(bill = {}) {
  const total = Math.round(Number(bill.totalPkr ?? bill.total ?? 0) * 100) / 100;
  if (!(total > 0) || !String(bill.supplier || "").trim()) return null;
  const rows = await supabaseAdminRequest("finance_supplier_bills", {
    method: "POST",
    body: [{
      ...(bill.legacyId ? { legacy_id: String(bill.legacyId) } : {}),
      supplier: String(bill.supplier).trim().slice(0, 160),
      reference: String(bill.reference || "").trim().slice(0, 160),
      total_pkr: total,
      bill_date: toDateOnly(bill.billDate ?? bill.date, todayDateOnly()),
      due_date: toDateOnly(bill.dueDate) || null,
      note: String(bill.note || "").trim().slice(0, 500),
      status: bill.status === "paid" ? "paid" : "open",
    }],
    prefer: "return=representation",
  });
  return rows?.[0] || null;
}

export async function updateSupplierBillStatus(id, status) {
  const rows = await supabaseAdminRequest(`finance_supplier_bills?id=eq.${encode(id)}`, {
    method: "PATCH",
    body: { status },
    prefer: "return=representation",
  });
  return rows?.[0] || null;
}

export async function insertMarketingCampaign(campaign = {}) {
  const name = String(campaign.name || "").trim();
  if (!name) return null;
  const rows = await supabaseAdminRequest("finance_marketing_campaigns", {
    method: "POST",
    body: [{
      ...(campaign.legacyId ? { legacy_id: String(campaign.legacyId) } : {}),
      name: name.slice(0, 160),
      platform: String(campaign.platform || "Other").trim().slice(0, 60),
      spend_pkr: Math.max(0, Number(campaign.spendPkr ?? campaign.spend ?? 0)),
      attributed_sales_pkr: Math.max(0, Number(campaign.salesPkr ?? campaign.sales ?? 0)),
      new_customers: Math.max(0, Math.floor(Number(campaign.customers || 0))),
      occurred_on: toDateOnly(campaign.occurredOn ?? campaign.date, todayDateOnly()),
      note: String(campaign.note || "").trim().slice(0, 500),
    }],
    prefer: "return=representation",
  });
  return rows?.[0] || null;
}

// ---------------------------------------------------------------------------
// One-time migration out of the store_settings JSON blob
// ---------------------------------------------------------------------------

/**
 * Inserts a batch, and if the batch is rejected (one bad legacy row can trip a
 * partial unique index) retries row by row so the rest still migrates. The
 * skipped rows are reported rather than silently dropped.
 */
async function upsertLegacyRows(table, rows, skipped) {
  if (!rows.length) return [];
  const path = `${table}?on_conflict=legacy_id`;
  const prefer = "return=representation,resolution=merge-duplicates";
  try {
    return await supabaseAdminRequest(path, { method: "POST", body: rows, prefer });
  } catch (batchError) {
    if (isMissingTableError(batchError)) throw batchError;
    const inserted = [];
    for (const row of rows) {
      try {
        const result = await supabaseAdminRequest(path, { method: "POST", body: [row], prefer });
        if (result?.[0]) inserted.push(result[0]);
      } catch (rowError) {
        skipped.push({ table, legacyId: row.legacy_id, reason: rowError?.message || "Rejected by database." });
      }
    }
    return inserted;
  }
}

/**
 * Copies the legacy JSON finance data into the new tables. Every legacy row
 * carries its original id in legacy_id, and inserts use `merge-duplicates`,
 * so running this twice cannot duplicate anything.
 */
export async function migrateLegacyFinanceData({ force = false } = {}) {
  const settings = await getFinanceSettings();
  if (!settings) throw new Error("Finance tables are not set up yet.");
  if (settings.legacy_migrated_at && !force) {
    return { migrated: false, reason: "already_migrated", at: settings.legacy_migrated_at };
  }

  const skipped = [];
  const legacy = await getStoreSettings({ includeFinance: true });
  const accounts = await listFinanceAccounts();
  const bankAccountId = accounts.find((account) => account.slug === "alfalah_owner")?.id || null;

  // Supplier bills first: their payments reference the new bill ids.
  const legacyBills = Array.isArray(legacy.supplierBills) ? legacy.supplierBills : [];
  const billRows = legacyBills
    .filter((bill) => String(bill?.supplier || "").trim() && Number(bill?.total || 0) > 0)
    .map((bill) => ({
      legacy_id: String(bill.id),
      supplier: String(bill.supplier).trim().slice(0, 160),
      reference: String(bill.reference || "").trim().slice(0, 160),
      total_pkr: Number(bill.total),
      bill_date: toDateOnly(bill.date, todayDateOnly()),
      due_date: toDateOnly(bill.dueDate) || null,
      note: String(bill.note || "").trim().slice(0, 500),
      status: bill.status === "paid" ? "paid" : "open",
    }));
  const insertedBills = await upsertLegacyRows("finance_supplier_bills", billRows, skipped);
  const billIdByLegacy = new Map(insertedBills.map((bill) => [bill.legacy_id, bill.id]));

  const legacyTransactions = Array.isArray(legacy.financeTransactions) ? legacy.financeTransactions : [];
  const transactionRows = legacyTransactions
    .filter((item) => Number(item?.amount || 0) > 0)
    .map((item) => {
      const entryType = ENTRY_TYPES[item.type] ? item.type : "business_expense";
      return {
        legacy_id: String(item.id),
        // Only PostEx bank receipts can be placed with confidence; the rest
        // are left unassigned for the owner to attribute to an account.
        account_id: entryType === "postex_bank_receipt" ? bankAccountId : null,
        entry_type: entryType,
        cash_direction: entryType === "cash_reset"
          ? (item.cashDirection === "in" ? "in" : "out")
          : entryDirection(entryType),
        title: String(item.title || entryLabel(entryType)).trim().slice(0, 200),
        category: String(item.category || "Other").trim().slice(0, 120),
        amount_pkr: Number(item.amount),
        occurred_on: toDateOnly(item.date, todayDateOnly()),
        reference: String(item.reference || "").trim().slice(0, 160),
        counterparty: String(item.counterparty || "").trim().slice(0, 160),
        note: String(item.note || "").trim().slice(0, 500),
        source: "migration",
        supplier_bill_id: billIdByLegacy.get(String(item.supplierBillId || "")) || null,
        production_batch_id: String(item.productionBatchId || "").slice(0, 120),
        voided: item.voided === true,
        voided_at: item.voidedAt || null,
        voided_by: String(item.voidedBy || "").slice(0, 120),
      };
    });

  // The legacy "manual expenses" list was a second expense store that fed the
  // same cash total. It becomes an ordinary expense transaction here.
  const legacyManualExpenses = Array.isArray(legacy.financeManualExpenses) ? legacy.financeManualExpenses : [];
  for (const expense of legacyManualExpenses) {
    if (!(Number(expense?.amount || 0) > 0)) continue;
    transactionRows.push({
      legacy_id: `manual-${String(expense.id)}`,
      account_id: null,
      entry_type: "business_expense",
      cash_direction: "out",
      title: String(expense.title || "Expense").trim().slice(0, 200),
      category: String(expense.category || "Other").trim().slice(0, 120),
      amount_pkr: Number(expense.amount),
      occurred_on: toDateOnly(expense.date, todayDateOnly()),
      reference: "",
      counterparty: "",
      note: "Migrated from the old manual expense list.",
      source: "migration",
      supplier_bill_id: null,
      production_batch_id: "",
      voided: false,
      voided_at: null,
      voided_by: "",
    });
  }

  const insertedTransactions = await upsertLegacyRows("finance_transactions", transactionRows, skipped);

  const legacyCampaigns = Array.isArray(legacy.marketingCampaigns) ? legacy.marketingCampaigns : [];
  const campaignRows = legacyCampaigns
    .filter((campaign) => String(campaign?.name || "").trim())
    .map((campaign) => ({
      legacy_id: String(campaign.id),
      name: String(campaign.name).trim().slice(0, 160),
      platform: String(campaign.platform || "Other").trim().slice(0, 60),
      spend_pkr: Math.max(0, Number(campaign.spend || 0)),
      attributed_sales_pkr: Math.max(0, Number(campaign.sales || 0)),
      new_customers: Math.max(0, Math.floor(Number(campaign.customers || 0))),
      occurred_on: toDateOnly(campaign.date, todayDateOnly()),
      note: "",
    }));
  const insertedCampaigns = await upsertLegacyRows("finance_marketing_campaigns", campaignRows, skipped);

  const allocation = legacy.financeAllocation || {};
  await updateFinanceSettings({
    marketing_percent: Math.min(100, Math.max(0, Number(allocation.marketingPercent ?? 25))),
    owner_percent: Math.min(100, Math.max(0, Number(allocation.ownerPercent ?? 30))),
    monthly_fixed_costs_pkr: Math.max(0, Number(legacy.financeFixedCosts || 0)),
    packaging_expense_pkr: Math.max(0, Number(legacy.financePackagingExpense || 0)),
    delivery_expense_pkr: Math.max(0, Number(legacy.financeDeliveryExpense || 0)),
    legacy_migrated_at: new Date().toISOString(),
  });

  return {
    migrated: true,
    counts: {
      transactions: insertedTransactions.length,
      supplierBills: insertedBills.length,
      marketingCampaigns: insertedCampaigns.length,
    },
    skipped,
  };
}
