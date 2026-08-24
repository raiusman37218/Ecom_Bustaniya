"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, ChevronDown, CreditCard, Loader2, Lock, MessageCircle, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import UkHeader from "../../../components/uk/UkHeader";
import UkFooter from "../../../components/uk/UkFooter";
import { DEFAULT_STORE_SETTINGS } from "../../../data/storeSettings";
import { formatPrice, REGIONS } from "../../../lib/regions";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../../../lib/images";

function isValidUkMobile(value = "") {
  const clean = value.replace(/[\s-]/g, "");
  return /^(?:(?:\+44\s?|0044\s?|0)7\d{9})$/.test(clean) || clean.length >= 10;
}

function isValidUkPostcode(value = "") {
  const clean = value.trim().toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(clean) || clean.length >= 5;
}

export default function UkCheckoutPage() {
  const [cart, setCart] = useState([]);
  const [cartReady, setCartReady] = useState(false);
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    county: "",
    postcode: "",
    orderNotes: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("card");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(REGIONS.uk.cartStorageKey);
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedFields = localStorage.getItem("bustaniya_uk_checkout_fields");
      if (savedFields) {
        const parsed = JSON.parse(savedFields);
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
    setCartReady(true);

    fetch("/api/store-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === "object") setStoreSettings(data);
      })
      .catch(() => {});
  }, []);

  const subtotal = useMemo(() => cart.reduce((total, item) => total + (item.price || 0) * (item.quantity || 1), 0), [cart]);
  const isFreeDelivery = subtotal >= REGIONS.uk.delivery.freeThreshold;
  const deliveryCharge = isFreeDelivery ? 0 : REGIONS.uk.delivery.standardFee;
  const totalOrderValue = subtotal + deliveryCharge;

  const totalSavings = useMemo(() => {
    return cart.reduce((sum, item) => {
      const original = Number(item.compareAtPrice || item.comparePrice || item.compare_at_price || 0);
      const price = Number(item.price || 0);
      const diff = original > price ? (original - price) * Number(item.quantity || 1) : 0;
      return sum + diff;
    }, 0);
  }, [cart]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  function validateForm() {
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = "Full name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email.trim())) errors.email = "Valid email is required";
    if (!form.phone.trim()) errors.phone = "Phone number is required";
    if (!form.addressLine1.trim()) errors.addressLine1 = "Street address is required";
    if (!form.city.trim()) errors.city = "Town or City is required";
    if (!form.postcode.trim()) errors.postcode = "UK Postcode is required";
    return errors;
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (submitting || !cart.length) return;

    const validationErrors = validateForm();
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstField = Object.keys(validationErrors)[0];
      const elem = document.querySelector(`[name="${firstField}"]`);
      if (elem) elem.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Save fields locally for returning user
      localStorage.setItem("bustaniya_uk_checkout_fields", JSON.stringify(form));

      const orderRef = `UK-${Date.now().toString().slice(-6)}`;
      const completedOrder = {
        orderRef,
        customer: form,
        items: [...cart],
        subtotal,
        delivery: deliveryCharge,
        total: totalOrderValue,
        currency: "GBP",
        paymentMethod,
        date: new Date().toISOString(),
      };

      // Clear UK Cart
      localStorage.removeItem(REGIONS.uk.cartStorageKey);
      window.dispatchEvent(new Event("cartUpdated-uk"));

      setOrder(completedOrder);
    } catch (err) {
      setError(err.message || "Failed to submit order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <main className="checkoutPageLayout">
        <UkHeader storeSettings={storeSettings} />
        <div className="checkoutConfirmationContainer" style={{ maxWidth: "680px", margin: "40px auto", padding: "32px 24px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <CheckCircle2 size={54} color="#16452c" style={{ margin: "0 auto 16px" }} />
            <h1 style={{ fontSize: "28px", color: "#16452c", marginBottom: "8px" }}>Thank You for Your Order!</h1>
            <p style={{ color: "#555", fontSize: "16px" }}>Order Reference: <b>#{order.orderRef}</b></p>
            <p style={{ color: "#777", fontSize: "14px", marginTop: "4px" }}>A confirmation receipt has been sent to <b>{order.customer.email}</b>.</p>
          </div>

          <div style={{ background: "#fbf9f4", padding: "20px", borderRadius: "8px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#16452c" }}>Delivery Details (UK)</h3>
            <p style={{ margin: "4px 0", color: "#333" }}><b>{order.customer.fullName}</b></p>
            <p style={{ margin: "4px 0", color: "#666" }}>{order.customer.addressLine1} {order.customer.addressLine2}</p>
            <p style={{ margin: "4px 0", color: "#666" }}>{order.customer.city}, {order.customer.county} {order.customer.postcode}</p>
            <p style={{ margin: "4px 0", color: "#666" }}>United Kingdom · Tel: {order.customer.phone}</p>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#16452c" }}>Order Items</h3>
            {order.items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee" }}>
                <span>{item.name} ({item.size || "S"}{item.color ? ` / ${item.color}` : ""}) × {item.quantity}</span>
                <b>{formatPrice(item.price * item.quantity, "uk")}</b>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "14px", fontSize: "15px" }}>
              <span>Shipping (Royal Mail / DPD Tracked)</span>
              <b>{order.delivery === 0 ? "FREE" : formatPrice(order.delivery, "uk")}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", fontSize: "18px", color: "#16452c" }}>
              <b>Total Amount</b>
              <b>{formatPrice(order.total, "uk")}</b>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "32px" }}>
            <a href="/uk" className="primaryButton" style={{ display: "inline-block", padding: "14px 28px" }}>
              Continue Shopping on Bustaniya UK
            </a>
          </div>
        </div>
        <UkFooter storeSettings={storeSettings} />
      </main>
    );
  }

  return (
    <main className="checkoutPageLayout">
      <UkHeader storeSettings={storeSettings} />

      <div className="checkoutContainer" style={{ maxWidth: "1100px", margin: "30px auto", padding: "0 20px" }}>
        <div style={{ marginBottom: "24px" }}>
          <a href="/uk/cart" className="cartBackLink">
            <ArrowLeft size={16} /> Return to bag
          </a>
          <h1 style={{ fontSize: "28px", color: "#16452c", marginTop: "12px" }}>UK Checkout</h1>
        </div>

        {!cart.length && cartReady ? (
          <div className="cartPageEmpty" style={{ textAlign: "center", padding: "60px 20px" }}>
            <ShoppingBag size={56} className="emptyCartIcon" />
            <h2>Your bag is empty</h2>
            <p>Add items before proceeding to checkout.</p>
            <a href="/uk" className="primaryButton cartEmptyCta" style={{ marginTop: "16px", display: "inline-block" }}>
              Shop UK Collection
            </a>
          </div>
        ) : (
          <div className="checkoutGrid" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "36px", alignItems: "start" }}>
            {/* Form Section */}
            <form onSubmit={handlePlaceOrder} className="checkoutFormCard" style={{ background: "#fff", padding: "28px", borderRadius: "12px", border: "1px solid #e8e3d9" }}>
              {error && (
                <div style={{ background: "#fde8e8", color: "#9b1c1c", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px" }}>
                  {error}
                </div>
              )}

              {/* 1. Contact Information */}
              <section style={{ marginBottom: "28px" }}>
                <h2 style={{ fontSize: "18px", color: "#16452c", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#16452c", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>1</span>
                  Contact Information
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Sarah Khan"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "6px", border: fieldErrors.fullName ? "1px solid #e02424" : "1px solid #ccc", fontSize: "14px" }}
                    />
                    {fieldErrors.fullName && <small style={{ color: "#e02424" }}>{fieldErrors.fullName}</small>}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Email (for tracking & receipt) *</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="e.g. sarah@example.co.uk"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "6px", border: fieldErrors.email ? "1px solid #e02424" : "1px solid #ccc", fontSize: "14px" }}
                    />
                    {fieldErrors.email && <small style={{ color: "#e02424" }}>{fieldErrors.email}</small>}
                  </div>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>UK Mobile Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="e.g. 07123 456789 or +44 7123 456789"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "6px", border: fieldErrors.phone ? "1px solid #e02424" : "1px solid #ccc", fontSize: "14px" }}
                  />
                  {fieldErrors.phone && <small style={{ color: "#e02424" }}>{fieldErrors.phone}</small>}
                </div>
              </section>

              {/* 2. UK Shipping Address */}
              <section style={{ marginBottom: "28px" }}>
                <h2 style={{ fontSize: "18px", color: "#16452c", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#16452c", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>2</span>
                  UK Delivery Address
                </h2>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Address Line 1 (House/Flat & Street) *</label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={form.addressLine1}
                    onChange={handleChange}
                    placeholder="e.g. 42 Richmond Road, Flat 3B"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "6px", border: fieldErrors.addressLine1 ? "1px solid #e02424" : "1px solid #ccc", fontSize: "14px" }}
                  />
                  {fieldErrors.addressLine1 && <small style={{ color: "#e02424" }}>{fieldErrors.addressLine1}</small>}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={form.addressLine2}
                    onChange={handleChange}
                    placeholder="Apartment, suite, unit, etc."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Town / City *</label>
                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="e.g. London"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "6px", border: fieldErrors.city ? "1px solid #e02424" : "1px solid #ccc", fontSize: "14px" }}
                    />
                    {fieldErrors.city && <small style={{ color: "#e02424" }}>{fieldErrors.city}</small>}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>County (Optional)</label>
                    <input
                      type="text"
                      name="county"
                      value={form.county}
                      onChange={handleChange}
                      placeholder="e.g. Greater London"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>UK Postcode *</label>
                    <input
                      type="text"
                      name="postcode"
                      value={form.postcode}
                      onChange={handleChange}
                      placeholder="e.g. E1 5NF"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "6px", border: fieldErrors.postcode ? "1px solid #e02424" : "1px solid #ccc", fontSize: "14px", textTransform: "uppercase" }}
                    />
                    {fieldErrors.postcode && <small style={{ color: "#e02424" }}>{fieldErrors.postcode}</small>}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Delivery Notes (Optional)</label>
                  <textarea
                    name="orderNotes"
                    value={form.orderNotes}
                    onChange={handleChange}
                    placeholder="Safe place to leave parcel, buzzer code, etc."
                    rows={2}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }}
                  />
                </div>
              </section>

              {/* 3. Delivery Method */}
              <section style={{ marginBottom: "28px" }}>
                <h2 style={{ fontSize: "18px", color: "#16452c", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#16452c", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>3</span>
                  Delivery Method
                </h2>
                <div style={{ border: "2px solid #16452c", padding: "16px", borderRadius: "8px", background: "#f7f9f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Truck size={22} color="#16452c" />
                    <div>
                      <b style={{ display: "block", fontSize: "14px", color: "#16452c" }}>Royal Mail / DPD Tracked Standard</b>
                      <small style={{ color: "#666" }}>Estimated 2–4 business days delivery across the UK</small>
                    </div>
                  </div>
                  <b style={{ color: "#16452c" }}>{isFreeDelivery ? "FREE" : "£4.99"}</b>
                </div>
              </section>

              {/* 4. Payment Options */}
              <section style={{ marginBottom: "28px" }}>
                <h2 style={{ fontSize: "18px", color: "#16452c", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#16452c", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>4</span>
                  Payment Method
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", border: paymentMethod === "card" ? "2px solid #16452c" : "1px solid #ccc", borderRadius: "8px", cursor: "pointer", background: paymentMethod === "card" ? "#fbf9f4" : "#fff" }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                    />
                    <CreditCard size={20} color="#16452c" />
                    <div>
                      <b style={{ display: "block", fontSize: "14px" }}>Debit / Credit Card &amp; Apple Pay</b>
                      <small style={{ color: "#666" }}>Secure encrypted online checkout (Visa, Mastercard, Amex)</small>
                    </div>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", border: paymentMethod === "bank" ? "2px solid #16452c" : "1px solid #ccc", borderRadius: "8px", cursor: "pointer", background: paymentMethod === "bank" ? "#fbf9f4" : "#fff" }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank"
                      checked={paymentMethod === "bank"}
                      onChange={() => setPaymentMethod("bank")}
                    />
                    <Lock size={20} color="#16452c" />
                    <div>
                      <b style={{ display: "block", fontSize: "14px" }}>UK Bank Transfer / Faster Payments</b>
                      <small style={{ color: "#666" }}>Transfer directly to BUSTANIYA LTD UK bank account</small>
                    </div>
                  </label>
                </div>
              </section>

              <button
                type="submit"
                disabled={submitting}
                className="primaryButton"
                style={{ width: "100%", padding: "16px", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="spin" /> Processing Order...
                  </>
                ) : (
                  <>
                    <Lock size={16} /> Place Order · {formatPrice(totalOrderValue, "uk")}
                  </>
                )}
              </button>
            </form>

            {/* Order Summary Sidebar */}
            <aside className="checkoutSummarySidebar" style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #e8e3d9", position: "sticky", top: "20px" }}>
              <h2 style={{ fontSize: "18px", color: "#16452c", marginBottom: "16px" }}>Order Summary ({cart.length})</h2>

              <div style={{ maxHeight: "320px", overflowY: "auto", marginBottom: "20px", paddingRight: "4px" }}>
                {cart.map((item, index) => (
                  <div key={index} style={{ display: "flex", gap: "14px", paddingBottom: "14px", marginBottom: "14px", borderBottom: "1px solid #f0ece3" }}>
                    <img
                      src={optimizedImageUrl(item.image, CLOUDINARY_IMAGE_PRESETS.thumbnail)}
                      alt={item.name}
                      style={{ width: "54px", height: "68px", objectFit: "cover", borderRadius: "4px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 4px", color: "#16452c" }}>{item.name}</p>
                      <small style={{ color: "#666", display: "block" }}>Size: {item.size || "S"}{item.color ? ` · Color: ${item.color}` : ""}</small>
                      <small style={{ color: "#666" }}>Qty: {item.quantity || 1}</small>
                    </div>
                    <b style={{ fontSize: "14px" }}>{formatPrice((item.price || 0) * (item.quantity || 1), "uk")}</b>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid #e8e3d9", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span>Subtotal</span>
                  <b>{formatPrice(subtotal, "uk")}</b>
                </div>

                {totalSavings > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#16452c" }}>
                    <span>Savings</span>
                    <b>- {formatPrice(totalSavings, "uk")}</b>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span>UK Tracked Shipping</span>
                  <b>{isFreeDelivery ? "FREE" : "£4.99"}</b>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", color: "#16452c", borderTop: "1px solid #e8e3d9", paddingTop: "12px", marginTop: "4px" }}>
                  <b>Total (GBP)</b>
                  <b>{formatPrice(totalOrderValue, "uk")}</b>
                </div>
              </div>

              <div style={{ marginTop: "24px", padding: "14px", background: "#fbf9f4", borderRadius: "8px", fontSize: "12px", color: "#555", lineHeight: "1.5" }}>
                <p style={{ margin: "0 0 6px" }}><b>Registered Office:</b></p>
                <p style={{ margin: "0" }}>BUSTANIYA LTD (Co. 17414024)</p>
                <p style={{ margin: "0" }}>Unit A1099 Siu Office, 4–6 Greatorex Street, London, E1 5NF</p>
              </div>
            </aside>
          </div>
        )}
      </div>

      <UkFooter storeSettings={storeSettings} />
    </main>
  );
}
