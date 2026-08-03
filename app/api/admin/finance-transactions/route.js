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
    await authorizeAdminSession(request, "finance");
    const body = await request.json();
    const existing = await getStoreSettings({ includeFinance: true });
    const proposedTransactions = body.transactions ?? existing.financeTransactions;
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
      supplierBills: body.supplierBills ?? existing.supplierBills,
      financeFixedCosts: body.fixedCosts ?? existing.financeFixedCosts,
      financeManualExpenses: body.manualExpenses ?? existing.financeManualExpenses,
      financePackagingExpense: body.packagingExpense ?? existing.financePackagingExpense,
      financeDeliveryExpense: body.deliveryExpense ?? existing.financeDeliveryExpense,
      marketingCampaigns: body.marketingCampaigns ?? existing.marketingCampaigns,
    });
    const postex = await getPostexSettlementSnapshot();
    return NextResponse.json({ success: true, transactions: settings.financeTransactions || [], allocation: settings.financeAllocation, supplierBills: settings.supplierBills || [], fixedCosts: settings.financeFixedCosts || 0, manualExpenses: settings.financeManualExpenses || [], packagingExpense: settings.financePackagingExpense || 0, deliveryExpense: settings.financeDeliveryExpense || 0, marketingCampaigns: settings.marketingCampaigns || [], postex });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    return NextResponse.json({ error: "Unable to save cashbook." }, { status: 500 });
  }
}
