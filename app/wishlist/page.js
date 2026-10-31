import { buildMetadata } from "../../lib/seo";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import WishlistPageClient from "../../components/WishlistPageClient";
import { getStoreSettings } from "../../lib/storeSettings";
import { getCatalogCategories } from "../../lib/categories";

export const metadata = buildMetadata({
  title: "My Wishlist - Bustaniya",
  description:
    "View and manage your saved Pakistani eastern wear pieces, kurtis, co-ords, and 3-piece suits at Bustaniya.",
  path: "/wishlist",
});

export default async function WishlistPage() {
  const [storeSettings, categories] = await Promise.all([
    getStoreSettings(),
    getCatalogCategories(),
  ]);

  return (
    <div className="siteLayout">
      <SiteHeader storeSettings={storeSettings} categories={categories} />
      <main className="bs-st cartPageLayout wishlistPageMain">
        <WishlistPageClient region="pk" />
      </main>
      <SiteFooter storeSettings={storeSettings} categories={categories} />
    </div>
  );
}

