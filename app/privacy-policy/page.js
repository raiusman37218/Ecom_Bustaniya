import { buildMetadata, siteConfig } from "../../lib/seo";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getStoreSettings } from "../../lib/storeSettings";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "Read Bustaniya's privacy policy for order, delivery, support and website information handling.",
  path: "/privacy-policy",
});

export default async function PrivacyPolicyPage() {
  const storeSettings = await getStoreSettings();

  return (
    <div className="siteLayout">
      <SiteHeader storeSettings={storeSettings} />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">PRIVACY POLICY</p>
          <h1>How customer information is used</h1>
          <p>We collect only the information needed to process orders, deliver products and provide support.</p>
        </section>
        <section className="infoContent">
          <h2>Information collected</h2>
          <p>Name, phone number, email when provided, delivery address, city, order items and payment method.</p>
          <h2>How it is used</h2>
          <p>
            Information is used for order confirmation, courier booking, customer support, fraud prevention
            and store communication related to Bustaniya.
          </p>
          <h2>Contact</h2>
          <p>{siteConfig.email || "support@bustaniya.pk"}</p>
        </section>
      </main>
      <SiteFooter storeSettings={storeSettings} />
    </div>
  );
}
