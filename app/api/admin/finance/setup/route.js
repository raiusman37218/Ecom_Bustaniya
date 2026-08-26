import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../../lib/adminAuth";
import {
  getFinanceSettings,
  listFinanceAccounts,
  migrateLegacyFinanceData,
  isMissingTableError,
} from "../../../../../lib/financeStore";
import { supabaseAdminRequestWithCount } from "../../../../../lib/supabaseRest";

function authFailure(error) {
  if (error?.status === 401 || error?.status === 403) {
    const authError = adminAuthErrorResponse(error);
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }
  return null;
}

const SETUP_HINT = "Run scripts/supabase-finance.sql in the Supabase SQL editor to create the finance tables.";

async function tableCount(table) {
  const { total } = await supabaseAdminRequestWithCount(`${table}?select=id&limit=1`);
  return total;
}

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "finance");
    const settings = await getFinanceSettings();
    if (!settings) {
      return NextResponse.json({ tablesReady: false, hint: SETUP_HINT });
    }
    const [accounts, transactions, supplierBills, marketingCampaigns] = await Promise.all([
      listFinanceAccounts(),
      tableCount("finance_transactions"),
      tableCount("finance_supplier_bills"),
      tableCount("finance_marketing_campaigns"),
    ]);
    return NextResponse.json({
      tablesReady: true,
      legacyMigratedAt: settings.legacy_migrated_at,
      accounts,
      counts: { transactions, supplierBills, marketingCampaigns },
    });
  } catch (error) {
    const failure = authFailure(error);
    if (failure) return failure;
    if (isMissingTableError(error)) {
      return NextResponse.json({ tablesReady: false, hint: SETUP_HINT });
    }
    console.error("Finance setup status error", { message: error?.message });
    return NextResponse.json({ error: "Unable to read finance setup status." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user } = await authorizeAdminSession(request, "finance");
    if (user.role !== "Owner") {
      return NextResponse.json({ error: "Only an Owner can migrate finance data." }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    if (body.action !== "migrate_legacy") {
      return NextResponse.json({ error: "Unknown finance setup action." }, { status: 400 });
    }
    const result = await migrateLegacyFinanceData({ force: body.force === true });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const failure = authFailure(error);
    if (failure) return failure;
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: SETUP_HINT }, { status: 409 });
    }
    console.error("Finance migration error", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to migrate finance data." }, { status: 500 });
  }
}
