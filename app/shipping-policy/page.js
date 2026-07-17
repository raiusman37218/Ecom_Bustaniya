import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Shipping Policy",
  description:
    "Read Bustaniya's shipping policy for Pakistani clothing orders, delivery charges, courier handling and confirmation payments.",
  path: "/shipping-policy",
});

export default function ShippingPolicyPage() {
  return (
    <main className="infoPage">
      <InfoNav />
      <section className="infoHero">
        <p className="eyebrow">SHIPPING POLICY</p>
        <h1>Delivery information for Bustaniya orders</h1>
        <p>Shipping charges are calculated during checkout based on the items in your cart.</p>
      </section>
      <section className="infoContent">
        <h2>Order confirmation</h2>
        <p>Orders currently require Rs. 300 advance payment for confirmation where shown on the website.</p>
        <h2>Delivery charges</h2>
        <p>
          The checkout page shows the current delivery amount before order placement. Some products
          may have free or custom delivery rules when configured in the catalog.
        </p>
        <h2>Missing details to confirm</h2>
        <p>
          Add confirmed delivery timelines, courier names, city limitations and failed-delivery rules
          before publishing a stricter promise.
        </p>
      </section>
    </main>
  );
}

function InfoNav() {
  return (
    <header className="categoryHeader infoHeader">
      <a className="brand" href="/" aria-label="Bustaniya home"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
      <nav><a href="/contact">Contact</a><a href="/exchange-return-policy">Returns</a><a href="/terms-and-conditions">Terms</a></nav>
    </header>
  );
}
