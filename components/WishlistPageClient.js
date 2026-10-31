"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Heart, ShoppingBag, Trash2 } from "lucide-react";

import { useWishlist } from "../lib/wishlist";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../lib/images";

export default function WishlistPageClient({ region = "pk" }) {
  const { items, count, isLoaded, remove, clear } = useWishlist();
  const [addedIds, setAddedIds] = useState({});

  const isUk = region === "uk";
  const homeLink = isUk ? "/uk" : "/";
  const productPrefix = isUk ? "/uk/product" : "/product";

  function handleAddToCart(product) {
    if (typeof window === "undefined") return;
    const size = "S";
    const qty = 1;

    try {
      const storageKey = "bustaniya-cart";
      const raw = localStorage.getItem(storageKey) || localStorage.getItem("bustaniya_cart");
      let current = [];
      if (raw) current = JSON.parse(raw);

      const found = current.find((i) => String(i.id) === String(product.id) && i.size === size);
      let nextCart;
      if (found) {
        nextCart = current.map((i) =>
          String(i.id) === String(product.id) && i.size === size
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      } else {
        nextCart = [...current, { ...product, size, quantity: qty }];
      }

      localStorage.setItem(storageKey, JSON.stringify(nextCart));
      window.dispatchEvent(new Event("storage"));

      // Temporary visual confirmation
      setAddedIds((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [product.id]: false }));
      }, 2400);
    } catch (err) {
      console.error("Failed to add wishlist item to cart:", err);
    }
  }

  if (!isLoaded) {
    return (
      <div className="wishlistLoading">
        <p>Loading your saved pieces...</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="cartPageEmpty wishlistEmpty">
        <div className="wishlistEmptyIconWrapper">
          <Heart size={48} strokeWidth={1.5} className="emptyCartIcon" />
        </div>
        <p className="eyebrow" style={{ margin: 0, letterSpacing: "0.18em" }}>SAVED ITEMS</p>
        <h2>Your Wishlist is Empty</h2>
        <p>
          You haven&rsquo;t saved any pieces yet. Explore our newest kurtis,
          co-ords, and festive ensembles to curate your favorites.
        </p>
        <Link href={homeLink} className="primaryButton cartEmptyCta">
          <span>Explore Collections</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="wishlistPageContainer">
      <div className="wishlistPageHeader">
        <div>
          <p className="eyebrow">YOUR ATELIER EDIT</p>
          <h1>My Wishlist</h1>
          <p className="wishlistSubtitle">
            {count} {count === 1 ? "piece" : "pieces"} saved for later.
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="wishlistClearBtn"
          aria-label="Clear all items from wishlist"
        >
          <Trash2 size={15} />
          <span>Clear wishlist</span>
        </button>
      </div>

      <div className="productGrid wishlistGrid">
        {items.map((product) => {
          const isAdded = addedIds[product.id];
          const price = Number(product.price || 0);
          const compareAt = Number(product.compareAtPrice || 0);
          const onSale = compareAt > price && price > 0;
          const salePercent = onSale ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
          const productHref = `${productPrefix}/${product.slug || product.id}`;

          return (
            <article className="productCard productCard--connected wishCard" key={product.id}>
              <div className="productImage">
                <Image
                  className="productImagePrimary"
                  src={optimizedImageUrl(
                    product.image || "/bustaniya-campaign-hero-v4.png",
                    CLOUDINARY_IMAGE_PRESETS.card
                  )}
                  alt={`${product.name} by Bustaniya`}
                  fill
                  sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                />

                <Link
                  className="productCardLink"
                  href={productHref}
                  prefetch={true}
                  aria-label={`View ${product.name}`}
                />

                {product.badge && <span className="badge">{product.badge}</span>}
                {onSale && salePercent > 0 && (
                  <span className="saleBadge">{salePercent}% OFF</span>
                )}

                {/* Remove from wishlist button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    remove(product.id);
                  }}
                  className="wishlistCardRemoveBtn"
                  aria-label={`Remove ${product.name} from wishlist`}
                  title="Remove from wishlist"
                >
                  <Heart size={16} fill="#c8175a" color="#c8175a" />
                </button>
              </div>

              <div className="productInfo">
                <div>
                  <p>{product.category || "Collection"}</p>
                  <h3>
                    <Link href={productHref} prefetch={true}>
                      {product.name}
                    </Link>
                  </h3>
                </div>

                <div className="productPrice">
                  <span>Rs. {price.toLocaleString()}</span>
                  {onSale && <del>Rs. {compareAt.toLocaleString()}</del>}
                </div>

                <div className="wishlistCardActions">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className={`wishlistAddBagBtn ${isAdded ? "isAdded" : ""}`}
                    disabled={isAdded}
                  >
                    {isAdded ? (
                      <>
                        <Check size={16} /> Added to Bag
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={15} /> Add to Bag
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

