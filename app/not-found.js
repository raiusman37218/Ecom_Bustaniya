import { Search, ShoppingBag } from "lucide-react";

export const metadata = {
  title: "Page not found - Lisette",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className="infoPage notFoundPage">
      <header className="categoryHeader infoHeader">
        <a className="brand lisetteBrand" href="/" aria-label="Lisette home">LISETTE<small>LINGERIE</small></a>
        <nav><a href="/category/kurtis">Kurtis</a><a href="/category/coord-sets">Co-ord Sets</a><a href="/contact">Contact</a></nav>
        <div><Search /><ShoppingBag /></div>
      </header>
      <section className="infoHero">
        <p className="eyebrow">404</p>
        <h1>This page is not available</h1>
        <p>The product or collection may have moved, sold out or been removed from the storefront.</p>
        <a className="primaryButton" href="/">Continue shopping</a>
      </section>
    </main>
  );
}
