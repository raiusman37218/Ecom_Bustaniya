import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import CategoryProductsGrid from "../../components/CategoryProductsGrid";
import { getCatalogCategories } from "../../lib/categories";
import { getCatalogProducts } from "../../lib/catalog";
import { getStoreSettings } from "../../lib/storeSettings";
import { buildMetadata } from "../../lib/seo";

export const revalidate = 60;

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const q = String(params?.q || "").trim();
  return buildMetadata({
    title: q ? `Search: "${q}" | Bustaniya` : "Search Collection | Bustaniya",
    description: `Explore search results for "${q}" from Bustaniya designer collection. Delivery across Pakistan.`,
    path: `/search?q=${encodeURIComponent(q)}`,
  });
}

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = String(params?.q || "").trim().toLowerCase();

  const [allProducts, categories, storeSettings] = await Promise.all([
    getCatalogProducts(),
    getCatalogCategories(),
    getStoreSettings(),
  ]);

  const searchResults = q
    ? allProducts.filter((product) => {
        const name = String(product.name || "").toLowerCase();
        const cat = String(product.category || "").toLowerCase();
        const subcat = String(product.subcategory || "").toLowerCase();
        const desc = String(product.description || "").toLowerCase();
        const fabric = String(product.fabricDetails || product.fabric_details || "").toLowerCase();
        const colors = Array.isArray(product.colors) ? product.colors.join(" ").toLowerCase() : "";
        const sku = String(product.sku || product.articleNumber || "").toLowerCase();

        return (
          name.includes(q) ||
          cat.includes(q) ||
          subcat.includes(q) ||
          desc.includes(q) ||
          fabric.includes(q) ||
          colors.includes(q) ||
          sku.includes(q)
        );
      })
    : [];

  return (
    <>
      <SiteHeader storeSettings={storeSettings} categories={categories} />

      <main className="categoryPage">
        <section className="collectionHeader">
          <nav className="collectionBreadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="collectionBreadcrumbCurrent">Search</span>
          </nav>
          <h1>{q ? `Results for “${params?.q}”` : "Search Collection"}</h1>
          <p className="collectionIntro">
            {q
              ? `Found ${searchResults.length} ${searchResults.length === 1 ? "design" : "designs"} matching your search.`
              : "Search across our latest luxury Pakistani kurtis, co-ords, and festive ensembles."}
          </p>
        </section>

        {searchResults.length > 0 ? (
          <CategoryProductsGrid
            initialProducts={searchResults}
            storeSettings={storeSettings}
            categoryName={q ? `Search: "${params?.q}"` : "All Products"}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px", maxWidth: "600px", margin: "0 auto" }}>
            <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#173d29", marginBottom: "10px" }}>
              No products found {q ? `for “${params?.q}”` : ""}
            </h3>
            <p style={{ color: "#64748b", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
              We couldn&apos;t find any designs matching your query. Try checking your spelling or explore our most loved categories below.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
              <Link href="/category/kurtis" className="subCategoryPill">
                Kurtis
              </Link>
              <Link href="/category/coord-sets" className="subCategoryPill">
                Co-ord Sets
              </Link>
              <Link href="/category/3-piece-suits" className="subCategoryPill">
                3 Piece Suits
              </Link>
              <Link href="/category/bottoms" className="subCategoryPill">
                Bottoms
              </Link>
            </div>
          </div>
        )}
      </main>

      <SiteFooter storeSettings={storeSettings} />
    </>
  );
}
