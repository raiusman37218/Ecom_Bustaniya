"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Truck, X } from "lucide-react";
import { productDescription } from "../lib/seo";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";
import AnnouncementBar from "./AnnouncementBar";

export default function ProductDetails({ product, related, storeSettings = DEFAULT_STORE_SETTINGS }) {
  const [size, setSize] = useState("S");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem("bustaniya-cart")) || []); } catch {}
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (cartReady) localStorage.setItem("bustaniya-cart", JSON.stringify(cart));
  }, [cart, cartReady]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const availableStock = Number(product.stock || 0);
  const outOfStock = availableStock <= 0;
  const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["XS", "S", "M", "L", "XL"];
  const detailDescription = productDescription(product);

  function addToBag({ openDrawer = true } = {}) {
    if (outOfStock) return;
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id && item.size === size);
      if (existing) {
        return current.map((item) => item.id === product.id && item.size === size ? { ...item, quantity: Math.min(availableStock, item.quantity + quantity) } : item);
      }
      return [...current, { ...product, size, quantity: Math.min(quantity, availableStock) }];
    });
    setAdded(true);
    if (openDrawer) setCartOpen(true);
    setTimeout(() => setAdded(false), 2200);
  }

  function updateQuantity(id, itemSize, change) {
    setCart((current) => current
      .map((item) => item.id === id && item.size === itemSize ? { ...item, quantity: Math.max(0, item.quantity + change) } : item)
      .filter((item) => item.quantity > 0));
  }

  return (
    <>
    <main className="productPage">
      <AnnouncementBar storeSettings={storeSettings} />
      <header className="categoryHeader productHeader">
        <a className="brand" href="/"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
        <nav><a href="/category/kurtis">Kurtis</a><a href="/category/bottoms">Bottoms</a><a href="/category/coord-sets">Co-ord Sets</a></nav>
        <button className="headerBag" onClick={() => setCartOpen(true)}><ShoppingBag /><span>Bag {cartCount ? `(${cartCount})` : ""}</span></button>
      </header>

      <div className="productDetailLayout">
        <section className="productGallery">
          <a className="productBack" href={product.category === "Kurtis" ? "/category/kurtis" : product.category === "Bottoms" ? "/category/bottoms" : "/category/coord-sets"}>
            <ArrowLeft size={16} /> Back to collection
          </a>
          <div className="mainProductPhoto">
            <Image
              src={product.image}
              alt={`${product.name} by Bustaniya`}
              fill
              priority
              sizes="(max-width: 1100px) 100vw, 54vw"
            />
          </div>
          <div className="secondaryProductPhoto">
            <Image
              src={product.image}
              alt={`${product.name} product detail`}
              fill
              sizes="(max-width: 1100px) 100vw, 54vw"
            />
          </div>
        </section>

        <section className="productPurchase">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="detailPrice">Rs. {product.price.toLocaleString()}</p>
          <p className="taxNote">Tax included. Delivery calculated at checkout.</p>
          <p className="productDescription">{detailDescription}</p>

          <div className="selectorHeading"><b>Select size</b><a href="#size-guide">Size guide</a></div>
          <div className="sizeOptions">
            {sizes.map((item) => <button key={item} className={size === item ? "selected" : ""} onClick={() => setSize(item)}>{item}</button>)}
          </div>

          <div className="quantityHeading"><b>Quantity</b></div>
          <div className="quantity productQuantity">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={14} /></button>
            {quantity}
            <button disabled={outOfStock || quantity >= availableStock} onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}><Plus size={14} /></button>
          </div>

          <div className="productActions">
            <button className="addBagButton" disabled={outOfStock} onClick={addToBag}>{outOfStock ? "Out of stock" : added ? <><Check /> Added to bag</> : <><ShoppingBag /> Add to bag</>}</button>
            <button className="wishButton" aria-label="Add to wishlist"><Heart /></button>
          </div>
          {outOfStock ? <span className="buyNowButton disabledBuy">Unavailable</span> : <a className="buyNowButton" href="/checkout" onClick={() => addToBag({ openDrawer: false })}>Buy it now</a>}

          <div className="productPromises">
            <div><Truck /><span><b>Delivery</b>Calculated at checkout</span></div>
            <div><ShieldCheck /><span><b>Exchange support</b>See policy details</span></div>
          </div>
          <details open><summary>Product details</summary><p>{detailDescription} Colours may vary slightly due to screen settings.</p></details>
          <details id="size-guide"><summary>Size guide</summary><p>Confirm exact measurements with Bustaniya before ordering if you are between sizes.</p></details>
          <details><summary>Care instructions</summary><p>Care details will be updated when confirmed for this product.</p></details>
        </section>
      </div>
      {!!related.length && <section className="relatedProducts">
        <p className="eyebrow">YOU MAY ALSO LIKE</p>
        <h2>Complete the look</h2>
        <div className="productGrid">
          {related.map((item) => <article className="productCard" key={item.id}>
            <a className="productImage" href={`/product/${item.id}`}>
              <Image
                src={item.image}
                alt={`${item.name} - ${item.category} by Bustaniya`}
                fill
                sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
              />
              {item.badge && <span className="badge">{item.badge}</span>}
              <span className="quickAdd">Choose options</span>
            </a>
            <div className="productInfo"><div><p>{item.category}</p><h3><a href={`/product/${item.id}`}>{item.name}</a></h3></div><div className="productPrice"><span>Rs. {item.price.toLocaleString()}</span><small>Regular price Rs. {item.price.toLocaleString()}</small></div></div>
          </article>)}
        </div>
      </section>}
    </main>
    {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)} />}
    <aside className={cartOpen ? "cartDrawer cartOpen" : "cartDrawer"}>
      <div className="cartHeader"><h2>Your bag <span>({cartCount})</span></h2><button onClick={() => setCartOpen(false)}><X /></button></div>
      <div className="cartItems">
        {!cart.length ? (
          <div className="emptyCart"><ShoppingBag size={36} /><h3>Your bag is empty</h3><p>Looks like you haven&apos;t added anything yet.</p><button onClick={() => setCartOpen(false)}>Continue shopping</button></div>
        ) : cart.map((item) => (
          <div className="cartItem" key={`${item.id}-${item.size || "default"}`}>
            <div style={{ backgroundImage: `url(${item.image})` }} />
            <section>
              <h3>{item.name}</h3>
              {item.size && <small>Size: {item.size}</small>}
              <p>Rs. {item.price.toLocaleString()}</p>
              <span className="quantity">
                <button onClick={() => updateQuantity(item.id, item.size, -1)}><Minus size={14} /></button>
                {item.quantity}
                <button onClick={() => updateQuantity(item.id, item.size, 1)}><Plus size={14} /></button>
              </span>
            </section>
          </div>
        ))}
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
