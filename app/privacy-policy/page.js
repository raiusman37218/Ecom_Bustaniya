import { buildMetadata, siteConfig } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "Read Lisette's privacy policy for order, delivery, support and website information handling.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <main className="infoPage">
      <InfoNav />
      <section className="infoHero">
        <p className="eyebrow">PRIVACY POLICY</p>
        <h1>How customer information is used</h1>
        <p>We collect only the information needed to process orders, deliver products and provide support.</p>
      </section>
      <section className="infoContent">
        <h2>Information collected</h2>
        <p>Name, phone number, email when provided, delivery address, city, order items and payment method.</p>
        <h2>How it is used</h2>
        <p>
          Information is used for order confirmation, courier booking, customer support, fraud prevention
          and store communication related to Lisette.
        </p>
        <h2>Contact</h2>
        <p>{siteConfig.email || "Add NEXT_PUBLIC_CONTACT_EMAIL for privacy requests."}</p>
      </section>
    </main>
  );
}

function InfoNav() {
  return (
    <header className="categoryHeader infoHeader">
      <a className="brand lisetteBrand" href="/" aria-label="Lisette home">LISETTE<small>LINGERIE</small></a>
      <nav><a href="/terms-and-conditions">Terms</a><a href="/contact">Contact</a><a href="/shipping-policy">Shipping</a></nav>
    </header>
  );
}
