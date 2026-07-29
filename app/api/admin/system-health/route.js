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

const FEATURE_SUPPORT = [
  {
    feature: "Products",
    required: ["products"],
    selectChecks: [{ table: "products", select: "id,name,price,compare_at_price,status,slug,meta_title,meta_description,img" }],
    purpose: "Public catalogue, admin editing, SEO and pricing.",
  },
  {
    feature: "Product variants",
    required: ["products"],
    selectChecks: [{ table: "products", select: "id,sizes,colors,sku" }],
    purpose: "Size/color options and SKU-level selling.",
    note: "Current implementation stores variant options on product rows; use dedicated variant rows only if true per-variant stock/pricing becomes required.",
  },
  {
    feature: "Categories / collections",
    required: ["catalog_categories"],
    selectChecks: [{ table: "catalog_categories", select: "id,name,slug,parent_id,image_url,is_active,sort_order" }],
    purpose: "Nested category navigation and storefront category pages.",
  },
  {
    feature: "Inventory",
    required: ["inventory", "inventory_movements", "production_batches"],
    selectChecks: [
      { table: "inventory", select: "product_id,stock_quantity,low_stock_threshold" },
      { table: "inventory_movements", select: "id,product_id,quantity,reason" },
      { table: "production_batches", select: "id,status,total_units,total_cost_pkr" },
    ],
    purpose: "Stock value, stock movements, production costing and restock planning.",
  },
  {
    feature: "Customers",
    required: ["orders"],
    selectChecks: [{ table: "orders", select: "id,shipping_full_name,customer_phone,customer_email,shipping_city" }],
    purpose: "Customer list is derived from orders until a dedicated customer profile table is needed.",
    note: "A separate customers table is optional; derived customers are acceptable for the current Bustaniya size.",
  },
  {
    feature: "Addresses",
    required: ["orders"],
    selectChecks: [{ table: "orders", select: "shipping_house_no,shipping_street_no,shipping_block,shipping_landmark,shipping_address,shipping_city" }],
    purpose: "Checkout delivery address and courier booking.",
  },
  {
    feature: "Orders / order items",
    required: ["orders", "order_items"],
    selectChecks: [
      { table: "orders", select: "id,status,total_pkr,payment_status,courier_status,tracking_number" },
      { table: "order_items", select: "order_id,product_id,quantity,price_pkr" },
    ],
    purpose: "Order lifecycle, packing, courier booking and finance calculations.",
  },
  {
    feature: "Payments / settlements",
    required: ["postex_order_payments", "postex_cpr_batches", "postex_cpr_items", "finance_transactions"],
    selectChecks: [
      { table: "postex_order_payments", select: "order_id,expected_amount_pkr,received_amount_pkr,status" },
      { table: "postex_cpr_batches", select: "id,deposit_amount_pkr,status" },
      { table: "postex_cpr_items", select: "id,order_id,paid_amount_pkr,remaining_amount_pkr" },
      { table: "finance_transactions", select: "id,type,amount_pkr,source" },
    ],
    purpose: "COD receivable, CPR reconciliation, wallet/cashbook and available balance.",
  },
  {
    feature: "Shipping / couriers",
    required: ["courier_accounts", "orders"],
    selectChecks: [
      { table: "courier_accounts", select: "id,provider,is_active" },
      { table: "orders", select: "id,courier_provider,courier_status,tracking_number" },
    ],
    purpose: "PostEx routing, tracking and courier operations.",
  },
  {
    feature: "Discounts",
    required: ["store_settings"],
    selectChecks: [{ table: "store_settings", select: "id,settings" }],
    purpose: "Discounts can be stored in settings for now; create coupons table only when coupon usage limits/history are required.",
    note: "Dedicated discount/coupon table is not required unless campaign-level coupon tracking is introduced.",
  },
  {
    feature: "Returns / refunds",
    required: ["order_operations", "order_operation_events", "inventory_movements", "finance_transactions"],
    selectChecks: [
      { table: "order_operations", select: "order_id,type,status" },
      { table: "order_operation_events", select: "id,order_id,event_type" },
      { table: "inventory_movements", select: "id,reason,quantity" },
      { table: "finance_transactions", select: "id,type,amount_pkr" },
    ],
    purpose: "Return inspection, stock restoration and courier-loss finance impact.",
  },
  {
    feature: "Admins / roles",
    required: ["admin_users"],
    selectChecks: [{ table: "admin_users", select: "id,name,email,role,permissions,status" }],
    purpose: "Owner/staff permissions and protected admin actions.",
  },
  {
    feature: "Media",
    required: ["products", "store_settings"],
    selectChecks: [
      { table: "products", select: "id,img,media" },
      { table: "store_settings", select: "id,settings" },
    ],
    purpose: "Product images and Cloudinary hero image URLs.",
    note: "Cloudinary URL storage is enough for now; Supabase Storage is optional.",
  },
  {
    feature: "Settings",
    required: ["store_settings"],
    selectChecks: [{ table: "store_settings", select: "id,settings,updated_at" }],
    purpose: "Homepage, checkout, payment and branding settings.",
  },
  {
    feature: "Suppliers / payables",
    required: ["supplier_bills", "supplier_payments"],
    selectChecks: [
      { table: "supplier_bills", select: "id,supplier_name,amount_pkr,due_date,status" },
      { table: "supplier_payments", select: "id,bill_id,amount_pkr,paid_at" },
    ],
    purpose: "Supplier statements, due-soon alerts and payment history.",
  },
  {
    feature: "Marketing ROI",
    required: ["marketing_campaigns"],
    selectChecks: [{ table: "marketing_campaigns", select: "id,name,spend_pkr,revenue_pkr,start_date,end_date" }],
    purpose: "Campaign spend, ROAS and weekly marketing report.",
  },
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

async function checkFeatureSupport(definition) {
  const failures = [];
  for (const check of definition.selectChecks) {
    try {
      await supabaseAdminRequest(`${check.table}?select=${check.select}&limit=1`);
    } catch (error) {
      failures.push(`${check.table}: ${formatSupabaseError(error)}`);
    }
  }

  const status = failures.length === 0 ? "complete" : failures.length < definition.selectChecks.length ? "partial" : "missing";
  return {
    feature: definition.feature,
    status,
    purpose: definition.purpose,
    requiredTables: definition.required,
    note: definition.note || "",
    gaps: failures,
    action: failures.length
      ? "Run the related SQL setup/migration or adjust column names to match the application contract."
      : "Database support is present for this feature.",
  };
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

    let completeness = [];
    if (optionalEnv("SUPABASE_URL") && envPresent(SERVICE_KEY_NAMES)) {
      const tableChecks = await Promise.all(REQUIRED_TABLES.map(checkTable));
      checks.push(...tableChecks);
      completeness = await Promise.all(FEATURE_SUPPORT.map(checkFeatureSupport));
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
      completeness,
      completenessSummary: completeness.reduce(
        (total, item) => ({ ...total, [item.status]: (total[item.status] || 0) + 1 }),
        { complete: 0, partial: 0, missing: 0 }
      ),
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    return NextResponse.json({ error: "Unable to run backend health check." }, { status: 500 });
  }
}
