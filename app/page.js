import HomePageClient from "../components/HomePageClient";
import { getCatalogCategories } from "../lib/categories";
import { getCatalogProducts } from "../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, organizationSchema, siteConfig, websiteSchema } from "../lib/seo";
import { getStoreSettings } from "../lib/storeSettings";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Lingerie, Bras, Panties & Everyday Essentials",
  description:
    "Shop Lisette for beautifully made bras, panties, sleepwear and everyday lingerie essentials with nationwide delivery.",
  path: "/",
  image: "/lisette-hero.png",
});

export default async function HomePage() {
  const [products, categories, storeSettings] = await Promise.all([
    getCatalogProducts(),
    getCatalogCategories(),
    getStoreSettings(),
  ]);

  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Store",
          name: siteConfig.name,
          url: siteConfig.url,
          image: `${siteConfig.url}/lisette-hero.png`,
          priceRange: "PKR",
          currenciesAccepted: "PKR",
          paymentAccepted: "Cash on Delivery, Bank Deposit",
        }}
      />
      <HomePageClient initialProducts={products} initialCategories={categories} storeSettings={storeSettings} />
    </>
  );
}
