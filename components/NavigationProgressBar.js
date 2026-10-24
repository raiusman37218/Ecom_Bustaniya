"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Universal Luxury Navigation Progress Bar
 * Provides instant, silky-smooth visual feedback across ALL page transitions.
 * Features an emerald gradient with luminous pulse and zero layout shift.
 */
export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const finishTimerRef = useRef(null);

  const start = useCallback(() => {
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setVisible(true);
    setProgress(18);

    // Smooth accelerating progress curve
    let current = 18;
    timerRef.current = setInterval(() => {
      if (current < 55) {
        current += Math.random() * 8 + 4;
      } else if (current < 82) {
        current += Math.random() * 4 + 1.5;
      } else if (current < 94) {
        current += 0.4;
      }
      setProgress(Math.min(current, 95));
    }, 120);
  }, []);

  const finish = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setProgress(100);

    finishTimerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setProgress(0), 250);
    }, 280);
  }, []);

  // Finish progress when the route pathname or searchParams change
  useEffect(() => {
    finish();
  }, [pathname, searchParams, finish]);

  // Intercept click on internal links to immediately trigger the loader
  useEffect(() => {
    const handleDocumentClick = (e) => {
      const anchor = e.target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore anchor jumps, protocols, downloads, target="_blank", or modifier key clicks
      if (
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        if (targetUrl.origin === currentUrl.origin) {
          const isSamePage =
            targetUrl.pathname === currentUrl.pathname &&
            targetUrl.search === currentUrl.search;

          if (!isSamePage) {
            start();
          }
        }
      } catch {}
    };

    const handlePopState = () => {
      start();
    };

    const handleCustomStart = () => start();
    const handleCustomFinish = () => finish();

    window.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("bs:navigation:start", handleCustomStart);
    window.addEventListener("bs:navigation:finish", handleCustomFinish);

    return () => {
      window.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("bs:navigation:start", handleCustomStart);
      window.removeEventListener("bs:navigation:finish", handleCustomFinish);
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [start, finish]);

  return (
    <div
      className="bs-navProgressWrapper"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-hidden={!visible}
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease-out",
        pointerEvents: "none",
      }}
    >
      <div
        className="bs-navProgressBar"
        style={{
          width: `${progress}%`,
        }}
      >
        <span className="bs-navProgressGlow" />
      </div>
    </div>
  );
}
