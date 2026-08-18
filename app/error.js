"use client";

import { useEffect } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Storefront error boundary caught:", error);
  }, [error]);

  return (
    <div className="siteLayout">
      <SiteHeader />
      <main className="infoPage notFoundPage">
        <section className="infoHero">
          <p className="eyebrow">STOREFRONT</p>
          <h1>Something went wrong</h1>
          <p>{error?.message || "An unexpected error occurred while loading the page."}</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "20px" }}>
            <button
              type="button"
              className="primaryButton"
              onClick={() => reset()}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <RefreshCw size={16} /> Try again
            </button>
            <a
              href="/"
              className="secondaryButton"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <ArrowLeft size={16} /> Return home
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
