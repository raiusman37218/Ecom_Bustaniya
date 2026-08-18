import { buildMetadata, siteConfig } from "../../lib/seo";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getStoreSettings } from "../../lib/storeSettings";

export const metadata = buildMetadata({
  title: "Contact Bustaniya",
  description:
    "Contact Bustaniya for order help, delivery questions, product details and Pakistani women's clothing support.",
  path: "/contact",
});

export default async function ContactPage() {
  const storeSettings = await getStoreSettings();

  return (
    <div className="siteLayout">
      <SiteHeader storeSettings={storeSettings} activeNav="contact" />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">CONTACT</p>
          <h1>Need help with an order or outfit?</h1>
          <p>Use the details below for product questions, checkout support and delivery assistance.</p>
        </section>
        <section className="infoContent">
          <h2>Customer support</h2>
          <p>
            Phone / WhatsApp: {siteConfig.phone || "Add NEXT_PUBLIC_CONTACT_PHONE in the deployment environment."}
          </p>
          <p>
            Email: {siteConfig.email || "Add NEXT_PUBLIC_CONTACT_EMAIL in the deployment environment."}
          </p>
          <h2>Before contacting us</h2>
          <p>
            Please share your order reference, phone number used at checkout and the product name so
            the support team can find your order quickly.
          </p>
          <p lang="ur" dir="rtl">آرڈر، سائز یا ڈیلیوری سے متعلق سوال کے لیے اپنا آرڈر ریفرنس ساتھ بھیجیں۔</p>
        </section>
      </main>
      <SiteFooter storeSettings={storeSettings} />
    </div>
  );
}
