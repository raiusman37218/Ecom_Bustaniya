"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Heart, Maximize2, Minus, Plus, Ruler, ShieldCheck, ShoppingBag, Truck, X } from "lucide-react";
import { productDescription } from "../lib/seo";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../lib/images";
import SizeChartModal, { SizeTable } from "./SizeChartModal";
import SiteHeader from "./SiteHeader";

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

  return <div className="structuredProductDetails">
    {blocks.map((block, index) => {
      if (block.type === "heading") return <h3 key={`heading-${index}`}>{block.text}</h3>;
      if (block.type === "bullets") return <ul key={`bullets-${index}`}>{block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul>;
      return <p key={`paragraph-${index}`}>{block.text}</p>;
    })}
  </div>;
}

export default function ProductDetails({ product, related, storeSettings = DEFAULT_STORE_SETTINGS }) {
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem("bustaniya-cart")) || []); } catch {}
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (cartReady) localStorage.setItem("bustaniya-cart", JSON.stringify(cart));
  }, [cart, cartReady]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const availableStock = Number(product.stock || 0);
  const outOfStock = availableStock <= 0;
  const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["XS", "S", "M", "L", "XL"];
  const detailDescription = productDescription(product);
  const productDetails = getProductDetailsText(product, detailDescription);

  function addToBag({ openDrawer = true } = {}) {
    if (outOfStock) return;
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id && item.size === size);
      if (existing) {
        return current.map((item) => item.id === product.id && item.size === size ? { ...item, quantity: Math.min(availableStock, item.quantity + quantity) } : item);
      }
      return [...current, { ...product, size, quantity: Math.min(quantity, availableStock) }];
    });
    setAdded(true);
    if (openDrawer) setCartOpen(true);
    setTimeout(() => setAdded(false), 2200);
  }

  function updateQuantity(id, itemSize, change) {
    setCart((current) => current
      .map((item) => item.id === id && item.size === itemSize ? { ...item, quantity: Math.max(0, item.quantity + change) } : item)
      .filter((item) => item.quantity > 0));
  }

  const productImages = Array.isArray(product.images) && product.images.length
    ? product.images.filter(Boolean)
    : [product.image || "/bustaniya-campaign-hero-v4.png"];
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [useOriginalMainImage, setUseOriginalMainImage] = useState(false);
  const [mainImageUnavailable, setMainImageUnavailable] = useState(false);
  const activeImage = productImages[activeImgIndex] || productImages[0];

  useEffect(() => {
    setUseOriginalMainImage(false);
    setMainImageUnavailable(false);
  }, [activeImgIndex]);

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
        </section>

        <section className="productPurchase">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="detailPrice">Rs. {product.price.toLocaleString()}</p>
          <p className="taxNote">Tax included. Delivery calculated at checkout.</p>
          <div className="selectorHeading">
            <b>Select size</b>
            <button type="button" className="sizeGuidePillBtn" onClick={() => setSizeChartOpen(true)}>
              <Ruler size={14} /> View Size Chart
            </button>
          </div>
          <div className="sizeOptions">
            {sizes.map((item) => <button key={item} className={size === item ? "selected" : ""} onClick={() => setSize(item)}>{item}</button>)}
          </div>

          <div className="purchaseControls">
            <div className="quantityControlGroup">
              <div className="quantityHeading"><b>Quantity</b></div>
              <div className="quantity productQuantity">
                <button aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={14} /></button>
                {quantity}
                <button aria-label="Increase quantity" disabled={outOfStock || quantity >= availableStock} onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}><Plus size={14} /></button>
              </div>
            </div>

            <div className="productActions">
              <button className="addBagButton" disabled={outOfStock || !size} onClick={addToBag}>{outOfStock ? "Out of stock" : added ? <><Check /> Added to bag</> : !size ? "Select a size" : <><ShoppingBag /> Add to bag</>}</button>
              <button className="wishButton" aria-label="Add to wishlist"><Heart /></button>
            </div>
          </div>
          {outOfStock ? <span className="buyNowButton disabledBuy">Unavailable</span> : !size ? <span className="buyNowButton disabledBuy">Select a size first</span> : <a className="buyNowButton" href="/checkout" onClick={() => addToBag({ openDrawer: false })}>Buy it now</a>}

          <div className="productPromises">
            <div><Truck /><span><b>Delivery</b>Calculated at checkout</span></div>
            <div><ShieldCheck /><span><b>Exchange support</b>7-day easy exchange</span></div>
          </div>
          <details id="size-guide" open>
            <summary>Size guide &amp; measurements</summary>
            <p className="sizeChartInlineTitle">Size Chart (Inches)</p>
            <SizeTable />
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
        ) : cart.map((item) => (
          <div className="cartItem" key={`${item.id}-${item.size || "default"}`}>
            <div style={{ backgroundImage: `url(${optimizedImageUrl(item.image, CLOUDINARY_IMAGE_PRESETS.thumbnail)})` }} />
            <section>
              <h3>{item.name}</h3>
              {item.size && <small>Size: {item.size}</small>}
              <p>Rs. {item.price.toLocaleString()}</p>
              <span className="quantity">
                <button onClick={() => updateQuantity(item.id, item.size, -1)}><Minus size={14} /></button>
                {item.quantity}
                <button onClick={() => updateQuantity(item.id, item.size, 1)}><Plus size={14} /></button>
              </span>
            </section>
          </div>
        ))}
      </div>
      {!!cart.length && <div className="cartFooter">
        <div><span>Subtotal</span><b>Rs. {subtotal.toLocaleString()}</b></div>
        <p>Delivery charges calculated at checkout.</p>
        <a className="checkoutButton" href="/checkout">Checkout <ArrowRight size={18} /></a>
        <button className="shopMoreButton" onClick={() => setCartOpen(false)}>Shop more</button>
      </div>}
    </aside>
    <SizeChartModal isOpen={sizeChartOpen} onClose={() => setSizeChartOpen(false)} />
    </>
  );
}
