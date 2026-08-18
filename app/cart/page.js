"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Banknote, Check, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, Trash2, Truck } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import { DEFAULT_STORE_SETTINGS } from "../../data/storeSettings";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../../lib/images";

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [cartReady, setCartReady] = useState(false);
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bustaniya-cart") || localStorage.getItem("bustaniya_cart");
      if (saved) setCart(JSON.parse(saved));
    } catch {}
    setCartReady(true);

    fetch("/api/store-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === "object") setStoreSettings(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cartReady) {
      localStorage.setItem("bustaniya-cart", JSON.stringify(cart));
    }
  }, [cart, cartReady]);

  const cartCount = useMemo(() => cart.reduce((total, item) => total + (item.quantity || 1), 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((total, item) => total + (item.price || 0) * (item.quantity || 1), 0), [cart]);

  const totalSavings = useMemo(() => {
    return cart.reduce((sum, item) => {
      const original = Number(item.compareAtPrice || item.comparePrice || item.compare_at_price || item.originalPrice || 0);
      const price = Number(item.price || 0);
      const diff = original > price ? (original - price) * Number(item.quantity || 1) : 0;
      return sum + diff;
    }, 0);
  }, [cart]);

  const deliverySettings = storeSettings?.deliverySettings || DEFAULT_STORE_SETTINGS.deliverySettings || {};
  const freeThreshold = Number(deliverySettings.freeDeliveryThreshold || 5000);
  const isFreeDelivery = subtotal >= freeThreshold;
  const freeDeliveryRemaining = Math.max(0, freeThreshold - subtotal);
  const freeDeliveryProgress = Math.min(100, Math.round((subtotal / freeThreshold) * 100));

  function updateQuantity(id, itemSize, itemColor, change) {
    setCart((current) => current
      .map((item) => {
        if (item.id === id && item.size === itemSize && (item.color || "") === (itemColor || "")) {
          return { ...item, quantity: Math.max(0, (item.quantity || 1) + change) };
        }
        return item;
      })
      .filter((item) => item.quantity > 0));
  }

  function removeItem(id, itemSize, itemColor) {
    setCart((current) => current.filter((item) => !(item.id === id && item.size === itemSize && (item.color || "") === (itemColor || ""))));
  }

  return (
    <main className="cartPageLayout">
      <SiteHeader storeSettings={storeSettings} cartCount={cartCount} />

      <div className="cartPageContainer">
        <div className="cartPageHeader">
          <div>
            <a href="/" className="cartBackLink">
              <ArrowLeft size={16} /> Continue shopping
            </a>
            <h1>Shopping Bag</h1>
            <p className="cartSubheading">
              {cartCount === 1 ? "1 item in your bag" : `${cartCount} items in your bag`}
            </p>
          </div>
        </div>

        {!cart.length && cartReady ? (
          <div className="cartPageEmpty">
            <ShoppingBag size={56} className="emptyCartIcon" />
            <h2>Your shopping bag is empty</h2>
            <p>Explore our latest eastern wear collections, kurtis, and co-ords.</p>
            <a href="/" className="primaryButton cartEmptyCta">
              Explore collections <ArrowRight size={16} />
            </a>
          </div>
        ) : (
          <div className="cartPageGrid">
            {/* Items Column */}
            <div className="cartItemsColumn">
              {/* Free Delivery Bar */}
              <div className="cartThresholdBar">
                <div className="cartThresholdText">
                  <Truck size={18} />
                  <span>
                    {isFreeDelivery ? (
                      <b>🎉 You unlocked Free Nationwide Delivery!</b>
                    ) : (
                      <>
                        Add <b>Rs. {freeDeliveryRemaining.toLocaleString()}</b> more to get <b>Free Delivery</b>!
                      </>
                    )}
                  </span>
                </div>
                <div className="cartThresholdTrack">
                  <div className="cartThresholdProgress" style={{ width: `${freeDeliveryProgress}%` }} />
                </div>
              </div>

              {/* Items List */}
              <div className="cartPageList">
                {cart.map((item) => {
                  const originalPrice = Number(item.compareAtPrice || item.comparePrice || item.compare_at_price || item.originalPrice || 0);
                  const price = Number(item.price || 0);
                  const hasDiscount = originalPrice > price;
                  const unitSaving = hasDiscount ? originalPrice - price : 0;
                  const itemTotalSaving = unitSaving * (item.quantity || 1);

                  return (
                    <div className="cartPageItemCard" key={`${item.id}-${item.size || "default"}-${item.color || "default"}`}>
                      <a href={`/product/${item.id}`} className="cartPageItemThumb">
                        <img
                          src={optimizedImageUrl(item.image, CLOUDINARY_IMAGE_PRESETS.thumbnail)}
                          alt={item.name}
                        />
                      </a>

                      <div className="cartPageItemDetails">
                        <div className="cartPageItemTop">
                          <div>
                            <span className="cartPageCategory">{item.category || "Boutique Collection"}</span>
                            <h3 className="cartPageItemTitle">
                              <a href={`/product/${item.id}`}>{item.name}</a>
                            </h3>
                          </div>
                          <button
                            type="button"
                            className="cartPageItemRemoveBtn"
                            onClick={() => removeItem(item.id, item.size, item.color)}
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="cartItemMeta">
                          {item.size && <small>Size: {item.size}</small>}
                          {item.color && <small className="cartItemColor">Color: {item.color}</small>}
                        </div>

                        <div className="cartPageItemBottom">
                          <div className="cartPageItemPrices">
                            <div className="cartItemPriceLine">
                              <span className="cartPageCurrentPrice">
                                Rs. {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                              </span>
                              {hasDiscount && (
                                <span className="cartPageOriginalPrice">
                                  Rs. {(originalPrice * (item.quantity || 1)).toLocaleString()}
                                </span>
                              )}
                            </div>
                            {hasDiscount && itemTotalSaving > 0 && (
                              <span className="cartItemSavingsBadge">
                                You saved Rs. {itemTotalSaving.toLocaleString()}
                              </span>
                            )}
                          </div>

                          <div className="cartPageQuantityStepper">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.size, item.color, -1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span>{item.quantity || 1}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.size, item.color, 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary Column */}
            <div className="cartSummaryColumn">
              <div className="cartSummaryCard">
                <h2>Order Summary</h2>

                {totalSavings > 0 && (
                  <div className="cartTotalSavingsCallout">
                    <Sparkles size={16} />
                    <span>
                      You saved <b>Rs. {totalSavings.toLocaleString()}</b> on this order!
                    </span>
                  </div>
                )}

                <div className="cartSummaryBreakdown">
                  <div className="summaryRow">
                    <span>Subtotal</span>
                    <b>Rs. {subtotal.toLocaleString()}</b>
                  </div>

                  {totalSavings > 0 && (
                    <div className="summaryRow summarySavingsRow">
                      <span>Total Savings</span>
                      <b className="cartSavingsHighlight">- Rs. {totalSavings.toLocaleString()}</b>
                    </div>
                  )}

                  <div className="summaryRow">
                    <span>Estimated Shipping</span>
                    <b>{isFreeDelivery ? "FREE" : "Rs. 200"}</b>
                  </div>

                  <div className="summaryTotalRow">
                    <div>
                      <b>Estimated Total</b>
                      <small>Taxes and shipping confirmed at checkout</small>
                    </div>
                    <b>Rs. {(subtotal + (isFreeDelivery ? 0 : 200)).toLocaleString()}</b>
                  </div>
                </div>

                <a href="/checkout" className="primaryButton cartCheckoutBtn">
                  Proceed to Checkout <ArrowRight size={18} />
                </a>

                {/* Trust Badges */}
                <div className="cartTrustList">
                  <div className="cartTrustItem">
                    <Truck size={16} />
                    <span>Fast tracked delivery across Pakistan</span>
                  </div>
                  <div className="cartTrustItem">
                    <Banknote size={16} />
                    <span>Cash on Delivery available</span>
                  </div>
                  <div className="cartTrustItem">
                    <ShieldCheck size={16} />
                    <span>7-day easy exchange guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
