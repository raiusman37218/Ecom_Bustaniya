import { buildMetadata } from "../../lib/seo";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getStoreSettings } from "../../lib/storeSettings";

export const metadata = buildMetadata({
  title: "Exchange and Return Policy",
  description:
    "Read Bustaniya's exchange and return policy for online Pakistani women's clothing orders.",
  path: "/exchange-return-policy",
});

export default async function ExchangeReturnPolicyPage() {
  const storeSettings = await getStoreSettings();

  return (
    <div className="siteLayout">
      <SiteHeader storeSettings={storeSettings} />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">EXCHANGE AND RETURNS</p>
          <h1>Exchange and return information</h1>
          <p>We want you to love your Bustaniya pieces. Here is our straightforward exchange policy.</p>
        </section>
        <section className="infoContent">
          <h2>7-Day Doorstep Exchange</h2>
          <p>
            Items in original, unworn condition with tags intact can be exchanged for size or another piece within 7 days of delivery.
          </p>
          <h2>How to initiate an exchange</h2>
          <p>
            Contact our WhatsApp support team with your order reference number and a photo of the item. We will arrange a replacement dispatched to your doorstep.
          </p>
          <h2>Damaged or incorrect items</h2>
          <p>
            If you receive a defective or incorrect item, please notify us within 48 hours of delivery. We will arrange an immediate free replacement with no extra shipping charges.
          </p>
        </section>
      </main>
      <SiteFooter storeSettings={storeSettings} />
    </div>
  );
}
