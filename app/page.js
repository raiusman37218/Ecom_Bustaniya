import HomePageClient from "../components/HomePageClient";
import { getCatalogCategories } from "../lib/categories";
import { getCatalogProducts } from "../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, organizationSchema, siteConfig, websiteSchema } from "../lib/seo";
import { getStoreSettings } from "../lib/storeSettings";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Pakistani Women's Wear, Kurtis, Co-ord Sets & 3 Piece Suits",
  description:
    "Shop Bustaniya for Pakistani women's wear, everyday kurtis, elegant co-ord sets, bottoms and festive 3 piece suits with nationwide delivery.",
  path: "/",
  image: "/bustaniya-animated-hero-option-a.png",
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
          image: `${siteConfig.url}/bustaniya-animated-hero-option-a.png`,
          priceRange: "PKR",
          currenciesAccepted: "PKR",
          paymentAccepted: "Cash on Delivery, Bank Deposit",
        }}
      />
      <HomePageClient initialProducts={products} initialCategories={categories} storeSettings={storeSettings} />
    </>
  );
}
