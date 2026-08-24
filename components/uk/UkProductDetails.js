"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Clock, Heart, Maximize2, Minus, Plus, Ruler, ShieldCheck, ShoppingBag, Sparkles, Truck, X } from "lucide-react";

import { productDescription } from "../../lib/seo";
import { DEFAULT_STORE_SETTINGS } from "../../data/storeSettings";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../../lib/images";
import { getColorHex } from "../../data/variantOptions";
import { convertProductsToRegion, convertProductToRegion, formatPrice, REGIONS } from "../../lib/regions";
import SizeChartModal, { SizeTable } from "../SizeChartModal";
import UkHeader from "./UkHeader";
import UkFooter from "./UkFooter";

function WhatsAppIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.77 14.19c-.24.68-1.4 1.25-1.94 1.33-.51.07-1.18.11-3.41-.81-2.85-1.18-4.69-4.08-4.83-4.27-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09 1-2.37.24-.28.53-.35.71-.35.18 0 .35 0 .5.01.16.01.37-.06.58.44.22.52.74 1.82.81 1.96.07.14.12.3.02.49-.09.2-.14.32-.28.49-.14.17-.3.38-.43.51-.14.14-.29.3-.12.59.16.29.74 1.21 1.58 1.96 1.09.97 2.01 1.28 2.28 1.44.28.16.44.14.61-.05.17-.19.73-.85.92-1.14.19-.29.39-.24.65-.15.26.09 1.66.78 1.94.92.29.14.48.21.55.33.07.12.07.72-.17 1.4z" />
    </svg>
  );
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

export default function UkProductDetails({ product: rawProduct, related: rawRelated = [], storeSettings = DEFAULT_STORE_SETTINGS }) {
  const product = useMemo(() => convertProductToRegion(rawProduct, "uk"), [rawProduct]);
  const related = useMemo(() => convertProductsToRegion(rawRelated, "uk"), [rawRelated]);

  const rawImages = (product?.images?.length ? product.images : [product?.image]).filter(Boolean);
  const images = rawImages.length ? rawImages : ["/bustaniya-campaign-hero-v4.png"];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [size, setSize] = useState(product?.sizes?.[0] || "S");
  const [color, setColor] = useState(product?.colors?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REGIONS.uk.cartStorageKey);
      if (saved) setCart(JSON.parse(saved));
    } catch {}
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (cartReady) {
      localStorage.setItem(REGIONS.uk.cartStorageKey, JSON.stringify(cart));
      window.dispatchEvent(new Event("cartUpdated-uk"));
    }
  }, [cart, cartReady]);

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

  const availableStock = Number(product?.stock ?? 10);
  const outOfStock = availableStock <= 0;
  const detailDescription = productDescription(product);
  const productDetails = getProductDetailsText(product, detailDescription);

  const isFreeDelivery = Number(product?.price || 0) >= 75;
  const deliveryFeeSummary = isFreeDelivery
    ? "Free Tracked UK Delivery"
    : "£4.99 Tracked UK Delivery (Free over £75)";

  const [productUrl, setProductUrl] = useState(`https://bustaniya.com/uk/product/${product?.id}`);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setProductUrl(window.location.href);
    }
  }, []);

  const selectedOptionsText = [
    color ? `Color: ${color}` : "",
    size ? `Size: ${size}` : "",
  ].filter(Boolean).join(", ");

  const articleNumber = String(product?.article_number || product?.articleNumber || product?.sku || product?.id || "—").trim();

  const whatsappNumber = REGIONS.uk.contact.whatsapp;
  const whatsappMessage = `Hi Bustaniya UK! 🌸 I am interested in "${product?.name}" (${formatPrice(product?.price, "uk")})${selectedOptionsText ? ` [${selectedOptionsText}]` : ""}.\n\nProduct Link: ${productUrl}`;
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  function addToCart(qty = quantity) {
    if (outOfStock) return;
    const cartItem = {
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      compareAtPrice: Number(product.compareAtPrice || product.compare_at_price || 0),
      image: images[0],
      category: product.category,
      articleNumber: articleNumber,
      sku: product.sku || articleNumber,
      size: size || "S",
      color: color || "",
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

  const saleDiff = Number(product?.compareAtPrice || 0) > Number(product?.price || 0) ? Number(product.compareAtPrice) - Number(product.price) : 0;
  const salePercentValue = Number(product?.compareAtPrice || 0) > Number(product?.price || 0) && Number(product.compareAtPrice) > 0
    ? Math.round((saleDiff / Number(product.compareAtPrice)) * 100)
    : 0;

  return (
    <div className="productDetailPageLayout">
      <UkHeader storeSettings={storeSettings} cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />

      <main className="productDetailContainer">
        <div className="productDetailBreadcrumb">
          <a href="/uk">Home</a>
          <span>/</span>
          <a href={`/uk/category/${String(product.category).toLowerCase().replace(/\s+/g, "-")}`}>{product.category}</a>
          <span>/</span>
          <span className="currentBreadcrumb">{product.name}</span>
        </div>

        <div className="productDetailGrid">
          {/* Left Column: Image Gallery */}
          <div className="productGallerySection">
            <div className="galleryMainWrap">
              <div className="galleryMainImage" onClick={() => setLightboxOpen(true)}>
                <Image
                  src={optimizedImageUrl(images[activeImageIndex] || images[0], CLOUDINARY_IMAGE_PRESETS.heroDesktop)}
                  alt={`${product.name} - image ${activeImageIndex + 1}`}
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 550px"
                />
                {product.badge && <span className="detailBadge">{product.badge}</span>}
                {salePercentValue > 0 && <span className="detailSaleBadge">-{salePercentValue}% OFF</span>}
                <button type="button" className="lightboxTrigger" aria-label="Expand image">
                  <Maximize2 size={18} />
                </button>
              </div>

              {images.length > 1 && (
                <div className="galleryThumbnails">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`galleryThumbBtn ${activeImageIndex === idx ? "active" : ""}`}
                      onClick={() => setActiveImageIndex(idx)}
                    >
                      <Image src={optimizedImageUrl(img, CLOUDINARY_IMAGE_PRESETS.thumbnail)} alt={`Thumbnail ${idx + 1}`} fill unoptimized />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Product Purchase Form */}
          <div className="productPurchaseSection">
            <div className="productMetaHeader">
              <span className="detailCategory">{product.category}</span>
              <h1 className="detailTitle">{product.name}</h1>
              <p className="detailArticle">Article #{articleNumber}</p>
            </div>

            <div className="detailPriceRow">
              <span className="detailCurrentPrice">{formatPrice(product.price, "uk")}</span>
              {saleDiff > 0 && (
                <>
                  <del className="detailComparePrice">{formatPrice(product.compareAtPrice, "uk")}</del>
                  <span className="detailSavingsPill">Save {formatPrice(saleDiff, "uk")}</span>
                </>
              )}
            </div>

            {/* Colors */}
            {Array.isArray(product.colors) && product.colors.length > 0 && (
              <div className="optionBlock">
                <label className="optionLabel">
                  Color: <b>{color || product.colors[0]}</b>
                </label>
                <div className="colorSelectorGrid">
                  {product.colors.map((col) => {
                    const hex = getColorHex(col);
                    return (
                      <button
                        key={col}
                        type="button"
                        className={`colorSwatchBtn ${color === col ? "selected" : ""}`}
                        onClick={() => setColor(col)}
                        title={col}
                      >
                        <span className="colorDot" style={{ backgroundColor: hex }} />
                        <span className="colorName">{col}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sizes */}
            <div className="optionBlock">
              <div className="optionHeaderWithLink">
                <label className="optionLabel">
                  Size: <b>{size}</b>
                </label>
                <button type="button" className="sizeGuideLinkBtn" onClick={() => setSizeChartOpen(true)}>
                  <Ruler size={14} /> Size guide
                </button>
              </div>
              <div className="sizeSelectorGrid">
                {(Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["S", "M", "L", "XL"]).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    className={`sizeOptionBtn ${size === sz ? "selected" : ""}`}
                    onClick={() => setSize(sz)}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="optionBlock">
              <label className="optionLabel">Quantity</label>
              <div className="detailQuantityStepper">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">
                  <Minus size={15} />
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">
                  <Plus size={15} />
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="detailActionButtons">
              <button
                type="button"
                className="detailAddBagBtn primaryButton"
                onClick={() => addToCart()}
                disabled={outOfStock}
              >
                <ShoppingBag size={18} />
                {outOfStock ? "Out of Stock" : `Add to Bag · ${formatPrice(product.price * quantity, "uk")}`}
              </button>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="detailWhatsappBtn"
              >
                <WhatsAppIcon size={18} /> Order on WhatsApp
              </a>
            </div>

            {/* UK Delivery & Trust Feature Box */}
            <div className="detailTrustBox">
              <div className="trustBoxItem">
                <Truck size={18} />
                <div>
                  <b>{deliveryFeeSummary}</b>
                  <p>Dispatched via Royal Mail / DPD Tracked (2–4 business days across the UK)</p>
                </div>
              </div>
              <div className="trustBoxItem">
                <ShieldCheck size={18} />
                <div>
                  <b>14-Day Returns &amp; Exchanges</b>
                  <p>Hassle-free UK returns for unworn items with tags intact</p>
                </div>
              </div>
              <div className="trustBoxItem">
                <Clock size={18} />
                <div>
                  <b>Concierge Customer Support</b>
                  <p>UK support Mon–Sat, 9:00 AM–6:00 PM GMT ({REGIONS.uk.contact.email})</p>
                </div>
              </div>
            </div>

            {/* Product Details & Fabric Care */}
            <div className="detailInfoAccordion">
              <h3>Product Description &amp; Details</h3>
              <StructuredProductDetails value={productDetails} />
            </div>
          </div>
        </div>

        {/* Related Products Carousel */}
        {related.length > 0 && (
          <section className="relatedProductsSection">
            <h2 className="relatedHeading">You May Also Like</h2>
            <div className="productGrid">
              {related.map((item) => (
                <article className="productCard" key={item.id}>
                  <div className="productImage">
                    <Image
                      src={optimizedImageUrl(item.image, CLOUDINARY_IMAGE_PRESETS.card)}
                      alt={item.name}
                      fill
                      unoptimized
                      sizes="(max-width: 600px) 50vw, 25vw"
                    />
                    <a className="productCardLink" href={`/uk/product/${item.id}`} aria-label={`View ${item.name}`} />
                    {item.badge && <span className="badge">{item.badge}</span>}
                  </div>
                  <div className="productInfo">
                    <div>
                      <p>{item.category}</p>
                      <h3><a href={`/uk/product/${item.id}`}>{item.name}</a></h3>
                    </div>
                    <div className="productPrice">
                      <span>{formatPrice(item.price, "uk")}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Cart Drawer */}
      {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)} />}
      <aside className={cartOpen ? "cartDrawer cartOpen" : "cartDrawer"}>
        <div className="cartHeader">
          <h2>Your bag <span>({cartCount})</span></h2>
          <button onClick={() => setCartOpen(false)}><X /></button>
        </div>
        <div className="cartItems">
          {!cart.length ? (
            <div className="emptyCart">
              <ShoppingBag size={36} />
              <h3>Your bag is empty</h3>
              <p>Explore our latest UK collection.</p>
              <button onClick={() => setCartOpen(false)}>Continue shopping</button>
            </div>
          ) : (
            cart.map((item) => {
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
            })
          )}
        </div>
        {!!cart.length && (
          <div className="cartFooter">
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
            <p>UK delivery calculated at checkout (Free over £75).</p>
            <a className="checkoutButton" href="/uk/checkout">Checkout <ArrowRight size={18} /></a>
            <button className="shopMoreButton" onClick={() => setCartOpen(false)}>Shop more</button>
          </div>
        )}
      </aside>

      <UkFooter storeSettings={storeSettings} />

      <SizeChartModal isOpen={sizeChartOpen} onClose={() => setSizeChartOpen(false)} chartData={product?.sizeChart || storeSettings?.sizeChartSettings} />
    </div>
  );
}
