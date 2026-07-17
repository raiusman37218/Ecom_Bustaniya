import { NextResponse } from "next/server";
import { getCatalogProducts } from "../../../../lib/catalog";
import { supabaseRequest } from "../../../../lib/supabaseRest";

function normalizeText(value = "") {
  return String(value).trim().toLowerCase();
}

function legacyArticleNumber(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return "";
  return `BST-${String(numericId).padStart(4, "0")}`;
}

function findCatalogProduct(products, requested) {
  const requestedId = String(requested.id || "");
  const requestedArticle = String(
    requested.articleNumber ||
    requested.article_number ||
    requested.sku ||
    legacyArticleNumber(requested.id)
  );
  const requestedName = normalizeText(requested.name);

  return products.find((item) =>
    String(item.id) === requestedId ||
    String(item.articleNumber || "") === requestedArticle ||
    String(item.sku || "") === requestedArticle ||
    (requestedName && normalizeText(item.name) === requestedName)
  );
}

export async function POST(request) {
  try {
    const { items = [] } = await request.json();
    const requested = Array.isArray(items) ? items : [];
    const storefrontProducts = await getCatalogProducts();
    const articleNumbers = requested
      .map((item) => findCatalogProduct(storefrontProducts, item))
      .filter(Boolean)
      .map((product) => product.articleNumber || `BST-${String(product.id).padStart(4, "0")}`);

    if (!articleNumbers.length) {
      return NextResponse.json({ delivery: 0 });
    }

    const encoded = articleNumbers.map((value) => `"${value}"`).join(",");
    const [products, settings] = await Promise.all([
      supabaseRequest(
        `products?select=article_number,price,delivery_fee_mode,delivery_fee_pkr&article_number=in.(${encodeURIComponent(encoded)})`
      ),
      supabaseRequest(
        "store_settings?select=cod_delivery_fee_pkr,free_delivery_threshold_pkr&id=eq.1&limit=1"
      ),
    ]);

    const quantityByArticle = new Map(
      requested.map((item) => {
        const product = findCatalogProduct(storefrontProducts, item);
        return [
          product?.articleNumber || legacyArticleNumber(item.id),
          Math.max(1, Number(item.quantity) || 1),
        ];
      })
    );
    const subtotal = (products || []).reduce(
      (total, product) =>
        total + Number(product.price || 0) * (quantityByArticle.get(product.article_number) || 0),
      0
    );
    const rules = settings?.[0] || {};
    const threshold = Number(rules.free_delivery_threshold_pkr || 5000);
    const codFee = Number(rules.cod_delivery_fee_pkr || 200);
    const allFree =
      products?.length > 0 &&
      products.every((product) => product.delivery_fee_mode === "free");
    const customFee = (products || []).reduce(
      (highest, product) =>
        product.delivery_fee_mode === "paid"
          ? Math.max(highest, Number(product.delivery_fee_pkr || 0))
          : highest,
      0
    );

    return NextResponse.json({
      delivery: subtotal >= threshold || allFree ? 0 : Math.max(codFee, customFee),
      threshold,
    });
  } catch {
    return NextResponse.json({ delivery: 200, threshold: 5000 });
  }
}
