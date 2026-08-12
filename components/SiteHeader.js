"use client";

import { useState } from "react";
import { UserRound, Heart, ShoppingBag, Menu, X } from "lucide-react";
import AnnouncementBar from "./AnnouncementBar";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";

export default function SiteHeader({
  storeSettings = DEFAULT_STORE_SETTINGS,
  cartCount = 0,
  onOpenCart = () => {},
  categories = [],
  activeNav = "",
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigationCategories = categories
    .filter((category) => category && !category.parentSlug && category.showInHeader !== false)
    .map((category) => ({ name: category.name, slug: category.slug }));

  return (
    <header className="siteHeaderLucknawi">
      {/* 1. Top Cognac Announcement Bar */}
      <AnnouncementBar storeSettings={storeSettings} />

      {/* 2. Middle Brand Row: Logo | Action Icons */}
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
          <button type="button" aria-label="Shopping Cart" className="actionIconBtn cartBtn" onClick={onOpenCart} title="Shopping Cart">
            <ShoppingBag size={22} />
            {cartCount > 0 && <span className="actionBadge">{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* 3. Bottom Centered Navigation Bar */}
      <nav id="site-navigation" className={`headerNavRow ${mobileOpen ? "mobileOpen" : ""}`}>
        <div className="mobileNavTop"><span>MENU</span><button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu"><X size={20} /></button></div>
        <a onClick={() => setMobileOpen(false)} className={activeNav === "home" ? "navItem active" : "navItem"} href="/">HOME</a>
        {navigationCategories.map((category) => (
          <a onClick={() => setMobileOpen(false)} className={activeNav === category.slug ? "navItem active" : "navItem"} href={`/category/${category.slug}`} key={category.slug}>
          {category.name}
          </a>
        ))}
        <a onClick={() => setMobileOpen(false)} className="navItem" href="/#story">ABOUT US</a>
        <a onClick={() => setMobileOpen(false)} className="navItem" href="/#contact">CONTACT US</a>
        <a className="mobileNavInstagram" href="https://www.instagram.com/bustaniya_/" target="_blank" rel="noreferrer">Follow @bustaniya_</a>
      </nav>
    </header>
  );
}
