"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../lib/images";

const FALLBACK_IMAGE = "/bustaniya-campaign-hero-v4.png";

/**
 * Category artwork with a safety net: an image URL saved in admin can rot
 * (a deleted Cloudinary asset, a removed stock photo). Rather than show a
 * broken-image icon in the middle of the homepage, the tile swaps to the
 * brand fallback.
 */
function CategoryImage({ src, sizes }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const source = !src || failed ? FALLBACK_IMAGE : src;
  return (
    <Image
      className="bs-cat__img"
      src={optimizedImageUrl(source, CLOUDINARY_IMAGE_PRESETS.category)}
      alt=""
      fill
      loading="lazy"
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Homepage "Shop by Category" band, shared by the PK and UK storefronts.
 *
 * One component, two looks (picked in admin):
 *  - "atelier": editorial portrait tiles with the name set over the image.
 *  - "minimal": clean portrait tiles with the name underneath.
 *
 * Both lay out as a scroll-snap rail. On phones it is a full-bleed swipe
 * row with the next tile peeking in, so it is obvious there is more; on
 * desktop the tiles fill the container and arrow buttons appear only when
 * there are more categories than fit. Styles live in shop-by-category.css
 * under the `bs-cat` prefix so none of the legacy category rules (and their
 * `!important` mobile overrides) can reach this markup.
 */
export default function ShopByCategory({
  categories = [],
  variant = "atelier",
  eyebrow = "",
  heading = "Shop by Category",
  subtitle = "",
  viewAllHref = "#products",
  viewAllLabel = "View all",
  hrefFor = (category) => `/category/${category.slug}`,
  background,
  textColor,
  band = false,
}) {
  const headingId = useId();
  const railRef = useRef(null);
  const frameRef = useRef(0);
  const [rail, setRail] = useState({ canPrev: false, canNext: false, thumb: 1, progress: 0 });

  const items = (categories || []).filter((category) => category && category.slug && category.name);
  const isMinimal = variant === "minimal";

  const measure = useCallback(() => {
    const node = railRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    const next = {
      canPrev: node.scrollLeft > 4,
      canNext: node.scrollLeft < max - 4,
      thumb: node.scrollWidth > 0 ? Math.min(1, node.clientWidth / node.scrollWidth) : 1,
      progress: max > 0 ? Math.min(1, Math.max(0, node.scrollLeft / max)) : 0,
    };
    setRail((current) => (
      current.canPrev === next.canPrev &&
      current.canNext === next.canNext &&
      Math.abs(current.thumb - next.thumb) < 0.001 &&
      Math.abs(current.progress - next.progress) < 0.001
        ? current
        : next
    ));
  }, []);

  useEffect(() => {
    measure();
    const node = railRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, [measure, items.length]);

  function handleScroll() {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(measure);
  }

  function scrollRail(direction) {
    const node = railRef.current;
    if (!node) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollBy({ left: direction * node.clientWidth * 0.9, behavior: reducedMotion ? "auto" : "smooth" });
  }

  if (!items.length) return null;

  const hasOverflow = rail.canPrev || rail.canNext;
  const thumbOffset = rail.thumb < 1 ? rail.progress * (1 / rail.thumb - 1) * 100 : 0;
  const sizes = isMinimal
    ? "(max-width: 599px) 46vw, (max-width: 1023px) 31vw, (max-width: 1279px) 25vw, 20vw"
    : "(max-width: 599px) 72vw, (max-width: 1023px) 44vw, 25vw";

  return (
    <section
      id="shop-by-category"
      className={`bs-cat bs-cat--${isMinimal ? "minimal" : "atelier"}${band ? " bs-cat--band" : ""} scrollReveal`}
      data-scroll-reveal
      data-count={Math.min(items.length, 5)}
      aria-labelledby={headingId}
      style={{
        "--section-bg": background,
        "--section-text": textColor,
        "--cat-count": items.length,
      }}
    >
      <div className="bs-cat__inner">
        <header className="bs-cat__head">
          <div className="bs-cat__heading">
            {eyebrow && <p className="bs-cat__eyebrow">{eyebrow}</p>}
            <h2 id={headingId} className="bs-cat__title">{heading}</h2>
            {subtitle && <p className="bs-cat__subtitle">{subtitle}</p>}
          </div>
          <div className="bs-cat__tools">
            {hasOverflow && (
              <div className="bs-cat__nav">
                <button
                  type="button"
                  className="bs-cat__arrow"
                  onClick={() => scrollRail(-1)}
                  disabled={!rail.canPrev}
                  aria-label="Previous categories"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="bs-cat__arrow"
                  onClick={() => scrollRail(1)}
                  disabled={!rail.canNext}
                  aria-label="Next categories"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            )}
            {viewAllHref && (
              <a className="bs-cat__all" href={viewAllHref}>
                {viewAllLabel}
                <ArrowRight size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </header>

        <ul className="bs-cat__rail" ref={railRef} onScroll={handleScroll} aria-label={heading || "Shop by category"}>
          {items.map((category, index) => (
            <li className="bs-cat__item" key={category.id || category.slug}>
              <Link className="bs-cat__card" href={hrefFor(category)} prefetch={true}>
                <div className="bs-cat__media">
                  <CategoryImage src={category.image} sizes={sizes} />
                  {!isMinimal && <span className="bs-cat__shade" aria-hidden="true" />}
                </div>
                <div className="bs-cat__body">
                  {!isMinimal && (
                    <span className="bs-cat__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  )}
                  <h3 className="bs-cat__name">{category.name}</h3>
                  {!isMinimal && category.description && (
                    <span className="bs-cat__desc">{category.description}</span>
                  )}
                  <span className="bs-cat__cta">
                    <span className="bs-cat__cta-text">Shop now</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {hasOverflow && (
          <div className="bs-cat__progress" aria-hidden="true">
            <span
              className="bs-cat__progress-thumb"
              style={{ width: `${rail.thumb * 100}%`, transform: `translateX(${thumbOffset}%)` }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
