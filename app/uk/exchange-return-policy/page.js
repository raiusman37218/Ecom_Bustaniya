import { buildMetadata } from "../../../lib/seo";
import UkHeader from "../../../components/uk/UkHeader";
import UkFooter from "../../../components/uk/UkFooter";
import { getStoreSettings } from "../../../lib/storeSettings";
import { REGIONS } from "../../../lib/regions";

export const metadata = buildMetadata({
  title: "UK Returns & Exchange Policy",
  description:
    "Read Bustaniya's 14-day UK return and exchange policy for Pakistani women's clothing orders.",
  path: "/uk/exchange-return-policy",
});

export default async function UkExchangeReturnPolicyPage() {
  const storeSettings = await getStoreSettings();
  const ukConfig = REGIONS.uk;

  return (
    <div className="siteLayout">
      <UkHeader storeSettings={storeSettings} />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">UK RETURNS &amp; EXCHANGES</p>
          <h1>14-Day Hassle-Free Returns &amp; Exchanges</h1>
          <p>We want you to love every piece you purchase from Bustaniya UK.</p>
        </section>
        <section className="infoContent">
          <h2>14-Day Return Window</h2>
          <p>
            Under UK consumer law and Bustaniya&apos;s guarantee, items in original, unworn, unwashed condition with all tags and protective packaging intact may be returned or exchanged within <strong>14 calendar days</strong> of delivery.
          </p>

          <h2>How to Initiate a UK Return or Exchange</h2>
          <ol style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
            <li>Email our concierge team at <strong>{ukConfig.contact.email}</strong> or message us on WhatsApp quoting your order number (#UK-XXXXXX).</li>
            <li>Specify whether you require a different size/item or a full refund.</li>
            <li>Our team will provide return postage instructions and a UK return reference.</li>
          </ol>

          <h2>Exchanges for Size</h2>
          <p>
            If you require a size replacement, we will arrange for the replacement item to be dispatched promptly once the original item is received and inspected.
          </p>

          <h2>Damaged or Incorrect Items</h2>
          <p>
            In the unlikely event that you receive a defective, damaged, or incorrect item, please notify us within <strong>48 hours</strong> of delivery with clear photographs. We will arrange an immediate free replacement at no extra charge.
          </p>

          <h2>Refund Processing</h2>
          <p>
            Approved refunds are credited back to the original payment method within 5–7 business days of inspection.
          </p>
        </section>
      </main>
      <UkFooter storeSettings={storeSettings} />
    </div>
  );
}
