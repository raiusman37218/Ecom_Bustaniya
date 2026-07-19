"use client";

import Image, { getImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Menu, Minus, Plus, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { categories, categoryDetails, categoryToSlug, normalizeCategory, products as initialProducts } from "../data/store";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";
import AnnouncementBar from "./AnnouncementBar";

const fallbackCategoryRecords = categories
  .filter((category) => category !== "All")
  .map((name, index) => {
    const slug = categoryToSlug(name);
    return {
      id: slug,
      name,
      slug,
      description: categoryDetails[slug]?.description || "",
      image: categoryDetails[slug]?.image || "/bustaniya-campaign-hero-v4.png",
      parentSlug: "",
      sortOrder: (index + 1) * 10,
    };
  });

function normalizeProducts(items) {
  return items.map((product) => ({
    ...product,
    stock: Number(product.stock ?? 10),
    lowStockThreshold: Number(product.lowStockThreshold ?? 5),
  }));
}

function CampaignHeroImage({ desktopSrc, mobileSrc, alt }) {
  const shared = { alt, fill: true, priority: true, quality: 90, sizes: "100vw" };
  const { props: desktop } = getImageProps({ ...shared, src: desktopSrc });
  const { props: mobile } = getImageProps({ ...shared, src: mobileSrc });

  return <picture>
    <source media="(max-width: 767px)" srcSet={mobile.srcSet} />
    <source media="(min-width: 768px)" srcSet={desktop.srcSet} />
    <img {...desktop} src={desktop.src} alt={alt} fetchPriority="high" />
  </picture>;
}

export default function Home({
  initialProducts: serverProducts = initialProducts,
  initialCategories = fallbackCategoryRecords,
  storeSettings = DEFAULT_STORE_SETTINGS,
}) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cartReady, setCartReady] = useState(false);
  const [products, setProducts] = useState(() => normalizeProducts(serverProducts));
  const [categoryRecords, setCategoryRecords] = useState(() => initialCategories.filter((category) => !category.parentSlug));
  const [heroSlide, setHeroSlide] = useState(0);
  const heroDesktopImages = storeSettings.heroDesktopImages?.length ? storeSettings.heroDesktopImages : [storeSettings.heroDesktopImage || DEFAULT_STORE_SETTINGS.heroDesktopImage];
  const heroMobileImages = storeSettings.heroMobileImages?.length ? storeSettings.heroMobileImages : [storeSettings.heroMobileImage || DEFAULT_STORE_SETTINGS.heroMobileImage];
  const heroSlideCount = Math.max(heroDesktopImages.length, heroMobileImages.length);

  useEffect(() => {
    const savedCart = localStorage.getItem("bustaniya-cart");
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch {}
    }
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (cartReady) localStorage.setItem("bustaniya-cart", JSON.stringify(cart));
  }, [cart, cartReady]);

  useEffect(() => {
    if (heroSlideCount < 2) return undefined;
    const timer = window.setInterval(() => setHeroSlide((current) => (current + 1) % heroSlideCount), 5000);
    return () => window.clearInterval(timer);
  }, [heroSlideCount]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const categoryMatch = activeCategory === "All" || normalizeCategory(product.category) === activeCategory;
    return categoryMatch && product.name.toLowerCase().includes(search.toLowerCase());
  }), [activeCategory, products, search]);

  const categoryNames = useMemo(() => ["All", ...categoryRecords.map((category) => category.name)], [categoryRecords]);

  const categoryCards = useMemo(() => categoryRecords.map((category) => ({
    ...category,
    image: products.find((product) => normalizeCategory(product.category) === category.name)?.image || category.image,
  })), [categoryRecords, products]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  function addToCart(product) {
    if (Number(product.stock || 0) <= 0) return;
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function updateQuantity(id, change) {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item)
      .filter((item) => item.quantity > 0));
  }

  return (
    <>
      <AnnouncementBar storeSettings={storeSettings} />

      <header className="header">
        <a className="brand" href="/" aria-label="Bustaniya home"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
        <nav className={mobileOpen ? "nav navOpen" : "nav"} id="site-menu" aria-hidden={!mobileOpen}>
          <button className="mobileClose" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X /></button>
          <a className="navActive" href="/" onClick={() => setMobileOpen(false)}>Home</a>
          <a href="#products" onClick={() => setMobileOpen(false)}>New In</a>
          {categoryRecords.map((category) => <a href={`/category/${category.slug}`} key={category.slug} onClick={() => setMobileOpen(false)}>{category.name}</a>)}
          <a href="#story" onClick={() => setMobileOpen(false)}>Our Story</a>
        </nav>
        <div className="headerActions">
          <button aria-label="Search" onClick={() => setSearchOpen(!searchOpen)}><Search /></button>
          <button aria-label="Account"><UserRound /></button>
          <button aria-label="Cart" className="cartButton" onClick={() => setCartOpen(true)}>
            <ShoppingBag />{cartCount > 0 && <span>{cartCount}</span>}
          </button>
          <button className="menuButton" type="button" aria-label="Menu" aria-controls="site-menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu /></button>
        </div>
        {searchOpen && <div className="searchBar">
          <Search size={20} />
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dresses and collections..." />
          <button onClick={() => { setSearch(""); setSearchOpen(false); }}><X /></button>
        </div>}
      </header>

      <main>
        {storeSettings.heroEnabled && <section
          className={`campaignHero campaignHero--position-${storeSettings.heroTextPosition} campaignHero--align-${storeSettings.heroTextAlignment}`}
          id="new"
          style={{ "--campaign-overlay": Math.min(80, Math.max(0, Number(storeSettings.heroOverlayIntensity || 0))) / 100 }}
        >
          <div className="campaignHeroMedia">
            <CampaignHeroImage
              key={heroSlide}
              desktopSrc={heroDesktopImages[heroSlide % heroDesktopImages.length]}
              mobileSrc={heroMobileImages[heroSlide % heroMobileImages.length]}
              alt="Bustaniya eastern wear campaign"
            />
          </div>
          <div className="campaignHeroOverlay" />
          <div className="campaignHeroInner">
            <div className="campaignHeroCopy">
              {storeSettings.heroEyebrow && <p>{storeSettings.heroEyebrow}</p>}
              <h1>{storeSettings.heroHeading || DEFAULT_STORE_SETTINGS.heroHeading}</h1>
              {storeSettings.heroSupportingText && <span>{storeSettings.heroSupportingText}</span>}
              <div className="campaignHeroActions">
                {storeSettings.heroPrimaryButtonText && <a className="campaignHeroPrimary" href={storeSettings.heroPrimaryButtonLink || "#products"}>{storeSettings.heroPrimaryButtonText}<ArrowRight size={17} /></a>}
                {storeSettings.heroSecondaryButtonText && <a className="campaignHeroSecondary" href={storeSettings.heroSecondaryButtonLink || "#products"}>{storeSettings.heroSecondaryButtonText}</a>}
              </div>
            </div>
          </div>
        </section>}

        <section className="shopSection khaadiTopPicks" id="products">
          <div className="sectionHeading">
            <div><p className="eyebrow">NEW ARRIVALS</p><h2>Top Picks for You</h2><span>Fresh styles selected for everyday elegance.</span></div>
          </div>
          <div className="categoryTabs">
            {categoryNames.map((category) => <button key={category} className={category === activeCategory ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}
          </div>
          <div className="productGrid">
            {visibleProducts.map((product) => <article className="productCard" key={product.id}>
              <div className="productImage">
                <Image
                  src={product.image}
                  alt={`${product.name} - ${product.category} by Bustaniya`}
                  fill
                  sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                />
                <a className="productCardLink" href={`/product/${product.id}`} aria-label={`View ${product.name}`} />
                {product.badge && <span className="badge">{product.badge}</span>}
              </div>
              <div className="productInfo">
                <div><p>{product.category}</p><h3><a href={`/product/${product.id}`}>{product.name}</a></h3></div>
                <div className="productPrice"><span>PKR {product.price.toLocaleString()}</span></div>
              </div>
            </article>)}
          </div>
          {!visibleProducts.length && <p className="empty">No products found.</p>}
        </section>

        <section className="categoryShowcase">
          <p className="eyebrow">FIND YOUR FAVOURITE</p>
          <h2>Shop by category</h2>
          <div className="categoryCards">
            {categoryCards.map((category, index) => (
              <a className={`categoryCard card${index + 1}`} href={`/category/${category.slug}`} key={category.slug} style={category.image ? { backgroundImage: `url(${category.image})` } : undefined}>
                <span>{category.name}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="story" id="story">
          <div className="storyImage" />
          <div className="storyContent">
            <p className="eyebrow">THE BUSTANIYA STORY</p>
            <h2>Tradition, with<br />a modern soul.</h2>
            <p>Bustaniya celebrates eastern wear through graceful silhouettes, expressive colour and comfort that belongs in everyday life.</p>
            <a href="/about">Discover our story <ArrowRight size={17} /></a>
            <div className="storyStats"><div><b>PKR</b><span>prices shown clearly</span></div><div><b>COD</b><span>available at checkout</span></div></div>
          </div>
        </section>

        <section className="newsletter">
          <p className="eyebrow">STAY IN THE LOOP</p>
          <h2>A little beauty, delivered.</h2>
          <p>New collections, styling inspiration and 10% off your first order.</p>
          <form onSubmit={(e) => e.preventDefault()}><input type="email" placeholder="Your email address" /><button aria-label="Subscribe"><ArrowRight /></button></form>
        </section>
      </main>

      <footer id="footer">
        <div className="footerBrand">
          <a className="brand" href="/" aria-label="Bustaniya home"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
          <p>Pakistani clothing, rooted in grace.</p>
          <span>Thoughtfully designed silhouettes for everyday elegance and memorable occasions.</span>
        </div>
        <div><b>Shop</b>{categoryRecords.map((category) => <a href={`/category/${category.slug}`} key={category.slug}>{category.name}</a>)}</div>
        <div><b>Help</b><a href="/shipping-policy">Delivery</a><a href="/exchange-return-policy">Exchange</a><a href="/contact">Contact Us</a></div>
        <div><b>Follow</b><a href="https://www.instagram.com/bustaniya_/" target="_blank" rel="noreferrer">Instagram</a></div>
        <div className="copyright">
          <p>Copyright 2026 Bustaniya. Made with care in Pakistan.</p>
          <div><a href="/privacy-policy">Privacy</a><a href="/terms-and-conditions">Terms</a><a href="/shipping-policy">Shipping</a></div>
        </div>
      </footer>

      {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)} />}
      <aside className={cartOpen ? "cartDrawer cartOpen" : "cartDrawer"}>
        <div className="cartHeader"><h2>Your bag <span>({cartCount})</span></h2><button onClick={() => setCartOpen(false)}><X /></button></div>
        <div className="cartItems">
          {!cart.length ? <div className="emptyCart"><ShoppingBag size={36} /><h3>Your bag is empty</h3><p>Looks like you haven&apos;t added anything yet.</p><button onClick={() => setCartOpen(false)}>Continue shopping</button></div>
          : cart.map((item) => <div className="cartItem" key={item.id}>
              <div style={{ backgroundImage: `url(${item.image})` }} />
              <section><h3>{item.name}</h3><p>Rs. {item.price.toLocaleString()}</p><span className="quantity"><button onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>{item.quantity}<button onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button></span></section>
            </div>)}
        </div>
        {!!cart.length && <div className="cartFooter">
          <div><span>Subtotal</span><b>Rs. {subtotal.toLocaleString()}</b></div>
          <p>Delivery charges calculated at checkout.</p>
          <a className="checkoutButton" href="/checkout">Checkout <ArrowRight size={18} /></a>
          <button className="shopMoreButton" onClick={() => setCartOpen(false)}>Shop more</button>
        </div>}
      </aside>
    </>
  );
}
