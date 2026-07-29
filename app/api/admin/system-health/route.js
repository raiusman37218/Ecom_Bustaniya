import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  adminAuthErrorResponse,
  authorizeAdminSession,
} from "../../../../lib/adminAuth";
import { ADMIN_PERMISSIONS, listAdminUsers } from "../../../../lib/adminUsers";
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

async function buildSecurityAudit() {
  const audit = [];
  const push = (status, area, check, detail, action = "") => audit.push({ status, area, check, detail, action });
  const password = optionalEnv("ADMIN_PASSWORD");
  const publicServiceKeys = [
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_SERVICE_KEY",
    "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
    "NEXT_PUBLIC_ADMIN_PASSWORD",
    "NEXT_PUBLIC_ADMIN_SESSION_SECRET",
  ].filter((name) => Boolean(optionalEnv(name)));

  push(
    optionalEnv("ADMIN_SESSION_SECRET") ? "ok" : "fail",
    "Sessions",
    "Signed admin sessions",
    optionalEnv("ADMIN_SESSION_SECRET") ? "Admin session signing secret is configured." : "ADMIN_SESSION_SECRET is missing.",
    optionalEnv("ADMIN_SESSION_SECRET") ? "" : "Add a long random ADMIN_SESSION_SECRET in Vercel/local server env."
  );
  push(
    ADMIN_SESSION_MAX_AGE_SECONDS <= 60 * 60 * 12 ? "ok" : "warning",
    "Sessions",
    "Session expiry",
    `Admin sessions expire after ${Math.round(ADMIN_SESSION_MAX_AGE_SECONDS / 3600)} hour(s).`,
    ADMIN_SESSION_MAX_AGE_SECONDS <= 60 * 60 * 12 ? "" : "Keep admin sessions at 12 hours or less for safer shared-device use."
  );
  push(
    password && password !== "Bustaniya@1122" && password.length >= 14 ? "ok" : password && password !== "Bustaniya@1122" ? "warning" : "fail",
    "Password",
    "Owner password strength",
    !password ? "ADMIN_PASSWORD is missing." : password === "Bustaniya@1122" ? "Default admin password is still configured." : `Custom admin password is configured with ${password.length} characters.`,
    password && password !== "Bustaniya@1122" && password.length >= 14 ? "" : "Use a unique owner password of at least 14 characters and remove the previous/default password."
  );
  push(
    publicServiceKeys.length ? "fail" : "ok",
    "Secrets",
    "No public secret env vars",
    publicServiceKeys.length ? `Dangerous public env names detected: ${publicServiceKeys.join(", ")}` : "No known secret/service env vars are exposed with NEXT_PUBLIC_ names.",
    publicServiceKeys.length ? "Remove these from public env immediately and rotate any exposed secrets." : ""
  );
  push(
    "ok",
    "Login",
    "Login brute-force guard",
    "Admin login route rate-limits repeated failed attempts per client.",
    ""
  );
  push(
    "ok",
    "Logout",
    "Logout clears session",
    "Admin logout route expires the signed session cookie server-side.",
    ""
  );
  push(
    "ok",
    "Cookies",
    "HttpOnly session cookie",
    "Admin auth uses an HttpOnly SameSite cookie; frontend/local state alone cannot create admin access.",
    ""
  );
  push(
    "ok",
    "Authorization",
    "Server-side permission checks",
    "Admin APIs use signed session verification and permission checks server-side.",
    ""
  );
  push(
    "ok",
    "Protected routes",
    "No frontend-only authorization",
    "Admin data routes require the signed cookie and do not trust localStorage/frontend state for privileges.",
    ""
  );
  push(
    "ok",
    "Supabase Auth",
    "Admin auth model",
    "This project uses custom signed admin sessions plus Supabase service-role access on the server, not public Supabase Auth sessions for admin access.",
    "If customer accounts are added later, keep customer Supabase Auth separate from owner/staff admin sessions."
  );

  try {
    const users = await listAdminUsers();
    const activeOwners = users.filter((user) => user.role === "Owner" && user.status === "Active");
    const invalidPermissionUsers = users.filter((user) =>
      (user.permissions || []).some((permission) => !ADMIN_PERMISSIONS.includes(permission))
    );
    push(
      activeOwners.length ? "ok" : "fail",
      "Roles",
      "Active owner account",
      activeOwners.length ? `${activeOwners.length} active owner account(s) found.` : "No active owner account found.",
      activeOwners.length ? "" : "Create or enable one owner account before relying on staff roles."
    );
    push(
      invalidPermissionUsers.length ? "warning" : "ok",
      "Roles",
      "Permission integrity",
      invalidPermissionUsers.length ? `${invalidPermissionUsers.length} admin user(s) have unknown permissions.` : "All admin permissions match the supported permission list.",
      invalidPermissionUsers.length ? "Review admin user permissions and remove unsupported values." : ""
    );
    push(
      users.length ? "ok" : "warning",
      "Users",
      "Admin user store",
      users.length ? `${users.length} admin user record(s) loaded successfully.` : "No admin users loaded; env owner fallback may be the only login path.",
      users.length ? "" : "Run admin_users SQL setup and keep owner/staff users in Supabase for production."
    );
  } catch (error) {
    push(
      "fail",
      "Users",
      "Admin user store",
      error?.message || "Unable to load admin users.",
      "Check admin_users table setup and server write permissions."
    );
  }

  return audit;
}

function buildDeploymentAudit(request) {
  const audit = [];
  const push = (status, area, check, detail, action = "") => audit.push({ status, area, check, detail, action });
  const vercelEnv = optionalEnv("VERCEL_ENV");
  const nodeEnv = optionalEnv("NODE_ENV");
  const vercelUrl = optionalEnv("VERCEL_URL");
  const siteUrl = optionalEnv("NEXT_PUBLIC_SITE_URL") || optionalEnv("SITE_URL");
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const forwardedProto = request.headers.get("x-forwarded-proto") || "";
  const deploymentId = optionalEnv("VERCEL_GIT_COMMIT_SHA") || optionalEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA");

  push(
    optionalEnv("VERCEL") ? "ok" : "warning",
    "Deployment",
    "Vercel runtime",
    optionalEnv("VERCEL") ? "Request is running on Vercel runtime." : "VERCEL env is not present; this may be local/dev runtime.",
    optionalEnv("VERCEL") ? "" : "On production this should be present. If absent on live, verify deployment platform configuration."
  );
  push(
    vercelEnv === "production" ? "ok" : vercelEnv ? "warning" : "warning",
    "Deployment",
    "Environment",
    vercelEnv ? `Vercel environment is ${vercelEnv}.` : `Vercel environment is not exposed; NODE_ENV is ${nodeEnv || "unknown"}.`,
    vercelEnv === "production" ? "" : "Confirm production deploy is using the Production environment, not Preview/Development."
  );
  push(
    vercelUrl ? "ok" : "warning",
    "Deployment",
    "Deployment URL",
    vercelUrl ? "Vercel deployment URL is configured." : "VERCEL_URL is not available.",
    vercelUrl ? "" : "If this is production, check Vercel system env exposure."
  );
  push(
    siteUrl ? "ok" : "warning",
    "Domains",
    "Canonical site URL",
    siteUrl ? "Canonical site URL env is configured." : "No SITE_URL/NEXT_PUBLIC_SITE_URL env found.",
    siteUrl ? "" : "Add canonical production URL env for SEO, emails, payment callbacks and absolute links."
  );
  push(
    forwardedHost.includes("bustaniya.com") || (siteUrl && siteUrl.includes("bustaniya.com")) ? "ok" : "warning",
    "Domains",
    "Production domain",
    forwardedHost ? `Current host observed as ${forwardedHost}.` : "No host header observed.",
    forwardedHost.includes("bustaniya.com") || (siteUrl && siteUrl.includes("bustaniya.com")) ? "" : "Verify bustaniya.com is attached as the production domain in Vercel."
  );
  push(
    forwardedProto.includes("https") || optionalEnv("VERCEL") ? "ok" : "warning",
    "Security",
    "HTTPS delivery",
    forwardedProto ? `Forwarded protocol is ${forwardedProto}.` : "Forwarded protocol header is not available.",
    forwardedProto.includes("https") || optionalEnv("VERCEL") ? "" : "Ensure production traffic is HTTPS-only."
  );
  push(
    envPresent(["SUPABASE_URL"]) && envPresent(SERVICE_KEY_NAMES) && optionalEnv("ADMIN_SESSION_SECRET") ? "ok" : "fail",
    "Environment variables",
    "Required server env",
    "Supabase URL, service key and admin session secret are checked without printing values.",
    envPresent(["SUPABASE_URL"]) && envPresent(SERVICE_KEY_NAMES) && optionalEnv("ADMIN_SESSION_SECRET")
      ? ""
      : "Add missing production env vars in Vercel Project Settings → Environment Variables."
  );
  push(
    deploymentId ? "ok" : "warning",
    "Deployment consistency",
    "Git commit metadata",
    deploymentId ? "Git commit metadata is available for this deployment." : "Git commit metadata is not available in runtime env.",
    deploymentId ? "" : "Enable Vercel system env vars to make deployed commit easier to verify."
  );
  push(
    "ok",
    "Serverless/API",
    "Dynamic admin health route",
    "This health endpoint is dynamic, authenticated and server-rendered on demand.",
    ""
  );
  push(
    "warning",
    "Logs",
    "Runtime logs",
    "Runtime logs cannot be read safely from the app itself.",
    "Use Vercel dashboard logs for production runtime errors after each deployment."
  );

  return audit;
}

async function timedCheck(label, runner) {
  const startedAt = Date.now();
  try {
    const result = await runner();
    return { label, durationMs: Date.now() - startedAt, ok: true, result };
  } catch (error) {
    return { label, durationMs: Date.now() - startedAt, ok: false, error };
  }
}

function cloudinaryOptimized(url = "") {
  const value = String(url || "");
  return value.includes("res.cloudinary.com") && /\/(?:c_|q_auto|f_auto|w_|h_)/i.test(value);
}

function extractImageUrls(product) {
  const urls = [];
  if (product?.img) urls.push(product.img);
  const media = Array.isArray(product?.media) ? product.media : [];
  for (const item of media) {
    if (typeof item === "string") urls.push(item);
    if (item?.src) urls.push(item.src);
    if (item?.url) urls.push(item.url);
  }
  return urls.filter(Boolean);
}

async function buildPerformanceAudit() {
  const audit = [];
  const push = (status, area, check, detail, action = "") => audit.push({ status, area, check, detail, action });

  const catalogTiming = await timedCheck("Public catalog API", () =>
    supabaseRequest("products?select=id,name,price,img,media,instock&instock=eq.true&limit=12")
  );
  push(
    !catalogTiming.ok ? "fail" : catalogTiming.durationMs <= 700 ? "ok" : catalogTiming.durationMs <= 1500 ? "warning" : "fail",
    "API latency",
    "Public catalog query",
    catalogTiming.ok
      ? `Sample public catalog query completed in ${catalogTiming.durationMs}ms.`
      : `Catalog query failed: ${formatSupabaseError(catalogTiming.error)}`,
    catalogTiming.ok && catalogTiming.durationMs <= 700 ? "" : "Review Supabase indexes, selected columns and API caching for product listing."
  );

  const adminOrdersTiming = await timedCheck("Admin orders API data", () =>
    supabaseAdminRequest("orders?select=id,total_pkr,status,courier_status,created_at&order=created_at.desc&limit=25")
  );
  push(
    !adminOrdersTiming.ok ? "fail" : adminOrdersTiming.durationMs <= 900 ? "ok" : adminOrdersTiming.durationMs <= 1800 ? "warning" : "fail",
    "API latency",
    "Admin orders query",
    adminOrdersTiming.ok
      ? `Sample admin orders query completed in ${adminOrdersTiming.durationMs}ms.`
      : `Admin orders query failed: ${formatSupabaseError(adminOrdersTiming.error)}`,
    adminOrdersTiming.ok && adminOrdersTiming.durationMs <= 900 ? "" : "Add/verify indexes on order date/status fields and keep admin selects lean."
  );

  const imageTiming = await timedCheck("Product image sample", () =>
    supabaseAdminRequest("products?select=id,img,media&limit=20")
  );
  if (imageTiming.ok) {
    const imageUrls = (imageTiming.result || []).flatMap(extractImageUrls);
    const cloudinaryImages = imageUrls.filter((url) => String(url).includes("res.cloudinary.com"));
    const optimizedImages = cloudinaryImages.filter(cloudinaryOptimized);
    const localImages = imageUrls.filter((url) => String(url).startsWith("/"));
    push(
      !imageUrls.length ? "warning" : optimizedImages.length === cloudinaryImages.length ? "ok" : "warning",
      "Images",
      "Product image optimization",
      `${imageUrls.length} image URL(s) sampled. ${optimizedImages.length}/${cloudinaryImages.length} Cloudinary URL(s) include transformation hints.`,
      optimizedImages.length === cloudinaryImages.length
        ? ""
        : "Use Cloudinary delivery transformations such as f_auto,q_auto,w_... for heavy product/hero images."
    );
    push(
      localImages.length ? "warning" : "ok",
      "Images",
      "Static/local image risk",
      localImages.length ? `${localImages.length} sampled product image(s) are local/static paths.` : "Sampled product images are externally optimized URLs.",
      localImages.length ? "Move production product media to Cloudinary optimized URLs where possible." : ""
    );
  } else {
    push(
      "warning",
      "Images",
      "Product image optimization",
      `Could not sample product images: ${formatSupabaseError(imageTiming.error)}`,
      "Refresh after Supabase product table is reachable."
    );
  }

  push(
    "ok",
    "Caching",
    "Static storefront pages",
    "Policy/contact/static pages are statically generated in the build; dynamic product/category pages render on demand.",
    "For high traffic, add explicit revalidation/caching to catalog APIs once inventory freshness rules are finalized."
  );
  push(
    "warning",
    "JavaScript bundle",
    "Admin bundle size",
    "Admin is a large single client component, so first-load JS grows as features are added.",
    "Next polish phase: split heavy admin modules into lazy-loaded chunks by section."
  );
  push(
    "ok",
    "Loading states",
    "Admin loading shell",
    "Admin has a professional skeleton loading shell and table empty/loading states.",
    ""
  );
  push(
    "warning",
    "Layout shifts",
    "Image dimensions",
    "Cloudinary/product images rely on CSS containers; some remote images may still shift if dimensions are unknown.",
    "Prefer fixed aspect-ratio containers and optimized image components for all product/hero media."
  );
  push(
    "warning",
    "Duplicate requests",
    "Client-side data refresh",
    "Some admin sections refresh independently and can duplicate requests during rapid navigation.",
    "Add shared fetch/cache layer later if admin traffic or latency increases."
  );

  return audit;
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

    const securityAudit = await buildSecurityAudit();
    const deploymentAudit = buildDeploymentAudit(request);
    const performanceAudit = await buildPerformanceAudit();

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
      securityAudit,
      securitySummary: securityAudit.reduce(
        (total, item) => ({ ...total, [item.status]: (total[item.status] || 0) + 1 }),
        { ok: 0, warning: 0, fail: 0 }
      ),
      deploymentAudit,
      deploymentSummary: deploymentAudit.reduce(
        (total, item) => ({ ...total, [item.status]: (total[item.status] || 0) + 1 }),
        { ok: 0, warning: 0, fail: 0 }
      ),
      performanceAudit,
      performanceSummary: performanceAudit.reduce(
        (total, item) => ({ ...total, [item.status]: (total[item.status] || 0) + 1 }),
        { ok: 0, warning: 0, fail: 0 }
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
