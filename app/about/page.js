import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "About Bustaniya",
  description:
    "Bustaniya is a Pakistani women's clothing store for eastern wear, kurtis, co-ord sets, bottoms and thoughtful everyday style.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <main className="infoPage">
      <InfoNav />
      <section className="infoHero">
        <p className="eyebrow">ABOUT BUSTANIYA</p>
        <h1>Pakistani women's clothing with everyday grace</h1>
        <p>
          Bustaniya curates eastern wear for girls and women in Pakistan, with a focus on pieces
          that feel graceful, wearable and easy to style.
        </p>
      </section>
      <section className="infoContent">
        <h2>What we sell</h2>
        <p>
          Our current catalog includes kurtis, co-ord sets, bottoms and 3 piece suits. Product pages
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
      <a className="brand" href="/" aria-label="Bustaniya home"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
      <nav><a href="/category/kurtis">Kurtis</a><a href="/contact">Contact</a><a href="/shipping-policy">Shipping</a></nav>
    </header>
  );
}
