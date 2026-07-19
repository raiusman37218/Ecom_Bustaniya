import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getStoreSettings } from "../../../../lib/storeSettings";

export async function GET(request) {
  try {
    // Projection includes private cashbook marketing data, so it follows Finance/Dashboard access.
    await authorizeAdminSession(request, "dashboard");
    const settings = await getStoreSettings({ includeFinance: true });
    return NextResponse.json({ transactions: settings.financeTransactions || [] });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const auth = adminAuthErrorResponse(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    return NextResponse.json({ error: "Unable to load inventory profit assumptions." }, { status: 500 });
  }
}
