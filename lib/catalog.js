import { normalizeCategory, parseCategorySelection, products as fallbackProducts } from "../data/store";
import { optimizedImageUrl } from "./images";
import { supabaseAdminRequest, supabaseRequest } from "./supabaseRest";

const DEFAULT_ACTIVE_STOCK = 10;

function isStorefrontProduct(product) {
  return normalizeCategory(product.category) !== "Custom Inventory" && product.status === "Active";
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

function formatFallbackProduct(product) {
  return {
    ...product,
    category: normalizeCategory(product.category),
    subcategory: product.subcategory || "",
    collection: product.collection || "",
    articleNumber: product.articleNumber || `BST-${String(product.id).padStart(4, "0")}`,
    images: (product.images || [product.image]).filter(Boolean).map((image) => optimizedImageUrl(image)),
    stock: Number(product.stock ?? DEFAULT_ACTIVE_STOCK),
    lowStockThreshold: Number(product.lowStockThreshold ?? 5),
    deliveryFeeMode: product.deliveryFeeMode || "inherit",
    deliveryFee: Number(product.deliveryFee || 0),
  };
}

export function formatCatalogProduct(product) {
  const inventory = Array.isArray(product.inventory)
    ? product.inventory[0]
    : product.inventory;
  const images = parseJsonArray(product.img)
    .filter(Boolean)
    .map((image) => optimizedImageUrl(image));
  const categorySelection = parseCategorySelection(product.category);
  const costBreakdownObj = typeof product.cost_breakdown === "object" && product.cost_breakdown ? product.cost_breakdown : (() => { try { return JSON.parse(product.cost_breakdown || "{}"); } catch { return {}; } })();
  const metadata = costBreakdownObj?.metadata || {};
  const savedStatus = String(metadata.status || "").trim();
  const status = savedStatus || (product.instock === false ? "Archived" : "Active");

  return {
    id: product.id,
    name: product.name,
    description: product.description || "",
    fabricDetails: metadata.fabricDetails || product.fabric_details || "",
    careInstructions: metadata.careInstructions || product.care_instructions || "",
    category: categorySelection.category,
    subcategory: product.subcategory || categorySelection.subcategory,
    collection: product.collection || categorySelection.collection,
    price: Number(product.price || 0),
    compareAtPrice: Number(product.compare_at_price || metadata.compareAtPrice || 0),
    articleNumber: product.article_number,
    sku: inventory?.sku || product.article_number || "",
    stock: Number(inventory?.stock_quantity ?? (product.instock !== false ? DEFAULT_ACTIVE_STOCK : 0)),
    lowStockThreshold: Number(inventory?.low_stock_threshold || 5),
    sizes: parseJsonArray(product.size),
    colors: parseJsonArray(product.color),
    images,
    image: images[0] || "/bustaniya-campaign-hero-v4.png",
    // The admin archives an item by marking it unavailable and preserving the
    // explicit status in metadata. Keep that status here so no archive can
    // leak into the website, feed, search, or category pages.
    status,
    badge: product.new ? "New" : product.bestsellere ? "Bestseller" : "",
    isNew: Boolean(product.new),
    isBestseller: Boolean(product.bestsellere),
    deliveryFeeMode: product.delivery_fee_mode || "inherit",
    deliveryFee: Number(product.delivery_fee_pkr || 0),
    cost_breakdown: costBreakdownObj,
  };
}

export async function getCatalogProducts() {
  try {
    let products;
    try {
      products = await supabaseAdminRequest(
        "products?select=*,inventory(stock_quantity,low_stock_threshold,sku)&order=created_at.desc"
      );
    } catch {
      products = await supabaseRequest(
        "products?select=*,inventory(stock_quantity,low_stock_threshold,sku)&order=created_at.desc"
      );
    }

    if (!Array.isArray(products) || !products.length) {
      return fallbackProducts.map(formatFallbackProduct);
    }

    const formatted = products
      .map(formatCatalogProduct)
      .filter(isStorefrontProduct);

    // An empty result can be intentional: for example when every live product
    // has been archived. Do not replace that intentional empty catalogue with
    // local fallback products, otherwise archived products reappear publicly.
    return formatted;
  } catch (error) {
    console.error("Failed to load catalog products:", error);
    return fallbackProducts.map(formatFallbackProduct);
  }
}

export async function getCatalogBestSellerIds(limit = 4) {
  try {
    const orders = await supabaseAdminRequest("orders?select=id,status,courier_status&limit=1000");
    const deliveredIds = (orders || [])
      .filter((order) => [order.status, order.courier_status].some((value) => String(value || "").toLowerCase().includes("deliver")))
      .map((order) => String(order.id))
      .filter(Boolean);

    if (!deliveredIds.length) return [];

    const items = await supabaseAdminRequest(
      `order_items?select=product_id,quantity&order_id=in.(${deliveredIds.join(",")})`
    );
    const quantityByProduct = new Map();
    for (const item of items || []) {
      const productId = String(item.product_id || "");
      if (!productId) continue;
      quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + Number(item.quantity || 0));
    }

    return [...quantityByProduct.entries()]
      .sort(([, leftQuantity], [, rightQuantity]) => rightQuantity - leftQuantity)
      .slice(0, limit)
      .map(([productId]) => productId);
  } catch (error) {
    console.error("Failed to load bestseller ranking:", error);
    return [];
  }
}
