import { NextResponse } from "next/server";
import { adminAuthErrorResponse, authorizeAdminSession } from "../../../../lib/adminAuth";
import { optionalEnv } from "../../../../lib/env";
import { supabaseAdminRequest, supabaseRequest } from "../../../../lib/supabaseRest";

export const dynamic = "force-dynamic";

const SERVICE_KEY_NAMES = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_SECRET_KEY"];
const PUBLIC_KEY_NAMES = ["SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

const REQUIRED_TABLES = [
  { table: "products", select: "id", area: "Catalog", detail: "Products source of truth for storefront and admin." },
  { table: "inventory", select: "product_id", area: "Inventory", detail: "Stock quantity, thresholds and product cost link." },
  { table: "orders", select: "id", area: "Orders", detail: "Customer orders and courier/payment status." },
  { table: "order_items", select: "order_id", area: "Orders", detail: "Line-item products used for COGS and fulfilment." },
  { table: "inventory_movements", select: "id", area: "Inventory", detail: "Stock in/out audit trail." },
  { table: "store_settings", select: "id", area: "Settings", detail: "Homepage, payments, checkout and hero settings." },
  { table: "admin_users", select: "id", area: "Security", detail: "Role-based admin access." },
  { table: "catalog_categories", select: "id", area: "Catalog", detail: "Nested storefront categories." },
  { table: "finance_transactions", select: "id", area: "Finance", detail: "Cashbook and owner/business allocation records." },
  { table: "supplier_bills", select: "id", area: "Finance", detail: "Accounts payable and supplier statement tracking." },
  { table: "courier_accounts", select: "id", area: "Courier", detail: "Courier configuration and routing readiness." },
  { table: "postex_order_payments", select: "order_id", area: "Settlements", detail: "COD receivable and settlement reconciliation." },
  { table: "postex_cpr_batches", select: "id", area: "Settlements", detail: "Weekly CPR batch summary records." },
  { table: "postex_cpr_items", select: "id", area: "Settlements", detail: "Order-level CPR payment/remainder records." },
  { table: "order_operations", select: "order_id", area: "Returns", detail: "Returns inspection and courier loss workflow." },
  { table: "order_operation_events", select: "id", area: "Returns", detail: "Operations timeline/history for orders." },
  { table: "marketing_campaigns", select: "id", area: "Marketing", detail: "Marketing ROI tracker data." },
];

function envPresent(names) {
  return names.some((name) => Boolean(optionalEnv(name)));
}

function pushCheck(checks, status, area, name, detail, action = "") {
  checks.push({ status, area, name, detail, action });
}

function formatSupabaseError(error) {
  const code = error?.details?.code || error?.status || "";
  const message = error?.message || "Unable to read through Supabase REST API.";
  return code ? `${message} (${code})` : message;
}

async function checkTable(definition) {
  try {
    await supabaseAdminRequest(`${definition.table}?select=${definition.select}&limit=1`);
    return {
      status: "ok",
      area: definition.area,
      name: definition.table,
      detail: definition.detail,
      action: "",
    };
  } catch (error) {
    return {
      status: "fail",
      area: definition.area,
      name: definition.table,
      detail: formatSupabaseError(error),
      action: "Run the related Supabase SQL setup/migration for this feature, then refresh this health check.",
    };
  }
}

async function checkPublicCostExposure() {
  try {
    await supabaseRequest("products?select=cost_total_pkr&limit=1");
    return {
      status: "fail",
      area: "Security",
      name: "Public cost fields",
      detail: "Public/anon API can read product cost_total_pkr.",
      action: "Keep private cost fields blocked from anon/authenticated reads via the public products policy/view.",
    };
  } catch (error) {
    if ([401, 403, 400].includes(Number(error?.status))) {
      return {
        status: "ok",
        area: "Security",
        name: "Public cost fields",
        detail: "Private product cost fields are not readable through the public key.",
        action: "",
      };
    }
    return {
      status: "warning",
      area: "Security",
      name: "Public cost fields",
      detail: `Could not complete anon exposure check: ${formatSupabaseError(error)}`,
      action: "Refresh after Supabase public key/config is available.",
    };
  }
}

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "settings");

    const checks = [];
    pushCheck(
      checks,
      optionalEnv("SUPABASE_URL") ? "ok" : "fail",
      "Environment",
      "SUPABASE_URL",
      optionalEnv("SUPABASE_URL") ? "Supabase project URL is configured." : "Supabase project URL is missing.",
      optionalEnv("SUPABASE_URL") ? "" : "Add SUPABASE_URL in Vercel/local env."
    );
    pushCheck(
      checks,
      envPresent(PUBLIC_KEY_NAMES) ? "ok" : "fail",
      "Environment",
      "Supabase public key",
      envPresent(PUBLIC_KEY_NAMES) ? "Publishable/anon key is configured for public reads." : "No publishable/anon key found.",
      envPresent(PUBLIC_KEY_NAMES) ? "" : "Add SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY."
    );
    pushCheck(
      checks,
      envPresent(SERVICE_KEY_NAMES) ? "ok" : "fail",
      "Environment",
      "Supabase service key",
      envPresent(SERVICE_KEY_NAMES) ? "Server-only service key is configured." : "No server service key found.",
      envPresent(SERVICE_KEY_NAMES) ? "" : "Add SUPABASE_SERVICE_ROLE_KEY only in server/Vercel env, never in NEXT_PUBLIC."
    );
    pushCheck(
      checks,
      optionalEnv("ADMIN_SESSION_SECRET") ? "ok" : "fail",
      "Security",
      "Admin session secret",
      optionalEnv("ADMIN_SESSION_SECRET") ? "Admin sessions can be signed securely." : "Admin session secret is missing.",
      optionalEnv("ADMIN_SESSION_SECRET") ? "" : "Add a long random ADMIN_SESSION_SECRET."
    );
    pushCheck(
      checks,
      optionalEnv("ADMIN_PASSWORD") ? "ok" : "warning",
      "Security",
      "Owner password",
      optionalEnv("ADMIN_PASSWORD") ? "Custom owner password is configured." : "ADMIN_PASSWORD is not configured.",
      optionalEnv("ADMIN_PASSWORD") ? "" : "Set a strong ADMIN_PASSWORD and remove any old/default password."
    );

    if (optionalEnv("SUPABASE_URL") && envPresent(SERVICE_KEY_NAMES)) {
      const tableChecks = await Promise.all(REQUIRED_TABLES.map(checkTable));
      checks.push(...tableChecks);
    } else {
      pushCheck(
        checks,
        "warning",
        "Database",
        "Table audit skipped",
        "Service DB checks were skipped because Supabase URL/service key is not fully configured.",
        "Fix environment variables, then refresh."
      );
    }

    if (optionalEnv("SUPABASE_URL") && envPresent(PUBLIC_KEY_NAMES)) {
      checks.push(await checkPublicCostExposure());
    }

    const summary = checks.reduce(
      (total, check) => ({ ...total, [check.status]: (total[check.status] || 0) + 1 }),
      { ok: 0, warning: 0, fail: 0 }
    );

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary,
      checks,
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    return NextResponse.json({ error: "Unable to run backend health check." }, { status: 500 });
  }
}
