import { notFound } from "next/navigation";
import { normalizeCategory } from "../../../data/store";
import ProductDetails from "../../../components/ProductDetails";
import { getCatalogProducts } from "../../../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, productDescription, productSchema, productSlug } from "../../../lib/seo";
import { getStoreSettings } from "../../../lib/storeSettings";

export const dynamic = "force-dynamic";

function legacyArticleNumber(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return "";
  return `BST-${String(numericId).padStart(4, "0")}`;
}

function findProduct(products, id) {
  const legacyArticle = legacyArticleNumber(id);
  return products.find((item) =>
    String(item.id) === String(id) ||
    String(item.articleNumber || "") === legacyArticle ||
    String(item.sku || "") === legacyArticle
  );
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

export default async function ProductPage({ params }) {
  const { id } = await params;
  const [products, storeSettings] = await Promise.all([
    getCatalogProducts(),
    getStoreSettings(),
  ]);
  const product = findProduct(products, id);
  if (!product) notFound();
  const related = products
    .filter((item) => item.id !== product.id && normalizeCategory(item.category) === normalizeCategory(product.category))
    .slice(0, 4);

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: product.category, path: product.category === "Kurtis" ? "/category/kurtis" : product.category === "Bottoms" ? "/category/bottoms" : product.category === "3 Piece Suits" ? "/category/3-piece-suits" : "/category/coord-sets" },
        { name: product.name, path: productSlug(product) },
      ])} />
      <JsonLd data={productSchema(product)} />
      <ProductDetails product={product} related={related} storeSettings={storeSettings} />
    </>
  );
}
