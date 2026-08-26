import { buildMetadata } from "../../lib/seo";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getStoreSettings } from "../../lib/storeSettings";

export const metadata = buildMetadata({
  title: "Terms and Conditions",
  description:
    "Read Bustaniya's online shopping terms for product details, prices, checkout, payments and order processing.",
  path: "/terms-and-conditions",
});

export default async function TermsAndConditionsPage() {
  const storeSettings = await getStoreSettings();

  return (
    <div className="siteLayout">
      <SiteHeader storeSettings={storeSettings} />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">TERMS AND CONDITIONS</p>
          <h1>Shopping terms for Bustaniya customers</h1>
          <p>These terms help customers understand product information, checkout and order processing.</p>
        </section>
        <section className="infoContent">
          <h2>Product information</h2>
          <p>
            We aim to keep names, prices, images, availability and product details accurate. Color may
            vary slightly because of screen settings and photography.
          </p>
          <h2>Orders and payment</h2>
          <p>
            Orders are accepted and confirmed after valid checkout details are submitted. Payment
            verification is tracked separately, and full advance payment remains optional unless a
            customer chooses the free-delivery option. Prices are listed in Pakistani Rupees.
          </p>
          <h2>Policy links</h2>
          <p>
            Please review the shipping policy, exchange and return policy, and privacy policy before
            placing an order.
          </p>
        </section>
      </main>
      <SiteFooter storeSettings={storeSettings} />
    </div>
  );
}
