import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getStoreSettings } from "../../../../lib/storeSettings";
import { listFinanceTransactions } from "../../../../lib/financeStore";
import { getPostexSettlementSnapshot } from "../../../../lib/postexSettlements";

export async function GET(request) {
  try {
    // Projection includes private cashbook marketing data, so it follows Finance/Dashboard access.
    await authorizeAdminSession(request, "dashboard");
    const [dbTransactions, settings, postex] = await Promise.all([
      listFinanceTransactions({ includeVoided: false }).catch(() => null),
      getStoreSettings({ includeFinance: true }),
      getPostexSettlementSnapshot().catch(() => ({ setupAvailable: false, payments: [], batches: [], items: [], summary: {} })),
    ]);
    const normalizedDbTransactions = Array.isArray(dbTransactions)
      ? dbTransactions.map((row) => ({
          id: row.id,
          type: row.entry_type,
          title: row.title,
          category: row.category,
          amount: Number(row.amount_pkr || 0),
          date: row.occurred_on,
          productionBatchId: row.production_batch_id || "",
          voided: row.voided === true,
        }))
      : null;
    return NextResponse.json({
      transactions: normalizedDbTransactions && normalizedDbTransactions.length
        ? normalizedDbTransactions
        : settings.financeTransactions || [],
      postex,
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const auth = adminAuthErrorResponse(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    return NextResponse.json({ error: "Unable to load inventory profit assumptions." }, { status: 500 });
  }
}
