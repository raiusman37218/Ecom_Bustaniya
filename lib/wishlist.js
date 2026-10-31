"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "bustaniya_wishlist";

/**
 * Safe retrieval of wishlist from localStorage.
 */
export function getWishlist() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read wishlist from localStorage:", err);
    return [];
  }
}

/**
 * Save wishlist items to localStorage and notify other components.
 */
export function saveWishlist(items) {
  if (typeof window === "undefined") return;
  try {
    const safeItems = Array.isArray(items) ? items : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeItems));
    window.dispatchEvent(
      new CustomEvent("wishlist-updated", { detail: { items: safeItems } })
    );
  } catch (err) {
    console.error("Failed to save wishlist to localStorage:", err);
  }
}

/**
 * Check if a product is in the wishlist by id or article number.
 */
export function isProductInWishlist(productId) {
  if (!productId) return false;
  const list = getWishlist();
  const targetId = String(productId);
  return list.some((item) => String(item.id) === targetId || String(item.article_number) === targetId);
}

/**
 * Add product to wishlist.
 */
export function addToWishlist(product) {
  if (!product || !product.id) return getWishlist();
  const list = getWishlist();
  const targetId = String(product.id);
  const exists = list.some((item) => String(item.id) === targetId);
  if (exists) return list;

  const itemToSave = {
    id: product.id,
    name: product.name || "Product",
    price: Number(product.price || 0),
    compareAtPrice: Number(product.compareAtPrice || product.compare_at_price || 0),
    image: product.image || "/bustaniya-campaign-hero-v4.png",
    category: product.category || "",
    badge: product.badge || "",
    stock: typeof product.stock === "number" ? product.stock : 10,
    slug: product.slug || product.id,
    addedAt: Date.now(),
  };

  const updated = [itemToSave, ...list];
  saveWishlist(updated);
  return updated;
}

/**
 * Remove product from wishlist.
 */
export function removeFromWishlist(productId) {
  if (!productId) return getWishlist();
  const targetId = String(productId);
  const list = getWishlist();
  const updated = list.filter((item) => String(item.id) !== targetId && String(item.article_number) !== targetId);
  saveWishlist(updated);
  return updated;
}

/**
 * Toggle product in wishlist.
 */
export function toggleWishlist(product) {
  if (!product || !product.id) return false;
  const inList = isProductInWishlist(product.id);
  if (inList) {
    removeFromWishlist(product.id);
    return false;
  } else {
    addToWishlist(product);
    return true;
  }
}

/**
 * Clear entire wishlist.
 */
export function clearWishlist() {
  saveWishlist([]);
}

/**
 * React hook for consuming and updating the wishlist.
 */
export function useWishlist() {
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setItems(getWishlist());
    setIsLoaded(true);

    const handleUpdate = (e) => {
      if (e?.detail?.items) {
        setItems(e.detail.items);
      } else {
        setItems(getWishlist());
      }
    };

    window.addEventListener("wishlist-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("wishlist-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const toggle = useCallback((product) => {
    return toggleWishlist(product);
  }, []);

  const remove = useCallback((id) => {
    removeFromWishlist(id);
  }, []);

  const add = useCallback((product) => {
    addToWishlist(product);
  }, []);

  const clear = useCallback(() => {
    clearWishlist();
  }, []);

  const isInWishlist = useCallback(
    (id) => {
      const targetId = String(id);
      return items.some((item) => String(item.id) === targetId || String(item.article_number) === targetId);
    },
    [items]
  );

  return {
    items,
    count: items.length,
    isLoaded,
    toggle,
    remove,
    add,
    clear,
    isInWishlist,
  };
}

