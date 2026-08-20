"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { ArrowLeft, ArrowRight, Banknote, Check, ChevronLeft, ChevronRight, Clock, ExternalLink, Heart, Maximize2, Minus, Plus, Ruler, ShieldCheck, ShoppingBag, Sparkles, Truck, X } from "lucide-react";

import { productDescription } from "../lib/seo";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../lib/images";
import { trackEvent } from "../lib/trackEvent";
import { getColorHex } from "../data/variantOptions";
import SizeChartModal, { SizeTable } from "./SizeChartModal";
import SiteHeader from "./SiteHeader";

function getInstagramEmbedUrl(url) {
  if (!url) return null;
  try {
    const raw = String(url).trim();
    if (!raw) return null;
    const clean = raw.split("?")[0].replace(/\/+$/, "");
    const match = clean.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
    if (match && match[1]) {
      return `https://www.instagram.com/p/${match[1]}/embed/captioned/`;
    }
    if (clean.includes("instagram.com/")) {
      return `${clean}/embed/`;
    }
    return null;
  } catch {
    return null;
  }
}


function getProductDetailsText(product, fallbackDescription) {
  const description = String(product?.description || "").trim();
  const fabricDetails = String(product?.fabricDetails || "").trim();
  const careInstructions = String(product?.careInstructions || "").trim();
  const sections = [description || fallbackDescription];

  if (fabricDetails && !description.includes(fabricDetails)) sections.push(`## Fabric & material\n${fabricDetails}`);
  if (careInstructions && !description.includes(careInstructions)) sections.push(`## Care instructions\n${careInstructions}`);

  return sections.filter(Boolean).join("\n\n");
}

function StructuredProductDetails({ value }) {
  const blocks = [];
  let bullets = [];
  const flushBullets = () => {
    if (bullets.length) blocks.push({ type: "bullets", items: bullets });
    bullets = [];
  };

  String(value || "").replace(/\r/g, "").split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushBullets();
      return;
    }
    if (/^#{1,3}\s+/.test(line)) {
      flushBullets();
      blocks.push({ type: "heading", text: line.replace(/^#{1,3}\s+/, "") });
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    flushBullets();
    blocks.push({ type: "paragraph", text: line });
  });
  flushBullets();

  return (
    <div className="structuredProductDetails">
      {blocks.map((block, index) => {
        if (block.type === "heading") return <h3 key={`heading-${index}`}>{block.text}</h3>;
        if (block.type === "bullets") return <ul key={`bullets-${index}`}>{block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul>;
        return <p key={`paragraph-${index}`}>{block.text}</p>;
      })}
    </div>
  );
}

function WhatsAppIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.77 14.19c-.24.68-1.4 1.25-1.94 1.33-.51.07-1.18.11-3.41-.81-2.85-1.18-4.69-4.08-4.83-4.27-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09 1-2.37.24-.28.53-.35.71-.35.18 0 .35 0 .5.01.16.01.37-.06.58.44.22.52.74 1.82.81 1.96.07.14.12.3.02.49-.09.2-.14.32-.28.49-.14.17-.3.38-.43.51-.14.14-.29.3-.12.59.16.29.74 1.21 1.58 1.96 1.09.97 2.01 1.28 2.28 1.44.28.16.44.14.61-.05.17-.19.73-.85.92-1.14.19-.29.39-.24.65-.15.26.09 1.66.78 1.94.92.29.14.48.21.55.33.07.12.07.72-.17 1.4z" />
    </svg>
  );
}

function InstagramIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export default function ProductDetails({ product, related, storeSettings = DEFAULT_STORE_SETTINGS }) {


  const colors = useMemo(() => Array.isArray(product.colors) && product.colors.length ? product.colors : [], [product.colors]);
  const sizes = useMemo(() => Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["XS", "S", "M", "L", "XL"], [product.sizes]);
  const variants = useMemo(() => Array.isArray(product.variants) ? product.variants : [], [product.variants]);
  const colorImages = useMemo(() => (typeof product.colorImages === "object" && product.colorImages ? product.colorImages : {}), [product.colorImages]);

  const [color, setColor] = useState(() => colors[0] || "");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (colors.length && (!color || !colors.includes(color))) {
      setColor(colors[0] || "");
    }
  }, [colors, color]);

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem("bustaniya-cart")) || []); } catch {}
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (!product) return;
    trackEvent("ViewContent", {
      customData: {
        value: Number(product.price || 0),
        contentName: product.name,
        contentIds: [String(product.article_number || product.articleNumber || product.id || "")],
      },
    });
    // Only fire once per product page load, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  useEffect(() => {
    if (cartReady) localStorage.setItem("bustaniya-cart", JSON.stringify(cart));
  }, [cart, cartReady]);

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
  const availableStock = Number(product.stock || 0);

  const outOfStock = availableStock <= 0;
  const detailDescription = productDescription(product);
  const productDetails = getProductDetailsText(product, detailDescription);

  const deliverySettings = storeSettings?.deliverySettings || DEFAULT_STORE_SETTINGS.deliverySettings || {};
  const estimatedDays = deliverySettings.estimatedDays || "3-5 business days";
  const freeThreshold = Number(deliverySettings.freeDeliveryThreshold || 5000);
  const isFreeDelivery = Number(product.price || 0) >= freeThreshold;
  const deliveryFeeSummary = isFreeDelivery
    ? "Free Delivery"
    : (deliverySettings.deliveryFeeText || "Rs. 200 nationwide delivery");
  const codAvailable = deliverySettings.codAvailable !== false;
  const codNote = deliverySettings.codNote || "Cash on Delivery available nationwide";
  const customDeliveryText = String(product?.deliveryInfo || product?.delivery_info || product?.deliveryText || "").trim();
  const fallbackDeliveryText = deliverySettings.defaultDeliveryInfo || "Orders are processed within 24 hours and delivered within 3-5 business days across Pakistan. Tracking details are shared via SMS and WhatsApp once dispatched.";
  const displayDeliveryInfo = customDeliveryText || fallbackDeliveryText;

  const whatsappNumber = String(
    storeSettings?.paymentSettings?.whatsappNumber ||
    storeSettings?.whatsappNumber ||
    DEFAULT_STORE_SETTINGS.paymentSettings?.whatsappNumber ||
    "923053530008"
  ).replace(/\D/g, "");

  const [productUrl, setProductUrl] = useState(`https://bustaniya.pk/product/${product.id}`);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setProductUrl(window.location.href);
    }
  }, []);

  const selectedOptionsText = [
    color ? `Color: ${color}` : "",
    size ? `Size: ${size}` : "",
  ].filter(Boolean).join(", ");


  const whatsappMessage = `Hi Bustaniya! 🌸 I am interested in "${product.name}" (Rs. ${Number(product.price || 0).toLocaleString()})${selectedOptionsText ? ` [${selectedOptionsText}]` : ""}.\n\nProduct Link: ${productUrl}`;

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  const instagramRaw = String(
    storeSettings?.instagramHandle ||
    storeSettings?.instagramUrl ||
    DEFAULT_STORE_SETTINGS.instagramHandle ||
    "@bustaniya_"
  ).trim();

  const instagramUrl = instagramRaw.startsWith("http")
    ? instagramRaw
    : `https://www.instagram.com/${instagramRaw.replace("@", "")}/`;

  const instagramVideoUrl = String(
    product?.instagramVideoUrl ||
    product?.instagram_video_url ||
    product?.cost_breakdown?.metadata?.instagramVideoUrl ||
    product?.cost_breakdown?.metadata?.instagramEmbedUrl ||
    ""
  ).trim();

  const instagramEmbedUrl = useMemo(() => getInstagramEmbedUrl(instagramVideoUrl), [instagramVideoUrl]);
  // A product-level Reel/Post link must always take precedence over the
  // storefront profile. Otherwise the visible Instagram action incorrectly
  // opens the brand homepage even when the admin has attached a showcase Reel.
  const instagramActionUrl = instagramVideoUrl || instagramUrl;
  const hasProductInstagramVideo = Boolean(instagramVideoUrl);



  function isColorInStock(colorName) {
    if (outOfStock) return false;
    if (!variants.length) return true;
    const colorVariants = variants.filter(
      (v) => String(v.color || "").toLowerCase() === String(colorName).toLowerCase()
    );
    if (!colorVariants.length) return true;
    return colorVariants.some((v) => Number(v.stock ?? 1) > 0);
  }

  const isVariantOutOfStock = useMemo(() => {
    if (outOfStock) return true;
    if (!variants.length) return false;
    if (color && !isColorInStock(color)) return true;
    if (size && color) {
      const match = variants.find((v) =>
        String(v.size || "").toLowerCase() === String(size).toLowerCase() &&
        String(v.color || "").toLowerCase() === String(color).toLowerCase()
      );
      if (match && Number(match.stock ?? 0) <= 0) return true;
    }
    return false;
  }, [outOfStock, variants, size, color]);

  const activeColorImages = useMemo(() => {
    if (!color) return null;
    if (colorImages[color]) {
      const list = Array.isArray(colorImages[color]) ? colorImages[color] : [colorImages[color]];
      const valid = list.filter(Boolean);
      if (valid.length) return valid;
    }
    const variantMatch = variants.find(
      (v) => String(v.color || "").toLowerCase() === String(color).toLowerCase() && v.image
    );
    if (variantMatch?.image) return [variantMatch.image];
    return null;
  }, [color, colorImages, variants]);

  const productImages = useMemo(() => {
    if (activeColorImages && activeColorImages.length) {
      return activeColorImages.map((img) => optimizedImageUrl(img));
    }
    return Array.isArray(product.images) && product.images.length
      ? product.images.filter(Boolean).map((img) => optimizedImageUrl(img))
      : [product.image || "/bustaniya-campaign-hero-v4.png"];
  }, [activeColorImages, product.images, product.image]);

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [useOriginalMainImage, setUseOriginalMainImage] = useState(false);
  const [mainImageUnavailable, setMainImageUnavailable] = useState(false);
  const activeImage = productImages[activeImgIndex] || productImages[0];

  useEffect(() => {
    setActiveImgIndex(0);
    setUseOriginalMainImage(false);
    setMainImageUnavailable(false);
  }, [color]);

  useEffect(() => {
    setUseOriginalMainImage(false);
    setMainImageUnavailable(false);
  }, [activeImgIndex]);

  function addToBag({ openDrawer = true } = {}) {
    if (outOfStock || isVariantOutOfStock) return;
    trackEvent("AddToCart", {
      customData: {
        value: Number(product.price || 0) * quantity,
        contentName: product.name,
        contentIds: [String(product.article_number || product.articleNumber || product.id || "")],
        contents: [{ id: String(product.article_number || product.articleNumber || product.id || ""), quantity }],
        numItems: quantity,
      },
    });
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id && item.size === size && (item.color || "") === (color || ""));
      if (existing) {
        return current.map((item) => item.id === product.id && item.size === size && (item.color || "") === (color || "") ? { ...item, quantity: Math.min(availableStock, item.quantity + quantity) } : item);
      }
      return [...current, { ...product, size, color, quantity: Math.min(quantity, availableStock) }];
    });
    setAdded(true);
    if (openDrawer) setCartOpen(true);
    setTimeout(() => setAdded(false), 2200);
  }

  function updateQuantity(id, itemSize, itemColor, change) {
    setCart((current) => current
      .map((item) => item.id === id && item.size === itemSize && (item.color || "") === (itemColor || "") ? { ...item, quantity: Math.max(0, item.quantity + change) } : item)
      .filter((item) => item.quantity > 0));
  }


  return (
    <>
    <main className="productPage">
      <SiteHeader
        storeSettings={storeSettings}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <div className="productDetailLayout">
        <section className="productGallery mariabGallery">
          <a className="productBack" href={product.category === "Kurtis" ? "/category/kurtis" : product.category === "Bottoms" ? "/category/bottoms" : "/category/coord-sets"}>
            <ArrowLeft size={16} /> Back to collection
          </a>

          <div className={`galleryWorkspace ${productImages.length > 1 ? "hasThumbnails" : "singleImage"}`}>
            {/* Thumbnails Sidebar Column */}
            {productImages.length > 1 && (
              <div className="galleryThumbnails">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`thumbBtn ${activeImgIndex === idx ? "active" : ""}`}
                    onClick={() => setActiveImgIndex(idx)}
                    aria-label={`View photo ${idx + 1}`}
                  >
                    <img src={optimizedImageUrl(img, CLOUDINARY_IMAGE_PRESETS.thumbnail)} alt={`${product.name} thumbnail ${idx + 1}`} loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}

            {/* Main Featured Display Photo */}
            <div className="galleryMainView" onClick={() => !mainImageUnavailable && setLightboxOpen(true)}>
              {!mainImageUnavailable ? <img
                className="galleryMainImage"
                src={useOriginalMainImage ? activeImage : optimizedImageUrl(activeImage, CLOUDINARY_IMAGE_PRESETS.product)}
                alt={`${product.name} - View ${activeImgIndex + 1} by Bustaniya`}
                fetchPriority="high"
                onError={() => {
                  if (!useOriginalMainImage) setUseOriginalMainImage(true);
                  else setMainImageUnavailable(true);
                }}
              /> : <div className="galleryImageFallback"><b>Product image is unavailable</b><span>Please choose another photo or contact us for help.</span></div>}
              <div className="galleryZoomHint">
                <Maximize2 size={15} /> <span>Click to zoom</span>
              </div>
              {productImages.length > 1 && (
                <div className="galleryNavControls" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1))}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span>{activeImgIndex + 1} / {productImages.length}</span>
                  <button
                    type="button"
                    onClick={() => setActiveImgIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0))}
                    aria-label="Next photo"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Maria.B Style Multi-Photo Grid View for additional photos */}
          {productImages.length > 1 && (
            <div className="mariabPhotoGrid">
              {productImages.map((img, idx) => (
                <div className="gridPhotoCard" key={idx} onClick={() => { setActiveImgIndex(idx); setLightboxOpen(true); }}>
                  <Image src={optimizedImageUrl(img, CLOUDINARY_IMAGE_PRESETS.card)} alt={`${product.name} detail photo ${idx + 1}`} fill sizes="(max-width: 1100px) 50vw, 25vw" />
                </div>
              ))}
            </div>
          )}

          {/* Fullscreen Lightbox Zoom Modal */}
          {lightboxOpen && (
            <div className="galleryLightbox" role="dialog" aria-modal="true">
              <div className="lightboxOverlay" onClick={() => setLightboxOpen(false)} />
              <div className="lightboxContent">
                <button type="button" className="lightboxCloseBtn" onClick={() => setLightboxOpen(false)} aria-label="Close zoom">
                  <X size={20} />
                </button>

                {productImages.length > 1 && (
                  <button
                    type="button"
                    className="lightboxNavBtn left"
                    onClick={() => setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1))}
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}

                <div className="lightboxImgWrap">
                  <img src={optimizedImageUrl(productImages[activeImgIndex] || productImages[0], CLOUDINARY_IMAGE_PRESETS.product)} alt={`${product.name} high res zoom`} />
                </div>

                {productImages.length > 1 && (
                  <button
                    type="button"
                    className="lightboxNavBtn right"
                    onClick={() => setActiveImgIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0))}
                  >
                    <ChevronRight size={24} />
                  </button>
                )}

                <div className="lightboxCounter">
                  {activeImgIndex + 1} of {productImages.length} — {product.name}
                </div>
              </div>
            </div>
          )}

          {/* Instagram Reel / Video Showcase (Only rendered if URL is configured) */}
          {instagramEmbedUrl && (
            <div className="productInstagramReelCard">
              <div className="instagramReelCardHeader">
                <div className="instagramReelBrandBadge">
                  <InstagramIcon size={18} />
                  <div>
                    <h3>Product Showcase Reel</h3>
                    <p>Watch this silhouette in motion on Instagram</p>
                  </div>
                </div>
                <a
                  href={instagramVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="instagramReelDirectLink"
                  title="Open video on Instagram"
                >
                  <span>Watch on Instagram</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <div className="instagramIframeShell">
                <iframe
                  src={instagramEmbedUrl}
                  className="instagramIframe"
                  title={`${product.name} Instagram Video Showcase`}
                  allowFullScreen
                  loading="lazy"
                  scrolling="no"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              </div>
            </div>
          )}
        </section>


        <section className="productPurchase">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="detailPrice">Rs. {product.price.toLocaleString()}</p>
          <p className="taxNote">
            Tax included. {isFreeDelivery ? <span className="freeDeliveryBadge">🎉 Free Delivery on this order</span> : "Delivery calculated at checkout."}
          </p>
          {/* Color Selector */}
          {!!colors.length && (
            <div className="productOptionSection colorSelectorSection">
              <div className="selectorHeading">
                <div className="selectorLabelGroup">
                  <b>Color:</b> <span className="selectedOptionValue">{color || "Select a color"}</span>
                </div>
              </div>
              <div className="colorSwatchesList" role="radiogroup" aria-label="Product colors">
                {colors.map((colorName) => {
                  const isSelected = color === colorName;
                  const hex = getColorHex(colorName);
                  const inStock = isColorInStock(colorName);
                  const colorThumb = colorImages[colorName] ? (Array.isArray(colorImages[colorName]) ? colorImages[colorName][0] : colorImages[colorName]) : null;

                  return (
                    <button
                      key={colorName}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`colorSwatchBtn ${isSelected ? "selected" : ""} ${!inStock ? "swatchOutOfStock" : ""}`}
                      onClick={() => setColor(colorName)}
                      title={`${colorName}${!inStock ? " (Out of stock)" : ""}`}
                      aria-label={`Select color ${colorName}${!inStock ? " - Out of stock" : ""}`}
                    >
                      <span
                        className="colorSwatchFill"
                        style={{
                          background: colorThumb
                            ? `url(${optimizedImageUrl(colorThumb, CLOUDINARY_IMAGE_PRESETS.thumbnail)}) center/cover no-repeat`
                            : hex,
                        }}
                      >
                        {isSelected && <Check size={12} className="swatchCheckMark" />}
                        {!inStock && <span className="swatchSlash" />}
                      </span>
                      <span className="swatchLabelText">{colorName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="productOptionSection sizeSelectorSection">
            <div className="selectorHeading">
              <div className="selectorLabelGroup">
                <b>Select size</b> {size && <span className="selectedOptionValue">({size})</span>}
              </div>
              <button type="button" className="sizeGuidePillBtn" onClick={() => setSizeChartOpen(true)}>
                <Ruler size={14} /> View Size Chart
              </button>
            </div>
            <div className="sizeOptions">
              {sizes.map((item) => {
                const isSelected = size === item;
                const sizeInStock = !outOfStock && (!variants.length || variants.some((v) =>
                  String(v.size || "").toLowerCase() === String(item).toLowerCase() &&
                  (!color || String(v.color || "").toLowerCase() === String(color).toLowerCase()) &&
                  Number(v.stock ?? 1) > 0
                ));
                return (
                  <button
                    key={item}
                    type="button"
                    className={`${isSelected ? "selected" : ""} ${!sizeInStock ? "sizeOutOfStock" : ""}`}
                    onClick={() => setSize(item)}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="purchaseControls">
            <div className="quantityControlGroup">
              <div className="quantityHeading"><b>Quantity</b></div>
              <div className="quantity productQuantity">
                <button aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={14} /></button>
                {quantity}
                <button aria-label="Increase quantity" disabled={outOfStock || isVariantOutOfStock || quantity >= availableStock} onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}><Plus size={14} /></button>
              </div>
            </div>

            <div className="productActions">
              <button
                className="addBagButton"
                disabled={outOfStock || isVariantOutOfStock || (sizes.length > 0 && !size) || (colors.length > 0 && !color)}
                onClick={addToBag}
              >
                {outOfStock || isVariantOutOfStock
                  ? "Out of stock"
                  : added
                  ? <><Check /> Added to bag</>
                  : colors.length > 0 && !color
                  ? "Select a color"
                  : sizes.length > 0 && !size
                  ? "Select a size"
                  : <><ShoppingBag /> Add to bag</>}
              </button>
              <button className="wishButton" aria-label="Add to wishlist"><Heart /></button>
            </div>
          </div>
          {outOfStock || isVariantOutOfStock ? (
            <span className="buyNowButton disabledBuy">Unavailable</span>
          ) : colors.length > 0 && !color ? (
            <span className="buyNowButton disabledBuy">Select a color first</span>
          ) : sizes.length > 0 && !size ? (
            <span className="buyNowButton disabledBuy">Select a size first</span>
          ) : (
            <a className="buyNowButton" href="/checkout" onClick={() => addToBag({ openDrawer: false })}>
              Buy it now
            </a>
          )}

          {/* WhatsApp & Instagram Direct Action Buttons */}
          <div className="productSocialActions">
            <a
              className="productSocialBtn productSocialBtn--whatsapp"
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Order on WhatsApp"
            >
              <div className="socialBtnIconWrap whatsappIconCircle">
                <WhatsAppIcon size={20} />
              </div>
              <div className="socialBtnTextWrap">
                <span className="socialBtnLine">ORDER ON</span>
                <span className="socialBtnLine">WHATSAPP</span>
              </div>
            </a>

            <a
              className="productSocialBtn productSocialBtn--instagram"
              href={instagramActionUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={hasProductInstagramVideo ? "Watch product reel on Instagram" : "View on Instagram"}
            >
              <div className="socialBtnIconWrap instagramIconWrap">
                <InstagramIcon size={22} />
              </div>
              <div className="socialBtnTextWrap">
                <span className="socialBtnLine">{hasProductInstagramVideo ? "WATCH REEL ON" : "VIEW ON"}</span>
                <span className="socialBtnLine">INSTAGRAM</span>
              </div>
            </a>
          </div>

          <details id="size-guide" open>
            <summary>Size guide &amp; measurements</summary>
            <p className="sizeChartInlineTitle">Size Chart (Inches)</p>
            <SizeTable />
          </details>


          {/* Delivery Information Accordion */}
          <details className="productDetailsAccordion deliveryAccordion" open>
            <summary>Delivery &amp; shipping information</summary>
            <div className="productDetailsAccordionBody">
              <div className="deliveryAccordionHeader">
                <div className="deliveryHeaderIconWrap">
                  <Truck size={20} />
                </div>
                <div>
                  <h2 className="productDetailsTitle">Delivery Information</h2>
                  <p className="deliverySubtitle">Nationwide tracked shipping across Pakistan</p>
                </div>
              </div>

              <div className="deliverySpecsGrid">
                <div className="deliverySpecCard">
                  <Clock size={16} />
                  <div>
                    <span className="specLabel">Estimated Delivery</span>
                    <strong className="specValue">{estimatedDays}</strong>
                  </div>
                </div>
                <div className="deliverySpecCard">
                  <Truck size={16} />
                  <div>
                    <span className="specLabel">Delivery Charges</span>
                    <strong className="specValue">{deliveryFeeSummary}</strong>
                  </div>
                </div>
                {codAvailable && (
                  <div className="deliverySpecCard">
                    <Banknote size={16} />
                    <div>
                      <span className="specLabel">Cash on Delivery</span>
                      <strong className="specValue">Available</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="deliveryTextBody">
                <StructuredProductDetails value={displayDeliveryInfo} />
              </div>

              {customDeliveryText ? (
                <div className="productSpecificDeliveryTag">
                  <Sparkles size={13} />
                  <span>Item-specific dispatch notes applied</span>
                </div>
              ) : null}

              <div className="deliveryFooterNote">
                <ShieldCheck size={14} />
                <span>All parcels are packed securely and dispatched with live tracking via PostEx Courier.</span>
              </div>
            </div>
          </details>

          <details className="productDetailsAccordion" open>
            <summary>Product details</summary>
            <div className="productDetailsAccordionBody">
              <h2 className="productDetailsTitle">Description</h2>
              <StructuredProductDetails value={productDetails} />
              <small className="productDetailsNote">Colours may vary slightly due to camera lighting and screen settings.</small>
            </div>
          </details>
        </section>
      </div>

      {!!related.length && <section className="relatedProducts">
        <p className="eyebrow">YOU MAY ALSO LIKE</p>
        <h2>Complete the look</h2>
        <div className="productGrid">
          {related.map((item) => <article className={`productCard productCard--${storeSettings.productCardStyle || "connected"}`} key={item.id}>
            <a className="productImage" href={`/product/${item.id}`}>
              <Image
                src={optimizedImageUrl(item.image, CLOUDINARY_IMAGE_PRESETS.card)}
                alt={`${item.name} - ${item.category} by Bustaniya`}
                fill
                sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
              />
              {item.badge && <span className="badge">{item.badge}</span>}
              <span className="quickAdd">Choose options</span>
            </a>
            <div className="productInfo"><div><p>{item.category}</p><h3><a href={`/product/${item.id}`}>{item.name}</a></h3></div><div className="productPrice"><span>Rs. {item.price.toLocaleString()}</span><small>Regular price Rs. {item.price.toLocaleString()}</small></div></div>
          </article>)}
        </div>
      </section>}
    </main>
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
            <div className="cartItem" key={`${item.id}-${item.size || "default"}-${item.color || "default"}`}>
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
                  <button onClick={() => updateQuantity(item.id, item.size, item.color, -1)}><Minus size={14} /></button>
                  {item.quantity}
                  <button onClick={() => updateQuantity(item.id, item.size, item.color, 1)}><Plus size={14} /></button>
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
        <a className="checkoutButton" href="/checkout">Checkout <ArrowRight size={18} /></a>
        <button className="shopMoreButton" onClick={() => setCartOpen(false)}>Shop more</button>
      </div>}
    </aside>

    <SizeChartModal isOpen={sizeChartOpen} onClose={() => setSizeChartOpen(false)} chartData={product?.sizeChart || storeSettings?.sizeChartSettings} />
    </>
  );
}

