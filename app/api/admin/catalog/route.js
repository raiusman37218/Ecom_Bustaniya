import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

function revalidateCatalogPaths(productId) {
  try {
    if (productId) {
      revalidatePath(`/product/${productId}`);
      revalidatePath(`/uk/product/${productId}`);
    }
    revalidatePath("/", "layout");
    revalidatePath("/", "page");
    revalidatePath("/uk", "layout");
    revalidatePath("/uk", "page");
    revalidatePath("/search", "page");
    revalidatePath("/product/[id]", "page");
    revalidatePath("/uk/product/[id]", "page");
    revalidatePath("/category/[slug]", "page");
    revalidatePath("/category/[slug]/[subcategory]", "page");
    revalidatePath("/uk/category/[slug]", "page");
    revalidatePath("/uk/category/[slug]/[subcategory]", "page");
    revalidatePath("/uk/product/[id]", "page");
    revalidatePath("/category/[slug]", "page");
    revalidatePath("/", "page");
    revalidatePath("/uk", "page");
    revalidatePath("/admin", "page");
  } catch {}
}
import { DEFAULT_KURTI_BOTTOM_OPTIONS, formatCategorySelection, parseCategorySelection } from "../../../../data/store";
import { authorizeAdminRequest } from "../../../../lib/adminAuth";
import { supabaseAdminRequest, supabaseAdminRpc } from "../../../../lib/supabaseRest";
import { invalidateCatalogCache } from "../../../../lib/catalog";


const DEFAULT_ACTIVE_STOCK = 10;

function generateArticleNumber(product = {}) {
  const namePart = String(product.name || "product")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 8) || "PRODUCT";
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BST-${namePart}-${timePart}-${randomPart}`;
}

function articleNumberForProduct(product = {}) {
  return String(product.sku || product.article_number || "").trim() || generateArticleNumber(product);
}

function normalizeSubmittedCreateProduct(product = {}) {
  const articleNumber = articleNumberForProduct(product);
  return {
    ...product,
    sku: articleNumber,
    article_number: articleNumber,
  };
}

function normalizeSubmittedUpdateProduct(product = {}) {
  if (product.sku === undefined && product.article_number === undefined) return product;
  const articleNumber = articleNumberForProduct(product);
  return {
    ...product,
    sku: articleNumber,
    article_number: articleNumber,
  };
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value ? [value] : [];
  }
}

function parseJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function formatProduct(product) {
  const inventory = Array.isArray(product.inventory)
    ? product.inventory[0]
    : product.inventory;
  const images = parseJsonArray(product.img);
  const categorySelection = parseCategorySelection(product.category);
  const costBreakdown = parseJsonObject(product.cost_breakdown);
  const productMetadata = parseJsonObject(costBreakdown.metadata);
  const status = String(productMetadata.status || (product.instock ? "Active" : "Archived"));
  return {
    id: product.id,
    name: product.name,
    description: product.description || "",
    category: categorySelection.category,
    categories: Array.from(new Set([categorySelection.category, ...parseJsonArray(productMetadata.categories || product.categories)].map((x) => String(x || "").trim()).filter(Boolean))),
    categoryPrices: typeof productMetadata.categoryPrices === "object" && productMetadata.categoryPrices ? productMetadata.categoryPrices : (typeof product.category_prices === "object" && product.category_prices ? product.category_prices : {}),
    subcategory: product.subcategory || categorySelection.subcategory,
    collection: product.collection || categorySelection.collection,
    price: Number(product.price || 0),
    articleNumber: product.article_number,
    sku: inventory?.sku || product.article_number || "",
    stock: Number(inventory?.stock_quantity ?? (product.instock ? DEFAULT_ACTIVE_STOCK : 0)),
    lowStockThreshold: Number(inventory?.low_stock_threshold || 5),
    sizes: parseJsonArray(product.size),
    colors: parseJsonArray(product.color || productMetadata.colors),
    colorHexMap: parseJsonObject(productMetadata.colorHexMap || product.color_hex_map),
    variants: Array.isArray(productMetadata.variants) ? productMetadata.variants : [],
    colorImages: productMetadata.colorImages || {},
    images,

    image: images[0] || "/bustaniya-campaign-hero-v4.png",
    status,
    badge: product.new ? "New" : product.bestsellere ? "Bestseller" : "",
    compareAtPrice: Number(product.compare_at_price ?? productMetadata.compareAtPrice ?? productMetadata.compare_at_price ?? 0) || null,
    tags: Array.isArray(productMetadata.tags) ? productMetadata.tags : [],
    productType: String(productMetadata.productType || ""),
    publishDate: String(productMetadata.publishDate || ""),
    isNew: Boolean(product.new),
    isBestseller: Boolean(product.bestsellere),
    deliveryFeeMode: product.delivery_fee_mode || "inherit",
    deliveryFee: Number(product.delivery_fee_pkr || 0),
    deliveryInfo: String(product.delivery_info || productMetadata.deliveryInfo || productMetadata.deliveryText || "").trim(),
    instagramVideoUrl: String(product.instagram_video_url || productMetadata.instagramVideoUrl || productMetadata.instagramEmbedUrl || "").trim(),
    costTotalPkr: Number(product.cost_total_pkr || 0),
    costBreakdown,
    vendor: String(productMetadata.vendor || "Bustaniya"),
    barcode: String(productMetadata.barcode || ""),
    weight: String(productMetadata.weight || ""),
    weightUnit: productMetadata.weightUnit === "g" ? "g" : "kg",
    countryOfOrigin: String(productMetadata.countryOfOrigin || "Pakistan"),
    hsTariffCode: String(productMetadata.hsTariffCode || ""),
    seoTitle: String(productMetadata.seoTitle || ""),
    seoDescription: String(productMetadata.seoDescription || ""),
    urlHandle: String(productMetadata.urlHandle || ""),
    enableBottomOptions: productMetadata.enableBottomOptions !== undefined ? Boolean(productMetadata.enableBottomOptions) : (Array.isArray(productMetadata.bottomOptions) ? productMetadata.bottomOptions.length > 0 : undefined),
    bottomOptions: productMetadata.enableBottomOptions === false ? [] : Array.isArray(productMetadata.bottomOptions) ? productMetadata.bottomOptions : [],
  };
}


function errorResponse(error) {
  const unauthorized = error.status === 401 || error.status === 403;
  const validation = error.status === 400 || error.status === 422;
  return NextResponse.json(
    { error: unauthorized || validation ? error.message : error.message || "Unable to update catalogue." },
    { status: unauthorized || validation ? error.status : 500 }
  );
}

function validationError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizeNonNegativeNumber(value, label, max = 10000000) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0 || number > max) {
    throw validationError(`${label} must be a valid non-negative number.`);
  }
  return number;
}

function normalizeImageList(value) {
  const images = Array.isArray(value) ? value : parseJsonArray(value);
  const cleaned = images
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  return cleaned.length ? cleaned : ["/bustaniya-campaign-hero-v4.png"];
}

function normalizeProductPayload(product) {
  const price = normalizeNonNegativeNumber(product.price, "Price");
  const compareAtPrice = product.compare_at_price ? normalizeNonNegativeNumber(product.compare_at_price, "Compare-at price") : null;
  const costTotal = normalizeNonNegativeNumber(product.cost_total_pkr ?? product.costTotalPkr, "Total cost");
  const deliveryFee = normalizeNonNegativeNumber(product.delivery_fee_pkr ?? product.deliveryFee, "Delivery fee");
  const articleNumber = String(product.article_number || product.articleNumber || "").trim();
  const status = ["Active", "Draft", "Archived"].includes(product.status) ? product.status : "Active";
  const costBreakdown = parseJsonObject(product.cost_breakdown ?? product.costBreakdown ?? {});
  const metadata = parseJsonObject(costBreakdown.metadata);
  const deliveryInfo = String(product.deliveryInfo || product.delivery_info || product.deliveryText || metadata.deliveryInfo || metadata.deliveryText || "").trim();
  const instagramVideoUrl = String(product.instagramVideoUrl || product.instagram_video_url || product.instagramEmbedUrl || metadata.instagramVideoUrl || metadata.instagramEmbedUrl || "").trim();

  return {
    name: String(product.name || "").trim(),
    description: product.description || "",
    price,
    category: formatCategorySelection({
      category: product.category,
      subcategory: product.subcategory,
      collection: product.collection,
    }),
    color: JSON.stringify(product.colors || product.color || []),
    size: JSON.stringify(product.sizes || product.size || []),
    img: JSON.stringify(normalizeImageList(product.images || product.img || ["/bustaniya-campaign-hero-v4.png"])),
    instock: status === "Active",
    new: Boolean(product.is_new ?? product.new ?? product.isNew),
    bestsellere: Boolean(product.is_bestseller ?? product.bestsellere ?? product.isBestseller),
    article_number: articleNumber,
    delivery_fee_mode: product.delivery_fee_mode || product.deliveryFeeMode || "inherit",
    delivery_fee_pkr:
      (product.delivery_fee_mode || product.deliveryFeeMode) === "paid"
        ? deliveryFee
        : null,
    delivery_info: deliveryInfo || null,
    instagram_video_url: instagramVideoUrl || null,
    cost_total_pkr: costTotal,
    cost_breakdown: {
      ...costBreakdown,
      metadata: {
        ...metadata,
        compareAtPrice,
        status,
        deliveryInfo,
        instagramVideoUrl,
        productType: String(product.productType || product.product_type || metadata.productType || "").trim(),
        tags: Array.isArray(product.tags) ? product.tags : metadata.tags || [],
        publishDate: String(product.publishDate || product.publish_date || metadata.publishDate || "").trim(),
        colorHexMap: parseJsonObject(product.colorHexMap || product.color_hex_map || metadata.colorHexMap || {}),
        colorImages: parseJsonObject(product.colorImages || product.color_images || metadata.colorImages || {}),
        variants: Array.isArray(product.variants) ? product.variants : (Array.isArray(metadata.variants) ? metadata.variants : []),
        bottomOptions: Array.isArray(product.bottomOptions) ? product.bottomOptions : (Array.isArray(metadata.bottomOptions) ? metadata.bottomOptions : []),
        categories: Array.isArray(product.categories) ? product.categories : (metadata.categories || []),
        categoryPrices: parseJsonObject(product.categoryPrices || product.category_prices || metadata.categoryPrices || {}),
      },
    },
  };
}

function withoutDeliveryColumns(record) {
  const { delivery_fee_mode, delivery_fee_pkr, delivery_info, instagram_video_url, ...baseRecord } = record;
  return baseRecord;
}

function isSchemaColumnError(error) {
  const message = `${error?.message || ""} ${JSON.stringify(error?.details || {})}`.toLowerCase();
  return message.includes("schema cache") || message.includes("column") || message.includes("delivery_fee") || message.includes("delivery_info") || message.includes("instagram_video_url");
}


function isRpcUnavailableError(error) {
  const message = `${error?.message || ""} ${JSON.stringify(error?.details || {})}`.toLowerCase();
  return error?.status === 404 || message.includes("function") || message.includes("rpc");
}

function isInventoryProductDuplicateError(error) {
  const message = `${error?.message || ""} ${error?.code || ""} ${JSON.stringify(error?.details || {})}`.toLowerCase();
  return message.includes("inventory_product_id_key") || message.includes("duplicate key");
}

async function createProductDirect(body) {
  const productRecord = normalizeProductPayload(body.product || {});
  if (!productRecord.name) throw new Error("Product title is required.");
  if (!Number.isFinite(productRecord.price) || productRecord.price < 0) {
    throw new Error("Product price must be valid.");
  }

  let created;
  try {
    created = await supabaseAdminRequest("products?select=*", {
      method: "POST",
      prefer: "return=representation",
      body: productRecord,
    });
  } catch (error) {
    if (!isSchemaColumnError(error)) throw error;
    created = await supabaseAdminRequest("products?select=*", {
      method: "POST",
      prefer: "return=representation",
      body: withoutDeliveryColumns(productRecord),
    });
  }
  const product = created?.[0];
  if (!product?.id) throw new Error("Product was not created.");

  await upsertInventoryStock(product.id, normalizeNonNegativeNumber(body.stock, "Stock quantity", 1000000), productRecord.article_number);

  return product.id;
}

async function updateProductDirect(body) {
  const updates = {};
  const product = body.product || {};

  if (product.delivery_fee_mode !== undefined || product.deliveryFeeMode !== undefined) {
    const mode = product.delivery_fee_mode || product.deliveryFeeMode || "inherit";
    updates.delivery_fee_mode = mode;
    updates.delivery_fee_pkr = mode === "paid"
      ? Number(product.delivery_fee_pkr ?? product.deliveryFee ?? 0)
      : null;
  }
  if (product.deliveryInfo !== undefined || product.delivery_info !== undefined || product.deliveryText !== undefined) {
    const deliveryInfo = String(product.deliveryInfo || product.delivery_info || product.deliveryText || "").trim();
    updates.delivery_info = deliveryInfo || null;
  }
  if (product.name !== undefined) updates.name = String(product.name || "").trim();
  if (product.description !== undefined) updates.description = product.description || "";
  if (
    product.category !== undefined ||
    product.subcategory !== undefined ||
    product.collection !== undefined
  ) {
    updates.category = formatCategorySelection({
      category: product.category,
      subcategory: product.subcategory,
      collection: product.collection,
    });
  }
  if (product.price !== undefined) updates.price = normalizeNonNegativeNumber(product.price, "Product price");
  if (product.status !== undefined) {
    if (!["Active", "Draft", "Archived"].includes(product.status)) throw validationError("Product status is invalid.");
    updates.instock = product.status === "Active";
  }
  if (product.images !== undefined) updates.img = JSON.stringify(normalizeImageList(product.images || []));
  if (product.sizes !== undefined) updates.size = JSON.stringify(product.sizes || []);
  if (product.colors !== undefined) updates.color = JSON.stringify(product.colors || []);
  if (product.sku !== undefined) updates.article_number = String(product.sku || "").trim();
  if (product.cost_total_pkr !== undefined || product.costTotalPkr !== undefined) {
    updates.cost_total_pkr = normalizeNonNegativeNumber(product.cost_total_pkr ?? product.costTotalPkr, "Product cost");
  }
  if (product.cost_breakdown !== undefined || product.costBreakdown !== undefined || product.deliveryInfo !== undefined || product.delivery_info !== undefined || product.deliveryText !== undefined || product.bottomOptions !== undefined || product.bottom_options !== undefined || product.enableBottomOptions !== undefined || product.colorImages !== undefined || product.color_images !== undefined || product.variants !== undefined) {
    const incomingBreakdown = parseJsonObject(product.cost_breakdown ?? product.costBreakdown ?? {});
    const incomingMetadata = parseJsonObject(incomingBreakdown.metadata);
    updates.cost_breakdown = {
      ...incomingBreakdown,
      metadata: {
        ...incomingMetadata,
        ...(product.deliveryInfo !== undefined || product.delivery_info !== undefined || product.deliveryText !== undefined
          ? { deliveryInfo: String(product.deliveryInfo || product.delivery_info || product.deliveryText || "").trim() }
          : {}),
        ...(product.compare_at_price !== undefined || product.compareAtPrice !== undefined
          ? { compareAtPrice: normalizeNonNegativeNumber(product.compare_at_price ?? product.compareAtPrice, "Compare-at price") }
          : {}),
        ...(product.status !== undefined ? { status: product.status } : {}),
        ...(product.productType !== undefined || product.product_type !== undefined
          ? { productType: String(product.productType || product.product_type || "").trim() }
          : {}),
        ...(product.tags !== undefined ? { tags: Array.isArray(product.tags) ? product.tags : [] } : {}),
        ...(product.bottomOptions !== undefined || product.bottom_options !== undefined ? { bottomOptions: Array.isArray(product.bottomOptions ?? product.bottom_options) ? (product.bottomOptions ?? product.bottom_options) : [] } : {}),
        ...(product.categories !== undefined ? { categories: Array.isArray(product.categories) ? product.categories : [] } : {}),
        ...(product.categoryPrices !== undefined ? { categoryPrices: parseJsonObject(product.categoryPrices) } : {}),
        ...(product.enableBottomOptions !== undefined ? { enableBottomOptions: Boolean(product.enableBottomOptions) } : {}),
        ...(product.colorImages !== undefined || product.color_images !== undefined ? { colorImages: parseJsonObject(product.colorImages || product.color_images || {}) } : {}),
        ...(product.variants !== undefined ? { variants: Array.isArray(product.variants) ? product.variants : [] } : {}),
        ...(product.colorHexMap !== undefined || product.color_hex_map !== undefined
          ? { colorHexMap: parseJsonObject(product.colorHexMap || product.color_hex_map || {}) }
          : {}),
        ...(product.publishDate !== undefined || product.publish_date !== undefined
          ? { publishDate: String(product.publishDate || product.publish_date || "").trim() }
          : {}),
      },
    };
  }


  if (Object.keys(updates).length) {
    try {
      await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(body.productId)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: updates,
      });
    } catch (error) {
      if (!isSchemaColumnError(error)) throw error;
      const fallbackUpdates = withoutDeliveryColumns(updates);
      if (Object.keys(fallbackUpdates).length) {
        await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(body.productId)}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: fallbackUpdates,
        });
      }
    }
  }

  if (body.stock !== undefined && body.stock !== null) {
    await upsertInventoryStock(
      body.productId,
      normalizeNonNegativeNumber(body.stock, "Stock quantity", 1000000),
      updates.article_number,
      body.lowStockThreshold ?? body.product?.lowStockThreshold ?? body.product?.low_stock_threshold
    );
  } else if (body.lowStockThreshold !== undefined || body.product?.lowStockThreshold !== undefined || body.product?.low_stock_threshold !== undefined) {
    const existingInv = await getInventory(body.productId);
    const currentStock = Number(existingInv?.stock_quantity || 0);
    await upsertInventoryStock(
      body.productId,
      currentStock,
      updates.article_number || existingInv?.sku || "",
      body.lowStockThreshold ?? body.product?.lowStockThreshold ?? body.product?.low_stock_threshold
    );
  }
}

async function getInventory(productId) {
  const rows = await supabaseAdminRequest(
    `inventory?select=*&product_id=eq.${encodeURIComponent(productId)}&limit=1`
  );
  return rows?.[0] || null;
}

async function upsertInventoryStock(productId, stock, sku = "", lowStockThreshold = undefined) {
  const normalizedStock = normalizeNonNegativeNumber(stock, "Stock quantity", 1000000);
  const thresholdVal = lowStockThreshold !== undefined && lowStockThreshold !== null && Number.isFinite(Number(lowStockThreshold))
    ? Math.max(0, Number(lowStockThreshold))
    : undefined;
  const existing = await getInventory(productId);
  if (existing) {
    await supabaseAdminRequest(`inventory?product_id=eq.${encodeURIComponent(productId)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: {
        stock_quantity: normalizedStock,
        ...(sku ? { sku } : {}),
        ...(thresholdVal !== undefined ? { low_stock_threshold: thresholdVal } : {}),
      },
    });
    return;
  }

  await supabaseAdminRequest("inventory", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      product_id: productId,
      stock_quantity: normalizedStock,
      low_stock_threshold: thresholdVal !== undefined ? thresholdVal : 5,
      sku,
    },
  });
}

async function adjustInventoryDirect(body) {
  const productId = body.productId;
  if (!productId) throw new Error("Product is required for inventory adjustment.");

  const existing = await getInventory(productId);
  const before = Number(existing?.stock_quantity || 0);
  const change = body.setStock !== undefined && body.setStock !== null
    ? Number(body.setStock) - before
    : Number(body.change || 0);

  if (!Number.isFinite(change)) throw new Error("Inventory adjustment must be a valid number.");
  if (Math.abs(change) > 1000000) throw validationError("Inventory adjustment is too large.");

  const after = Math.max(0, before + change);
  await upsertInventoryStock(productId, after, existing?.sku || "", body.lowStockThreshold);

  if (after !== before) {
    await supabaseAdminRequest("inventory_movements", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        product_id: productId,
        quantity_change: after - before,
        reason: body.reason || "Stock count correction",
        stock_before: before,
        stock_after: after,
      },
    }).catch(() => { });
  }

  return { stock_before: before, stock_after: after };
}

async function archiveProductDirect(productId) {
  await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(productId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      instock: false,
    },
  });

  await supabaseAdminRequest(`inventory?product_id=eq.${encodeURIComponent(productId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      stock_quantity: 0,
    },
  }).catch(() => { });

  return { deleted: false, archived: true };
}

async function deleteProductDirect(productId) {
  if (!productId) throw new Error("Product is required.");

  try {
    // 1. Delete inventory movements first
    await supabaseAdminRequest(`inventory_movements?product_id=eq.${encodeURIComponent(productId)}`, {
      method: "DELETE",
      prefer: "return=minimal",
    }).catch(() => { });

    // 2. Delete inventory record
    await supabaseAdminRequest(`inventory?product_id=eq.${encodeURIComponent(productId)}`, {
      method: "DELETE",
      prefer: "return=minimal",
    }).catch(() => { });

    // 3. Delete product from products table
    await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(productId)}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });

    return { deleted: true, archived: false };
  } catch (error) {
    // If referenced in orders, preserve revenue & history but archive product from active list
    const existing = await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(productId)}&select=cost_breakdown`).catch(() => []);
    const existingBreakdown = parseJsonObject(existing?.[0]?.cost_breakdown);
    const updatedMetadata = { ...parseJsonObject(existingBreakdown.metadata), status: "Archived" };
    const updatedBreakdown = JSON.stringify({ ...existingBreakdown, metadata: updatedMetadata });

    await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(productId)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: {
        instock: false,
        cost_breakdown: updatedBreakdown,
      },
    }).catch(() => { });

    return { deleted: false, archived: true };
  }
}

export async function POST(request) {
  try {
    await authorizeAdminRequest(request, "products");
    const products = await supabaseAdminRequest(
      "products?select=*,inventory(stock_quantity,low_stock_threshold,sku)&order=created_at.desc"
    );
    const movements = await supabaseAdminRequest(
      "inventory_movements?select=id,product_id,quantity_change,reason,stock_before,stock_after,created_at&order=created_at.desc&limit=100"
    );
    return NextResponse.json({
      products: (products || []).map(formatProduct),
      movements: movements || [],
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request) {
  try {
    await authorizeAdminRequest(request, "products");
    const body = await request.json();
    body.product = {
      ...normalizeSubmittedCreateProduct(body.product || {}),
      category: formatCategorySelection({
        category: body.product?.category,
        subcategory: body.product?.subcategory,
        collection: body.product?.collection,
      }),
    };
    let result;
    try {
      result = await supabaseAdminRpc("admin_create_product_v2", {
        p_product: body.product,
        p_stock: Number(body.stock || 0),
      });
    } catch (error) {
      if (!isRpcUnavailableError(error) && !isInventoryProductDuplicateError(error)) throw error;
      result = await createProductDirect(body);
    }
    // Older catalogue RPCs intentionally ignore unknown JSON keys. Persist cost
    // details separately so the finance screen always receives the true cost.
    if (
      body.product?.cost_total_pkr !== undefined ||
      body.product?.cost_breakdown !== undefined ||
      body.product?.status !== undefined ||
      body.product?.compare_at_price !== undefined
    ) {
      const rows = await supabaseAdminRequest(
        `products?select=id&article_number=eq.${encodeURIComponent(body.product.article_number)}&limit=1`
      );
      if (rows?.[0]?.id) {
        await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(rows[0].id)}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: {
            cost_total_pkr: Number(body.product.cost_total_pkr || 0),
            cost_breakdown: await (async () => {
              const targetId = typeof rows !== "undefined" && rows?.[0]?.id ? rows[0].id : body.productId;
              const existingRows = await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(targetId)}&select=cost_breakdown`).catch(() => []);
              const existingBreakdown = parseJsonObject(existingRows?.[0]?.cost_breakdown);
              const existingMetadata = parseJsonObject(existingBreakdown.metadata);
              const incomingBreakdown = parseJsonObject(body.product?.cost_breakdown || {});
              const incomingMetadata = parseJsonObject(incomingBreakdown.metadata);
              const targetBottomOptions = Array.isArray(body.product?.bottomOptions)
                ? body.product.bottomOptions
                : (Array.isArray(incomingMetadata.bottomOptions) ? incomingMetadata.bottomOptions : existingMetadata.bottomOptions);
              const targetEnableBottoms = body.product?.enableBottomOptions !== undefined
                ? Boolean(body.product.enableBottomOptions)
                : (incomingMetadata.enableBottomOptions !== undefined ? Boolean(incomingMetadata.enableBottomOptions) : existingMetadata.enableBottomOptions);
              return {
                ...existingBreakdown,
                ...incomingBreakdown,
                metadata: {
                  ...existingMetadata,
                  ...incomingMetadata,
                  ...(targetBottomOptions !== undefined ? { bottomOptions: targetBottomOptions } : {}),
                  ...(targetEnableBottoms !== undefined ? { enableBottomOptions: targetEnableBottoms } : {}),
                },
              };
            })(),
            ...(body.product.status !== undefined ? { instock: body.product.status === "Active" } : {}),
          },
        });
      }
    }
    invalidateCatalogCache();
    revalidateCatalogPaths(result);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    if (body.action === "adjust") {
      await authorizeAdminRequest(request, "inventory");
      let result;
      if (body.setStock !== undefined || body.lowStockThreshold !== undefined) {
        result = await adjustInventoryDirect(body);
      } else {
        try {
          result = await supabaseAdminRpc("admin_adjust_inventory_v2", {
            p_product_id: body.productId,
            p_change: Number(body.change),
            p_reason: body.reason,
          });
        } catch (error) {
          if (!isRpcUnavailableError(error)) throw error;
          result = await adjustInventoryDirect(body);
        }
      }
      if (Array.isArray(body.variants)) {
        const existingRows = await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(body.productId)}&select=cost_breakdown`).catch(() => []);
        const existingBreakdown = parseJsonObject(existingRows?.[0]?.cost_breakdown);
        const existingMetadata = parseJsonObject(existingBreakdown.metadata);
        await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(body.productId)}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: {
            cost_breakdown: {
              ...existingBreakdown,
              metadata: {
                ...existingMetadata,
                variants: body.variants,
              },
            },
          },
        }).catch(() => {});
      }
      invalidateCatalogCache();
      revalidateCatalogPaths(body.productId);
      return NextResponse.json({ success: true, result });
    }
    await authorizeAdminRequest(request, "products");
    let result;
    if (
      body.product?.category !== undefined ||
      body.product?.subcategory !== undefined ||
      body.product?.collection !== undefined
    ) {
      body.product = {
        ...normalizeSubmittedUpdateProduct(body.product),
        category: formatCategorySelection({
          category: body.product.category,
          subcategory: body.product.subcategory,
          collection: body.product.collection,
        }),
      };
    } else {
      body.product = normalizeSubmittedUpdateProduct(body.product || {});
    }
    try {
      result = await supabaseAdminRpc("admin_update_product_v2", {
        p_id: body.productId,
        p_product: body.product || {},
        p_stock: body.stock === undefined ? null : Number(body.stock),
      });
    } catch (error) {
      if (!isRpcUnavailableError(error)) throw error;
      result = await updateProductDirect(body);
    }
    if (body.lowStockThreshold !== undefined || body.product?.lowStockThreshold !== undefined) {
      const existingInv = await getInventory(body.productId);
      if (existingInv) {
        await supabaseAdminRequest(`inventory?product_id=eq.${encodeURIComponent(body.productId)}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: {
            low_stock_threshold: Math.max(0, Number(body.lowStockThreshold ?? body.product?.lowStockThreshold ?? 5)),
          },
        }).catch(() => {});
      }
    }
    if (
      body.product?.cost_total_pkr !== undefined ||
      body.product?.costTotalPkr !== undefined ||
      body.product?.cost_breakdown !== undefined ||
      body.product?.costBreakdown !== undefined ||
      body.product?.status !== undefined ||
      body.product?.compare_at_price !== undefined ||
      body.product?.compareAtPrice !== undefined ||
      body.product?.variants !== undefined
    ) {
      const existingRows = await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(body.productId)}&select=cost_total_pkr,cost_breakdown`).catch(() => []);
      const existingBreakdown = parseJsonObject(existingRows?.[0]?.cost_breakdown);
      const existingMetadata = parseJsonObject(existingBreakdown.metadata);
      const incomingBreakdown = parseJsonObject(body.product?.cost_breakdown ?? body.product?.costBreakdown ?? {});
      const incomingMetadata = parseJsonObject(incomingBreakdown.metadata);
      const targetBottomOptions = Array.isArray(body.product?.bottomOptions)
        ? body.product.bottomOptions
        : (Array.isArray(incomingMetadata.bottomOptions) ? incomingMetadata.bottomOptions : existingMetadata.bottomOptions);
      const targetEnableBottoms = body.product?.enableBottomOptions !== undefined
        ? Boolean(body.product.enableBottomOptions)
        : (incomingMetadata.enableBottomOptions !== undefined ? Boolean(incomingMetadata.enableBottomOptions) : existingMetadata.enableBottomOptions);
      const targetCompareAt = body.product?.compare_at_price !== undefined || body.product?.compareAtPrice !== undefined
        ? (Number(body.product.compare_at_price ?? body.product.compareAtPrice ?? 0) || null)
        : (incomingMetadata.compareAtPrice !== undefined ? incomingMetadata.compareAtPrice : existingMetadata.compareAtPrice);
      const targetStatus = body.product?.status !== undefined
        ? body.product.status
        : (incomingMetadata.status !== undefined ? incomingMetadata.status : existingMetadata.status);
      const targetVariants = Array.isArray(body.product?.variants)
        ? body.product.variants
        : (Array.isArray(incomingMetadata.variants) ? incomingMetadata.variants : existingMetadata.variants);

      const hasExplicitCost = body.product?.cost_total_pkr !== undefined || body.product?.costTotalPkr !== undefined;
      const nextCostTotal = hasExplicitCost
        ? Number(body.product.cost_total_pkr ?? body.product.costTotalPkr ?? 0)
        : Number(existingRows?.[0]?.cost_total_pkr || 0);

      await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(body.productId)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: {
          ...(hasExplicitCost ? { cost_total_pkr: nextCostTotal } : {}),
          ...(body.product?.price !== undefined ? { price: Number(body.product.price || 0) } : {}),
          cost_breakdown: {
            ...existingBreakdown,
            ...incomingBreakdown,
            metadata: {
              ...existingMetadata,
              ...incomingMetadata,
              ...(targetBottomOptions !== undefined ? { bottomOptions: targetBottomOptions } : {}),
              ...(targetEnableBottoms !== undefined ? { enableBottomOptions: targetEnableBottoms } : {}),
              ...(targetCompareAt !== undefined ? { compareAtPrice: targetCompareAt } : {}),
              ...(targetStatus !== undefined ? { status: targetStatus } : {}),
              ...(targetVariants !== undefined ? { variants: targetVariants } : {}),
            },
          },
          ...(body.product?.status !== undefined ? { instock: body.product.status === "Active" } : {}),
        },
      });
    }
    invalidateCatalogCache();
    revalidateCatalogPaths(body.productId);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request) {
  try {
    await authorizeAdminRequest(request, "products");
    const { productId } = await request.json();
    let result;
    try {
      const deleted = await supabaseAdminRpc("admin_delete_product_v2", {
        p_id: productId,
      });
      result = {
        deleted: Boolean(deleted),
        archived: !deleted,
      };
    } catch (error) {
      result = await deleteProductDirect(productId);
    }
    invalidateCatalogCache();
    revalidateCatalogPaths(productId);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return errorResponse(error);
  }

}
