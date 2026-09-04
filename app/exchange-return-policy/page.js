import { buildMetadata } from "../../lib/seo";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getStoreSettings } from "../../lib/storeSettings";

export const metadata = buildMetadata({
  title: "Return & Exchange Policy",
  description:
    "Read Bustaniya's official return and exchange policy for Pakistani women's clothing orders.",
  path: "/exchange-return-policy",
});

export default async function ExchangeReturnPolicyPage() {
  const storeSettings = await getStoreSettings();

  return (
    <div className="siteLayout">
      <SiteHeader storeSettings={storeSettings} />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">CUSTOMER CARE</p>
          <h1>Return &amp; Exchange Policy</h1>
          <p>
            At <strong>Bustaniya</strong>, we carefully inspect and pack every order before dispatch to ensure you receive your product in perfect condition.
          </p>
        </section>
        <section className="infoContent">
          <h2>1. Damaged or Defective Product</h2>
          <p>
            If you receive an item that is <strong>damaged, defective, or incorrect due to an issue from our side</strong>, you are eligible for a return or replacement.
          </p>
          <ul>
            <li>Please contact us within <strong>24 hours of receiving your order</strong>.</li>
            <li>Share clear pictures/videos of the product and the issue with our customer support team.</li>
            <li>If the issue is confirmed to be from our side, <strong>Bustaniya will bear the return/exchange delivery charges</strong>.</li>
            <li>A replacement will be provided, subject to product availability.</li>
          </ul>

          <h2>2. Change of Mind / Product Not Liked</h2>
          <p>
            If you simply <strong>do not like the product, change your mind, or the product is not as expected</strong>, we do not offer refunds.
          </p>
          <p>
            However, you may request an <strong>exchange/replacement</strong>, subject to availability.
          </p>
          <ul>
            <li>The customer will be responsible for <strong>all delivery charges associated with the exchange</strong>.</li>
            <li>The product must be unused, unworn, unwashed, and in its original condition with all tags and packaging intact.</li>
          </ul>

          <h2>3. Refund Policy</h2>
          <p>
            <strong>Bustaniya does not offer refunds for change-of-mind or preference-based requests.</strong>
          </p>
          <p>
            Refunds will only be considered in exceptional circumstances where the issue is confirmed to be from Bustaniya&apos;s side and a suitable replacement is not available.
          </p>

          <h2>4. Important Conditions</h2>
          <ul>
            <li>Products that have been <strong>worn, washed, altered, damaged, or used</strong> by the customer are not eligible for exchange.</li>
            <li>We cannot accept exchange requests after the specified return/exchange period.</li>
            <li>Sale, discounted, or specially customized items may have different exchange conditions.</li>
            <li>Customers are requested to <strong>record an unboxing video</strong> when opening their parcel. This may be required to verify damage or missing/incorrect items.</li>
          </ul>

          <div className="infoNoticeBox">
            <p>
              For any return or exchange request, please contact our customer support team with your <strong>order number and clear pictures/videos of the issue</strong>.
            </p>
            <p style={{ marginTop: "10px", fontWeight: "600" }}>
              Bustaniya reserves the right to assess each return/exchange request and approve it according to the conditions mentioned above.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter storeSettings={storeSettings} />
    </div>
  );
}
