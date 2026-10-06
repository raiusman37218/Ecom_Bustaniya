import { buildMetadata } from "../../lib/seo";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import TrackOrderClient from "../../components/TrackOrderClient";
import { getStoreSettings } from "../../lib/storeSettings";
import { getCatalogCategories } from "../../lib/categories";

export const metadata = buildMetadata({
  title: "Track My Order - Bustaniya",
  description:
    "Track your Bustaniya order status and PostEx courier delivery progress in real time across Pakistan.",
  path: "/track-order",
});

export default async function TrackOrderPage() {
  const [storeSettings, categories] = await Promise.all([
    getStoreSettings(),
    getCatalogCategories(),
  ]);

  return (
    <div className="siteLayout">
      <SiteHeader storeSettings={storeSettings} categories={categories} />
      <main className="infoPage trackOrderPage">
        <section className="infoHero">
          <p className="eyebrow">ORDER TRACKING</p>
          <h1>Track Your Bustaniya Order</h1>
          <p>
            Real-time delivery progress with PostEx courier updates across Pakistan.
          </p>
        </section>
        <section className="infoContent trackContentSection">
          <TrackOrderClient storeSettings={storeSettings} />
        </section>
      </main>
      <SiteFooter storeSettings={storeSettings} categories={categories} />
    </div>
  );
}
