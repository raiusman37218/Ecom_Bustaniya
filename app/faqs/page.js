import { buildMetadata } from "../../lib/seo";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FaqAccordion from "../../components/FaqAccordion";
import { getStoreSettings } from "../../lib/storeSettings";
import { getCatalogCategories } from "../../lib/categories";

export const metadata = buildMetadata({
  title: "Frequently Asked Questions (FAQ) - Bustaniya",
  description:
    "Find answers to frequently asked questions about delivery, orders, custom stitching, payments, and returns at Bustaniya.",
  path: "/faqs",
});

export default async function FaqsPage() {
  const [storeSettings, categories] = await Promise.all([
    getStoreSettings(),
    getCatalogCategories(),
  ]);

  const rawWhatsapp = String(
    storeSettings?.paymentSettings?.whatsappNumber ||
    storeSettings?.whatsappNumber ||
    "923053530008"
  ).replace(/\D/g, "");

  const cleanWhatsapp = rawWhatsapp.startsWith("0") ? "92" + rawWhatsapp.slice(1) : rawWhatsapp;

  return (
    <div className="siteLayout">
      <SiteHeader storeSettings={storeSettings} categories={categories} />
      <main className="infoPage faqsPage">
        <section className="infoHero">
          <p className="eyebrow">HELP &amp; SUPPORT</p>
          <h1>Frequently Asked Questions</h1>
          <p>
            Quick answers to everything you need to know about shopping, delivery, custom tailoring, and payments at Bustaniya.
          </p>
        </section>
        <section className="infoContent faqContentSection">
          <FaqAccordion whatsappNumber={cleanWhatsapp} />
        </section>
      </main>
      <SiteFooter storeSettings={storeSettings} categories={categories} />
    </div>
  );
}
