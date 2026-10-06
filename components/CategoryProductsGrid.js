"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../lib/images";

export default function CategoryProductsGrid({
  initialProducts = [],
  storeSettings = {},
  categoryName = "",
}) {
  const [sortBy, setSortBy] = useState("featured");

  const sortedProducts = useMemo(() => {
    const list = [...initialProducts];
    switch (sortBy) {
      case "price-asc":
        return list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      case "price-desc":
        return list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
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
        {sortedProducts.map((product) => {
          const price = Number(product.price || 0);
          const compareAtPrice = Number(product.compareAtPrice || product.compare_at_price || 0);
          const onSale = compareAtPrice > price && price > 0;
          const salePercent = onSale ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;
          const displayCategory = product.category || categoryName;

          return (
            <article
              className={`productCard productCard--${cardStyle}`}
              key={product.id}
            >
              <Link href={`/product/${product.id}`} className="productImage">
                <Image
                  src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)}
                  alt={`${product.name} - ${displayCategory} by Bustaniya`}
                  fill
                  sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                />
                {product.badge && <span className="badge">{product.badge}</span>}
                {onSale && salePercent > 0 && <span className="saleBadge">{salePercent}% OFF</span>}
                <span className="quickAdd">Choose options</span>
              </Link>

              <div className="productInfo">
                <div>
                  <p>{displayCategory}</p>
                  <h3>
                    <Link href={`/product/${product.id}`}>{product.name}</Link>
                  </h3>
                </div>

                {/* Guaranteed Visible, High-Contrast Price */}
                <div className="productPrice" style={{ display: "flex", alignItems: "center", gap: "8px", visibility: "visible", opacity: 1 }}>
                  <span className="priceCurrent" style={{ color: "#173d29", fontSize: "14.5px", fontWeight: 700, visibility: "visible" }}>
                    Rs. {price.toLocaleString()}
                  </span>
                  {onSale && (
                    <del className="priceCompare" style={{ color: "#8b8983", fontSize: "11.5px", fontWeight: 500 }}>
                      Rs. {compareAtPrice.toLocaleString()}
                    </del>
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
