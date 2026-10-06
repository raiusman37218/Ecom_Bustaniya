"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X, ArrowRight, Sparkles } from "lucide-react";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../lib/images";

const QUICK_TAGS = ["Kurtis", "Co-ord Sets", "3 Piece Suits", "Bottoms", "Summer", "Festive"];

export default function HeaderSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Fetch catalog on first open so search is instantaneous
  useEffect(() => {
    if (!isOpen) return;

    if (catalogProducts.length === 0) {
      setLoading(true);
      fetch("/api/catalog")
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.products || [];
          setCatalogProducts(list);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    // Auto-focus input
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    // Escape key closes modal
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, catalogProducts.length, onClose]);

  // Lock body scroll when search is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return catalogProducts.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const cat = String(product.category || "").toLowerCase();
      const subcat = String(product.subcategory || "").toLowerCase();
      const desc = String(product.description || "").toLowerCase();
      const fabric = String(product.fabricDetails || product.fabric_details || "").toLowerCase();
      const colors = Array.isArray(product.colors) ? product.colors.join(" ").toLowerCase() : "";

      return (
        name.includes(q) ||
        cat.includes(q) ||
        subcat.includes(q) ||
        desc.includes(q) ||
        fabric.includes(q) ||
        colors.includes(q)
      );
    });
  }, [query, catalogProducts]);

  if (!isOpen) return null;

  return (
    <div className="headerSearchModalBackdrop" onClick={onClose} role="presentation">
      <div className="headerSearchModalDialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Search products">
        {/* Search Bar Input Row */}
        <div className="headerSearchInputWrap">
          <Search size={22} className="headerSearchInputIcon" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search kurtis, co-ords, suits, bottoms, colors..."
            className="headerSearchInput"
            aria-label="Search keywords"
          />
          {query && (
            <button
              type="button"
              className="headerSearchClearBtn"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
          <button type="button" className="headerSearchCloseBtn" onClick={onClose} aria-label="Close search">
            ESC
          </button>
        </div>

        {/* Quick Suggestion Tags */}
        <div className="headerSearchTagsRow">
          <span className="headerSearchTagsLabel">Popular:</span>
          {QUICK_TAGS.map((tag) => (
            <button
              type="button"
              key={tag}
              className={`headerSearchTagChip ${query.toLowerCase() === tag.toLowerCase() ? "isActive" : ""}`}
              onClick={() => {
                setQuery(tag);
                inputRef.current?.focus();
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results Area */}
        <div className="headerSearchResultsArea">
          {loading && (
            <div className="headerSearchLoading">
              <span>Loading collection...</span>
            </div>
          )}

          {!loading && query.trim() && searchResults.length > 0 && (
            <div>
              <div className="headerSearchResultsHeader">
                <span>{searchResults.length} {searchResults.length === 1 ? "piece" : "pieces"} found for &ldquo;<b>{query}</b>&rdquo;</span>
              </div>
              <div className="headerSearchResultsGrid">
                {searchResults.slice(0, 8).map((product) => {
                  const compareAtPrice = Number(product.compareAtPrice || product.compare_at_price || 0);
                  const onSale = compareAtPrice > product.price;

                  return (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      className="headerSearchResultCard"
                      onClick={onClose}
                    >
                      <div className="headerSearchResultImg">
                        <Image
                          src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.thumbnail)}
                          alt={product.name}
                          fill
                          sizes="80px"
                        />
                      </div>
                      <div className="headerSearchResultDetails">
                        <span className="headerSearchResultCategory">{product.category}</span>
                        <h4 className="headerSearchResultTitle">{product.name}</h4>
                        <div className="headerSearchResultPrice">
                          <span>Rs. {Number(product.price || 0).toLocaleString()}</span>
                          {onSale && <del>Rs. {compareAtPrice.toLocaleString()}</del>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && query.trim() && searchResults.length === 0 && (
            <div className="headerSearchEmptyState">
              <Sparkles size={28} className="headerSearchEmptyIcon" />
              <h3>No pieces found for &ldquo;{query}&rdquo;</h3>
              <p>Try searching by style (e.g. &ldquo;Kurtis&rdquo;, &ldquo;Co-ord Sets&rdquo;, &ldquo;3 Piece Suits&rdquo;) or color.</p>
              <div className="headerSearchEmptySuggestions">
                <Link href="/category/kurtis" onClick={onClose} className="headerSearchEmptyLink">
                  View Kurtis <ArrowRight size={14} />
                </Link>
                <Link href="/category/coord-sets" onClick={onClose} className="headerSearchEmptyLink">
                  View Co-ord Sets <ArrowRight size={14} />
                </Link>
                <Link href="/category/3-piece-suits" onClick={onClose} className="headerSearchEmptyLink">
                  View 3 Piece Suits <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}

          {!query.trim() && !loading && (
            <div className="headerSearchInitialState">
              <p className="headerSearchInitialPrompt">Search for your favorite silhouettes, fabrics, colors, or collections.</p>
              <div className="headerSearchQuickCategories">
                <Link href="/category/kurtis" onClick={onClose} className="headerSearchQuickCatCard">
                  <b>Kurtis</b>
                  <small>Everyday &amp; luxury silhouettes</small>
                </Link>
                <Link href="/category/coord-sets" onClick={onClose} className="headerSearchQuickCatCard">
                  <b>Co-ord Sets</b>
                  <small>Matching 2-piece elegance</small>
                </Link>
                <Link href="/category/3-piece-suits" onClick={onClose} className="headerSearchQuickCatCard">
                  <b>3 Piece Suits</b>
                  <small>Complete festive &amp; formal wear</small>
                </Link>
                <Link href="/category/bottoms" onClick={onClose} className="headerSearchQuickCatCard">
                  <b>Bottoms</b>
                  <small>Pants, trousers &amp; shalwars</small>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
