"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Lock, ShoppingBag, Truck } from "lucide-react";
import { buildShippingAddress } from "../../lib/shippingAddress";
import { DEFAULT_STORE_SETTINGS } from "../../data/storeSettings";

export default function CheckoutPage() {
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    houseNo: "",
    street: "",
    block: "",
    landmark: "",
    city: "",
    postalCode: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState(false);
  const [quotedDelivery, setQuotedDelivery] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_STORE_SETTINGS.paymentSettings);

  useEffect(() => {
    const saved = localStorage.getItem("bustaniya-cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    fetch("/api/postex/cities")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setCities(result.cities || []);
      })
      .catch(() => setCitiesError(true))
      .finally(() => setCitiesLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/store-settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        const nextPaymentSettings = result.paymentSettings || DEFAULT_STORE_SETTINGS.paymentSettings;
        setPaymentSettings(nextPaymentSettings);
        if (nextPaymentSettings.codEnabled === false && nextPaymentSettings.manualTransferEnabled !== false) {
          setPaymentMethod("bank_deposit");
        }
      })
      .catch(() => {});
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  );
  // Product prices exclude shipping. Every non-empty order has one flat fee,
  // regardless of how many products are in the cart.
  const estimatedDelivery = cart.length ? 200 : 0;
  const delivery = quotedDelivery ?? estimatedDelivery;

  useEffect(() => {
    if (!cart.length) {
      setQuotedDelivery(0);
      return;
    }
    let active = true;
    fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map(({ id, articleNumber, article_number, sku, name, quantity }) => ({
          id,
          articleNumber,
          article_number,
          sku,
          name,
          quantity,
        })),
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (active && Number.isFinite(Number(result.delivery))) {
          setQuotedDelivery(Number(result.delivery));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [cart]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function placeOrder(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const completeAddress = buildShippingAddress(form);
    const customer = { ...form, address: completeAddress };

    try {
      const response = await fetch("/api/postex/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          paymentMethod,
          items: cart.map(({ id, articleNumber, article_number, sku, name, quantity, size, color }) => ({
            id,
            articleNumber,
            article_number,
            sku,
            name,
            quantity,
            size,
            color,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to place order.");

      setOrder({
        ...result,
        customer,
        items: [...cart],
        subtotal,
        delivery,
        paymentMethod,
      });
      setCart([]);
      localStorage.removeItem("bustaniya-cart");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    const confirmedItems = order.items || [];
    const confirmedSubtotal = Number(order.subtotal ?? Math.max(0, order.total - (order.delivery || 0)));
    const confirmedDelivery = Number(order.delivery ?? Math.max(0, order.total - confirmedSubtotal));

    return <OrderConfirmation order={order} items={confirmedItems} subtotal={confirmedSubtotal} delivery={confirmedDelivery} />;
  }

  return (
    <main className="checkoutPage">
      <header className="checkoutHeader">
        <a className="brand" href="/"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
        <span><Lock size={14} /> Secure checkout</span>
      </header>

      <div className="checkoutLayout">
        <section className="checkoutForm">
          <a className="backShopping" href="/"><ArrowLeft size={16} /> Continue shopping</a>
          <p className="eyebrow">DELIVERY DETAILS</p>
          <h1>Checkout</h1>
          <form onSubmit={placeOrder}>
            <label>Full name<input required name="fullName" value={form.fullName} onChange={updateField} placeholder="Your full name" /></label>
            <label>Phone number<input required name="phone" value={form.phone} onChange={updateField} type="tel" inputMode="tel" placeholder="Phone / WhatsApp number" /></label>
            <label>Email address (optional)<input name="email" value={form.email} onChange={updateField} type="email" placeholder="you@example.com" /></label>
            <fieldset className="checkoutAddressFields">
              <legend>Delivery address</legend>
              <p>Please enter each part separately so the courier can find your address easily.</p>
              <div className="formRow">
                <label>House / Flat No.<input required name="houseNo" value={form.houseNo} onChange={updateField} autoComplete="address-line1" placeholder="e.g. House 24, Flat 3B" /></label>
                <label>Street / Road<input required name="street" value={form.street} onChange={updateField} autoComplete="address-line2" placeholder="e.g. Street 8, Main Boulevard" /></label>
              </div>
              <div className="formRow">
                <label>Block / Area<input required name="block" value={form.block} onChange={updateField} placeholder="e.g. Block C, Gulberg III" /></label>
                <label>Nearby landmark (optional)<input name="landmark" value={form.landmark} onChange={updateField} placeholder="e.g. Near Central Mosque" /></label>
              </div>
            </fieldset>
            <div className="formRow">
              <label>City
                {citiesError ? (
                  <input required name="city" value={form.city} onChange={updateField} placeholder="Enter delivery city" />
                ) : (
                  <select required name="city" value={form.city} onChange={updateField} disabled={citiesLoading}>
                    <option value="">{citiesLoading ? "Loading delivery cities..." : "Select delivery city"}</option>
                    {cities.map((city) => <option value={city} key={city}>{city}</option>)}
                  </select>
                )}
              </label>
              <label>Postal code (optional)<input name="postalCode" value={form.postalCode} onChange={updateField} placeholder="Postal code" /></label>
            </div>

            <label className={paymentMethod === "cod" ? "paymentBox" : "paymentBox paymentChoice"}>
              <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === "cod"} disabled={paymentSettings.codEnabled === false} onChange={() => setPaymentMethod("cod")} />
              <div><b>Cash on Delivery</b><span>Pay when your order arrives</span></div>
            </label>
            {paymentSettings.onlineGatewayEnabled && (
              <label className="paymentBox paymentUnavailable">
                <input type="radio" name="paymentMethod" value="online_gateway" disabled />
                <div><b>Online prepaid payment</b><span>Hosted gateway will activate after merchant credentials are connected.</span></div>
              </label>
            )}
            {paymentSettings.manualTransferEnabled !== false && (
              <label className={paymentMethod === "bank_deposit" ? "paymentBox" : "paymentBox paymentChoice"}>
                <input type="radio" name="paymentMethod" value="bank_deposit" checked={paymentMethod === "bank_deposit"} onChange={() => setPaymentMethod("bank_deposit")} />
                <div><b>Manual bank / wallet transfer</b><span>Enter the exact order reference in your transfer notes. Courier collection amount will be Rs. 0 after verification.</span></div>
              </label>
            )}
            <div className="advancePaymentNote">
              <b>{paymentMethod === "bank_deposit" ? "Bank deposit selected" : "COD selected"}</b>
              <span>{paymentMethod === "bank_deposit" ? (paymentSettings.instructions || "Admin will verify your payment before dispatch. Delivery fee is Rs. 200 per order.") : "Flat delivery fee is Rs. 200 per order, regardless of item quantity."}</span>
            </div>
            {error && <p className="checkoutError" role="alert">{error}</p>}
            <button className="placeOrder" type="submit" disabled={!cart.length || submitting}>
              {submitting ? "Placing order..." : `Place order · Rs. ${(subtotal + delivery).toLocaleString()}`}
            </button>
          </form>
        </section>

        <aside className="orderSummary">
          <h2>Your order <span>({cart.reduce((n, item) => n + item.quantity, 0)})</span></h2>
          {!cart.length ? (
            <div className="checkoutEmpty"><ShoppingBag /><p>Your cart is empty.</p><a href="/">Shop collection</a></div>
          ) : cart.map((item) => (
            <div className="summaryItem" key={item.id}>
              <div className="summaryImage" style={{ backgroundImage: `url(${item.image})` }}><span>{item.quantity}</span></div>
              <div><b>{item.name}</b><small>{[item.category, item.size && `Size ${item.size}`, item.color].filter(Boolean).join(" · ")}</small></div>
              <p>Rs. {(item.price * item.quantity).toLocaleString()}</p>
            </div>
          ))}
          <div className="summaryTotals">
            <div><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
            <div><span>COD delivery</span><span>{delivery ? `Rs. ${delivery}` : "Free"}</span></div>
            <div className="totalLine"><b>Total</b><b>Rs. {(subtotal + delivery).toLocaleString()}</b></div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function OrderConfirmation({ order, items, subtotal, delivery }) {
  return (
    <main className="checkoutPage">
      <header className="checkoutHeader">
        <a className="brand" href="/"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
        <span><Lock size={14} /> Order confirmed</span>
      </header>
      <section className="orderSuccess shopifySuccess">
        <div className="confirmationPanel">
          <div className="confirmationHero">
            <span className="successMark"><CheckCircle2 /></span>
            <div>
              <p className="eyebrow">ORDER {order.orderRef}</p>
              <h1>Thank you, {order.customer?.fullName || "there"}!</h1>
              <p>{order.emailSent ? "Your confirmation email has been sent. Keep your tracking ID safe." : "Your order is confirmed. Keep your tracking ID safe."}</p>
            </div>
          </div>

          <div className="confirmationCard deliveryCard">
            <div><Truck /><span><b>Your order is confirmed</b>We&apos;ve accepted your order, and we&apos;re getting it ready.</span></div>
            <small>Tracking ID: <b>{order.trackingNumber}</b></small>
          </div>

          <div className="confirmationGrid">
            <div className="confirmationCard">
              <h2>Customer information</h2>
              <span><b>Contact</b>{order.customer?.email || order.customer?.phone}</span>
              <span><b>Ship to</b>{order.customer?.address}, {order.customer?.city}</span>
              <span><b>Payment</b>{order.paymentMethod === "bank_deposit" ? "Bank deposit / advance payment" : "Cash on Delivery"}</span>
            </div>
            <div className="confirmationCard">
              <h2>Order details</h2>
              <span><b>Order reference</b>{order.orderRef}</span>
              <span><b>Tracking number</b>{order.trackingNumber}</span>
              <span><b>Delivery method</b>{order.courierBooked ? (order.paymentMethod === "bank_deposit" ? "Courier - Rs. 0 collection" : "Courier COD") : "Manual courier booking"}</span>
              <span><b>Courier collection</b>Rs. {Number(order.postexCollectionAmount ?? order.total).toLocaleString()}</span>
            </div>
          </div>

          <div className="confirmationActions">
            <a className="primaryButton" href="/">Continue shopping</a>
            {order.courierBooked && <a className="secondaryButton" href={`https://postex.pk/tracking?cn=${order.trackingNumber}`} target="_blank" rel="noreferrer">Track order</a>}
          </div>
        </div>

        <aside className="orderSummary confirmedSummary">
          <h2>Order summary <span>({items.reduce((n, item) => n + item.quantity, 0)})</span></h2>
          {items.map((item) => (
            <div className="summaryItem" key={`${item.id}-${item.size || "confirmed"}`}>
              <div className="summaryImage" style={{ backgroundImage: `url(${item.image})` }}><span>{item.quantity}</span></div>
              <div><b>{item.name}</b><small>{[item.category, item.size && `Size ${item.size}`, item.color].filter(Boolean).join(" · ")}</small></div>
              <p>Rs. {(item.price * item.quantity).toLocaleString()}</p>
            </div>
          ))}
          <div className="summaryTotals">
            <div><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
            <div><span>COD delivery</span><span>{delivery ? `Rs. ${delivery.toLocaleString()}` : "Free"}</span></div>
            <div className="totalLine"><b>Total</b><b>Rs. {Number(order.total).toLocaleString()}</b></div>
          </div>
        </aside>
      </section>
    </main>
  );
}
