"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserRound, Heart, ShoppingBag, Menu, X } from "lucide-react";
import AnnouncementBar from "./AnnouncementBar";
import HeaderSearchModal from "./HeaderSearchModal";
import HeaderAccountModal from "./HeaderAccountModal";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

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
    let rafId = null;
    let lastStuck = false;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        const y = window.scrollY || window.pageYOffset || 0;
        // Hysteresis dead-zone:
        // Activate sticky compact state only after scrolling past 110px.
        // Revert to full expanded state only when scrolling back up near the top (< 25px).
        // This 85px buffer prevents any threshold flickering or layout shift vibration.
        if (!lastStuck && y > 110) {
          lastStuck = true;
          setIsStuck(true);
        } else if (lastStuck && y < 25) {
          lastStuck = false;
          setIsStuck(false);
        }
        rafId = null;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const displayCartCount = typeof initialCartCount === "number" ? initialCartCount : localCartCount;

  const navigationCategories = useMemo(() => {
    const valid = (categories || [])
      .filter((category) => category && !category.parentSlug && category.showInHeader !== false)
      .map((category) => ({ name: category.name, slug: category.slug }));

    const base = valid.length > 0 ? valid : DEFAULT_NAV_CATEGORIES;
    const hasSuits = base.some((c) => c.slug === "3-piece-suits" || c.name.toLowerCase().includes("3 piece"));
    if (!hasSuits) {
      return [...base, { name: "3 Piece Suits", slug: "3-piece-suits" }];
    }
    return base;
  }, [categories]);

  function handleCartClick(e) {
    if (typeof onOpenCart === "function") {
      e.preventDefault();
      onOpenCart();
    }
  }

  return (
    <>
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

          <Link href="/" className="headerBrandLogo" aria-label="Bustaniya Home">
            <img src="/bustaniya-logo-v2.png" alt="Bustaniya" />
          </Link>

          <div className="headerRightActions">
            <button
              type="button"
              aria-label="Search"
              className="actionIconBtn searchBtn"
              onClick={() => setSearchOpen(true)}
              title="Search products"
            >
              <Search size={21} />
            </button>
            <button
              type="button"
              aria-label="My Account"
              className="actionIconBtn accountBtn"
              onClick={() => setAccountOpen(true)}
              title="My Account / Track Order"
            >
              <UserRound size={21} />
            </button>
            <button type="button" aria-label="Wishlist" className="actionIconBtn" title="Wishlist">
              <Heart size={21} />
              <span className="actionBadge">0</span>
            </button>
            <Link
              href="/cart"
              aria-label="Shopping Bag"
              className="actionIconBtn cartBtn"
              onClick={handleCartClick}
              title="Shopping Bag"
            >
              <ShoppingBag size={21} />
              {displayCartCount > 0 && <span className="actionBadge">{displayCartCount}</span>}
            </Link>
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
          <div className="mobileNavSearchWrap">
            <button
              type="button"
              className="mobileNavSearchBtn"
              onClick={() => {
                setMobileOpen(false);
                setSearchOpen(true);
              }}
            >
              <Search size={16} /> Search kurtis, suits, co-ords...
            </button>
          </div>
        <Link
          onClick={() => setMobileOpen(false)}
          className={activeNav === "home" ? "navItem active" : "navItem"}
          href="/"
        >
          HOME
        </Link>
        {navigationCategories.map((category) => (
          <Link
            onClick={() => setMobileOpen(false)}
            className={activeNav === category.slug ? "navItem active" : "navItem"}
            href={`/category/${category.slug}`}
            key={category.slug}
          >
            {category.name.toUpperCase()}
          </Link>
        ))}
        <Link
          onClick={() => setMobileOpen(false)}
          className={activeNav === "custom-order" ? "navItem active navItemHighlight" : "navItem navItemHighlight"}
          href="/custom-order"
        >
          CUSTOM DRESS
        </Link>
        <Link
          onClick={() => setMobileOpen(false)}
          className={activeNav === "about" ? "navItem active" : "navItem"}
          href="/about"
        >
          ABOUT US
        </Link>
        <Link
          onClick={() => setMobileOpen(false)}
          className={activeNav === "contact" ? "navItem active" : "navItem"}
          href="/contact"
        >
          CONTACT US
        </Link>
        <a
          className="mobileNavInstagram"
          href="https://www.instagram.com/bustaniya_/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Follow @bustaniya_
        </a>
      </nav>

      {/* Real-time Product Search Modal */}
      <HeaderSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Customer Account & Order Tracking Modal */}
      <HeaderAccountModal
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        storeSettings={storeSettings}
      />
    </header>
  </>
  );
}
