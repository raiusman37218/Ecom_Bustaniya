import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getStoreSettings, updateStoreSettings } from "../../../../lib/storeSettings";
import { getPostexSettlementSnapshot } from "../../../../lib/postexSettlements";

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "finance");
    const [settings, postex] = await Promise.all([
      getStoreSettings({ includeFinance: true }),
      getPostexSettlementSnapshot(),
    ]);
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
    const settings = await updateStoreSettings({
      ...existing,
      financeTransactions: body.transactions ?? existing.financeTransactions,
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
