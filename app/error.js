"use client";

import { useEffect } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Storefront error boundary caught:", error);
  }, [error]);

  return (
    <main className="infoPage notFoundPage">
      <header className="categoryHeader infoHeader">
        <a className="brand" href="/" aria-label="Bustaniya home">
          <img src="/bustaniya-logo-v2.png" alt="Bustaniya" />
        </a>
      </header>
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
  );
}
