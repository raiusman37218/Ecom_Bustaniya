import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata = {
  title: "Page not found - Bustaniya",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="siteLayout">
      <SiteHeader />
      <main className="infoPage notFoundPage">
        <section className="infoHero">
          <p className="eyebrow">404</p>
          <h1>This page is not available</h1>
          <p>The product or collection may have moved, sold out or been removed from the storefront.</p>
          <a className="primaryButton" href="/">Continue shopping</a>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
