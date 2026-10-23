"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, Sparkles } from "lucide-react";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl, preloadProductImage } from "../lib/images";

const POPULAR_SEARCH_CHIPS = ["Kurtis", "Co-Ord Sets", "3 Piece Suits", "Custom Dress"];

export default function HeaderSearchModal({ isOpen, onClose }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const resultsListRef = useRef(null);

  // Client hydration check for portals
  useEffect(() => {
    setMounted(true);
  }, []);

  // Preload catalog on mount so search is instant on first click
  useEffect(() => {
    if (catalogProducts.length === 0) {
      setCatalogLoading(true);
      fetch("/api/catalog")
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.products || [];
          setCatalogProducts(list);
        })
        .catch(() => {})
        .finally(() => setCatalogLoading(false));
    }
  }, [catalogProducts.length]);

  // Pre-warm top product thumbnails in browser cache so search results render with zero delay
  useEffect(() => {
    if (catalogProducts.length > 0 && typeof window !== "undefined") {
      const prefetchBatch = catalogProducts.slice(0, 12);
      prefetchBatch.forEach((p) => {
        if (p.image) {
          const img = new window.Image();
          img.src = optimizedImageUrl(p.image, CLOUDINARY_IMAGE_PRESETS.searchThumb);
        }
      });
    }
  }, [catalogProducts]);

  // Autofocus input on open
  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);

    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  // Debounce input typing by 300ms
  useEffect(() => {
    if (!query) {
      setDebouncedQuery("");
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setIsDebouncing(false);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Lock body scroll on mobile when open, reset query on close
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      setSelectedIndex(-1);

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    } else {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDownGlobal = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDownGlobal);
    return () => window.removeEventListener("keydown", handleKeyDownGlobal);
  }, [isOpen, onClose]);

  // Search filtering
  const allMatchingResults = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q || q.length < 2) return [];

    return catalogProducts.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const cat = String(product.category || "").toLowerCase();
      const subcat = String(product.subcategory || "").toLowerCase();
      const desc = String(product.description || "").toLowerCase();
      const fabric = String(product.fabricDetails || product.fabric_details || "").toLowerCase();
      const colors = Array.isArray(product.colors) ? product.colors.join(" ").toLowerCase() : "";
      const sku = String(product.sku || product.articleNumber || "").toLowerCase();

      return (
        name.includes(q) ||
        cat.includes(q) ||
        subcat.includes(q) ||
        desc.includes(q) ||
        fabric.includes(q) ||
        colors.includes(q) ||
        sku.includes(q)
      );
    });
  }, [debouncedQuery, catalogProducts]);

  // Limit to max 6 results for dropdown
  const visibleResults = useMemo(() => {
    return allMatchingResults.slice(0, 6);
  }, [allMatchingResults]);

  const showLoading = (isDebouncing && query.trim().length >= 2) || (catalogLoading && query.trim().length >= 2);
  const showEmpty = !showLoading && debouncedQuery.length >= 2 && allMatchingResults.length === 0;
  const showResults = !showLoading && debouncedQuery.length >= 2 && allMatchingResults.length > 0;
  const showPopular = !query.trim() || query.trim().length < 2;

  // Clicking a popular search chip
  function handlePopularChipClick(chipText) {
    setQuery(chipText);
    setDebouncedQuery(chipText.trim());
    setIsDebouncing(false);
    inputRef.current?.focus();
  }

  // Keyboard navigation
  function handleInputKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const maxIndex = visibleResults.length; // max index is visibleResults.length (represents "View all")
      setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const maxIndex = visibleResults.length;
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < visibleResults.length) {
        // Open selected product
        const selected = visibleResults[selectedIndex];
        router.push(`/product/${selected.id}`);
        onClose();
      } else if (query.trim()) {
        // Submit search page query
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        onClose();
      }
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay dims the page behind */}
      {mounted &&
        createPortal(
          <div
            className="bustaniyaSearchBackdrop"
            onClick={onClose}
            aria-hidden="true"
          />,
          document.body
        )}

      {/* Expanding Search Bar Panel (under header on desktop, full-screen on mobile) */}
      <div
        ref={dropdownRef}
        className="bustaniyaSearchDropdown"
        role="dialog"
        aria-modal="true"
        aria-label="Product Search"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bustaniyaSearchContainer">
          {/* Top Search Input Row */}
          <div className="bustaniyaSearchInputRow">
            <div className={`bustaniyaSearchPill ${isFocused ? "isFocused" : ""}`}>
              <Search size={19} className="bustaniyaSearchPillIcon" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Search kurtis, co-ord sets, 3 piece suits..."
                className="bustaniyaSearchInput"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                aria-label="Search kurtis, co-ord sets, 3 piece suits"
              />
              {query && (
                <button
                  type="button"
                  className="bustaniyaSearchClearBtn"
                  onClick={() => {
                    setQuery("");
                    setDebouncedQuery("");
                    setSelectedIndex(-1);
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  title="Clear text"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="bustaniyaSearchCloseBtn"
              onClick={onClose}
              aria-label="Close search"
              title="Close (Esc)"
            >
              <span className="bustaniyaCloseText">ESC</span>
              <X size={20} className="bustaniyaCloseIcon" />
            </button>
          </div>

          {/* Popular Searches Chips (when input is empty or < 2 characters) */}
          {showPopular && (
            <div className="bustaniyaSearchPopularRow">
              <span className="bustaniyaPopularLabel">Popular Searches:</span>
              <div className="bustaniyaPopularChips">
                {POPULAR_SEARCH_CHIPS.map((chip) => (
                  <button
                    type="button"
                    key={chip}
                    className="bustaniyaPopularChip"
                    onClick={() => handlePopularChipClick(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {showLoading && (
            <div className="bustaniyaSearchSkeletonWrap" aria-busy="true" aria-label="Searching products">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bustaniyaSearchSkeletonItem">
                  <div className="bustaniyaSkeletonThumb shimmer" />
                  <div className="bustaniyaSkeletonDetails">
                    <div className="bustaniyaSkeletonLine bustaniyaSkeletonLineShort shimmer" />
                    <div className="bustaniyaSkeletonLine bustaniyaSkeletonLineLong shimmer" />
                  </div>
                  <div className="bustaniyaSkeletonLine bustaniyaSkeletonLinePrice shimmer" />
                </div>
              ))}
            </div>
          )}

          {/* Live Search Results (Max 6) */}
          {showResults && (
            <div className="bustaniyaSearchResultsSection">
              <div className="bustaniyaSearchResultsMeta">
                <span>
                  Showing {visibleResults.length} of {allMatchingResults.length} results for &ldquo;<b>{debouncedQuery}</b>&rdquo;
                </span>
              </div>

              <div className="bustaniyaSearchResultsList" ref={resultsListRef} role="listbox">
                {visibleResults.map((product, idx) => {
                  const compareAtPrice = Number(product.compareAtPrice || product.compare_at_price || 0);
                  const onSale = compareAtPrice > product.price;
                  const isSelected = selectedIndex === idx;

                  return (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      prefetch={true}
                      className={`bustaniyaSearchResultItem ${isSelected ? "isSelected" : ""}`}
                      onClick={onClose}
                      onMouseEnter={() => preloadProductImage(product.image)}
                      onTouchStart={() => preloadProductImage(product.image)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="bustaniyaSearchThumb">
                        {product.image ? (
                          <img
                            src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.searchThumb)}
                            alt={product.name}
                            width={48}
                            height={60}
                            loading="eager"
                            decoding="async"
                          />
                        ) : (
                          <div className="bustaniyaThumbFallback">
                            <Search size={16} />
                          </div>
                        )}
                      </div>

                      <div className="bustaniyaSearchInfo">
                        {product.category && (
                          <span className="bustaniyaSearchCategory">{product.category}</span>
                        )}
                        <h4 className="bustaniyaSearchName">{product.name}</h4>
                      </div>

                      <div className="bustaniyaSearchPrice">
                        <span>Rs. {Number(product.price || 0).toLocaleString()}</span>
                        {onSale && <del>Rs. {compareAtPrice.toLocaleString()}</del>}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* View all results footer link */}
              <Link
                href={`/search?q=${encodeURIComponent(debouncedQuery)}`}
                onClick={onClose}
                className={`bustaniyaSearchViewAllBtn ${selectedIndex === visibleResults.length ? "isSelected" : ""}`}
              >
                <span>View all {allMatchingResults.length} results</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          )}

          {/* Empty State */}
          {showEmpty && (
            <div className="bustaniyaSearchEmpty">
              <Sparkles size={26} className="bustaniyaSearchEmptyIcon" />
              <h3 className="bustaniyaSearchEmptyTitle">No products found for &ldquo;{debouncedQuery}&rdquo;</h3>
              <p className="bustaniyaSearchEmptySubtitle">
                We couldn&apos;t find any designs matching your query. Check your spelling or browse popular categories:
              </p>
              <div className="bustaniyaPopularChips" style={{ justifyContent: "center", marginTop: "12px" }}>
                {POPULAR_SEARCH_CHIPS.map((chip) => (
                  <button
                    type="button"
                    key={chip}
                    className="bustaniyaPopularChip"
                    onClick={() => handlePopularChipClick(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
