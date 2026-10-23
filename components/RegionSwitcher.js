"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { REGIONS, regionFromPath, switchRegionPath } from "../lib/regions";

/* Flags are inline SVG, not emoji: Windows ships no flag glyphs at all, so
   🇵🇰 renders as the letters "PK" for a large share of this store's shoppers
   and for the owner's own machine. */

function FlagPK(props) {
  return (
    <svg viewBox="0 0 60 40" aria-hidden="true" focusable="false" {...props}>
      <rect width="60" height="40" fill="#01411c" />
      <rect width="15" height="40" fill="#fff" />
      <circle cx="39" cy="20" r="9.5" fill="#fff" />
      <circle cx="42.5" cy="16.8" r="9.5" fill="#01411c" />
      <path d="M45.4 12.1l1.07 2.62 2.82.2-2.16 1.83.68 2.75-2.41-1.5-2.41 1.5.68-2.75-2.16-1.83 2.82-.2z" fill="#fff" />
    </svg>
  );
}

function FlagUK(props) {
  return (
    <svg viewBox="0 0 60 40" aria-hidden="true" focusable="false" {...props}>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#c8102e" strokeWidth="4" />
      <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0v40M0 20h60" stroke="#c8102e" strokeWidth="8" />
    </svg>
  );
}

const FLAGS = { pk: FlagPK, uk: FlagUK };

// Only the two regions the store actually ships to.
const AVAILABLE = ["pk", "uk"];

export default function RegionSwitcher() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const toggleRef = useRef(null);

  const activeCode = regionFromPath(pathname);
  const active = REGIONS[activeCode];

  // Close on outside click or Escape, and hand focus back to the toggle so a
  // keyboard user is not dropped at the top of the document.
  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Never strand the panel open across a navigation.
  useEffect(() => { setOpen(false); }, [pathname]);

  // The switcher lives in the root layout, which also wraps admin. Checkout is
  // excluded too: the two regions keep separate carts (cartStorageKey), so
  // switching mid-checkout would silently empty the one being paid for.
  if (
    pathname.startsWith("/admin")
    || pathname.startsWith("/checkout")
    || pathname.startsWith("/uk/checkout")
    || pathname.startsWith("/style-guide")
  ) {
    return null;
  }

  function choose(code) {
    setOpen(false);
    if (code === activeCode) return;
    router.push(switchRegionPath(pathname, code));
  }

  const ActiveFlag = FLAGS[activeCode];

  return (
    <div className="bs-region" ref={rootRef}>
      {open && (
        <ul className="bs-region__menu" role="listbox" aria-label="Choose your country">
          {AVAILABLE.map((code) => {
            const region = REGIONS[code];
            const Flag = FLAGS[code];
            const selected = code === activeCode;
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`bs-region__option ${selected ? "is-selected" : ""}`}
                  onClick={() => choose(code)}
                >
                  <Flag className="bs-region__flag" />
                  <span className="bs-region__name">{region.name}</span>
                  <span className="bs-region__code">{region.currency.code}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        ref={toggleRef}
        className="bs-region__toggle"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <ActiveFlag className="bs-region__flag" />
        <span className="bs-region__current">{active.currency.code}</span>
        <svg className="bs-region__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="bs-visually-hidden">
          Country: {active.name}. Change country or currency.
        </span>
      </button>
    </div>
  );
}
