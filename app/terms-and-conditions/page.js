import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Terms and Conditions",
  description:
    "Read Bustaniya's online shopping terms for product details, prices, checkout, payments and order processing.",
  path: "/terms-and-conditions",
});

export default function TermsAndConditionsPage() {
  return (
    <main className="infoPage">
      <InfoNav />
      <section className="infoHero">
        <p className="eyebrow">TERMS AND CONDITIONS</p>
        <h1>Shopping terms for Bustaniya customers</h1>
        <p>These terms help customers understand product information, checkout and order processing.</p>
      </section>
      <section className="infoContent">
        <h2>Product information</h2>
        <p>
          We aim to keep names, prices, images, availability and product details accurate. Color may
          vary slightly because of screen settings and photography.
        </p>
        <h2>Orders and payment</h2>
        <p>
          Orders are accepted after checkout details are submitted and any required confirmation
          payment is completed. Prices are listed in Pakistani Rupees.
        </p>
        <h2>Policy links</h2>
        <p>
          Please review the shipping policy, exchange and return policy, and privacy policy before
          placing an order.
        </p>
      </section>
    </main>
  );
}

function InfoNav() {
  return (
    <header className="categoryHeader infoHeader">
      <a className="brand" href="/" aria-label="Bustaniya home"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
      <nav><a href="/shipping-policy">Shipping</a><a href="/exchange-return-policy">Returns</a><a href="/privacy-policy">Privacy</a></nav>
    </header>
  );
}
