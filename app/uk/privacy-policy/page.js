import { buildMetadata } from "../../../lib/seo";
import UkHeader from "../../../components/uk/UkHeader";
import UkFooter from "../../../components/uk/UkFooter";
import { getStoreSettings } from "../../../lib/storeSettings";
import { REGIONS } from "../../../lib/regions";

export const metadata = buildMetadata({
  title: "UK Privacy Policy",
  description:
    "Read Bustaniya UK's privacy policy, GDPR compliance, and data protection practices for UK customers.",
  path: "/uk/privacy-policy",
});

export default async function UkPrivacyPolicyPage() {
  const storeSettings = await getStoreSettings();
  const ukConfig = REGIONS.uk;

  return (
    <div className="siteLayout">
      <UkHeader storeSettings={storeSettings} />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">UK PRIVACY POLICY</p>
          <h1>How We Protect &amp; Use Your Personal Data</h1>
          <p>We are committed to safeguarding the privacy and personal data of our UK visitors and customers.</p>
        </section>
        <section className="infoContent">
          <h2>Data Controller</h2>
          <p>
            The data controller responsible for your personal data on this website is <strong>{ukConfig.contact.companyName}</strong> (Company no. {ukConfig.contact.companyNumber}), having its registered office at {ukConfig.contact.registeredOffice}.
          </p>

          <h2>Information We Collect</h2>
          <p>
            When you browse, create a shopping bag, or place an order through our UK store, we may collect your name, postal delivery address, email address, telephone number, payment confirmation details, and IP address.
          </p>

          <h2>How Your Information is Used</h2>
          <p>
            Under the UK General Data Protection Regulation (UK GDPR) and Data Protection Act 2018, we process your information on lawful grounds to:
          </p>
          <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
            <li>Process, fulfill, and deliver your orders via tracked UK couriers.</li>
            <li>Send order confirmation, dispatch notices, and delivery tracking updates.</li>
            <li>Provide customer support, exchange management, and address queries.</li>
            <li>Detect and prevent fraudulent transactions.</li>
          </ul>

          <h2>Your Rights under UK GDPR</h2>
          <p>
            You have the right to request access to your personal data, rectify inaccuracies, request erasure, or object to processing. To exercise any of these rights, contact us at <strong>{ukConfig.contact.email}</strong>.
          </p>
        </section>
      </main>
      <UkFooter storeSettings={storeSettings} />
    </div>
  );
}
