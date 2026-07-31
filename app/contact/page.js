import { buildMetadata, siteConfig } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Contact Bustaniya",
  description:
    "Contact Bustaniya for order help, delivery questions, product details and Pakistani women's clothing support.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main className="infoPage">
      <InfoNav />
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
  );
}

function InfoNav() {
  return (
    <header className="categoryHeader infoHeader">
      <a className="brand" href="/" aria-label="Bustaniya home"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
      <nav><a href="/about">About</a><a href="/shipping-policy">Shipping</a><a href="/exchange-return-policy">Returns</a></nav>
    </header>
  );
}
