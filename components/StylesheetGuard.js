"use client";

import { useEffect } from "react";

/**
 * Recovers a page that rendered without its stylesheets.
 *
 * Every `next build` rewrites all of .next/static with fresh content hashes
 * and deletes the previous build's files. So a shopper whose tab was open
 * across a deploy — or whose phone simply dropped one of the seven stylesheet
 * requests on a weak signal — asks for a file that is no longer there, gets a
 * 404, and the browser renders the page with that stylesheet missing. Nothing
 * in Next recovers from this: the page is simply unstyled until the shopper
 * thinks to refresh, and most will just leave.
 *
 * The check is deliberately narrow. A stylesheet that failed leaves no entry
 * in document.styleSheets at all, so "the <link> is there but its sheet is
 * not" is an unambiguous signal, not a guess.
 */
export default function StylesheetGuard() {
  useEffect(() => {
    const RELOADED = "bs:css-reloaded";

    /** The href of the first /_next/static stylesheet that did not apply. */
    const findMissing = () => {
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      for (const link of links) {
        const href = link.href || "";
        // Only our own build output: a third-party sheet is cross-origin and
        // throws on cssRules for reasons that have nothing to do with this.
        if (!href.includes("/_next/static/css/")) continue;
        const sheet = Array.from(document.styleSheets).find((s) => s.href === href);
        if (!sheet) return href;
        try {
          if (sheet.cssRules.length === 0) return href;
        } catch {
          return href;
        }
      }
      return null;
    };

    /** Never throw away something the shopper has typed. */
    const hasTypedInput = () => {
      const fields = document.querySelectorAll("input, textarea, select");
      for (const field of fields) {
        if (field.type === "checkbox" || field.type === "radio") {
          if (field.checked !== field.defaultChecked) return true;
          continue;
        }
        if (field.value && field.value !== field.defaultValue) return true;
      }
      return false;
    };

    const check = () => {
      const missing = findMissing();

      if (!missing) {
        // Styles are fine, so let a later deploy in this same tab recover too.
        try { sessionStorage.removeItem(RELOADED); } catch {}
        return;
      }

      let alreadyTried = false;
      try { alreadyTried = sessionStorage.getItem(RELOADED) === "1"; } catch {}

      // One attempt, ever. If the stylesheet is still unreachable after a
      // reload the problem is not a stale hash, and a loop would be worse
      // than an unstyled page.
      if (alreadyTried) {
        console.error("Bustaniya: stylesheet did not load:", missing);
        return;
      }
      if (hasTypedInput()) {
        console.error("Bustaniya: stylesheet did not load, not reloading over typed input:", missing);
        return;
      }

      try { sessionStorage.setItem(RELOADED, "1"); } catch {}
      window.location.reload();
    };

    // Only once everything has had its chance to load — a sheet still in
    // flight has no entry in document.styleSheets either.
    if (document.readyState === "complete") {
      const id = setTimeout(check, 0);
      return () => clearTimeout(id);
    }
    window.addEventListener("load", check, { once: true });
    return () => window.removeEventListener("load", check);
  }, []);

  return null;
}
