"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Instagram, Menu, Minus, Play, Plus, Ruler, ShieldCheck, ShoppingBag, Sparkles, Truck, UserRound, X } from "lucide-react";

import { categories, categoryDetails, categoryToSlug, normalizeCategory, products as initialProducts } from "../../data/store";
import { DEFAULT_HOMEPAGE_SECTIONS, DEFAULT_STORE_SETTINGS } from "../../data/storeSettings";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../../lib/images";
import { convertProductsToRegion, formatPrice, REGIONS } from "../../lib/regions";
import UkHeader from "./UkHeader";
import UkFooter from "./UkFooter";
import SizeChartModal from "../SizeChartModal";

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

function normalizeUkProducts(items) {
  const converted = convertProductsToRegion(items || [], "uk");
  return converted.map((product) => ({
    ...product,
    stock: Number(product.stock ?? 10),
    lowStockThreshold: Number(product.lowStockThreshold ?? 5),
  }));
}

function CampaignHeroImage({ desktopSrc, mobileSrc, alt }) {
  const safeDesktop = desktopSrc || "/bustaniya-campaign-hero-v5.png";
  const safeMobile = mobileSrc || safeDesktop;
  const desktopUrl = optimizedImageUrl(safeDesktop, CLOUDINARY_IMAGE_PRESETS.heroDesktop);
  const mobileUrl = optimizedImageUrl(safeMobile, CLOUDINARY_IMAGE_PRESETS.heroMobile);

  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={mobileUrl} />
      <source media="(min-width: 768px)" srcSet={desktopUrl} />
      <img src={desktopUrl} alt={alt || "Bustaniya UK eastern wear campaign"} fetchPriority="high" decoding="async" />
    </picture>
  );
}

export default function UkHomePageClient({
  initialProducts: serverProducts = initialProducts,
  initialCategories = fallbackCategoryRecords,
  storeSettings = DEFAULT_STORE_SETTINGS,
  bestSellingProductIds = [],
}) {
  const safeSettings = storeSettings || DEFAULT_STORE_SETTINGS;
  const sectionColors = { ...DEFAULT_STORE_SETTINGS.sectionColors, ...(safeSettings.sectionColors || {}) };
  const sectionTextColors = { ...DEFAULT_STORE_SETTINGS.sectionTextColors, ...(safeSettings.sectionTextColors || {}) };
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [products, setProducts] = useState(() => normalizeUkProducts(serverProducts || []));
  const [categoryRecords, setCategoryRecords] = useState(() => (initialCategories || []).filter((category) => category && !category.parentSlug));
  const [heroSlide, setHeroSlide] = useState(0);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewSize, setQuickViewSize] = useState("S");
  const [quickViewQty, setQuickViewQty] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const instagramRailRef = useRef(null);

  const rawDesktop = Array.isArray(safeSettings.heroDesktopImages) && safeSettings.heroDesktopImages.length ? safeSettings.heroDesktopImages : [safeSettings.heroDesktopImage || DEFAULT_STORE_SETTINGS.heroDesktopImage];
  const rawMobile = Array.isArray(safeSettings.heroMobileImages) && safeSettings.heroMobileImages.length ? safeSettings.heroMobileImages : [safeSettings.heroMobileImage || DEFAULT_STORE_SETTINGS.heroMobileImage];
  const heroDesktopImages = rawDesktop.map((img) => img || "/bustaniya-campaign-hero-v5.png");
  const heroMobileImages = rawMobile.map((img) => img || "/bustaniya-campaign-hero-v5.png");
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
    const savedCart = localStorage.getItem(REGIONS.uk.cartStorageKey);
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch {}
    }
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (cartReady) {
      localStorage.setItem(REGIONS.uk.cartStorageKey, JSON.stringify(cart));
      window.dispatchEvent(new Event("cartUpdated-uk"));
    }
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
    if (reducedMotion || !("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-revealed"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -48px" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const visibleProducts = useMemo(() => (products || []).filter((product) => {
    if (!product) return false;
    const categoryMatch = activeCategory === "All" || normalizeCategory(product.category) === activeCategory;
    return categoryMatch;
  }), [activeCategory, products]);

  const categoryNames = useMemo(() => ["All", ...(categoryRecords || []).map((category) => category?.name || "").filter(Boolean)], [categoryRecords]);

  const categoryCards = useMemo(() => (categoryRecords || []).filter((category) => category && category.showInHeader !== false).map((category) => ({
    ...category,
    name: category?.name || "",
    slug: category?.slug || "",
    image: (products || []).find((product) => normalizeCategory(product?.category) === category?.name)?.image || category?.image || "/bustaniya-campaign-hero-v4.png",
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
  const subtotal = cart.reduce((total, item) => total + (item.price || 0) * item.quantity, 0);
  const totalSavings = useMemo(() => {
    return cart.reduce((sum, item) => {
      const original = Number(item.compareAtPrice || item.comparePrice || item.compare_at_price || 0);
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
    const selectedColor = Array.isArray(product.colors) && product.colors.length ? product.colors[0] : "";
    const cartItem = {
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      compareAtPrice: Number(product.compareAtPrice || product.compare_at_price || 0),
      image: product.image,
      category: product.category,
      articleNumber: product.articleNumber || product.article_number || `BST-${String(product.id).padStart(4, "0")}`,
      sku: product.sku || product.articleNumber || `BST-${String(product.id).padStart(4, "0")}`,
      size: size || "S",
      color: selectedColor,
      quantity: Math.max(1, qty),
      currency: "GBP",
    };

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id && item.size === cartItem.size && item.color === cartItem.color);
      if (existing) {
        return current.map((item) =>
          item.id === product.id && item.size === cartItem.size && item.color === cartItem.color
            ? { ...item, quantity: item.quantity + cartItem.quantity }
            : item
        );
      }
      return [cartItem, ...current];
    });

    setCartOpen(true);
  }

  function updateQuantity(id, change) {
    setCart((current) => current.map((item) => (item.id === id ? { ...item, quantity: item.quantity + change } : item)).filter((item) => item.quantity > 0));
  }

  const sections = Array.isArray(safeSettings.homepageSections) && safeSettings.homepageSections.length ? safeSettings.homepageSections : DEFAULT_HOMEPAGE_SECTIONS;
  const overlayIntensity = Number(safeSettings.heroOverlayIntensity ?? 34);

  return (
    <>
      <UkHeader
        storeSettings={safeSettings}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        categories={categoryRecords}
        activeNav="home"
      />

      <main className="homepageMain">
        {sections.map((section) => {
          if (!section.enabled) return null;
          const defaults = DEFAULT_HOMEPAGE_SECTIONS.find((s) => s.id === section.id) || {};

          if (section.type === "hero") {
            const hasAnyContent = Boolean(
              desktopHero.eyebrow || desktopHero.heading || desktopHero.supportingText || desktopHero.primaryButtonText || desktopHero.secondaryButtonText ||
              mobileHero.eyebrow || mobileHero.heading || mobileHero.supportingText || mobileHero.primaryButtonText || mobileHero.secondaryButtonText
            );

            return (
              <section
                key={section.id}
                className={`campaignHero ${hasAnyContent ? "hasContent" : "mediaOnly"}`}
                style={{
                  "--hero-desktop-align": desktopHero.alignment,
                  "--hero-mobile-align": mobileHero.alignment,
                  "--hero-overlay-intensity": `${overlayIntensity / 100}`,
                }}
                data-desktop-pos={desktopHero.position}
                data-mobile-pos={mobileHero.position}
              >
                <div className="campaignHeroMedia">
                  <CampaignHeroImage
                    key={heroSlide}
                    desktopSrc={heroDesktopImages[heroSlide % heroDesktopImages.length]}
                    mobileSrc={heroMobileImages[heroSlide % heroMobileImages.length]}
                    alt="Bustaniya UK eastern wear campaign"
                  />
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
                          {desktopHero.primaryButtonText && <a className="campaignHeroPrimary campaignHeroDesktopOnly" href={desktopHero.primaryButtonLink || "#products"}>{desktopHero.primaryButtonText}<ArrowRight size={17} /></a>}
                          {mobileHero.primaryButtonText && <a className="campaignHeroPrimary campaignHeroMobileOnly" href={mobileHero.primaryButtonLink || "#products"}>{mobileHero.primaryButtonText}<ArrowRight size={14} /></a>}
                          {desktopHero.secondaryButtonText && <a className="campaignHeroSecondary campaignHeroDesktopOnly" href={desktopHero.secondaryButtonLink || "#products"}>{desktopHero.secondaryButtonText}</a>}
                          {mobileHero.secondaryButtonText && <a className="campaignHeroSecondary campaignHeroMobileOnly" href={mobileHero.secondaryButtonLink || "#products"}>{mobileHero.secondaryButtonText}</a>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {heroSlideCount > 1 && (
                  <div className="campaignHeroDots" role="tablist" aria-label="Hero banner slides">
                    {Array.from({ length: heroSlideCount }, (_, index) => (
                      <button
                        key={index}
                        type="button"
                        role="tab"
                        aria-label={`Show banner ${index + 1}`}
                        aria-selected={heroSlide === index}
                        className={heroSlide === index ? "active" : ""}
                        onClick={() => setHeroSlide(index)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          }

          if (section.type === "new_arrivals") {
            return (
              <section key={section.id} className="shopSection khaadiTopPicks scrollReveal" data-scroll-reveal id="products" style={{ "--section-bg": sectionColors.products, "--section-text": sectionTextColors.products }}>
                <div className="sectionHeading">
                  <div>
                    <p className="eyebrow">{section.eyebrow || defaults.eyebrow}</p>
                    <h2>{section.heading || defaults.heading}</h2>
                  </div>
                </div>
                <div className="categoryTabs">
                  {categoryNames.map((category) => (
                    <button key={category} className={category === activeCategory ? "active" : ""} onClick={() => setActiveCategory(category)}>
                      {category}
                    </button>
                  ))}
                </div>
                <div className="productGrid">
                  {visibleProducts.map((product) => (
                    <article className={`productCard productCard--${storeSettings.productCardStyle || "connected"}`} key={product.id}>
                      <div className="productImage">
                        <Image
                          src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)}
                          alt={`${product.name} - ${product.category} by Bustaniya UK`}
                          fill
                          unoptimized
                          sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                        />
                        <a className="productCardLink" href={`/uk/product/${product.id}`} aria-label={`View ${product.name}`} />
                        {product.badge && <span className="badge">{product.badge}</span>}
                        {salePercent(product) > 0 && <span className="saleBadge">{salePercent(product)}% OFF</span>}
                        <button className="quickViewButton" type="button" onClick={() => setQuickViewProduct(product)}>Quick view</button>
                      </div>
                      <div className="productInfo">
                        <div>
                          <p>{product.category}</p>
                          <h3><a href={`/uk/product/${product.id}`}>{product.name}</a></h3>
                          {Array.isArray(product.colors) && product.colors.length > 0 && (
                            <div className="colorSwatches" aria-label={`${product.colors.length} available colours`}>
                              {product.colors.slice(0, 5).map((color) => (
                                <i key={color} title={color} style={{ backgroundColor: color.toLowerCase() }} />
                              ))}
                              {product.colors.length > 5 && <small>+{product.colors.length - 5}</small>}
                            </div>
                          )}
                        </div>
                        <div className="productPrice">
                          <span>{formatPrice(product.price, "uk")}</span>
                          {salePercent(product) > 0 && <del>{formatPrice(product.compareAtPrice || product.compare_at_price, "uk")}</del>}
                        </div>
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

            if (currentStyle === "minimal") {
              return (
                <section key={section.id} className="categoryShowcase categoryShowcase--minimal scrollReveal" data-scroll-reveal style={{ "--section-bg": catBg, "--section-text": catTextColor, color: catTextColor }}>
                  <div className="categoryMinimalHeader">
                    {(section.eyebrow || defaults.eyebrow) && <p className="eyebrow">{section.eyebrow || defaults.eyebrow}</p>}
                    <h2 style={{ color: catTextColor }}>{sectionHeading}</h2>
                  </div>
                  <div className="categoryMinimalGrid" aria-label="Shop by category">
                    {categoryCards.map((category) => (
                      <a className="categoryMinimalCard" href={`/uk/category/${category.slug}`} key={category.slug}>
                        <div className="categoryMinimalImageWrap">
                          <Image
                            src={optimizedImageUrl(category.image || "/bustaniya-campaign-hero-v4.png", CLOUDINARY_IMAGE_PRESETS.category)}
                            alt={category.name}
                            fill
                            unoptimized
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
                      </a>
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
                  {categoryCards.map((category, index) => (
                    <a className={`categoryCard card${index + 1}`} href={`/uk/category/${category.slug}`} key={category.slug} style={category.image ? { backgroundImage: `url(${optimizedImageUrl(category.image, CLOUDINARY_IMAGE_PRESETS.category)})` } : undefined}>
                      <div className="categoryCardContent">
                        <small>Collection {String(index + 1).padStart(2, "0")}</small>
                        <p>{category.description || "Curated essentials, made for everyday elegance."}</p>
                        <h3>{category.name}</h3>
                        <b>Explore collection <ArrowRight size={15} aria-hidden="true" /></b>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            );
          }

          if (section.type === "best_sellers") {
            return (
              <section key={section.id} className="bestsellersSection scrollReveal" data-scroll-reveal style={{ "--section-bg": sectionColors.products, "--section-text": sectionTextColors.products }}>
                <div className="sectionHeading">
                  <div>
                    <p className="eyebrow">{section.eyebrow || defaults.eyebrow}</p>
                    <h2>{section.heading || defaults.heading}</h2>
                  </div>
                </div>
                <div className="productGrid">
                  {bestSellers.map((product) => (
                    <article className={`productCard productCard--${storeSettings.productCardStyle || "connected"}`} key={product.id}>
                      <div className="productImage">
                        <Image
                          src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)}
                          alt={`${product.name} - ${product.category} by Bustaniya UK`}
                          fill
                          unoptimized
                          sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                        />
                        <a className="productCardLink" href={`/uk/product/${product.id}`} aria-label={`View ${product.name}`} />
                        {product.badge && <span className="badge">{product.badge}</span>}
                        {salePercent(product) > 0 && <span className="saleBadge">{salePercent(product)}% OFF</span>}
                        <button className="quickViewButton" type="button" onClick={() => setQuickViewProduct(product)}>Quick view</button>
                      </div>
                      <div className="productInfo">
                        <div>
                          <p>{product.category}</p>
                          <h3><a href={`/uk/product/${product.id}`}>{product.name}</a></h3>
                        </div>
                        <div className="productPrice">
                          <span>{formatPrice(product.price, "uk")}</span>
                          {salePercent(product) > 0 && <del>{formatPrice(product.compareAtPrice || product.compare_at_price, "uk")}</del>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          }

          if (section.type === "instagram_feed") {
            const posts = Array.isArray(safeSettings.instagramPosts) && safeSettings.instagramPosts.length ? safeSettings.instagramPosts : [];
            if (!posts.length) return null;
            return (
              <section key={section.id} className="instagramFeedSection scrollReveal" data-scroll-reveal style={{ "--section-bg": sectionColors.instagram, "--section-text": sectionTextColors.instagram }}>
                <div className="sectionHeading instagramHeading">
                  <div>
                    <p className="eyebrow">{section.eyebrow || defaults.eyebrow}</p>
                    <h2>{section.heading || defaults.heading}</h2>
                    {section.subtitle && <p className="sectionSubtitle">{section.subtitle}</p>}
                  </div>
                  <div className="railNavArrows">
                    <button type="button" onClick={() => scrollInstagramRail(-1)} aria-label="Previous posts"><ChevronLeft size={18} /></button>
                    <button type="button" onClick={() => scrollInstagramRail(1)} aria-label="Next posts"><ChevronRight size={18} /></button>
                  </div>
                </div>
                <div className="instagramGrid instagramRail" ref={instagramRailRef}>
                  {posts.map((post) => (
                    <a href={post.url || "https://www.instagram.com/bustaniya_/"} target="_blank" rel="noopener noreferrer" className="instagramCard" key={post.id}>
                      <Image
                        src={optimizedImageUrl(post.image, CLOUDINARY_IMAGE_PRESETS.card)}
                        alt={post.caption || "Bustaniya UK Instagram post"}
                        fill
                        unoptimized
                        sizes="(max-width: 600px) 70vw, 260px"
                      />
                      <div className="instagramOverlay">
                        <Instagram size={24} />
                        {post.caption && <p>{post.caption}</p>}
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })}
      </main>

      <UkFooter categories={categoryRecords} storeSettings={safeSettings} />

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
                <span>{formatPrice(quickViewProduct.price, "uk")}</span>
                {salePercent(quickViewProduct) > 0 && <del>{formatPrice(quickViewProduct.compareAtPrice || quickViewProduct.compare_at_price, "uk")}</del>}
              </div>

              <span className="productDescription">{quickViewProduct.description || "A thoughtfully designed Bustaniya piece, stitched to perfection with premium fabrics."}</span>

              {/* Size Selector */}
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
                <a className="viewFullDetailsLink" href={`/uk/product/${quickViewProduct.id}`}>
                  View full details <ArrowRight size={15} />
                </a>
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
            const originalPrice = Number(item.compareAtPrice || item.comparePrice || item.compare_at_price || 0);
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
                    <p className="cartItemPrice">{formatPrice(item.price * item.quantity, "uk")}</p>
                    {hasDiscount && (
                      <span className="cartItemOriginalPrice">{formatPrice(originalPrice * item.quantity, "uk")}</span>
                    )}
                  </div>
                  {hasDiscount && itemTotalSaving > 0 && (
                    <span className="cartItemSavingsBadge">
                      You saved {formatPrice(itemTotalSaving, "uk")}
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
              <span>You saved <b>{formatPrice(totalSavings, "uk")}</b> on this order!</span>
            </div>
          )}
          <div className="cartFooterSubtotal">
            <span>Subtotal</span>
            <b>{formatPrice(subtotal, "uk")}</b>
          </div>
          {totalSavings > 0 && (
            <div className="cartFooterSavingsRow">
              <span>Total Discount</span>
              <b className="cartSavingsHighlight">- {formatPrice(totalSavings, "uk")}</b>
            </div>
          )}
          <p>UK delivery charges calculated at checkout (Free over £75).</p>
          <a className="checkoutButton" href="/uk/checkout">Checkout <ArrowRight size={18} /></a>
          <button className="shopMoreButton" onClick={() => setCartOpen(false)}>Shop more</button>
        </div>}
      </aside>

      <SizeChartModal isOpen={sizeChartOpen} onClose={() => setSizeChartOpen(false)} chartData={quickViewProduct?.sizeChart || storeSettings?.sizeChartSettings} />
    </>
  );
}
