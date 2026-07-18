import { NextResponse } from "next/server";
import { formatCategorySelection, parseCategorySelection } from "../../../../data/store";
import { authorizeAdminRequest } from "../../../../lib/adminAuth";
import { supabaseAdminRequest, supabaseAdminRpc } from "../../../../lib/supabaseRest";

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
  return {
    id: product.id,
    name: product.name,
    description: product.description || "",
    category: categorySelection.category,
    subcategory: product.subcategory || categorySelection.subcategory,
    collection: product.collection || categorySelection.collection,
    price: Number(product.price || 0),
    articleNumber: product.article_number,
    sku: inventory?.sku || product.article_number || "",
    stock: Number(inventory?.stock_quantity ?? (product.instock ? DEFAULT_ACTIVE_STOCK : 0)),
    lowStockThreshold: Number(inventory?.low_stock_threshold || 5),
    sizes: parseJsonArray(product.size),
    colors: parseJsonArray(product.color),
    images,
    image: images[0] || "/bustaniya-campaign-hero-v4.png",
    status: product.instock ? "Active" : "Out of stock",
    badge: product.new ? "New" : product.bestsellere ? "Bestseller" : "",
    isNew: Boolean(product.new),
    isBestseller: Boolean(product.bestsellere),
    deliveryFeeMode: product.delivery_fee_mode || "inherit",
    deliveryFee: Number(product.delivery_fee_pkr || 0),
    costTotalPkr: Number(product.cost_total_pkr || 0),
    costBreakdown: parseJsonObject(product.cost_breakdown),
  };
}

function errorResponse(error) {
  const unauthorized = error.status === 401 || error.status === 403;
  return NextResponse.json(
    { error: unauthorized ? error.message : error.message || "Unable to update catalogue." },
    { status: unauthorized ? error.status : 500 }
  );
}

function normalizeProductPayload(product = {}) {
  const articleNumber = articleNumberForProduct(product);

  return {
    name: String(product.name || "").trim(),
    description: product.description || "",
    price: Number(product.price || 0),
    category: formatCategorySelection({
      category: product.category,
      subcategory: product.subcategory,
      collection: product.collection,
    }),
    color: JSON.stringify(product.colors || product.color || []),
    size: JSON.stringify(product.sizes || product.size || []),
    img: JSON.stringify(product.images || product.img || ["/bustaniya-campaign-hero-v4.png"]),
    instock: true,
    new: Boolean(product.is_new ?? product.new ?? product.isNew),
    bestsellere: Boolean(product.is_bestseller ?? product.bestsellere ?? product.isBestseller),
    article_number: articleNumber,
    delivery_fee_mode: product.delivery_fee_mode || product.deliveryFeeMode || "inherit",
    delivery_fee_pkr:
      (product.delivery_fee_mode || product.deliveryFeeMode) === "paid"
        ? Number(product.delivery_fee_pkr ?? product.deliveryFee ?? 0)
        : null,
    cost_total_pkr: Number(product.cost_total_pkr ?? product.costTotalPkr ?? 0),
    cost_breakdown: product.cost_breakdown ?? product.costBreakdown ?? {},
  };
}

function withoutDeliveryColumns(record) {
  const { delivery_fee_mode, delivery_fee_pkr, ...baseRecord } = record;
  return baseRecord;
}

function isSchemaColumnError(error) {
  const message = `${error?.message || ""} ${JSON.stringify(error?.details || {})}`.toLowerCase();
  return message.includes("schema cache") || message.includes("column") || message.includes("delivery_fee");
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

  await upsertInventoryStock(product.id, Number(body.stock || 0), productRecord.article_number);

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
  if (product.price !== undefined) updates.price = Number(product.price || 0);
  if (product.images !== undefined) updates.img = JSON.stringify(product.images || []);
  if (product.sizes !== undefined) updates.size = JSON.stringify(product.sizes || []);
  if (product.colors !== undefined) updates.color = JSON.stringify(product.colors || []);
  if (product.sku !== undefined) updates.article_number = String(product.sku || "").trim();
  if (product.cost_total_pkr !== undefined || product.costTotalPkr !== undefined) {
    updates.cost_total_pkr = Number(product.cost_total_pkr ?? product.costTotalPkr ?? 0);
  }
  if (product.cost_breakdown !== undefined || product.costBreakdown !== undefined) {
    updates.cost_breakdown = product.cost_breakdown ?? product.costBreakdown ?? {};
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
    await upsertInventoryStock(body.productId, Number(body.stock), updates.article_number);
  }
}

async function getInventory(productId) {
  const rows = await supabaseAdminRequest(
    `inventory?select=*&product_id=eq.${encodeURIComponent(productId)}&limit=1`
  );
  return rows?.[0] || null;
}

async function upsertInventoryStock(productId, stock, sku = "") {
  const existing = await getInventory(productId);
  if (existing) {
    await supabaseAdminRequest(`inventory?product_id=eq.${encodeURIComponent(productId)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: {
        stock_quantity: Math.max(0, Number(stock || 0)),
        ...(sku ? { sku } : {}),
      },
    });
    return;
  }

  await supabaseAdminRequest("inventory", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      product_id: productId,
      stock_quantity: Math.max(0, Number(stock || 0)),
      low_stock_threshold: 5,
      sku,
    },
  });
}

async function adjustInventoryDirect(body) {
  const productId = body.productId;
  const change = Number(body.change || 0);
  if (!productId) throw new Error("Product is required for inventory adjustment.");
  if (!Number.isFinite(change)) throw new Error("Inventory adjustment must be a valid number.");

  const existing = await getInventory(productId);
  const before = Number(existing?.stock_quantity || 0);
  const after = Math.max(0, before + change);
  await upsertInventoryStock(productId, after, existing?.sku || "");

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
  }).catch(() => {});

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
  }).catch(() => {});

  return { deleted: false, archived: true };
}

async function deleteProductDirect(productId) {
  if (!productId) throw new Error("Product is required.");

  return archiveProductDirect(productId);
}

export async function POST(request) {
  try {
    await authorizeAdminRequest(request, "products");
    const products = await supabaseAdminRequest(
      "products?select=*,inventory(stock_quantity,low_stock_threshold,sku)&instock=eq.true&order=created_at.desc"
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
    if (body.product?.cost_total_pkr !== undefined || body.product?.cost_breakdown !== undefined) {
      const rows = await supabaseAdminRequest(
        `products?select=id&article_number=eq.${encodeURIComponent(body.product.article_number)}&limit=1`
      );
      if (rows?.[0]?.id) {
        await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(rows[0].id)}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: {
            cost_total_pkr: Number(body.product.cost_total_pkr || 0),
            cost_breakdown: body.product.cost_breakdown || {},
          },
        });
      }
    }
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
    if (body.product?.cost_total_pkr !== undefined || body.product?.cost_breakdown !== undefined) {
      await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(body.productId)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: {
          cost_total_pkr: Number(body.product.cost_total_pkr || 0),
          cost_breakdown: body.product.cost_breakdown || {},
        },
      });
    }
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
      if (!isRpcUnavailableError(error)) throw error;
      result = await deleteProductDirect(productId);
    }
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
