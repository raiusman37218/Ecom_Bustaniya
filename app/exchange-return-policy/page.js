import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Exchange and Return Policy",
  description:
    "Read Bustaniya's exchange and return policy for online Pakistani women's clothing orders.",
  path: "/exchange-return-policy",
});

export default function ExchangeReturnPolicyPage() {
  return (
    <main className="infoPage">
      <InfoNav />
      <section className="infoHero">
        <p className="eyebrow">EXCHANGE AND RETURNS</p>
        <h1>Exchange and return information</h1>
        <p>This page lists the policy details customers need before placing an order.</p>
      </section>
      <section className="infoContent">
        <h2>Current policy status</h2>
        <p>
          Final exchange, return, refund, defect reporting and size issue rules need to be confirmed
          by Bustaniya before stronger promises are published.
        </p>
        <h2>What customers should keep</h2>
        <p>
          Keep your order reference, product packaging and photos of any product issue so support can
          review the request.
        </p>
        <h2>Required business input</h2>
        <p>
          Confirm the eligible window, whether refunds are offered, who pays return shipping, and
          whether sale or used items are excluded.
        </p>
      </section>
    </main>
  );
}

function InfoNav() {
  return (
    <header className="categoryHeader infoHeader">
      <a className="brand" href="/" aria-label="Bustaniya home"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
      <nav><a href="/shipping-policy">Shipping</a><a href="/contact">Contact</a><a href="/privacy-policy">Privacy</a></nav>
    </header>
  );
}
