"use client";

import { useEffect, useMemo, useState } from "react";
import { UserRound, Heart, ShoppingBag, Menu, X } from "lucide-react";
import AnnouncementBar from "./AnnouncementBar";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";

const DEFAULT_NAV_CATEGORIES = [
  { name: "Kurtis", slug: "kurtis" },
  { name: "Co-ord Sets", slug: "coord-sets" },
  { name: "Bottoms", slug: "bottoms" },
  { name: "3 Piece Suits", slug: "3-piece-suits" },
];

export default function SiteHeader({
  storeSettings = DEFAULT_STORE_SETTINGS,
  cartCount: initialCartCount,
  onOpenCart,
  categories = [],
  activeNav = "",
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [localCartCount, setLocalCartCount] = useState(0);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bustaniya-cart") || localStorage.getItem("bustaniya_cart");
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) {
          const total = items.reduce((acc, item) => acc + (item.quantity || 1), 0);
          setLocalCartCount(total);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onScroll = () => setIsStuck(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const displayCartCount = typeof initialCartCount === "number" ? initialCartCount : localCartCount;

  const navigationCategories = useMemo(() => {
    const valid = (categories || [])
      .filter((category) => category && !category.parentSlug && category.showInHeader !== false)
      .map((category) => ({ name: category.name, slug: category.slug }));

    return valid.length > 0 ? valid : DEFAULT_NAV_CATEGORIES;
  }, [categories]);

  function handleCartClick(e) {
    if (typeof onOpenCart === "function") {
      e.preventDefault();
      onOpenCart();
    } else {
      window.location.href = "/cart";
    }
  }

  return (
    <header className={isStuck ? "siteHeaderLucknawi isStuck" : "siteHeaderLucknawi"}>
      {/* 1. Top Announcement Bar */}
      <AnnouncementBar storeSettings={storeSettings} />

      {/* 2. Middle Brand Row: Mobile Menu | Logo | Action Icons */}
      <div className="headerMiddleRow">
        <div className="headerLeftActions">
          <button
            type="button"
            className="mobileMenuBtn"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="site-navigation"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <a href="/" className="headerBrandLogo" aria-label="Bustaniya Home">
          <img src="/bustaniya-logo-v2.png" alt="Bustaniya" />
        </a>

        <div className="headerRightActions">
          <a href="/admin" aria-label="Account" className="actionIconLink" title="Admin Account">
            <UserRound size={22} />
          </a>
          <button type="button" aria-label="Wishlist" className="actionIconBtn" title="Wishlist">
            <Heart size={22} />
            <span className="actionBadge">0</span>
          </button>
          <a
            href="/cart"
            aria-label="Shopping Bag"
            className="actionIconBtn cartBtn"
            onClick={handleCartClick}
            title="Shopping Bag"
          >
            <ShoppingBag size={22} />
            {displayCartCount > 0 && <span className="actionBadge">{displayCartCount}</span>}
          </a>
        </div>
      </div>

      {/* 3. Bottom Centered Navigation Bar */}
      <nav id="site-navigation" className={`headerNavRow ${mobileOpen ? "mobileOpen" : ""}`}>
        <div className="mobileNavTop">
          <span>MENU</span>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu">
            <X size={20} />
          </button>
        </div>
        <a
          onClick={() => setMobileOpen(false)}
          className={activeNav === "home" ? "navItem active" : "navItem"}
          href="/"
        >
          HOME
        </a>
        {navigationCategories.map((category) => (
          <a
            onClick={() => setMobileOpen(false)}
            className={activeNav === category.slug ? "navItem active" : "navItem"}
            href={`/category/${category.slug}`}
            key={category.slug}
          >
            {category.name.toUpperCase()}
          </a>
        ))}
        <a
          onClick={() => setMobileOpen(false)}
          className={activeNav === "about" ? "navItem active" : "navItem"}
          href="/about"
        >
          ABOUT US
        </a>
        <a
          onClick={() => setMobileOpen(false)}
          className={activeNav === "contact" ? "navItem active" : "navItem"}
          href="/contact"
        >
          CONTACT US
        </a>
        <a
          className="mobileNavInstagram"
          href="https://www.instagram.com/bustaniya_/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Follow @bustaniya_
        </a>
      </nav>
    </header>
  );
}
