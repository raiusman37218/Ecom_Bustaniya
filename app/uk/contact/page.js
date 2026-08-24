import { buildMetadata } from "../../../lib/seo";
import UkHeader from "../../../components/uk/UkHeader";
import UkFooter from "../../../components/uk/UkFooter";
import { getStoreSettings } from "../../../lib/storeSettings";
import { REGIONS } from "../../../lib/regions";

export const metadata = buildMetadata({
  title: "Contact Bustaniya UK",
  description:
    "Contact Bustaniya UK for order help, delivery tracking, product sizing, and customer assistance.",
  path: "/uk/contact",
});

export default async function UkContactPage() {
  const storeSettings = await getStoreSettings();
  const ukConfig = REGIONS.uk;

  return (
    <div className="siteLayout">
      <UkHeader storeSettings={storeSettings} activeNav="contact" />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">CONTACT BUSTANIYA UK</p>
          <h1>Need help with a UK order or outfit?</h1>
          <p>Use the details below for product questions, checkout support, and UK delivery assistance.</p>
        </section>
        <section className="infoContent">
          <h2>UK Customer Support</h2>
          <p>
            <strong>Email:</strong> {ukConfig.contact.email}
          </p>
          <p>
            <strong>Phone / Support:</strong> {ukConfig.contact.phone}
          </p>
          <p>
            <strong>WhatsApp Concierge:</strong> {ukConfig.contact.whatsappDisplay}
          </p>
          <p>
            <strong>Operating Hours:</strong> {ukConfig.contact.supportHours}
          </p>

          <h2>Registered UK Company &amp; Office</h2>
          <p>
            <strong>Company Name:</strong> {ukConfig.contact.companyName}
          </p>
          <p>
            <strong>Company Number:</strong> {ukConfig.contact.companyNumber} (Registered in England &amp; Wales)
          </p>
          <p>
            <strong>Registered Office:</strong> {ukConfig.contact.registeredOffice}
          </p>
          <p>
            <strong>Nature of Business:</strong> {ukConfig.contact.sic}
          </p>

          <h2>Before Contacting Us</h2>
          <p>
            Please include your UK order reference (e.g. #UK-123456), the email address used at checkout, and the product name so our support team can assist you swiftly.
          </p>
        </section>
      </main>
      <UkFooter storeSettings={storeSettings} />
    </div>
  );
}
