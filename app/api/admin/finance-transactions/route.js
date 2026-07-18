import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getStoreSettings, updateStoreSettings } from "../../../../lib/storeSettings";

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "finance");
    const settings = await getStoreSettings({ includeFinance: true });
    return NextResponse.json({ transactions: settings.financeTransactions || [], allocation: settings.financeAllocation });
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
    });
    return NextResponse.json({ success: true, transactions: settings.financeTransactions || [], allocation: settings.financeAllocation });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    return NextResponse.json({ error: "Unable to save cashbook." }, { status: 500 });
  }
}
