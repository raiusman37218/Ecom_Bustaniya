import { normalizeCategory, parseCategorySelection, products as fallbackProducts } from "../data/store";
import { optimizedImageUrl } from "./images";
import { supabaseRequest } from "./supabaseRest";

const DEFAULT_ACTIVE_STOCK = 10;

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
  };
}

export async function getCatalogProducts() {
  try {
    const products = await supabaseRequest(
      "products?select=*,inventory(stock_quantity,low_stock_threshold,sku)&instock=eq.true&order=created_at.desc"
    );
    const formatted = (products || []).map(formatCatalogProduct).filter(isStorefrontProduct);
    return formatted.length ? formatted : fallbackProducts.map(formatFallbackProduct);
  } catch {
    return fallbackProducts.map(formatFallbackProduct);
  }
}
