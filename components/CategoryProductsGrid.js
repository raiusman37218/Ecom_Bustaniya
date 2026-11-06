"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, SlidersHorizontal, ArrowUpDown, Heart } from "lucide-react";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl, preloadProductImage } from "../lib/images";
import { getColorHex } from "../data/variantOptions";
import { getProductCategoryComparePrice, getProductCategoryPrice } from "../data/store";
import { useWishlist } from "../lib/wishlist";
import QuickViewModal from "./QuickViewModal";

export default function CategoryProductsGrid({
  initialProducts = [],
  storeSettings = {},
  categoryName = "",
}) {
  const [sortBy, setSortBy] = useState("featured");
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const { isInWishlist, toggle: toggleWishlist } = useWishlist();

  function handleAddToCart(product, size = "S", qty = 1, color = null) {
    try {
      const stored = localStorage.getItem("bustaniya-cart") || localStorage.getItem("bustaniya_cart");
      const current = stored ? JSON.parse(stored) : [];
      const itemColor = color || product.color || (Array.isArray(product.colors) ? product.colors[0] : null);

      const found = current.find(
        (item) => item.id === product.id && item.size === size && (item.color || "") === (itemColor || "")
      );
      let nextCart;
      if (found) {
        nextCart = current.map((item) =>
          item.id === product.id && item.size === size && (item.color || "") === (itemColor || "")
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      } else {
        nextCart = [...current, { ...product, size, color: itemColor, quantity: qty }];
      }
      localStorage.setItem("bustaniya-cart", JSON.stringify(nextCart));
      window.dispatchEvent(new Event("cart-updated"));
    } catch {}
  }

  const sortedProducts = useMemo(() => {
    const list = [...initialProducts];
    switch (sortBy) {
      case "price-asc":
        return list.sort((a, b) => getProductCategoryPrice(a, categoryName) - getProductCategoryPrice(b, categoryName));
      case "price-desc":
        return list.sort((a, b) => getProductCategoryPrice(b, categoryName) - getProductCategoryPrice(a, categoryName));
      case "newest":
        return list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      case "name-asc":
        return list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      case "name-desc":
        return list.sort((a, b) => String(b.name || "").localeCompare(String(a.name || "")));
      case "featured":
      default:
        return list;
    }
  }, [initialProducts, sortBy]);

  const cardStyle = storeSettings?.productCardStyle || "connected";

  return (
    <div className="categoryProductsContainer">
      {/* Interactive Sorting & Count Bar */}
      <div className="collectionTopBar">
        <p className="productCountText">
          <b>{sortedProducts.length}</b> {sortedProducts.length === 1 ? "Product" : "Products"}
        </p>

        <div className="sortDropdownWrapper">
          <label htmlFor="category-sort-select" className="sortLabel">
            <ArrowUpDown size={14} className="sortIcon" />
            <span>Sort by:</span>
          </label>
          <div className="sortSelectCustom">
            <select
              id="category-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sortSelect"
              aria-label="Sort collection products"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
              <option value="name-asc">Alphabetical (A – Z)</option>
            </select>
            <ChevronDown size={14} className="sortSelectArrow" />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="productGrid">
        {sortedProducts.map((product, idx) => {
          const price = getProductCategoryPrice(product, categoryName);
          const compareAtPrice = getProductCategoryComparePrice(product, categoryName);
          const onSale = compareAtPrice > price && price > 0;
          const salePercent = onSale ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;
          const displayCategory = categoryName || product.category;

          return (
            <article
              className={`productCard productCard--${cardStyle}`}
              key={product.id}
              onMouseEnter={() => preloadProductImage(product.image)}
              onTouchStart={() => preloadProductImage(product.image)}
            >
              {/* The grid is the LCP on a collection page, so the first row
                  is preloaded. Only two cards fit a phone's fold, and
                  preloading four means the two the customer can actually see
                  share bandwidth with two they cannot. The next four still
                  load eagerly, just without jumping the queue. */}
              <Link href={`/product/${product.id}`} className="productImage" prefetch={true}>
                <Image
                  src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)}
                  alt={`${product.name} - ${displayCategory} by Bustaniya`}
                  fill
                  priority={idx < 2}
                  loading={idx < 2 ? undefined : idx < 6 ? "eager" : "lazy"}
                  sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                />
                {product.badge && <span className="badge">{product.badge}</span>}
                {onSale && salePercent > 0 && <span className="saleBadge">{salePercent}% OFF</span>}
                <button
                  type="button"
                  className="quickViewButton quickAdd"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setQuickViewProduct(product);
                  }}
                  aria-label={`Quick view ${product.name}`}
                >
                  Quick view
                </button>
              </Link>

              <button
                type="button"
                className={`productCardWishBtn ${isInWishlist(product.id) ? "isWishlisted" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleWishlist(product);
                }}
                aria-label={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                title={isInWishlist(product.id) ? "In Wishlist" : "Add to Wishlist"}
              >
                <Heart
                  size={16}
                  fill={isInWishlist(product.id) ? "#c8175a" : "none"}
                  color={isInWishlist(product.id) ? "#c8175a" : "#16301d"}
                />
              </button>

              <div className="productInfo">
                <div>
                  <p>{displayCategory}</p>
                  <h3>
                    <Link href={`/product/${product.id}`} prefetch={true}>{product.name}</Link>
                  </h3>
                  {Array.isArray(product.colors) && product.colors.length > 0 && (
                    <div className="colorSwatches" aria-label={`${product.colors.length} available colours`}>
                      {product.colors.slice(0, 5).map((color) => {
                        const hex = product.colorHexMap?.[color] || getColorHex(color);
                        return (
                          <Link
                            key={color}
                            href={`/product/${product.id}?color=${encodeURIComponent(color)}`}
                            onClick={(e) => e.stopPropagation()}
                            title={color}
                            aria-label={`View in ${color}`}
                          >
                            <i style={{ background: hex }} />
                          </Link>
                        );
                      })}
                      {product.colors.length > 5 && <small>+{product.colors.length - 5}</small>}
                    </div>
                  )}
                </div>

                {/* Colours and sizing live in CSS. They used to be inline here
                    to force the price visible, but an inline style outranks
                    every stylesheet, so the card could not be re-themed. */}
                <div className="productPrice">
                  <span className="priceCurrent">Rs. {price.toLocaleString()}</span>
                  {onSale && (
                    <del className="priceCompare">Rs. {compareAtPrice.toLocaleString()}</del>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!sortedProducts.length && (
        <div className="emptyCategoryState">
          <p>No products found in this collection.</p>
          <Link href="/" className="backToHomeBtn">
            Back to Home
          </Link>
        </div>
      )}

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={handleAddToCart}
          currency="Rs."
        />
      )}
    </div>
  );
}
