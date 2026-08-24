import { notFound } from "next/navigation";
import { normalizeCategory } from "../../../../data/store";
import UkProductDetails from "../../../../components/uk/UkProductDetails";
import { getCatalogProducts } from "../../../../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, productDescription, siteConfig } from "../../../../lib/seo";
import { getStoreSettings } from "../../../../lib/storeSettings";
import { convertProductToRegion, convertProductsToRegion } from "../../../../lib/regions";

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
  const rawProducts = await getCatalogProducts();
  const rawProduct = findProduct(rawProducts, id);
  if (!rawProduct) return {};
  const product = convertProductToRegion(rawProduct, "uk");
  return buildMetadata({
    title: `${product.name} - ${product.category} in the UK`,
    description: `${productDescription(product)} Available for tracked delivery across the UK from Bustaniya.`,
    path: `/uk/product/${product.id}`,
    image: product.image,
  });
}

export default async function UkProductPage({ params }) {
  const { id } = await params;
  const [rawProducts, storeSettings] = await Promise.all([
    getCatalogProducts(),
    getStoreSettings(),
  ]);
  const rawProduct = findProduct(rawProducts, id);
  if (!rawProduct) notFound();

  const product = convertProductToRegion(rawProduct, "uk");
  const rawRelated = rawProducts
    .filter((item) => item.id !== rawProduct.id && normalizeCategory(item.category) === normalizeCategory(rawProduct.category))
    .slice(0, 4);
  const related = convertProductsToRegion(rawRelated, "uk");

  const categorySlug = product.category === "Kurtis"
    ? "kurtis"
    : product.category === "Bottoms"
    ? "bottoms"
    : product.category === "3 Piece Suits"
    ? "3-piece-suits"
    : "coord-sets";

  const stock = Number(product.stock || 0);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/uk" },
          { name: product.category, path: `/uk/category/${categorySlug}` },
          { name: product.name, path: `/uk/product/${product.id}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: productDescription(product),
          image: (product.images?.length ? product.images : [product.image]),
          brand: { "@type": "Brand", name: `${siteConfig.name} UK` },
          category: product.category,
          offers: {
            "@type": "Offer",
            url: `${siteConfig.url}/uk/product/${product.id}`,
            priceCurrency: "GBP",
            price: Number(product.price || 0),
            availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          },
          sku: product.sku || product.articleNumber,
        }}
      />
      <UkProductDetails product={product} related={related} storeSettings={storeSettings} />
    </>
  );
}
