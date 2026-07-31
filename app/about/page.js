import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "About Lisette",
  description:
    "Lisette is a Pakistani lingerie and essentials store made for comfort, support and confidence.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <main className="infoPage">
      <InfoNav />
      <section className="infoHero">
        <p className="eyebrow">ABOUT LISETTE</p>
        <h1>Comfort that starts with you</h1>
        <p>
          Lisette creates lingerie and everyday essentials for women in Pakistan, with a focus on
          pieces that feel soft, supportive and easy to live in.
        </p>
      </section>
      <section className="infoContent">
        <h2>What we sell</h2>
        <p>
          Our current catalog includes bras, panties, coordinated sets and sleepwear. Product pages
          should always be checked for the latest price, availability and size options.
        </p>
        <h2>Our shopping promise</h2>
        <p>
          We keep product, payment and delivery information visible before checkout. Fabric, fit and
          care details will be expanded as soon as confirmed product-level information is available.
        </p>
        <p lang="ur" dir="rtl">
          بستانیہ پاکستانی خواتین کے لیے مشرقی لباس، کرتیز اور روزمرہ پہننے کے خوبصورت انداز پیش کرتا ہے۔
        </p>
      </section>
    </main>
  );
}

function InfoNav() {
  return (
    <header className="categoryHeader infoHeader">
      <a className="brand lisetteBrand" href="/" aria-label="Lisette home">LISETTE<small>LINGERIE</small></a>
      <nav><a href="/category/bras">Bras</a><a href="/contact">Contact</a><a href="/shipping-policy">Shipping</a></nav>
    </header>
  );
}
