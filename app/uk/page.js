import UkHomePageClient from "../../components/uk/UkHomePageClient";
import { getCatalogCategories } from "../../lib/categories";
import { getCatalogBestSellerIds, getCatalogProducts } from "../../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, organizationSchema, siteConfig, websiteSchema } from "../../lib/seo";
import { getStoreSettings } from "../../lib/storeSettings";
import { REGIONS } from "../../lib/regions";

export const revalidate = 60;

export const metadata = buildMetadata({
  title: REGIONS.uk.seo.defaultTitle,
  description: REGIONS.uk.seo.defaultDescription,
  path: "/uk",
  image: "/bustaniya-campaign-hero-v5.png",
});

export default async function UkHomePage() {
  const [products, categories, storeSettings, bestSellingProductIds] = await Promise.all([
    getCatalogProducts(),
    getCatalogCategories(),
    getStoreSettings(),
    getCatalogBestSellerIds(),
  ]);

  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/uk" }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Store",
          name: `${siteConfig.name} UK`,
          url: `${siteConfig.url}/uk`,
          image: `${siteConfig.url}/bustaniya-campaign-hero-v5.png`,
          priceRange: "GBP",
          currenciesAccepted: "GBP",
          paymentAccepted: "Credit Card, Debit Card, Apple Pay, Google Pay, Bank Transfer",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Unit A1099 Siu Office, 4–6 Greatorex Street",
            addressLocality: "London",
            postalCode: "E1 5NF",
            addressCountry: "GB",
          },
        }}
      />
      <UkHomePageClient
        initialProducts={products}
        initialCategories={categories}
        storeSettings={storeSettings}
        bestSellingProductIds={bestSellingProductIds}
      />
    </>
  );
}
