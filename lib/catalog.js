import { normalizeCategory, parseCategorySelection, products as fallbackProducts } from "../data/store";
import { supabaseAdminRequest, supabaseRequest } from "./supabaseRest";

const DEFAULT_ACTIVE_STOCK = 10;

const LISETTE_CATALOG_IMAGES = {
  bras: "/lisette-bra-01.png",
  panties: "/lisette-panties-01.png",
  "lingerie sets": "/lisette-lounge-set-01.png",
  sleepwear: "/lisette-lounge-set-01.png",
};

function lisetteCatalogImage(category, name = "") {
  const normalized = `${normalizeCategory(category)} ${name}`.toLowerCase();
  if (normalized.includes("bra") || normalized.includes("bralette")) return LISETTE_CATALOG_IMAGES.bras;
  if (normalized.includes("pant") || normalized.includes("brief") || normalized.includes("underwear")) return LISETTE_CATALOG_IMAGES.panties;
  return normalized.includes("set") || normalized.includes("sleep") || normalized.includes("night")
    ? LISETTE_CATALOG_IMAGES["lingerie sets"]
    : "/lisette-lounge-set-01.png";
}

function isStorefrontProduct(product) {
  return normalizeCategory(product.category) !== "Custom Inventory";
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
  const productImage = lisetteCatalogImage(product.category, product.name);
  return {
    ...product,
    category: normalizeCategory(product.category),
    subcategory: product.subcategory || "",
    collection: product.collection || "",
    articleNumber: product.articleNumber || `BST-${String(product.id).padStart(4, "0")}`,
    images: [productImage],
    image: productImage,
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
  const categorySelection = parseCategorySelection(product.category);
  const productImage = lisetteCatalogImage(categorySelection.category, product.name);
  const costBreakdownObj = typeof product.cost_breakdown === "object" && product.cost_breakdown ? product.cost_breakdown : (() => { try { return JSON.parse(product.cost_breakdown || "{}"); } catch { return {}; } })();
  const metadata = costBreakdownObj?.metadata || {};

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
    images: [productImage],
    image: productImage,
    status: product.instock !== false ? "Active" : "Out of stock",
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
      .filter((item) => isStorefrontProduct(item) && item.status !== "Archived");

    return formatted.length ? formatted : fallbackProducts.map(formatFallbackProduct);
  } catch (error) {
    console.error("Failed to load catalog products:", error);
    return fallbackProducts.map(formatFallbackProduct);
  }
}
