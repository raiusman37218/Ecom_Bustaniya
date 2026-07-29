import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getStoreSettings } from "../../../../lib/storeSettings";
import { getPostexSettlementSnapshot } from "../../../../lib/postexSettlements";

export async function GET(request) {
  try {
    // Projection includes private cashbook marketing data, so it follows Finance/Dashboard access.
    await authorizeAdminSession(request, "dashboard");
    const [settings, postex] = await Promise.all([
      getStoreSettings({ includeFinance: true }),
      getPostexSettlementSnapshot().catch(() => ({ setupAvailable: false, payments: [], batches: [], items: [], summary: {} })),
    ]);
    return NextResponse.json({ transactions: settings.financeTransactions || [], postex });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const auth = adminAuthErrorResponse(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    return NextResponse.json({ error: "Unable to load inventory profit assumptions." }, { status: 500 });
  }
}
