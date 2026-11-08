"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X, Minus, Plus, Check, ArrowRight, Ruler, ShoppingBag,
  ChevronLeft, ChevronRight, Star, ShieldCheck, Truck, RotateCcw
} from "lucide-react";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../lib/images";
import { getColorHex } from "../data/variantOptions";
import { DEFAULT_COORD_BOTTOM_OPTIONS, DEFAULT_KURTI_BOTTOM_OPTIONS, DEFAULT_SUIT_3PC_OPTIONS, getProductCategoryComparePrice, getProductCategoryPrice, normalizeCategory } from "../data/store";
import SizeChartModal from "./SizeChartModal";

function formatProductTitle(title) {
  if (!title) return "";
  const str = String(title).trim();
  // If text is ALL CAPS (e.g. "AQUA CO-ORD SET" or "AQUA CO-ORD set")
  if (str === str.toUpperCase() || /^[A-Z0-9\s-_/]+$/i.test(str)) {
    return str
      .toLowerCase()
      .split(" ")
      .map((w) => {
        if (w.toLowerCase() === "co-ord") return "Co-Ord";
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");
  }
  return str;
}

export default function QuickViewModal({
  product,
  categoryName = "",
  onClose,
  onAddToCart,
  onOpenSizeChart,
  currency = "Rs.",
}) {
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);

  const [activeCategory, setActiveCategory] = useState(() => {
    if (categoryName) return normalizeCategory(categoryName);
    if (typeof window !== "undefined") {
      try {
        const param = new URLSearchParams(window.location.search).get("category");
        if (param) return normalizeCategory(param);
      } catch {}
    }
    return normalizeCategory(product?.category || "");
  });

  useEffect(() => {
    if (categoryName) {
      setActiveCategory(normalizeCategory(categoryName));
    }
  }, [categoryName]);

  const availableCategoryOptions = useMemo(() => {
    if (!product) return [];
    const allCats = Array.from(
      new Set([
        product?.category,
        ...(Array.isArray(product?.categories) ? product.categories : []),
      ].filter(Boolean))
    );
    if (allCats.length <= 1) return [];
    const hasCategoryPrices = product?.categoryPrices && Object.keys(product.categoryPrices).length > 0;
    const hasPriceVariance = allCats.some(
      (c) => getProductCategoryPrice(product, c) !== Number(product?.price || 0)
    );
    if (!hasCategoryPrices && !hasPriceVariance) return [];
    return allCats.map((catName) => ({
      name: normalizeCategory(catName),
      price: getProductCategoryPrice(product, catName),
      compareAtPrice: getProductCategoryComparePrice(product, catName),
    }));
  }, [product]);

  // Available Sizes & Colors
  const sizes = useMemo(() => {
    return Array.isArray(product?.sizes) && product.sizes.length
      ? product.sizes
      : ["XS", "S", "M", "L", "XL"];
  }, [product?.sizes]);

  const colors = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.colors) && product.colors.length) return product.colors;
    if (product.color) return [product.color];
    return [];
  }, [product]);

  const bottomOptions = useMemo(() => {
    if (product?.enableBottomOptions === false) return [];
    if (Array.isArray(product?.bottomOptions) && product.bottomOptions.length > 0) return product.bottomOptions;
    const cat = String(product?.category || "").toLowerCase();
    const title = String(product?.name || "").toLowerCase();
    if (cat.includes("coord") || cat.includes("co-ord") || title.includes("coord") || title.includes("co-ord")) {
      return DEFAULT_COORD_BOTTOM_OPTIONS;
    }
    if (cat.includes("3 piece") || cat.includes("suit")) {
      return DEFAULT_SUIT_3PC_OPTIONS;
    }
    if (cat.includes("kurti") || cat.includes("shirt")) {
      return DEFAULT_KURTI_BOTTOM_OPTIONS;
    }
    return [];
  }, [product?.bottomOptions, product?.enableBottomOptions, product?.category, product?.name]);

  const isCoordSet = useMemo(() => {
    const cat = String(product?.category || "").toLowerCase();
    const title = String(product?.name || "").toLowerCase();
    return cat.includes("coord") || cat.includes("co-ord") || title.includes("coord") || title.includes("co-ord");
  }, [product?.category, product?.name]);

  const [selectedBottom, setSelectedBottom] = useState(() => (bottomOptions.length ? bottomOptions[0].name : ""));

  // Initialize size and color whenever product changes
  useEffect(() => {
    if (!product) return;
    setSelectedSize(sizes[0] || "S");
    setSelectedColor(colors[0] || product.color || "");
    const baseOpt = bottomOptions.find((o) => Number(o.priceDelta || 0) === 0) || bottomOptions[0];
    setSelectedBottom(baseOpt ? baseOpt.name : "");
    setQuantity(1);
    setIsAdded(false);
    setActiveImgIndex(0);
  }, [product, sizes, colors, bottomOptions]);

  // Gallery images resolver with color variant sync
  const productImages = useMemo(() => {
    if (!product) return [];

    // 1. If color variant images exist for selected color
    if (selectedColor && typeof product.colorImages === "object" && product.colorImages) {
      const matchKey = Object.keys(product.colorImages).find(
        (k) => k.toLowerCase() === selectedColor.toLowerCase()
      );
      if (matchKey && product.colorImages[matchKey]) {
        const list = Array.isArray(product.colorImages[matchKey])
          ? product.colorImages[matchKey]
          : [product.colorImages[matchKey]];
        if (list.filter(Boolean).length) {
          return list.filter(Boolean).map((img) => optimizedImageUrl(img, CLOUDINARY_IMAGE_PRESETS.card));
        }
      }
    }

    // 2. Main product images array
    if (Array.isArray(product.images) && product.images.length) {
      return product.images.filter(Boolean).map((img) => optimizedImageUrl(img, CLOUDINARY_IMAGE_PRESETS.card));
    }

    // 3. Single image fallback
    if (product.image) {
      return [optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)];
    }

    return ["/placeholder.jpg"];
  }, [product, selectedColor]);

  // Reset active image index if list shrinks
  useEffect(() => {
    if (activeImgIndex >= productImages.length) {
      setActiveImgIndex(0);
    }
  }, [productImages, activeImgIndex]);

  // Lock body scroll while modal is open & listen for Escape key
  useEffect(() => {
    if (!product) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  const availableStock = Number(product.stock ?? 10);
  const isOutOfStock = availableStock <= 0;
  const basePrice = useMemo(() => {
    return product ? getProductCategoryPrice(product, activeCategory) : 0;
  }, [product, activeCategory]);

  const baseCompareAt = useMemo(() => {
    return product ? getProductCategoryComparePrice(product, activeCategory) : 0;
  }, [product, activeCategory]);

  const activeBottomOption = useMemo(() => bottomOptions.find((o) => o.name === selectedBottom) || null, [bottomOptions, selectedBottom]);
  const bottomPriceDelta = Number(activeBottomOption?.priceDelta || 0);
  const price = Math.max(0, basePrice + bottomPriceDelta);
  const compareAtPrice = baseCompareAt > 0 ? Math.max(0, baseCompareAt + bottomPriceDelta) : 0;
  const hasDiscount = compareAtPrice > price && price > 0;
  const discountPercent = hasDiscount ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;
  const savingsPkr = hasDiscount ? compareAtPrice - price : 0;
  const displayTitle = formatProductTitle(product.name);

  function handleAddToCart() {
    if (isOutOfStock) return;
    setIsAdded(true);
    const cartProduct = {
      ...product,
      price,
      compareAtPrice: compareAtPrice || product.compareAtPrice,
      bottom: selectedBottom,
      category: activeCategory || product.category,
    };
    if (typeof onAddToCart === "function") {
      onAddToCart(cartProduct, selectedSize, quantity, selectedColor, selectedBottom);
    }
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 650);
  }

  function handleOpenSizeGuide() {
    if (typeof onOpenSizeChart === "function") {
      onOpenSizeChart(product);
    } else {
      setIsSizeChartOpen(true);
    }
  }

  return (
    <>
      <div className="quickViewPortal">
        {/* Backdrop */}
        <div className="quickViewOverlay" onClick={onClose} aria-hidden="true" />

        {/* Dialog */}
        <div
          className="quickViewModal"
          role="dialog"
          aria-modal="true"
          aria-label={`Quick view ${displayTitle}`}
        >
          {/* Close Button */}
          <button
            type="button"
            className="quickViewClose"
            onClick={onClose}
            aria-label="Close quick view"
          >
            <X size={18} />
          </button>

          {/* Left Column: Image Gallery */}
          <div className="quickViewImage">
            <Image
              src={productImages[activeImgIndex] || productImages[0]}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 460px"
              style={{ objectFit: "cover", objectPosition: "top center" }}
            />

            {/* Luxury Badges */}
            <div className="qvBadgeContainer">
              {product.badge ? (
                <span className="qvBadgeNew">{product.badge}</span>
              ) : (
                <span className="qvBadgeNew">NEW ARRIVAL</span>
              )}
              {discountPercent > 0 && (
                <span className="qvBadgeDiscount">-{discountPercent}% OFF</span>
              )}
            </div>

            {/* Gallery Navigation Arrows (if multiple photos) */}
            {productImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="qvGalleryArrow prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1));
                  }}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="qvGalleryArrow next"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImgIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0));
                  }}
                  aria-label="Next photo"
                >
                  <ChevronRight size={18} />
                </button>

                {/* Dot Indicators */}
                <div className="qvDots">
                  {productImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`qvDot ${idx === activeImgIndex ? "active" : ""}`}
                      onClick={() => setActiveImgIndex(idx)}
                      aria-label={`Show photo ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Details & Purchasing */}
          <div className="quickViewDetails">
            {/* Category & Status Bar */}
            <div className="qvTopMeta">
              {(activeCategory || product.category) && (
                <span className="quickViewCategory">{activeCategory || product.category}</span>
              )}
              <div className="qvStockRatingRow">
                <span className="qvStockPill">
                  <span className="qvStockDot" />
                  In Stock • Dispatch in 24h
                </span>
                <span className="qvRatingBadge">
                  <Star size={12} fill="#d97706" color="#d97706" /> 4.9
                </span>
              </div>
            </div>

            <h2 className="quickViewTitle">{displayTitle}</h2>

            {/* Price Section */}
            <div className="quickViewPrice">
              <span className="currentPrice">
                {currency} {price.toLocaleString()}
              </span>
              {hasDiscount && (
                <del className="comparePrice">
                  {currency} {compareAtPrice.toLocaleString()}
                </del>
              )}
              {discountPercent > 0 && (
                <span className="discountPill">
                  Save {currency} {savingsPkr.toLocaleString()} ({discountPercent}% OFF)
                </span>
              )}
            </div>

            {/* Multi-Category Edition Selector (if different prices exist across categories) */}
            {availableCategoryOptions.length > 1 && (
              <div className="qvOptionGroup" style={{ marginBottom: "14px" }}>
                <span className="qvOptionLabel">
                  Edition / Category: <strong style={{ color: "#173d29" }}>{activeCategory}</strong>
                </span>
                <div className="qvSizeChips" style={{ gap: "6px" }}>
                  {availableCategoryOptions.map((opt) => {
                    const isSelected = normalizeCategory(activeCategory).toLowerCase() === normalizeCategory(opt.name).toLowerCase();
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        className={`qvSizeChip ${isSelected ? "selected" : ""}`}
                        style={{ padding: "6px 12px", minWidth: "auto", fontSize: "12px", fontWeight: isSelected ? 700 : 500 }}
                        onClick={() => setActiveCategory(opt.name)}
                      >
                        {opt.name} ({currency} {opt.price.toLocaleString()})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <p className="quickViewDesc">
                {product.description.slice(0, 190)}
                {product.description.length > 190 ? "..." : ""}
              </p>
            )}

            {/* Color Selection (if colors exist) */}
            {colors.length > 0 && (
              <div className="quickViewSection">
                <div className="quickViewSectionHeader">
                  <div className="sectionLabelGroup">
                    <span className="sectionLabel">Color:</span>
                    <b className="sectionValue">{selectedColor}</b>
                  </div>
                </div>
                <div className="quickViewColorOptions" role="radiogroup" aria-label="Product color">
                  {colors.map((color) => {
                    const hex = product.colorHexMap?.[color] || getColorHex(color);
                    const isSelected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        className={`quickViewColorBtn ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedColor(color)}
                        title={color}
                        aria-label={`Select color ${color}`}
                        aria-checked={isSelected}
                        role="radio"
                      >
                        <span className="colorDot" style={{ background: hex }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selection */}
            <div className="quickViewSection">
              <div className="quickViewSectionHeader">
                <div className="sectionLabelGroup">
                  <span className="sectionLabel">Select Size:</span>
                  <b className="sectionValue">{selectedSize}</b>
                </div>
                <button
                  type="button"
                  className="quickViewSizeGuideLink"
                  onClick={handleOpenSizeGuide}
                >
                  <Ruler size={13} /> Size Guide
                </button>
              </div>
              <div className="quickViewSizeOptions" role="radiogroup" aria-label="Product size">
                {sizes.map((s) => {
                  const isSelected = selectedSize === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`quickViewSizeBtn ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedSize(s)}
                      aria-checked={isSelected}
                      role="radio"
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Style / Bottom / Outfit Piece Options */}
            {!!bottomOptions.length && (
              <div className="quickViewSection">
                <div className="quickViewSectionHeader">
                  <div className="sectionLabelGroup">
                    <span className="sectionLabel">{isCoordSet ? "Outfit / Piece:" : "Style / Bottom:"}</span>
                    <b className="sectionValue">{selectedBottom || "Select style"}</b>
                  </div>
                </div>
                <div
                  className="bottomOptionsList"
                  role="radiogroup"
                  aria-label="Style and piece options"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", marginTop: "6px", gap: "8px" }}
                >
                  {bottomOptions.map((opt) => {
                    const isSelected = selectedBottom === opt.name;
                    const delta = Number(opt.priceDelta || 0);
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`bottomOptionBtn ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedBottom(opt.name)}
                        style={{ padding: "8px 10px" }}
                      >
                        <span className="bottomOptionName" style={{ fontSize: "12.5px" }}>{opt.name}</span>
                        {delta > 0 ? (
                          <span className="bottomOptionDelta" style={{ fontSize: "11px" }}>+Rs. {delta.toLocaleString()}</span>
                        ) : delta < 0 ? (
                          <span className="bottomOptionDelta" style={{ color: "#166534", fontWeight: 700, fontSize: "11px" }}>
                            -Rs. {Math.abs(delta).toLocaleString()}
                          </span>
                        ) : (
                          <span className="bottomOptionBase" style={{ fontSize: "11px" }}>{isCoordSet ? "2-Piece Included" : "Shirt only"}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="quickViewSection">
              <div className="quickViewSectionHeader">
                <span className="sectionLabel">Quantity</span>
                {availableStock > 0 && availableStock <= 5 && (
                  <span className="quickViewLowStock">
                    🔥 Only {availableStock} left in stock!
                  </span>
                )}
              </div>
              <div className="quickViewQtyRow">
                <div className="quickViewQtyBox">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span aria-live="polite">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                    disabled={quantity >= availableStock}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="quickViewActions">
              <button
                type="button"
                className="quickViewAddBagBtn"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? (
                  "Out of Stock"
                ) : isAdded ? (
                  <span className="btnInner">
                    <Check size={18} /> Added to Bag!
                  </span>
                ) : (
                  <span className="btnInner">
                    <ShoppingBag size={17} /> Add to Bag ({selectedSize}) • {currency} {(price * quantity).toLocaleString()}
                  </span>
                )}
              </button>

              <Link
                href={`/product/${product.id}${activeCategory ? `?category=${encodeURIComponent(activeCategory)}` : ""}`}
                className="quickViewFullDetailsLink"
                onClick={onClose}
                prefetch={true}
              >
                <span>View full product details</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Luxury Assurance Strip */}
            <div className="qvTrustStrip">
              <div className="qvTrustItem">
                <Truck size={14} />
                <span>Free delivery over Rs. 3,000</span>
              </div>
              <div className="qvTrustItem">
                <RotateCcw size={14} />
                <span>Easy 7-day exchange</span>
              </div>
              <div className="qvTrustItem">
                <ShieldCheck size={14} />
                <span>100% Authentic Fabric</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Size Chart Modal Fallback */}
      {isSizeChartOpen && (
        <SizeChartModal
          isOpen={true}
          onClose={() => setIsSizeChartOpen(false)}
          chartData={product.sizeChartData || product.sizeChart}
        />
      )}
    </>
  );
}
