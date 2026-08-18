import { buildMetadata } from "../../lib/seo";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getStoreSettings } from "../../lib/storeSettings";

export const metadata = buildMetadata({
  title: "Shipping Policy",
  description:
    "Read Bustaniya's shipping policy for Pakistani clothing orders, delivery charges, courier handling and confirmation payments.",
  path: "/shipping-policy",
});

export default async function ShippingPolicyPage() {
  const storeSettings = await getStoreSettings();

  return (
    <div className="siteLayout">
      <SiteHeader storeSettings={storeSettings} />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">SHIPPING POLICY</p>
          <h1>Delivery information for Bustaniya orders</h1>
          <p>Shipping charges are calculated during checkout based on the items in your cart.</p>
        </section>
        <section className="infoContent">
          <h2>Order confirmation</h2>
          <p>Orders currently require Rs. 250 advance payment for COD confirmation where shown on the website. Full advance payment orders receive Free Delivery nationwide.</p>
          <h2>Delivery charges</h2>
          <p>
            The checkout page shows the current delivery amount before order placement. Standard delivery is Rs. 200 across Pakistan, with Free Delivery on orders of Rs. 5,000 or above.
          </p>
          <h2>Estimated delivery times</h2>
          <p>
            Orders are processed within 24–48 hours and delivered within 3–5 business days nationwide via tracked courier. Tracking updates are provided via SMS and WhatsApp.
          </p>
        </section>
      </main>
      <SiteFooter storeSettings={storeSettings} />
    </div>
  );
}
