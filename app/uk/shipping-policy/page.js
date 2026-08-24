import { buildMetadata } from "../../../lib/seo";
import UkHeader from "../../../components/uk/UkHeader";
import UkFooter from "../../../components/uk/UkFooter";
import { getStoreSettings } from "../../../lib/storeSettings";

export const metadata = buildMetadata({
  title: "UK Shipping & Delivery Policy",
  description:
    "Read Bustaniya's UK shipping policy, delivery rates, Royal Mail & DPD tracked courier handling, and estimated transit times across the UK.",
  path: "/uk/shipping-policy",
});

export default async function UkShippingPolicyPage() {
  const storeSettings = await getStoreSettings();

  return (
    <div className="siteLayout">
      <UkHeader storeSettings={storeSettings} />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">UK SHIPPING POLICY</p>
          <h1>Delivery Information for UK Orders</h1>
          <p>We provide fast, reliable tracked shipping across the United Kingdom.</p>
        </section>
        <section className="infoContent">
          <h2>UK Delivery Rates</h2>
          <p>
            <strong>Standard UK Tracked Delivery:</strong> £4.99 on orders under £75.
          </p>
          <p>
            <strong>Free UK Delivery:</strong> Automatically applied at checkout for all UK orders of £75 or above.
          </p>

          <h2>Estimated Delivery Times</h2>
          <p>
            Orders are processed and dispatched within 24–48 hours (excluding Sundays and UK bank holidays).
            Delivery takes <strong>2–4 business days</strong> via tracked courier services (Royal Mail Tracked 24/48 or DPD).
          </p>

          <h2>Order Tracking</h2>
          <p>
            Once your parcel is dispatched, a tracking number and courier link will be emailed to you so you can follow your delivery in real-time.
          </p>

          <h2>Delivery Coverage</h2>
          <p>
            We deliver to all residential and business addresses across England, Scotland, Wales, and Northern Ireland.
          </p>

          <h2>Customs &amp; Duties</h2>
          <p>
            All prices displayed on <strong>bustaniya.com/uk</strong> include applicable UK duties and taxes. There are no additional customs fees or surprise charges on delivery.
          </p>
        </section>
      </main>
      <UkFooter storeSettings={storeSettings} />
    </div>
  );
}
