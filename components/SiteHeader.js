"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowRight, ChevronDown, Heart, Home, LayoutGrid, Menu, MessageCircle, Search, ShoppingBag, Truck, UserRound, X } from "lucide-react";
import AnnouncementBar from "./AnnouncementBar";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";

const HeaderSearchModal = dynamic(() => import("./HeaderSearchModal"), { ssr: false });
const HeaderAccountModal = dynamic(() => import("./HeaderAccountModal"), { ssr: false });

const DEFAULT_NAV_CATEGORIES = [
  { name: "Kurtis", slug: "kurtis" },
  { name: "Bottoms", slug: "bottoms" },
  { name: "Co-ord Sets", slug: "coord-sets" },
  { name: "3 Piece Suits", slug: "3-piece-suits" },
];

/** Canonical brand order, kept from the previous header. */
function navOrder(slug = "") {
  const s = slug.toLowerCase();
  if (s.includes("kurti")) return 1;
  if (s.includes("bottom")) return 2;
  if (s.includes("coord") || s.includes("co-ord")) return 3;
  if (s.includes("3-piece") || s.includes("suit")) return 4;
  return 10;
}

export default function SiteHeader({
  storeSettings = DEFAULT_STORE_SETTINGS,
  cartCount: initialCartCount,
  onOpenCart,
  categories = [],
  activeNav = "",
  /**
   * The import lets the header sit transparent over a full-bleed hero and
   * only paints it once the page scrolls. Only the home page passes this.
   */
  transparentOverHero = false,
  /** Optional `{ [slug]: count }` — the import shows a count beside each
   *  mega-menu link. Omitted where the surface has no catalogue loaded. */
  productCounts = null,
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [localCartCount, setLocalCartCount] = useState(0);
  const [isStuck, setIsStuck] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [megaSlug, setMegaSlug] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategoryExpand = useCallback((slug, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setExpandedCategories((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  }, []);

  useEffect(() => {
    setIsStuck(false);
    setMenuOpen(false);
    setMegaSlug("");

    let rafId = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        setIsStuck((window.scrollY || window.pageYOffset || 0) > 38);
        rafId = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bustaniya-cart") || localStorage.getItem("bustaniya_cart");
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) {
          setLocalCartCount(items.reduce((acc, item) => acc + (item.quantity || 1), 0));
        }
      }
    } catch {}
  }, []);

  // Escape closes whichever overlay is open, innermost first.
  useEffect(() => {
    if (!menuOpen && !megaSlug) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (megaSlug) setMegaSlug("");
      else setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, megaSlug]);

  // The drawer is a scroll trap; without this the page behind it moves.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  const displayCartCount = typeof initialCartCount === "number" ? initialCartCount : localCartCount;

  /** Top-level nav, plus the children each one owns for the mega panel. */
  const navTree = useMemo(() => {
    const all = (categories || []).filter(Boolean);
    const tops = all
      .filter((category) => !category.parentSlug && category.showInHeader !== false)
      .map((category) => ({ name: category.name, slug: category.slug, image: category.image }));

    const base = tops.length > 0 ? tops : DEFAULT_NAV_CATEGORIES;
    const hasSuits = base.some((c) => c.slug === "3-piece-suits" || c.name.toLowerCase().includes("3 piece"));
    const withSuits = hasSuits ? base : [...base, { name: "3 Piece Suits", slug: "3-piece-suits" }];

    return [...withSuits]
      .sort((a, b) => navOrder(a.slug) - navOrder(b.slug))
      .map((parent) => ({
        ...parent,
        children: all
          .filter((category) => category.parentSlug === parent.slug && category.showInHeader !== false)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map((child) => ({
            name: child.name,
            slug: child.slug,
            parentSlug: parent.slug,
            count: productCounts ? productCounts[child.slug] : undefined,
          })),
      }));
  }, [categories, productCounts]);

  const mega = useMemo(
    () => navTree.find((item) => item.slug === megaSlug && item.children.length > 0) || null,
    [navTree, megaSlug]
  );

  const transparent = transparentOverHero && !isStuck && !mega && !menuOpen;

  const handleCartClick = useCallback((event) => {
    if (typeof onOpenCart === "function") {
      event.preventDefault();
      onOpenCart();
    }
  }, [onOpenCart]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <AnnouncementBar storeSettings={storeSettings} />

      <header
        className="bs-st-header"
        data-transparent={transparent ? "true" : "false"}
        data-stuck={isStuck ? "true" : "false"}
        onMouseLeave={() => setMegaSlug("")}
        style={{ position: "sticky" }}
      >
        <div className="bs-st-header__bar">
          {/* Left — desktop category nav, mobile menu trigger */}
          <nav className="bs-st-header__nav" aria-label="Primary">
            <button
              type="button"
              className="bs-st-iconbtn bs-st-mobonly"
              style={{ marginLeft: "-10px" }}
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
            >
              <Menu size={20} />
            </button>

            {navTree.map((item) => (
              <Link
                key={item.slug}
                href={`/category/${item.slug}`}
                className="bs-st-navlink bs-st-deskonly"
                data-active={activeNav === item.slug ? "true" : "false"}
                aria-haspopup={item.children.length > 0 ? "true" : undefined}
                aria-expanded={item.children.length > 0 ? megaSlug === item.slug : undefined}
                onMouseEnter={() => setMegaSlug(item.children.length > 0 ? item.slug : "")}
                onFocus={() => setMegaSlug(item.children.length > 0 ? item.slug : "")}
              >
                {item.name.toUpperCase()}
              </Link>
            ))}
          </nav>

          {/* Centre — brand */}
          <Link href="/" className="bs-st-header__brand" aria-label="Bustaniya home">
            <img src="/bustaniya-logo-v2.png" alt="Bustaniya" />
          </Link>

          {/* Right — secondary nav and actions */}
          <div className="bs-st-header__actions">
            <Link
              href="/search"
              className="bs-st-navlink bs-st-navlink--sale bs-st-deskonly"
              style={{ marginRight: 14 }}
              onMouseEnter={() => setMegaSlug("")}
            >
              NEW IN
            </Link>

            <button
              type="button"
              className="bs-st-iconbtn"
              onClick={() => setSearchOpen((current) => !current)}
              aria-label="Search products"
              aria-expanded={searchOpen}
            >
              <Search size={20} />
            </button>

            <button
              type="button"
              className="bs-st-iconbtn bs-st-deskonly"
              onClick={() => setAccountOpen(true)}
              aria-label="My account and order tracking"
            >
              <UserRound size={20} />
            </button>

            <Link href="/track-order" className="bs-st-iconbtn bs-st-deskonly" aria-label="Track your order">
              <Heart size={20} />
            </Link>

            <Link
              href="/cart"
              className="bs-st-iconbtn bs-st-iconbtn--last"
              onClick={handleCartClick}
              aria-label={`Shopping bag, ${displayCartCount} items`}
            >
              <ShoppingBag size={20} />
              {displayCartCount > 0 && <span className="bs-st-iconbtn__badge">{displayCartCount}</span>}
            </Link>
          </div>
        </div>

        {/* Mega panel — only for a category that actually has children in admin */}
        {mega && (
          <div className="bs-st-mega" onMouseLeave={() => setMegaSlug("")}>
            <div className="bs-st-mega__inner">
              <div>
                <span className="bs-st-mega__title">{mega.name.toUpperCase()}</span>
                <div className="bs-st-mega__links">
                  {mega.children.map((child) => (
                    <Link
                      key={child.slug}
                      href={`/category/${child.parentSlug}/${child.slug}`}
                      className="bs-st-mega__link"
                      onClick={() => setMegaSlug("")}
                    >
                      <span>{child.name}</span>
                      {typeof child.count === "number" && (
                        <span className="bs-st-mega__count">{child.count}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              <Link href={`/category/${mega.slug}`} className="bs-st-mega__feature" onClick={() => setMegaSlug("")}>
                {mega.image && (
                  <Image src={mega.image} alt="" fill sizes="(min-width: 1000px) 40vw, 100vw" style={{ objectFit: "cover" }} />
                )}
                <span className="bs-st-mega__scrim" />
                <span className="bs-st-mega__caption">
                  Shop {mega.name}
                  <ArrowRight size={20} />
                </span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Mobile drawer */}
      <button
        type="button"
        className="bs-st-scrim bs-st-mobonly"
        data-open={menuOpen ? "true" : "false"}
        onClick={closeMenu}
        aria-label="Close navigation menu"
        tabIndex={menuOpen ? 0 : -1}
      />
      <nav
        className="bs-st-drawer bs-st-drawer--left bs-st-mobonly"
        data-open={menuOpen ? "true" : "false"}
        aria-label="Mobile navigation menu"
        aria-hidden={menuOpen ? "false" : "true"}
      >
        <div className="bs-st-drawer__head">
          <Link href="/" onClick={closeMenu} aria-label="Bustaniya Home">
            <img src="/bustaniya-logo-v2.png" alt="Bustaniya" style={{ height: 32, width: "auto" }} />
          </Link>
          <button
            type="button"
            className="bs-st-iconbtn bs-st-iconbtn--last"
            onClick={closeMenu}
            aria-label="Close menu"
            tabIndex={menuOpen ? 0 : -1}
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Search bar inside drawer */}
        <div className="bs-st-drawer__searchbox">
          <button
            type="button"
            className="bs-st-drawer__searchtrigger"
            onClick={() => {
              closeMenu();
              setSearchOpen(true);
            }}
            tabIndex={menuOpen ? 0 : -1}
          >
            <Search size={16} />
            <span>Search kurtis, 3-piece suits, pret...</span>
          </button>
        </div>

        <div className="bs-st-menu__list">
          <Link href="/" className="bs-st-menulink" onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}>
            <span>Home</span>
            <ArrowRight size={16} />
          </Link>

          {navTree.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            const isExpanded = !!expandedCategories[item.slug];
            return (
              <div key={item.slug} className="bs-st-menuitem-group">
                <div className="bs-st-menuitem-row">
                  <Link
                    href={`/category/${item.slug}`}
                    className="bs-st-menulink"
                    onClick={closeMenu}
                    tabIndex={menuOpen ? 0 : -1}
                  >
                    <span>{item.name}</span>
                  </Link>
                  {hasChildren ? (
                    <button
                      type="button"
                      className={`bs-st-menuitem-toggle ${isExpanded ? "is-expanded" : ""}`}
                      onClick={(e) => toggleCategoryExpand(item.slug, e)}
                      aria-label={`Toggle ${item.name} subcategories`}
                      aria-expanded={isExpanded}
                      tabIndex={menuOpen ? 0 : -1}
                    >
                      <ChevronDown size={18} />
                    </button>
                  ) : (
                    <Link
                      href={`/category/${item.slug}`}
                      className="bs-st-menuitem-arrow"
                      onClick={closeMenu}
                      aria-label={item.name}
                      tabIndex={menuOpen ? 0 : -1}
                    >
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </div>

                {hasChildren && isExpanded && (
                  <div className="bs-st-menu__sublist">
                    <Link
                      href={`/category/${item.slug}`}
                      className="bs-st-menusublink bs-st-menusublink--all"
                      onClick={closeMenu}
                      tabIndex={menuOpen ? 0 : -1}
                    >
                      <span>All {item.name}</span>
                      <ArrowRight size={14} />
                    </Link>
                    {item.children.map((child) => (
                      <Link
                        key={child.slug}
                        href={`/category/${child.parentSlug}/${child.slug}`}
                        className="bs-st-menusublink"
                        onClick={closeMenu}
                        tabIndex={menuOpen ? 0 : -1}
                      >
                        <span>{child.name}</span>
                        {typeof child.count === "number" && (
                          <span className="bs-st-menusublink__count">{child.count}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <Link href="/about" className="bs-st-menulink" onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}>
            <span>About Us</span>
            <ArrowRight size={16} />
          </Link>
          <Link href="/contact" className="bs-st-menulink" onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}>
            <span>Contact Us</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="bs-st-menu__foot">
          <Link
            href="/track-order"
            className="bs-st-menufoot-item"
            onClick={closeMenu}
            tabIndex={menuOpen ? 0 : -1}
          >
            <Truck size={17} />
            <span>Track My Order</span>
          </Link>
          <a
            className="bs-st-menufoot-item bs-st-menufoot-item--whatsapp"
            href="https://wa.me/923053530008"
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={menuOpen ? 0 : -1}
          >
            <MessageCircle size={17} />
            <span>WhatsApp Customer Support</span>
          </a>
          <a
            className="bs-st-menufoot-item"
            href="https://www.instagram.com/bustaniya_/"
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={menuOpen ? 0 : -1}
          >
            <span>Follow @bustaniya_ on Instagram</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </nav>

      {/* Modern Mobile App Bottom Navigation Bar */}
      <nav className="bs-st-bottomnav bs-st-mobonly" aria-label="Quick mobile navigation">
        <Link
          href="/"
          className="bs-st-bottomnav__item"
          data-active={pathname === "/" ? "true" : "false"}
          aria-label="Home"
        >
          <Home size={20} />
          <span className="bs-st-bottomnav__label">Home</span>
        </Link>

        <button
          type="button"
          className="bs-st-bottomnav__item"
          data-active={menuOpen ? "true" : "false"}
          onClick={() => setMenuOpen(true)}
          aria-label="Shop Categories"
        >
          <LayoutGrid size={20} />
          <span className="bs-st-bottomnav__label">Categories</span>
        </button>

        <button
          type="button"
          className="bs-st-bottomnav__item"
          onClick={() => setSearchOpen(true)}
          aria-label="Search Collection"
        >
          <Search size={20} />
          <span className="bs-st-bottomnav__label">Search</span>
        </button>

        <Link
          href="/track-order"
          className="bs-st-bottomnav__item"
          data-active={pathname === "/track-order" ? "true" : "false"}
          aria-label="Track Your Order"
        >
          <Truck size={20} />
          <span className="bs-st-bottomnav__label">Track</span>
        </Link>

        <button
          type="button"
          className="bs-st-bottomnav__item"
          onClick={handleCartClick}
          aria-label={`Shopping Bag, ${displayCartCount} items`}
        >
          <div style={{ position: "relative" }}>
            <ShoppingBag size={20} />
            {displayCartCount > 0 && (
              <span className="bs-st-bottomnav__badge">{displayCartCount}</span>
            )}
          </div>
          <span className="bs-st-bottomnav__label">Bag</span>
        </button>
      </nav>

      {searchOpen && <HeaderSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />}
      {accountOpen && (
        <HeaderAccountModal
          isOpen={accountOpen}
          onClose={() => setAccountOpen(false)}
          storeSettings={storeSettings}
        />
      )}
    </>
  );
}
