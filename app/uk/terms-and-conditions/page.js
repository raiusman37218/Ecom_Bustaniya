import { buildMetadata } from "../../../lib/seo";
import UkHeader from "../../../components/uk/UkHeader";
import UkFooter from "../../../components/uk/UkFooter";
import { getStoreSettings } from "../../../lib/storeSettings";
import { REGIONS } from "../../../lib/regions";

export const metadata = buildMetadata({
  title: "UK Terms and Conditions",
  description:
    "Read Bustaniya's terms and conditions for online shopping, ordering, pricing in GBP, and delivery in the UK.",
  path: "/uk/terms-and-conditions",
});

export default async function UkTermsAndConditionsPage() {
  const storeSettings = await getStoreSettings();
  const ukConfig = REGIONS.uk;

  return (
    <div className="siteLayout">
      <UkHeader storeSettings={storeSettings} />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">UK TERMS AND CONDITIONS</p>
          <h1>Terms of Service for UK Customers</h1>
          <p>Please read these terms and conditions carefully before placing an order on our UK store.</p>
        </section>
        <section className="infoContent">
          <h2>Company Information</h2>
          <p>
            This website is operated by <strong>{ukConfig.contact.companyName}</strong>, a company registered in England and Wales under Company Registration Number {ukConfig.contact.companyNumber}, with registered office at {ukConfig.contact.registeredOffice}.
          </p>

          <h2>Pricing &amp; Currency</h2>
          <p>
            All prices on <strong>bustaniya.com/uk</strong> are quoted in British Pounds Sterling (GBP / £). Prices include all applicable UK taxes and duties. Delivery charges are clearly stated before order completion.
          </p>

          <h2>Orders &amp; Formation of Contract</h2>
          <p>
            An order placed through our website represents an offer to purchase. A legally binding contract is established when you receive an order confirmation email containing your order reference and item details.
          </p>

          <h2>Delivery &amp; Risk</h2>
          <p>
            Risk of loss and title for items purchased pass to you upon delivery by the carrier. We use tracked services (Royal Mail and DPD) to ensure secure delivery.
          </p>

          <h2>Consumer Rights &amp; Returns</h2>
          <p>
            Nothing in these terms affects your statutory rights under the UK Consumer Rights Act 2015 or the Consumer Contracts Regulations 2013. You have 14 calendar days from delivery to request a return or exchange.
          </p>

          <h2>Governing Law</h2>
          <p>
            These terms and conditions, and any dispute arising under or in connection with them, are governed by the laws of England and Wales, and subject to the exclusive jurisdiction of the English courts.
          </p>
        </section>
      </main>
      <UkFooter storeSettings={storeSettings} />
    </div>
  );
}
