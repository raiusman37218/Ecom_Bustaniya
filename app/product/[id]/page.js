import { notFound } from "next/navigation";
import { normalizeCategory } from "../../../data/store";
import ProductDetails from "../../../components/ProductDetails";
import { getCatalogProducts } from "../../../lib/catalog";
import { getCatalogCategories } from "../../../lib/categories";
import { JsonLd, breadcrumbSchema, buildMetadata, productDescription, productSchema, productSlug } from "../../../lib/seo";
import { getStoreSettings } from "../../../lib/storeSettings";
import { optimizedImageUrl, CLOUDINARY_IMAGE_PRESETS } from "../../../lib/images";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function legacyArticleNumber(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return "";
  return `BST-${String(numericId).padStart(4, "0")}`;
}

function findProduct(products, id) {
  const target = String(id || "").trim().toLowerCase();
  const legacyArticle = legacyArticleNumber(id).toLowerCase();
  return products.find((item) => {
    const itemId = String(item.id || "").toLowerCase();
    const itemArticle = String(item.articleNumber || "").toLowerCase();
    const itemSku = String(item.sku || "").toLowerCase();
    const itemHandle = String(item.cost_breakdown?.metadata?.urlHandle || "").toLowerCase();
    return (
      itemId === target ||
      (legacyArticle && (itemArticle === legacyArticle || itemSku === legacyArticle)) ||
      (itemArticle && itemArticle === target) ||
      (itemSku && itemSku === target) ||
      (itemHandle && itemHandle === target)
    );
  });
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const products = await getCatalogProducts();
  const product = findProduct(products, id);
  return product ? buildMetadata({
    title: `${product.name} - ${product.category}`,
    description: productDescription(product),
    path: productSlug(product),
    image: product.image,
  }) : {};
}

export default async function ProductPage({ params, searchParams }) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedCategory = resolvedSearchParams?.category || resolvedSearchParams?.cat || "";
  const [products, storeSettings, categories] = await Promise.all([
    getCatalogProducts(),
    getStoreSettings(),
    getCatalogCategories(),
  ]);
  const product = findProduct(products, id);
  if (!product) notFound();
  const related = products
    .filter((item) => item.id !== product.id && normalizeCategory(item.category) === normalizeCategory(product.category))
    .slice(0, 4);

  const thumbPreloadUrl = product.image ? optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.thumbnail) : "";
  const productPreloadUrl = product.image ? optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.product) : "";

  return (
    <>
      {thumbPreloadUrl && <link rel="preload" as="image" href={thumbPreloadUrl} fetchPriority="high" />}
      {productPreloadUrl && <link rel="preload" as="image" href={productPreloadUrl} fetchPriority="high" />}
      <JsonLd data={breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: product.category, path: product.category === "Kurtis" ? "/category/kurtis" : product.category === "Bottoms" ? "/category/bottoms" : product.category === "3 Piece Suits" ? "/category/3-piece-suits" : "/category/coord-sets" },
        { name: product.name, path: productSlug(product) },
      ])} />
      <JsonLd data={productSchema(product)} />
      <ProductDetails
        product={product}
        related={related}
        storeSettings={storeSettings}
        categories={categories}
        initialCategory={requestedCategory}
      />
    </>
  );
}
