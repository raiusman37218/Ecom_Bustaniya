import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getStoreSettings, updateStoreSettings } from "../../../../lib/storeSettings";
import { getPostexSettlementSnapshot } from "../../../../lib/postexSettlements";

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "finance");
    // Cashbook settings and PostEx settlement tables are separate systems.
    // A missing/incomplete PostEx setup must not stop the whole Finance area
    // from loading (especially the Courier settlements tab).
    const settings = await getStoreSettings({ includeFinance: true });
    let postex = { setupAvailable: false, payments: [], batches: [], items: [], summary: {} };
    try {
      postex = await getPostexSettlementSnapshot();
    } catch (postexError) {
      console.error("PostEx settlement snapshot unavailable", { message: postexError?.message });
    }
    return NextResponse.json({ transactions: settings.financeTransactions || [], allocation: settings.financeAllocation, supplierBills: settings.supplierBills || [], fixedCosts: settings.financeFixedCosts || 0, manualExpenses: settings.financeManualExpenses || [], packagingExpense: settings.financePackagingExpense || 0, deliveryExpense: settings.financeDeliveryExpense || 0, marketingCampaigns: settings.marketingCampaigns || [], postex });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    return NextResponse.json({ error: "Unable to load cashbook." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { user } = await authorizeAdminSession(request, "finance");
    const body = await request.json();
    const existing = await getStoreSettings({ includeFinance: true });
    let proposedTransactions = body.transactions ?? existing.financeTransactions;
    let proposedSupplierBills = body.supplierBills ?? existing.supplierBills;

    if (body.action === "void_transaction") {
      if (user.role !== "Owner") {
        return NextResponse.json({ error: "Only an Owner can void a cashbook movement." }, { status: 403 });
      }
      const transactionId = String(body.transactionId || "").trim();
      const confirmation = String(body.confirmation || "").trim();
      const transaction = (existing.financeTransactions || []).find((item) => String(item.id) === transactionId);
      if (!transaction) return NextResponse.json({ error: "Cashbook movement not found." }, { status: 404 });
      if (transaction.voided === true) return NextResponse.json({ error: "This cashbook movement is already voided." }, { status: 422 });
      if (confirmation !== `VOID ${transaction.id}`) return NextResponse.json({ error: "Void confirmation does not match." }, { status: 422 });
      if (transaction.productionBatchId || String(transaction.title || "").startsWith("Production batch ")) {
        return NextResponse.json({ error: "Void this movement from its production batch so stock and cost reverse together." }, { status: 422 });
      }
      const voidedAt = new Date().toISOString();
      proposedTransactions = (existing.financeTransactions || []).map((item) => String(item.id) === transactionId ? {
        ...item,
        voided: true,
        voidedAt,
        voidedBy: user.name || user.email || "Owner",
        note: [item.note, `VOIDED ${voidedAt}`].filter(Boolean).join(" · "),
      } : item);
      if (transaction.supplierBillId) {
        proposedSupplierBills = (existing.supplierBills || []).map((bill) => {
          if (String(bill.id) !== String(transaction.supplierBillId)) return bill;
          const paid = Math.max(0, Number(bill.paid || 0) - Number(transaction.amount || 0));
          return { ...bill, paid, status: paid >= Number(bill.total || 0) ? "paid" : "open" };
        });
      }
    }
    const activePostexReferences = new Set();
    for (const transaction of Array.isArray(proposedTransactions) ? proposedTransactions : []) {
      if (transaction?.type !== "postex_bank_receipt" || transaction?.voided === true) continue;
      const reference = String(transaction?.reference || String(transaction?.title || "").replace(/^PostEx bank receipt:\s*/i, "")).trim().toLowerCase();
      if (!reference) continue;
      if (activePostexReferences.has(reference)) {
        return NextResponse.json({ error: "This PostEx bank reference / CPR is already active. Void the incorrect receipt instead of adding it again." }, { status: 422 });
      }
      activePostexReferences.add(reference);
    }
    const settings = await updateStoreSettings({
      ...existing,
      financeTransactions: proposedTransactions,
      financeAllocation: body.allocation ?? existing.financeAllocation,
      supplierBills: proposedSupplierBills,
      financeFixedCosts: body.fixedCosts ?? existing.financeFixedCosts,
      financeManualExpenses: body.manualExpenses ?? existing.financeManualExpenses,
      financePackagingExpense: body.packagingExpense ?? existing.financePackagingExpense,
      financeDeliveryExpense: body.deliveryExpense ?? existing.financeDeliveryExpense,
      marketingCampaigns: body.marketingCampaigns ?? existing.marketingCampaigns,
    });
    let postex = { setupAvailable: false, payments: [], batches: [], items: [], summary: {} };
    try {
      postex = await getPostexSettlementSnapshot();
    } catch (postexError) {
      console.error("PostEx settlement snapshot unavailable during PATCH", { message: postexError?.message });
    }
    return NextResponse.json({ success: true, transactions: settings.financeTransactions || [], allocation: settings.financeAllocation, supplierBills: settings.supplierBills || [], fixedCosts: settings.financeFixedCosts || 0, manualExpenses: settings.financeManualExpenses || [], packagingExpense: settings.financePackagingExpense || 0, deliveryExpense: settings.financeDeliveryExpense || 0, marketingCampaigns: settings.marketingCampaigns || [], postex });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    console.error("Finance transaction PATCH error:", error);
    return NextResponse.json({ error: error?.message || "Unable to save cashbook." }, { status: 500 });
  }
}
