"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Camera, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Instagram, Menu, MessageSquare, Minus, Play, Plus, Quote, Ruler, Scissors, ShieldCheck, ShoppingBag, Sparkles, Star, Truck, UserRound, X } from "lucide-react";

import { categories, categoryDetails, categoryToSlug, normalizeCategory, products as initialProducts } from "../data/store";
import { DEFAULT_HOMEPAGE_SECTIONS, DEFAULT_STORE_SETTINGS, getInstagramEmbedUrl } from "../data/storeSettings";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl, preloadProductImage } from "../lib/images";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { trackEvent } from "../lib/trackEvent";

const SizeChartModal = dynamic(() => import("./SizeChartModal"), { ssr: false });

const fallbackCategoryRecords = categories
  .filter((category) => category !== "All")
  .map((name, index) => {
    const slug = categoryToSlug(name);
    return {
      id: slug,
      name,
      slug,
      description: categoryDetails[slug]?.description || "",
      image: categoryDetails[slug]?.image || "/bustaniya-campaign-hero-v4.png",
      parentSlug: "",
      sortOrder: (index + 1) * 10,
    };
  });

/**
 * Builds a width-descriptor srcSet from a hero preset, keeping the preset's
 * aspect ratio at every width.
 */
function heroSrcSet(src, preset, widths) {
  if (!src || !src.includes("res.cloudinary.com")) return "";
  const ratio = preset.height / preset.width;
  return widths
    .map((width) => `${optimizedImageUrl(src, { ...preset, width, height: Math.round(width * ratio) })} ${width}w`)
    .join(", ");
}

function hoverImageOf(product) {
  const gallery = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  const second = gallery.find((src) => src && src !== product.image);
  return second || "";
}

function normalizeProducts(items) {
  return items.map((product) => ({
    ...product,
    stock: Number(product.stock ?? 10),
    lowStockThreshold: Number(product.lowStockThreshold ?? 5),
  }));
}

function CampaignHeroImage({ desktopSrc, mobileSrc, alt }) {
  const safeDesktop = desktopSrc || "/bustaniya-campaign-hero-v5.png";
  const safeMobile = mobileSrc || safeDesktop;

  const isCloudinaryDesktop = typeof safeDesktop === "string" && safeDesktop.includes("res.cloudinary.com");
  const isCloudinaryMobile = typeof safeMobile === "string" && safeMobile.includes("res.cloudinary.com");

  const desktopSrcSet = isCloudinaryDesktop ? heroSrcSet(safeDesktop, CLOUDINARY_IMAGE_PRESETS.heroDesktop, [1280, 1600, 1920, 2560]) : "";
  const mobileSrcSet = isCloudinaryMobile ? heroSrcSet(safeMobile, CLOUDINARY_IMAGE_PRESETS.heroMobile, [480, 640, 750, 900, 1080]) : "";
  const desktopUrl = optimizedImageUrl(safeDesktop, CLOUDINARY_IMAGE_PRESETS.heroDesktop);
  const mobileUrl = optimizedImageUrl(safeMobile, CLOUDINARY_IMAGE_PRESETS.heroMobile);

  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={mobileSrcSet || mobileUrl} sizes="100vw" />
      <source media="(min-width: 768px)" srcSet={desktopSrcSet || desktopUrl} sizes="100vw" />
      <img src={desktopUrl} alt={alt || "Bustaniya campaign hero"} fetchPriority="high" decoding="async" />
    </picture>
  );
}

export default function Home({
  initialProducts: serverProducts = initialProducts,
  initialCategories = fallbackCategoryRecords,
  storeSettings = DEFAULT_STORE_SETTINGS,
  bestSellingProductIds = [],
}) {
  const safeSettings = storeSettings || DEFAULT_STORE_SETTINGS;
  const supportWhatsapp = String(safeSettings.paymentSettings?.whatsappNumber || "").replace(/[^0-9]/g, "");
  const sectionColors = { ...DEFAULT_STORE_SETTINGS.sectionColors, ...(safeSettings.sectionColors || {}) };
  const sectionTextColors = { ...DEFAULT_STORE_SETTINGS.sectionTextColors, ...(safeSettings.sectionTextColors || {}) };
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [products, setProducts] = useState(() => normalizeProducts(serverProducts || []));
  const [categoryRecords, setCategoryRecords] = useState(() => (initialCategories || []).filter((category) => category && !category.parentSlug));

  useEffect(() => {
    setCategoryRecords((initialCategories || []).filter((category) => category && !category.parentSlug));
  }, [initialCategories]);
  const [heroSlide, setHeroSlide] = useState(0);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewSize, setQuickViewSize] = useState("S");
  const [quickViewQty, setQuickViewQty] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [expandedFaqId, setExpandedFaqId] = useState(null);
  const instagramRailRef = useRef(null);
  
  const rawDesktop = Array.isArray(safeSettings.heroDesktopImages) && safeSettings.heroDesktopImages.length
    ? safeSettings.heroDesktopImages
    : [safeSettings.heroDesktopImage || DEFAULT_STORE_SETTINGS.heroDesktopImage];
  const heroDesktopImages = rawDesktop.map((img) => img || "/bustaniya-campaign-hero-v5.png");

  const hasCustomMobile = Array.isArray(safeSettings.heroMobileImages) && safeSettings.heroMobileImages.length > 0 && safeSettings.heroMobileImages.some((img) => img && img !== DEFAULT_STORE_SETTINGS.heroMobileImage && img !== "/bustaniya-campaign-hero-mobile-v1.png" && img !== "/bustaniya-campaign-hero-v5.png");
  const rawMobile = hasCustomMobile
    ? safeSettings.heroMobileImages
    : (safeSettings.heroMobileImage && safeSettings.heroMobileImage !== DEFAULT_STORE_SETTINGS.heroMobileImage && safeSettings.heroMobileImage !== "/bustaniya-campaign-hero-mobile-v1.png" ? [safeSettings.heroMobileImage] : heroDesktopImages);
  const heroMobileImages = rawMobile.map((img) => img || heroDesktopImages[0] || "/bustaniya-campaign-hero-v5.png");

  const heroSlideCount = Math.max(heroDesktopImages.length, heroMobileImages.length);
  const desktopHero = {
    eyebrow: safeSettings.heroDesktopContent?.eyebrow ?? safeSettings.heroEyebrow ?? "",
    heading: safeSettings.heroDesktopContent?.heading ?? safeSettings.heroHeading ?? "",
    supportingText: safeSettings.heroDesktopContent?.supportingText ?? safeSettings.heroSupportingText ?? "",
    primaryButtonText: safeSettings.heroDesktopContent?.primaryButtonText ?? safeSettings.heroPrimaryButtonText ?? "",
    primaryButtonLink: safeSettings.heroDesktopContent?.primaryButtonLink ?? safeSettings.heroPrimaryButtonLink ?? "#products",
    secondaryButtonText: safeSettings.heroDesktopContent?.secondaryButtonText ?? safeSettings.heroSecondaryButtonText ?? "",
    secondaryButtonLink: safeSettings.heroDesktopContent?.secondaryButtonLink ?? safeSettings.heroSecondaryButtonLink ?? "",
    alignment: safeSettings.heroDesktopContent?.alignment || safeSettings.heroTextAlignment || "left",
    position: safeSettings.heroDesktopContent?.position || safeSettings.heroTextPosition || "left",
  };
  const mobileHero = safeSettings.heroMobileContent ? {
    eyebrow: safeSettings.heroMobileContent.eyebrow ?? desktopHero.eyebrow ?? "",
    heading: safeSettings.heroMobileContent.heading ?? desktopHero.heading ?? "",
    supportingText: safeSettings.heroMobileContent.supportingText ?? desktopHero.supportingText ?? "",
    primaryButtonText: safeSettings.heroMobileContent.primaryButtonText ?? desktopHero.primaryButtonText ?? "",
    primaryButtonLink: safeSettings.heroMobileContent.primaryButtonLink ?? desktopHero.primaryButtonLink ?? "#products",
    secondaryButtonText: safeSettings.heroMobileContent.secondaryButtonText ?? desktopHero.secondaryButtonText ?? "",
    secondaryButtonLink: safeSettings.heroMobileContent.secondaryButtonLink ?? desktopHero.secondaryButtonLink ?? "",
    alignment: safeSettings.heroMobileContent.alignment || desktopHero.alignment || "left",
    position: safeSettings.heroMobileContent.position || "bottom",
  } : {
    ...desktopHero,
    position: "bottom",
  };

  useEffect(() => {
    const savedCart = localStorage.getItem("bustaniya-cart");
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch {}
    }
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (cartReady) localStorage.setItem("bustaniya-cart", JSON.stringify(cart));
  }, [cart, cartReady]);

  useEffect(() => {
    if (heroSlideCount < 2) return undefined;
    const timer = window.setInterval(() => setHeroSlide((current) => (current + 1) % heroSlideCount), 5000);
    return () => window.clearInterval(timer);
  }, [heroSlideCount]);

  useEffect(() => {
    const sections = [...document.querySelectorAll("[data-scroll-reveal]")];
    if (!sections.length) return undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !("IntersectionObserver" in window)) return undefined;

    // Sections are only hidden once this class confirms JS is running and can
    // reveal them again. Previously the CSS hid them outright, so any script
    // failure left the whole page below the hero invisible.
    document.documentElement.classList.add("js-reveal");

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // A section that arrives already covering half the screen did not
        // slide into view — the reader jumped to it, or flicked past the head
        // start. Fading that in means a blank screen, so it appears at once.
        if (entry.intersectionRect.height > window.innerHeight * 0.5) {
          entry.target.classList.add("is-instant");
        }
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    // threshold 0 with a head start above the fold: a section begins its fade
    // just before it scrolls into view, so it has settled by the time it is
    // worth looking at. The old 0.12 threshold meant a 850px section waited
    // until 100px of it was already on screen, which read as a blank gap.
    }, { threshold: 0, rootMargin: "120px 0px -40px 0px" });
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const alreadyOnScreen = rect.top < window.innerHeight && rect.bottom > 0;
      if (alreadyOnScreen) {
        // Reload, a back navigation or an anchor jump can land the reader
        // part-way down the page. Fading those sections in would mean staring
        // at a blank screen, so whatever is already in view appears at once.
        section.classList.add("is-revealed", "is-instant");
        return;
      }
      observer.observe(section);
    });
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("js-reveal");
    };
  }, []);

  const visibleProducts = useMemo(() => (products || []).filter((product) => {
    if (!product) return false;
    const categoryMatch = activeCategory === "All" || normalizeCategory(product.category) === activeCategory;
    return categoryMatch;
  }), [activeCategory, products]);

  const categoryNames = useMemo(() => ["All", ...(categoryRecords || []).map((category) => category?.name || "").filter(Boolean)], [categoryRecords]);

  // The homepage collection rail deliberately follows the storefront navigation.
  // This prevents a category being discoverable in the header but missing from
  // "Shop by Category" (or the other way round).
  const categoryCards = useMemo(() => (categoryRecords || [])
    .filter((category) => category && category.showOnHomepage !== false && category.status !== "Archived")
    .map((category) => ({
      ...category,
      name: category?.name || "",
      slug: category?.slug || "",
      image: category?.image || (products || []).find((product) => normalizeCategory(product?.category) === category?.name)?.image || "/bustaniya-campaign-hero-v4.png",
    })), [categoryRecords, products]);

  const bestSellers = useMemo(() => {
    const salesRank = new Map((bestSellingProductIds || []).map((id, index) => [String(id), index]));
    const soldProducts = products
      .filter((product) => salesRank.has(String(product.id)))
      .sort((left, right) => salesRank.get(String(left.id)) - salesRank.get(String(right.id)));
    const fallbackProducts = products
      .filter((product) => !salesRank.has(String(product.id)))
      .sort((left, right) => Number(right.isBestseller) - Number(left.isBestseller));
    return [...soldProducts, ...fallbackProducts]
      .filter((product) => product.status !== "Archived")
      .slice(0, 4);
  }, [bestSellingProductIds, products]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalSavings = useMemo(() => {
    return cart.reduce((sum, item) => {
      const original = Number(item.compareAtPrice || item.comparePrice || item.compare_at_price || item.originalPrice || 0);
      const price = Number(item.price || 0);
      const diff = original > price ? (original - price) * Number(item.quantity || 1) : 0;
      return sum + diff;
    }, 0);
  }, [cart]);


  function salePercent(product) {
    const previous = Number(product.compareAtPrice || product.compare_at_price || 0);
    const current = Number(product.price || 0);
    return previous > current && current > 0 ? Math.round(((previous - current) / previous) * 100) : 0;
  }

  function scrollInstagramRail(direction) {
    const rail = instagramRailRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.78, behavior: "smooth" });
  }

  function addToCart(product, size = "S", qty = 1) {
    if (Number(product.stock || 0) <= 0) return;
    trackEvent("AddToCart", {
      customData: {
        contentName: product.name,
        contentIds: [String(product.article_number || product.articleNumber || product.id || "")],
        contents: [{ id: String(product.article_number || product.articleNumber || product.id || ""), quantity: qty, item_price: Number(product.price || 0) }],
        numItems: qty,
        value: Number(product.price || 0) * qty,
        currency: "PKR",
      },
    });
    setCart((current) => {
      const found = current.find((item) => item.id === product.id && item.size === size);
      if (found) return current.map((item) => item.id === product.id && item.size === size ? { ...item, quantity: item.quantity + qty } : item);
      return [...current, { ...product, size, quantity: qty }];
    });
    setCartOpen(true);
  }

  function updateQuantity(id, change) {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item)
      .filter((item) => item.quantity > 0));
  }

  const homepageSectionsToRender = useMemo(() => {
    const configured = (safeSettings.homepageSections && safeSettings.homepageSections.length) ? safeSettings.homepageSections : DEFAULT_HOMEPAGE_SECTIONS;
    let list = [...configured];

    // Defensive client-side fallback for custom_order and instagram_feed if missing from legacy data
    const hasCustomOrder = list.some((section) => section?.type === "custom_order");
    const customOrderDefaults = DEFAULT_HOMEPAGE_SECTIONS.find((section) => section.type === "custom_order");
    if (!hasCustomOrder && customOrderDefaults) {
      const insertIdx = list.findIndex((s) => s?.type === "newsletter" || s?.type === "instagram_feed");
      if (insertIdx > -1) {
        list.splice(insertIdx, 0, customOrderDefaults);
      } else {
        list.push(customOrderDefaults);
      }
    }

    const hasInstagramFeed = list.some((section) => section?.type === "instagram_feed");
    const instagramDefaults = DEFAULT_HOMEPAGE_SECTIONS.find((section) => section.type === "instagram_feed");
    if (!hasInstagramFeed && instagramDefaults) {
      list.push(instagramDefaults);
    }

    // Preserve exact user order without arbitrary repositioning
    return list
      .map((section) => (
        section?.type === "our_story"
          ? {
            ...section,
            type: "best_sellers",
            label: "Best Sellers",
            heading: "Best Sellers",
            eyebrow: "BEST SELLERS",
            subtitle: "",
          }
          : section
      ))
      .filter((section) => section && section.enabled !== false);
  }, [safeSettings.homepageSections]);

  return (
    <>
      <SiteHeader
        storeSettings={storeSettings}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        categories={categoryRecords}
        activeNav="home"
      />

      <main>
        {homepageSectionsToRender.map((section) => {
          const defaults = DEFAULT_HOMEPAGE_SECTIONS.find((d) => d.type === section.type) || {};

          if (section.type === "hero") {
            if (storeSettings.heroEnabled === false) return null;
            const hasDesktopContent = Boolean(desktopHero.eyebrow || desktopHero.heading || desktopHero.supportingText || desktopHero.primaryButtonText || desktopHero.secondaryButtonText);
            const hasMobileContent = Boolean(mobileHero.eyebrow || mobileHero.heading || mobileHero.supportingText || mobileHero.primaryButtonText || mobileHero.secondaryButtonText);
            const hasAnyContent = hasDesktopContent || hasMobileContent;
            const overlayIntensity = Math.min(80, Math.max(0, Number(storeSettings.heroOverlayIntensity || 0)));

            return (
              <section
                key={section.id}
                className={`campaignHero campaignHero--position-${desktopHero.position || "left"} campaignHero--align-${desktopHero.alignment || "left"} campaignHero--mobile-position-${mobileHero.position || "bottom"} campaignHero--mobile-align-${mobileHero.alignment || "left"} ${hasAnyContent ? "hasContent" : "mediaOnly"}`}
                id="new"
                style={{
                  "--campaign-overlay": hasAnyContent ? (overlayIntensity / 100) : 0,
                  "--campaign-overlay-color": "#102a1d",
                  "--campaign-text-color": sectionTextColors.heroOverlay || "#173d29"
                }}
              >
                <div className="campaignHeroMedia">
                  {!hasAnyContent ? (
                    <a
                      href={desktopHero.primaryButtonLink || mobileHero.primaryButtonLink || "#products"}
                      className="campaignHeroMediaLink"
                      aria-label="Shop collection"
                    >
                      <CampaignHeroImage
                        key={heroSlide}
                        desktopSrc={heroDesktopImages[heroSlide % heroDesktopImages.length]}
                        mobileSrc={heroMobileImages[heroSlide % heroMobileImages.length]}
                        alt="Bustaniya eastern wear campaign"
                      />
                    </a>
                  ) : (
                    <CampaignHeroImage
                      key={heroSlide}
                      desktopSrc={heroDesktopImages[heroSlide % heroDesktopImages.length]}
                      mobileSrc={heroMobileImages[heroSlide % heroMobileImages.length]}
                      alt="Bustaniya eastern wear campaign"
                    />
                  )}
                </div>
                {hasAnyContent && overlayIntensity > 0 && <div className="campaignHeroOverlay" />}
                {hasAnyContent && (
                  <div className="campaignHeroInner">
                    <div className="campaignHeroCopy">
                      {desktopHero.eyebrow && <p className="campaignHeroDesktopOnly">{desktopHero.eyebrow}</p>}
                      {mobileHero.eyebrow && <p className="campaignHeroMobileOnly">{mobileHero.eyebrow}</p>}
                      {(desktopHero.heading || mobileHero.heading) && (
                        <h1>
                          {desktopHero.heading && <span className="campaignHeroDesktopOnly">{desktopHero.heading}</span>}
                          {mobileHero.heading && <span className="campaignHeroMobileOnly">{mobileHero.heading}</span>}
                        </h1>
                      )}
                      {desktopHero.supportingText && <span className="campaignHeroDesktopOnly">{desktopHero.supportingText}</span>}
                      {mobileHero.supportingText && <span className="campaignHeroMobileOnly">{mobileHero.supportingText}</span>}
                      {(desktopHero.primaryButtonText || mobileHero.primaryButtonText || desktopHero.secondaryButtonText || mobileHero.secondaryButtonText) && (
                        <div className="campaignHeroActions">
                          {desktopHero.primaryButtonText && <Link className="campaignHeroPrimary campaignHeroDesktopOnly" href={desktopHero.primaryButtonLink || "#products"}>{desktopHero.primaryButtonText}<ArrowRight size={17} /></Link>}
                          {mobileHero.primaryButtonText && <Link className="campaignHeroPrimary campaignHeroMobileOnly" href={mobileHero.primaryButtonLink || "#products"}>{mobileHero.primaryButtonText}<ArrowRight size={14} /></Link>}
                          {desktopHero.secondaryButtonText && <Link className="campaignHeroSecondary campaignHeroDesktopOnly" href={desktopHero.secondaryButtonLink || "#products"}>{desktopHero.secondaryButtonText}</Link>}
                          {mobileHero.secondaryButtonText && <Link className="campaignHeroSecondary campaignHeroMobileOnly" href={mobileHero.secondaryButtonLink || "#products"}>{mobileHero.secondaryButtonText}</Link>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {heroSlideCount > 1 && <div className="campaignHeroDots" role="tablist" aria-label="Hero banner slides">
                  {Array.from({ length: heroSlideCount }, (_, index) => <button
                    key={index}
                    type="button"
                    role="tab"
                    aria-label={`Show banner ${index + 1}`}
                    aria-selected={heroSlide === index}
                    className={heroSlide === index ? "active" : ""}
                    onClick={() => setHeroSlide(index)}
                  />)}
                </div>}
              </section>
            );
          }

          if (section.type === "new_arrivals") {
            return (
              <section key={section.id} className="shopSection khaadiTopPicks scrollReveal" data-scroll-reveal id="products" style={{ "--section-bg": sectionColors.products, "--section-text": sectionTextColors.products }}>
                <div className="sectionHeading">
                  <div><p className="eyebrow">{section.eyebrow || defaults.eyebrow}</p><h2>{section.heading || defaults.heading}</h2></div>
                </div>
                <div className="categoryTabs">
                  {categoryNames.map((category) => <button key={category} className={category === activeCategory ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}
                </div>
                <div className="productGrid">
                  {visibleProducts.map((product, index) => (
                    <article
                      className={`productCard productCard--${storeSettings.productCardStyle || "connected"}`}
                      key={product.id}
                      onMouseEnter={() => preloadProductImage(product.image)}
                      onTouchStart={() => preloadProductImage(product.image)}
                    >
                      <div className="productImage">
                        <Image
                          className="productImagePrimary"
                          src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)}
                          alt={`${product.name} - ${product.category} by Bustaniya`}
                          fill
                          priority={index < 4}
                          sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                        />
                        {hoverImageOf(product) && (
                          <Image
                            className="productImageHover"
                            src={optimizedImageUrl(hoverImageOf(product), CLOUDINARY_IMAGE_PRESETS.card)}
                            alt=""
                            aria-hidden="true"
                            fill
                            loading="lazy"
                            sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                          />
                        )}
                        <Link className="productCardLink" href={`/product/${product.id}`} prefetch={true} aria-label={`View ${product.name}`} />
                        {product.badge && <span className="badge">{product.badge}</span>}
                        {salePercent(product) > 0 && <span className="saleBadge">{salePercent(product)}% OFF</span>}
                        <button className="quickViewButton" type="button" onClick={() => setQuickViewProduct(product)}>Quick view</button>
                      </div>
                      <div className="productInfo">
                        <div><p>{product.category}</p><h3><Link href={`/product/${product.id}`} prefetch={true}>{product.name}</Link></h3>{Array.isArray(product.colors) && product.colors.length > 0 && <div className="colorSwatches" aria-label={`${product.colors.length} available colours`}>{product.colors.slice(0, 5).map((color) => <i key={color} title={color} style={{ backgroundColor: color.toLowerCase() }} />)}{product.colors.length > 5 && <small>+{product.colors.length - 5}</small>}</div>}</div>
                        <div className="productPrice"><span>Rs. {product.price.toLocaleString()}</span>{salePercent(product) > 0 && <del>Rs. {Number(product.compareAtPrice || product.compare_at_price).toLocaleString()}</del>}</div>
                      </div>
                    </article>
                  ))}
                </div>
                {!visibleProducts.length && <p className="empty">No products found.</p>}
              </section>
            );
          }

          if (section.type === "shop_by_category") {
            const currentStyle = section.style === "minimal" ? "minimal" : (section.style === "atelier" ? "atelier" : (storeSettings.categorySectionStyle === "minimal" ? "minimal" : "atelier"));
            const sectionHeading = (!section.heading || section.heading === "Choose your mood") ? "Shop by Category" : section.heading;
            const catBg = sectionColors.categories || "#ffffff";
            const isLightCatBg = !catBg || ["#ffffff", "#fffefb", "#fff", "#fcf8ef", "#f7f2e8"].includes(catBg.toLowerCase().trim());
            const catTextColor = isLightCatBg ? "#173d29" : (sectionTextColors.categories || "#ffffff");

            const cardsToRender = (Array.isArray(section.cards) && section.cards.length > 0)
              ? section.cards.filter((c) => c && c.enabled !== false).map((c, idx) => ({
                  id: c.id || `card-${idx}`,
                  name: c.name || c.title || "",
                  slug: c.slug || slugifyCategory(c.name || ""),
                  description: c.description || "",
                  image: c.image || categoryCards.find((cat) => cat.slug === c.slug || cat.name === c.name)?.image || "/bustaniya-campaign-hero-v4.png",
                }))
              : categoryCards;

            if (currentStyle === "minimal") {
              return (
                <section key={section.id} className="categoryShowcase categoryShowcase--minimal scrollReveal" data-scroll-reveal style={{ "--section-bg": catBg, "--section-text": catTextColor, color: catTextColor }}>
                  <div className="categoryMinimalHeader">
                    {(section.eyebrow || defaults.eyebrow) && <p className="eyebrow">{section.eyebrow || defaults.eyebrow}</p>}
                    <h2 style={{ color: catTextColor }}>{sectionHeading}</h2>
                  </div>
                  <div className="categoryMinimalGrid" aria-label="Shop by category">
                    {cardsToRender.map((category) => (
                      <Link className="categoryMinimalCard" href={`/category/${category.slug}`} key={category.slug}>
                        <div className="categoryMinimalImageWrap">
                          <Image
                            src={optimizedImageUrl(category.image || "/bustaniya-campaign-hero-v4.png", CLOUDINARY_IMAGE_PRESETS.category)}
                            alt={category.name}
                            fill
                            sizes="(max-width: 600px) 50vw, (max-width: 1000px) 25vw, 300px"
                          />
                          <span className="categoryCardOverlay">
                            <span className="categoryCardBtn">Explore Collection <ArrowRight size={14} /></span>
                          </span>
                        </div>
                        <h3 className="categoryMinimalTitle">
                          <span>{category.name}</span>
                          <ArrowRight size={14} className="categoryTitleArrow" />
                        </h3>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            }

            return (
              <section key={section.id} className="categoryShowcase categoryShowcase--atelier scrollReveal" data-scroll-reveal style={{ "--section-bg": catBg, "--section-text": catTextColor, color: catTextColor }}>
                <header className="categoryShowcaseIntro">
                  <div>
                    <p className="eyebrow">{section.eyebrow || defaults.eyebrow}</p>
                    <h2 style={{ color: catTextColor }}>{sectionHeading}</h2>
                  </div>
                  <a className="categoryShowcaseAll" href="#products">
                    View all pieces <ArrowRight size={15} aria-hidden="true" />
                  </a>
                </header>
                <div className="categoryCards" aria-label="Shop by category">
                  {cardsToRender.map((category, index) => (
                    <Link className={`categoryCard card${index + 1}`} href={`/category/${category.slug}`} key={category.slug} style={category.image ? { backgroundImage: `url(${optimizedImageUrl(category.image, CLOUDINARY_IMAGE_PRESETS.category)})` } : undefined}>
                      <div className="categoryCardContent">
                        <small>Collection {String(index + 1).padStart(2, "0")}</small>
                        <p>{category.description || "Curated essentials, made for everyday elegance."}</p>
                        <h3>{category.name}</h3>
                        <b>Explore collection <ArrowRight size={15} aria-hidden="true" /></b>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          }

          if (section.type === "best_sellers" || section.type === "our_story") {
            return (
              <section key={section.id} className="shopSection khaadiTopPicks bestSellersSection scrollReveal" data-scroll-reveal style={{ "--section-bg": sectionColors.story, "--section-text": sectionTextColors.story }}>
                <div className="sectionHeading">
                  <div><p className="eyebrow">{section.eyebrow || defaults.eyebrow}</p><h2>{section.heading || defaults.heading}</h2></div>
                  <a href="#products">View all pieces <ArrowRight size={16} /></a>
                </div>
                <div className="productGrid">
                  {bestSellers.map((product, pIdx) => (
                    <article
                      className={`productCard productCard--${storeSettings.productCardStyle || "connected"}`}
                      key={product.id}
                      onMouseEnter={() => preloadProductImage(product.image)}
                      onTouchStart={() => preloadProductImage(product.image)}
                    >
                      <div className="productImage">
                        <Image className="productImagePrimary" src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)} alt={`${product.name} - bestseller by Bustaniya`} fill priority={pIdx < 4} sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw" />
                        {hoverImageOf(product) && <Image className="productImageHover" src={optimizedImageUrl(hoverImageOf(product), CLOUDINARY_IMAGE_PRESETS.card)} alt="" aria-hidden="true" fill loading="lazy" sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw" />}
                        <Link className="productCardLink" href={`/product/${product.id}`} prefetch={true} aria-label={`View ${product.name}`} />
                        <span className="badge">Best seller</span>
                        <button className="quickViewButton" type="button" onClick={() => setQuickViewProduct(product)}>Quick view</button>
                      </div>
                      <div className="productInfo"><div><p>{product.category}</p><h3><Link href={`/product/${product.id}`} prefetch={true}>{product.name}</Link></h3></div><div className="productPrice"><span>Rs. {product.price.toLocaleString()}</span></div></div>
                    </article>
                  ))}
                </div>
                {!bestSellers.length && <p className="empty">Best sellers will appear once products are active.</p>}
              </section>
            );
          }

          if (section.type === "newsletter") {
            return (
              <section key={section.id} className="newsletter scrollReveal" data-scroll-reveal style={{ "--section-bg": sectionColors.newsletter, "--section-text": sectionTextColors.newsletter }}>
                <p className="eyebrow">{section.eyebrow || defaults.eyebrow}</p>
                <h2>{section.heading || defaults.heading}</h2>
                <p>{section.subtitle || defaults.subtitle}</p>
                <form onSubmit={(e) => e.preventDefault()}><input type="email" placeholder="Your email address" /><button aria-label="Subscribe"><ArrowRight /></button></form>
              </section>
            );
          }

          if (section.type === "custom_order") {
            const bg = sectionColors.customOrder || "#10291c";
            const textColor = sectionTextColors.customOrder || "#fcf9f2";
            return (
              <section
                key={section.id}
                className="homeCustomSection scrollReveal"
                data-scroll-reveal
                style={{ "--section-bg": bg, "--section-text": textColor }}
              >
                <div className="homeCustomContainer">
                  <div className="homeCustomCopy">
                    <span className="homeCustomEyebrow">
                      <Scissors size={14} /> {section.eyebrow || defaults.eyebrow || "BESPOKE ATELIER & STITCHING"}
                    </span>
                    <h2 className="homeCustomHeading">
                      {section.heading || defaults.heading || "Design Your Dream Dress"}
                    </h2>
                    <p className="homeCustomSubtitle">
                      {section.subtitle || defaults.subtitle || "Have a design in mind from Pinterest or Instagram? Share your reference photo and exact custom measurements. Our master tailors will stitch it to perfection and we'll quote price directly on WhatsApp."}
                    </p>

                    <div className="homeCustomPillGrid">
                      <div className="homeCustomPill">
                        <Camera size={16} />
                        <div>
                          <strong>Upload Reference Photos</strong>
                          <span>Any style, neckline or sleeves inspiration</span>
                        </div>
                      </div>
                      <div className="homeCustomPill">
                        <Ruler size={16} />
                        <div>
                          <strong>Exact Body Measurements</strong>
                          <span>Kameez, Trouser or Standard Sizes</span>
                        </div>
                      </div>
                      <div className="homeCustomPill">
                        <MessageSquare size={16} />
                        <div>
                          <strong>WhatsApp Quote & Confirmation</strong>
                          <span>Direct chat with our styling experts</span>
                        </div>
                      </div>
                    </div>

                    <div className="homeCustomActions">
                      <Link href="/custom-order" className="homeCustomPrimaryBtn">
                        <Scissors size={18} />
                        <span>Start Custom Dress Order</span>
                        <ArrowRight size={16} />
                      </Link>
                      <a
                        href={`https://wa.me/${(safeSettings.whatsappNumber || "923000000000").replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Salam Bustaniya! I want to inquire about custom dress tailoring.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="homeCustomSecondaryBtn"
                      >
                        <MessageSquare size={16} />
                        <span>Ask on WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  <div className="homeCustomVisual">
                    <div className="homeCustomVisualCard">
                      <div className="homeCustomVisualHeader">
                        <span className="homeCustomVisualBadge">Handcrafted Elegance</span>
                        <span className="homeCustomVisualStep">How It Works</span>
                      </div>
                      <ul className="homeCustomStepList">
                        <li>
                          <span className="homeCustomStepNum">01</span>
                          <div>
                            <strong>Choose Outfit & Upload Photo</strong>
                            <p>Select 2-piece, 3-piece, maxi or kurti with reference images.</p>
                          </div>
                        </li>
                        <li>
                          <span className="homeCustomStepNum">02</span>
                          <div>
                            <strong>Provide Your Sizes</strong>
                            <p>Enter exact measurements (in inches or cm) or choose standard sizes.</p>
                          </div>
                        </li>
                        <li>
                          <span className="homeCustomStepNum">03</span>
                          <div>
                            <strong>Get Price & Place Order</strong>
                            <p>We review your request, quote price, and confirm order on WhatsApp.</p>
                          </div>
                        </li>
                      </ul>
                      <div className="homeCustomVisualFooter">
                        <Sparkles size={16} className="textGold" />
                        <span>Premium stitching • Authentic Pakistani fabrics • Nationwide COD</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          if (section.type === "instagram_feed") {
            if (storeSettings.instagramEnabled === false) return null;
            const posts = (Array.isArray(storeSettings.instagramPosts) && storeSettings.instagramPosts.length)
              ? storeSettings.instagramPosts
              : (DEFAULT_STORE_SETTINGS.instagramPosts || []);
            const handle = storeSettings.instagramHandle || "@bustaniya_";
            const profileUrl = `https://www.instagram.com/${handle.replace("@", "")}/`;

            return (
              <section key={section.id} className="instagramFeedSection scrollReveal" data-scroll-reveal style={{ "--section-bg": sectionColors.instagram || "#ffffff", "--section-text": sectionTextColors.instagram || "#173d29" }}>
                <div className="instagramFeedHeader">
                  <div>
                    <h2>{section.heading || defaults.heading || "Follow us Instagram"}</h2>
                    <p className="instagramFeedIntro">Latest product drops and reels from our Instagram.</p>
                  </div>
                  <p className="instagramFeedHandle">
                    <a href={profileUrl} target="_blank" rel="noreferrer">
                      <Instagram size={18} />
                      <span>{handle}</span>
                    </a>
                  </p>
                </div>
                <div className="instagramCarouselShell">
                  <button type="button" className="instagramCarouselButton instagramCarouselButton--previous" onClick={() => scrollInstagramRail(-1)} aria-label="Show previous Instagram posts"><ChevronLeft size={20} /></button>
                  <div className="instagramFeedGrid" ref={instagramRailRef} aria-label="Instagram Feed Gallery">
                  {posts.map((post, idx) => {
                    const embedUrl = getInstagramEmbedUrl(post.url);
                    if (embedUrl) {
                      return (
                        <article key={post.id || idx} className="instagramReelCard">
                          <div className="instagramReelIframeWrap">
                            <iframe
                              src={embedUrl}
                              className="instagramReelIframe"
                              title={post.caption || `Instagram Reel ${idx + 1}`}
                              loading="lazy"
                              scrolling="no"
                              frameBorder="0"
                              allowFullScreen
                              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                            />
                          </div>
                          {post.caption && (
                            <div className="instagramReelInfo">
                              <span className="instagramReelCaption">{post.caption}</span>
                              <a href={post.url} target="_blank" rel="noreferrer" className="instagramReelDirectLink" title="Watch on Instagram">
                                <Instagram size={13} />
                                <span>Watch Reel</span>
                              </a>
                            </div>
                          )}
                        </article>
                      );
                    }

                    return (
                      <a
                        key={post.id || idx}
                        href={post.url || profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="instagramPostCard"
                        title={post.caption || `Instagram post ${idx + 1}`}
                      >
                        <div className="instagramPostImageWrap">
                          {post.mediaType === "video" ? (
                            <video src={post.image} muted loop playsInline preload="none" aria-label={post.caption || "Bustaniya Instagram reel"} />
                          ) : (
                            <Image
                              src={post.image || "/bustaniya-instagram-hero.jpg"}
                              alt={post.caption || "Bustaniya Instagram post"}
                              fill
                              sizes="(max-width: 600px) 82vw, (max-width: 1000px) 43vw, 28vw"
                            />
                          )}
                          <div className="instagramPostOverlay">
                            {post.mediaType === "video" ? <Play size={28} fill="currentColor" /> : <Instagram size={28} />}
                            <span className="instagramPostHandle">{handle}</span>
                            {post.caption && <span className="instagramPostCaption">{post.caption}</span>}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                  </div>
                  <button type="button" className="instagramCarouselButton instagramCarouselButton--next" onClick={() => scrollInstagramRail(1)} aria-label="Show next Instagram posts"><ChevronRight size={20} /></button>
                </div>
              </section>
            );
          }

          if (section.type === "featured_collection") {
            const filterCat = section.category || "All";
            const collectionProducts = (products || [])
              .filter((p) => {
                if (p.status === "Archived") return false;
                if (!filterCat || filterCat === "All") return true;
                return normalizeCategory(p.category) === normalizeCategory(filterCat);
              })
              .slice(0, Number(section.limit) || 4);

            return (
              <section
                key={section.id}
                className="shopSection featuredCollectionSection scrollReveal"
                data-scroll-reveal
                id={`collection-${section.id}`}
              >
                <div className="sectionHeading">
                  <div>
                    {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
                    <h2>{section.heading || "Featured Collection"}</h2>
                    {section.subtitle && <p className="sectionSubtitle">{section.subtitle}</p>}
                  </div>
                  {section.buttonText && (
                    <Link href={section.buttonLink || "#products"} className="featuredCollectionCta">
                      {section.buttonText} <ArrowRight size={16} />
                    </Link>
                  )}
                </div>

                <div className="productGrid">
                  {collectionProducts.map((product, pIdx) => (
                    <article
                      className={`productCard productCard--${storeSettings.productCardStyle || "connected"}`}
                      key={product.id}
                      onMouseEnter={() => preloadProductImage(product.image)}
                      onTouchStart={() => preloadProductImage(product.image)}
                    >
                      <div className="productImage">
                        <Image
                          className="productImagePrimary"
                          src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)}
                          alt={`${product.name} - ${product.category} by Bustaniya`}
                          fill
                          priority={pIdx < 4}
                          sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                        />
                        {hoverImageOf(product) && (
                          <Image
                            className="productImageHover"
                            src={optimizedImageUrl(hoverImageOf(product), CLOUDINARY_IMAGE_PRESETS.card)}
                            alt=""
                            aria-hidden="true"
                            fill
                            loading="lazy"
                            sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                          />
                        )}
                        <Link className="productCardLink" href={`/product/${product.id}`} prefetch={true} aria-label={`View ${product.name}`} />
                        {product.badge && <span className="badge">{product.badge}</span>}
                        {salePercent(product) > 0 && <span className="saleBadge">{salePercent(product)}% OFF</span>}
                        <button className="quickViewButton" type="button" onClick={() => setQuickViewProduct(product)}>Quick view</button>
                      </div>
                      <div className="productInfo">
                        <div>
                          <p>{product.category}</p>
                          <h3><Link href={`/product/${product.id}`} prefetch={true}>{product.name}</Link></h3>
                          {Array.isArray(product.colors) && product.colors.length > 0 && (
                            <div className="colorSwatches" aria-label={`${product.colors.length} available colours`}>
                              {product.colors.slice(0, 5).map((color) => <i key={color} title={color} style={{ backgroundColor: color.toLowerCase() }} />)}
                              {product.colors.length > 5 && <small>+{product.colors.length - 5}</small>}
                            </div>
                          )}
                        </div>
                        <div className="productPrice">
                          <span>Rs. {Number(product.price).toLocaleString()}</span>
                          {salePercent(product) > 0 && <del>Rs. {Number(product.compareAtPrice || product.compare_at_price).toLocaleString()}</del>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {!collectionProducts.length && (
                  <p className="empty">No products currently available in this collection.</p>
                )}
              </section>
            );
          }

          if (section.type === "image_with_text") {
            const isImageRight = section.imagePosition === "right";
            const imageUrl = section.imageUrl || "/bustaniya-campaign-hero-v5.png";
            return (
              <section
                key={section.id}
                className={`imageWithTextSection scrollReveal ${isImageRight ? "imageRight" : "imageLeft"}`}
                data-scroll-reveal
              >
                <div className="imageWithTextContainer">
                  <div className="imageWithTextMedia">
                    <Image
                      src={optimizedImageUrl(imageUrl, CLOUDINARY_IMAGE_PRESETS.heroDesktop)}
                      alt={section.heading || "Bustaniya atelier story"}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <div className="imageWithTextCopy">
                    {section.eyebrow && <span className="imageWithTextEyebrow">{section.eyebrow}</span>}
                    {section.heading && <h2>{section.heading}</h2>}
                    {section.subtitle && <p className="imageWithTextSubtitle">{section.subtitle}</p>}
                    {section.content && <p className="imageWithTextBody">{section.content}</p>}
                    {section.buttonText && (
                      <div className="imageWithTextAction">
                        <Link href={section.buttonLink || "#products"} className="imageWithTextButton">
                          <span>{section.buttonText}</span>
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          if (section.type === "promo_banner") {
            const bg = section.bgColor || "#122a1e";
            const textClr = section.textColor || "#fdfaf3";
            const hasBgImage = Boolean(section.imageUrl);
            return (
              <section
                key={section.id}
                className={`promoBannerSection scrollReveal ${hasBgImage ? "hasBgImage" : ""}`}
                data-scroll-reveal
                style={{
                  "--promo-bg": bg,
                  "--promo-text": textClr,
                  backgroundImage: hasBgImage ? `url(${section.imageUrl})` : undefined,
                }}
              >
                {hasBgImage && <div className="promoBannerOverlay" />}
                <div className="promoBannerContent">
                  {section.eyebrow && <span className="promoBannerEyebrow">{section.eyebrow}</span>}
                  {section.heading && <h2>{section.heading}</h2>}
                  {section.subtitle && <p className="promoBannerSubtitle">{section.subtitle}</p>}
                  {section.buttonText && (
                    <div className="promoBannerAction">
                      <Link href={section.buttonLink || "#products"} className="promoBannerButton">
                        <span>{section.buttonText}</span>
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            );
          }

          if (section.type === "rich_text") {
            return (
              <section key={section.id} className="richTextSection scrollReveal" data-scroll-reveal>
                <div className="richTextInner">
                  {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
                  {section.heading && <h2>{section.heading}</h2>}
                  {section.subtitle && <p className="richTextSubtitle">{section.subtitle}</p>}
                  {section.content && <p className="richTextBody">{section.content}</p>}
                  {section.buttonText && (
                    <div className="richTextAction">
                      <Link href={section.buttonLink || "#products"} className="richTextBtn">
                        <span>{section.buttonText}</span>
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            );
          }

          if (section.type === "testimonials") {
            const reviews = Array.isArray(section.items) && section.items.length ? section.items : [
              {
                id: "review-1",
                name: "Ayesha Malik",
                location: "Lahore",
                rating: 5,
                review: "The fabric quality and intricate thread embroidery on the lawn kurti exceeded my expectations. Delivered in 2 days in secure packaging!",
                product: "Embroidered Lawn Kurti",
              },
              {
                id: "review-2",
                name: "Fatima Zahra",
                location: "Karachi",
                rating: 5,
                review: "Used the custom stitching service and gave my exact measurements. It fits absolutely perfectly! Truly impressed with the stitching standard.",
                product: "Custom 3-Piece Festive Suit",
              },
              {
                id: "review-3",
                name: "Zainab Tariq",
                location: "Islamabad",
                rating: 5,
                review: "The colors in person are just as rich as the photos. Fabric is so soft and breathable for summer. Will definitely order again.",
                product: "Pure Chiffon Co-ord Set",
              },
            ];

            return (
              <section key={section.id} className="testimonialsSection scrollReveal" data-scroll-reveal>
                <div className="testimonialsHeader">
                  {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
                  <h2>{section.heading || "Loved by Thousands of Women"}</h2>
                  {section.subtitle && <p className="testimonialsSubtitle">{section.subtitle}</p>}
                </div>
                <div className="testimonialsGrid">
                  {reviews.map((rev, rIdx) => (
                    <article key={rev.id || rIdx} className="testimonialCard">
                      <div className="testimonialRating" aria-label={`${rev.rating || 5} out of 5 stars`}>
                        {Array.from({ length: 5 }, (_, s) => (
                          <Star
                            key={s}
                            size={16}
                            fill={s < (Number(rev.rating) || 5) ? "#d4af37" : "none"}
                            color={s < (Number(rev.rating) || 5) ? "#d4af37" : "#d1d5db"}
                          />
                        ))}
                      </div>
                      <blockquote className="testimonialQuote">
                        "{rev.review}"
                      </blockquote>
                      <div className="testimonialAuthor">
                        <div className="testimonialAuthorMeta">
                          <div className="testimonialAuthorName">
                            <strong>{rev.name}</strong>
                            <span className="verifiedBuyerBadge" title="Verified Customer">
                              <Check size={11} /> Verified Buyer
                            </span>
                          </div>
                          <span className="testimonialLocation">{rev.location || "Pakistan"}</span>
                        </div>
                        {rev.product && (
                          <span className="testimonialProductTag">
                            {rev.product}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          }

          if (section.type === "faq") {
            const faqItems = Array.isArray(section.items) && section.items.length ? section.items : [
              {
                id: "faq-1",
                question: "How long does delivery take across Pakistan?",
                answer: "Standard nationwide delivery takes 2 to 4 working days. Express dispatch is available for Lahore, Karachi, and Islamabad.",
              },
              {
                id: "faq-2",
                question: "Do you offer Cash on Delivery (COD)?",
                answer: "Yes! Cash on Delivery is available across all major cities and towns in Pakistan. We also accept direct bank transfer, JazzCash, and EasyPaisa.",
              },
              {
                id: "faq-3",
                question: "How does the custom made-to-measure tailoring work?",
                answer: "Select Custom Order from the navigation, upload reference photos from Instagram/Pinterest, and provide your measurements. Our master tailors will quote price directly on WhatsApp.",
              },
              {
                id: "faq-4",
                question: "What is your return or exchange policy?",
                answer: "We offer a hassle-free 7-day exchange on all standard unstitched and ready-to-wear items as long as they are unworn with original tags attached.",
              },
            ];

            return (
              <section key={section.id} className="faqSection scrollReveal" data-scroll-reveal>
                <div className="faqHeader">
                  {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
                  <h2>{section.heading || "Frequently Asked Questions"}</h2>
                  {section.subtitle && <p className="faqSubtitle">{section.subtitle}</p>}
                </div>
                <div className="faqAccordionList">
                  {faqItems.map((item, idx) => {
                    const isOpen = expandedFaqId === (item.id || `faq-${idx}`);
                    return (
                      <div key={item.id || idx} className={`faqItem ${isOpen ? "open" : ""}`}>
                        <button
                          type="button"
                          className="faqQuestionButton"
                          onClick={() => setExpandedFaqId(isOpen ? null : (item.id || `faq-${idx}`))}
                          aria-expanded={isOpen}
                        >
                          <span className="faqQuestionText">{item.question}</span>
                          <span className="faqChevron">
                            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="faqAnswer">
                            <p>{item.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="faqWhatsAppSupport">
                  <p>Have another question about sizing or fabric?</p>
                  <a
                    href={`https://wa.me/${(safeSettings.whatsappNumber || "923000000000").replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Salam Bustaniya! I have a question about an order.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="faqWhatsAppBtn"
                  >
                    <MessageSquare size={15} />
                    <span>Ask directly on WhatsApp</span>
                  </a>
                </div>
              </section>
            );
          }

          return null;
        })}
      </main>

      <SiteFooter categories={categoryRecords} storeSettings={safeSettings} />

      {quickViewProduct && (
        <>
          <div className="overlay" onClick={() => setQuickViewProduct(null)} />
          <section className="quickViewModal" role="dialog" aria-modal="true" aria-label={`Quick view ${quickViewProduct.name}`}>
            <button className="quickViewClose" onClick={() => setQuickViewProduct(null)} aria-label="Close quick view"><X /></button>
            <div className="quickViewImage">
              <Image src={quickViewProduct.image} alt={quickViewProduct.name} fill sizes="(max-width: 700px) 90vw, 360px" />
              {salePercent(quickViewProduct) > 0 && <span className="saleBadge">-{salePercent(quickViewProduct)}%</span>}
            </div>
            <div className="quickViewDetails">
              <p className="eyebrow">{quickViewProduct.category}</p>
              <h2>{quickViewProduct.name}</h2>
              <div className="quickViewPrice">
                <span>Rs. {Number(quickViewProduct.price).toLocaleString()}</span>
                {salePercent(quickViewProduct) > 0 && <del>Rs. {Number(quickViewProduct.compareAtPrice || quickViewProduct.compare_at_price).toLocaleString()}</del>}
              </div>

              <span className="productDescription">{quickViewProduct.description || "A thoughtfully designed Bustaniya piece, stitched to perfection with premium Pakistani fabrics."}</span>

              {/* Size Selector + Size Guide Trigger */}
              <div className="selectorHeading" style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b>Select Size</b>
                <button type="button" className="sizeGuideLinkBtn" onClick={() => setSizeChartOpen(true)}>
                  <Ruler size={14} /> Size guide
                </button>
              </div>
              <div className="sizeOptions">
                {(Array.isArray(quickViewProduct.sizes) && quickViewProduct.sizes.length ? quickViewProduct.sizes : ["S", "M", "L", "XL"]).map((item) => (
                  <button key={item} type="button" className={quickViewSize === item ? "selected" : ""} onClick={() => setQuickViewSize(item)}>{item}</button>
                ))}
              </div>

              {/* Quantity Selector */}
              <div className="quantityHeading" style={{ marginTop: "10px" }}><b>Quantity</b></div>
              <div className="quantity productQuantity" style={{ marginBottom: "12px" }}>
                <button type="button" onClick={() => setQuickViewQty(Math.max(1, quickViewQty - 1))}><Minus size={14} /></button>
                <span>{quickViewQty}</span>
                <button type="button" disabled={Number(quickViewProduct.stock || 0) <= quickViewQty} onClick={() => setQuickViewQty(quickViewQty + 1)}><Plus size={14} /></button>
              </div>

              <div className="quickViewActions">
                <button
                  type="button"
                  className="addBagButton"
                  onClick={() => { addToCart(quickViewProduct, quickViewSize, quickViewQty); setQuickViewProduct(null); }}
                  disabled={Number(quickViewProduct.stock || 0) <= 0}
                >
                  {Number(quickViewProduct.stock || 0) > 0 ? `Add to bag (${quickViewSize})` : "Out of stock"}
                </button>
                <Link className="viewFullDetailsLink" href={`/product/${quickViewProduct.id}`}>
                  View full details <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)} />}
      <aside className={cartOpen ? "cartDrawer cartOpen" : "cartDrawer"}>
        <div className="cartHeader"><h2>Your bag <span>({cartCount})</span></h2><button onClick={() => setCartOpen(false)}><X /></button></div>
        <div className="cartItems">
          {!cart.length ? (
            <div className="emptyCart"><ShoppingBag size={36} /><h3>Your bag is empty</h3><p>Looks like you haven&apos;t added anything yet.</p><button onClick={() => setCartOpen(false)}>Continue shopping</button></div>
          ) : cart.map((item) => {
            const originalPrice = Number(item.compareAtPrice || item.comparePrice || item.compare_at_price || item.originalPrice || 0);
            const price = Number(item.price || 0);
            const hasDiscount = originalPrice > price;
            const unitSaving = hasDiscount ? originalPrice - price : 0;
            const itemTotalSaving = unitSaving * item.quantity;

            return (
              <div className="cartItem" key={item.id}>
                <div style={{ backgroundImage: `url(${optimizedImageUrl(item.image, CLOUDINARY_IMAGE_PRESETS.thumbnail)})` }} />
                <section>
                  <h3>{item.name}</h3>
                  <div className="cartItemMeta">
                    {item.size && <small>Size: {item.size}</small>}
                    {item.color && <small className="cartItemColor">Color: {item.color}</small>}
                  </div>
                  <div className="cartItemPriceLine">
                    <p className="cartItemPrice">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                    {hasDiscount && (
                      <span className="cartItemOriginalPrice">Rs. {(originalPrice * item.quantity).toLocaleString()}</span>
                    )}
                  </div>
                  {hasDiscount && itemTotalSaving > 0 && (
                    <span className="cartItemSavingsBadge">
                      You saved Rs. {itemTotalSaving.toLocaleString()}
                    </span>
                  )}
                  <span className="quantity">
                    <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                    {item.quantity}
                    <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                  </span>
                </section>
              </div>
            );
          })}
        </div>
        {!!cart.length && <div className="cartFooter">
          {totalSavings > 0 && (
            <div className="cartTotalSavingsCallout">
              <Sparkles size={14} />
              <span>You saved <b>Rs. {totalSavings.toLocaleString()}</b> on this order!</span>
            </div>
          )}
          <div className="cartFooterSubtotal">
            <span>Subtotal</span>
            <b>Rs. {subtotal.toLocaleString()}</b>
          </div>
          {totalSavings > 0 && (
            <div className="cartFooterSavingsRow">
              <span>Total Discount</span>
              <b className="cartSavingsHighlight">- Rs. {totalSavings.toLocaleString()}</b>
            </div>
          )}
          <p>Delivery charges calculated at checkout.</p>
          <Link className="checkoutButton" href="/checkout">Checkout <ArrowRight size={18} /></Link>
          <button className="shopMoreButton" onClick={() => setCartOpen(false)}>Shop more</button>
        </div>}
      </aside>

      {sizeChartOpen && (
        <SizeChartModal isOpen={sizeChartOpen} onClose={() => setSizeChartOpen(false)} chartData={quickViewProduct?.sizeChart || storeSettings?.sizeChartSettings} />
      )}
    </>
  );
}
