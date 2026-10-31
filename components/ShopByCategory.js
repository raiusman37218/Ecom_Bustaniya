"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ArrowRight } from "lucide-react";

import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../lib/images";

const FALLBACK_IMAGE = "/bustaniya-campaign-hero-v4.webp";

/**
 * Category artwork with fallback safety for missing/broken images.
 */
function CategoryImage({ src, sizes }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  let source = !src || failed ? FALLBACK_IMAGE : src;
  if (source.startsWith("/bustaniya-campaign-hero-v4.png")) {
    source = "/bustaniya-campaign-hero-v4.webp";
  }
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
 * High-Converting WearAroha Style "Shop by collection" section:
 * - Desktop (PC View): 4-column balanced grid with crisp portrait aspect ratio.
 * - Mobile View: 2-column clean grid (standard across top Pakistani boutique brands).
 * - Garment-first: Clean, bright images without heavy dark gradients obscuring the clothes.
 * - Minimal, elegant category titles positioned cleanly underneath each card.
 */
export default function ShopByCategory({
  categories = [],
  eyebrow = "FRESH DROPS EVERY WEEK",
  heading = "Shop by collection",
  subtitle = "",
  viewAllHref = "#products",
  viewAllLabel = "View all",
  hrefFor = (category) => `/category/${category.slug}`,
  background,
  textColor,
  band = false,
}) {
  const headingId = useId();
  const items = (categories || []).filter((category) => category && category.slug && category.name);
  const count = items.length;

  if (!count) return null;

  const cardSizes =
    count <= 2
      ? "(max-width: 768px) 50vw, (max-width: 1400px) 50vw, 720px"
      : count === 3
      ? "(max-width: 768px) 50vw, (max-width: 1400px) 33vw, 480px"
      : "(max-width: 600px) 50vw, (max-width: 1200px) 25vw, 350px";

  const displayEyebrow = eyebrow || "FRESH DROPS EVERY WEEK";
  const displayHeading = heading || "Shop by collection";

  return (
    <section
      id="shop-by-category"
      className={`bs-cat${band ? " bs-cat--band" : ""} scrollReveal`}
      data-scroll-reveal
      aria-labelledby={headingId}
      style={{
        "--section-bg": background,
        "--section-text": textColor,
      }}
    >
      <div className="bs-cat__inner">
        <header className="bs-cat__head">
          <div className="bs-cat__heading">
            {displayEyebrow && <p className="bs-cat__eyebrow">{displayEyebrow}</p>}
            <h2 id={headingId} className="bs-cat__title">{displayHeading}</h2>
            {subtitle && <p className="bs-cat__subtitle">{subtitle}</p>}
          </div>
          {viewAllHref && (
            <a className="bs-cat__all" href={viewAllHref}>
              <span>{viewAllLabel}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          )}
        </header>

        <div
          className={`bs-cat__grid bs-cat__grid--count-${count}`}
          data-count={count}
          style={{ "--cat-count": count }}
          aria-label={displayHeading}
        >
          {items.map((category) => (
            <Link
              className="bs-cat__card"
              href={hrefFor(category)}
              prefetch={true}
              key={category.id || category.slug}
            >
              <div className="bs-cat__media">
                <CategoryImage
                  src={category.image}
                  sizes={cardSizes}
                />
              </div>
              <div className="bs-cat__body">
                <h3 className="bs-cat__name">
                  <span>{category.name}</span>
                  <ArrowRight size={count <= 2 ? 16 : 13} className="bs-cat__arrow" aria-hidden="true" />
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
