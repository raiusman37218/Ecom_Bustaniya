"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, Check, ArrowRight, Ruler, ShoppingBag } from "lucide-react";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../lib/images";
import { getColorHex } from "../data/variantOptions";

export default function QuickViewModal({
  product,
  onClose,
  onAddToCart,
  onOpenSizeChart,
  currency = "Rs.",
}) {
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  // Initialize size and color whenever product changes
  useEffect(() => {
    if (!product) return;
    const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["S", "M", "L", "XL"];
    setSelectedSize(sizes[0] || "S");

    const colors = Array.isArray(product.colors) && product.colors.length ? product.colors : [];
    setSelectedColor(colors[0] || product.color || "");

    setQuantity(1);
    setIsAdded(false);
  }, [product]);

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
  const price = Number(product.price || 0);
  const compareAtPrice = Number(product.compareAtPrice || product.compare_at_price || 0);
  const hasDiscount = compareAtPrice > price && price > 0;
  const discountPercent = hasDiscount ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;
  const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["S", "M", "L", "XL"];
  const colors = Array.isArray(product.colors) && product.colors.length ? product.colors : [];

  function handleAddToCart() {
    if (isOutOfStock) return;
    setIsAdded(true);
    if (typeof onAddToCart === "function") {
      onAddToCart(product, selectedSize, quantity, selectedColor);
    }
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 600);
  }

  return (
    <div className="quickViewPortal">
      {/* Backdrop */}
      <div className="quickViewOverlay" onClick={onClose} aria-hidden="true" />

      {/* Dialog */}
      <div
        className="quickViewModal"
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view ${product.name}`}
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

        {/* Left Column: Image */}
        <div className="quickViewImage">
          <Image
            src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 420px"
            style={{ objectFit: "cover", objectPosition: "top center" }}
          />
          {discountPercent > 0 && <span className="saleBadge">-{discountPercent}%</span>}
          {product.badge && <span className="badge">{product.badge}</span>}
        </div>

        {/* Right Column: Details & Purchasing */}
        <div className="quickViewDetails">
          {product.category && (
            <p className="quickViewCategory">{product.category}</p>
          )}

          <h2 className="quickViewTitle">{product.name}</h2>

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
              <span className="discountPill">{discountPercent}% OFF</span>
            )}
          </div>

          {product.description && (
            <p className="quickViewDesc">
              {product.description.slice(0, 180)}
              {product.description.length > 180 ? "..." : ""}
            </p>
          )}

          {/* Color Selection (if colors exist) */}
          {colors.length > 0 && (
            <div className="quickViewSection">
              <div className="quickViewSectionHeader">
                <span className="sectionLabel">Color:</span>
                <b className="sectionValue">{selectedColor}</b>
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
                      <span className="colorDot" style={{ backgroundColor: hex }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div className="quickViewSection">
            <div className="quickViewSectionHeader">
              <div>
                <span className="sectionLabel">Size:</span>
                <b className="sectionValue">{selectedSize}</b>
              </div>
              {onOpenSizeChart && (
                <button
                  type="button"
                  className="quickViewSizeGuideLink"
                  onClick={() => onOpenSizeChart(product)}
                >
                  <Ruler size={13} /> Size Guide
                </button>
              )}
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

          {/* Quantity Selector */}
          <div className="quickViewSection">
            <div className="quickViewSectionHeader">
              <span className="sectionLabel">Quantity</span>
              {availableStock > 0 && availableStock <= 5 && (
                <small className="quickViewLowStock">Only {availableStock} left!</small>
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
                  <Check size={16} /> Added to Bag!
                </span>
              ) : (
                <span className="btnInner">
                  <ShoppingBag size={16} /> Add to Bag ({selectedSize}) • {currency} {(price * quantity).toLocaleString()}
                </span>
              )}
            </button>

            <Link
              href={`/product/${product.id}`}
              className="quickViewFullDetailsLink"
              onClick={onClose}
              prefetch={true}
            >
              <span>View full product details</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
