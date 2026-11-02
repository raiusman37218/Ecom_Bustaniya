"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, SlidersHorizontal, ArrowUpDown, Heart } from "lucide-react";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl, preloadProductImage } from "../lib/images";
import { getColorHex } from "../data/variantOptions";
import { getProductCategoryComparePrice, getProductCategoryPrice } from "../data/store";
import { useWishlist } from "../lib/wishlist";

export default function CategoryProductsGrid({
  initialProducts = [],
  storeSettings = {},
  categoryName = "",
}) {
  const [sortBy, setSortBy] = useState("featured");
  const { isInWishlist, toggle: toggleWishlist } = useWishlist();

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
              <Link href={`/product/${product.id}`} className="productImage" prefetch={true}>
                <Image
                  src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)}
                  alt={`${product.name} - ${displayCategory} by Bustaniya`}
                  fill
                  priority={idx < 4}
                  sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                />
                {product.badge && <span className="badge">{product.badge}</span>}
                {onSale && salePercent > 0 && <span className="saleBadge">{salePercent}% OFF</span>}
                <span className="quickAdd">Choose options</span>
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
    </div>
  );
}
