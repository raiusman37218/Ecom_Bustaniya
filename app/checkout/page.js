"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronDown, Lock, ShoppingBag, Truck } from "lucide-react";
import { buildShippingAddress } from "../../lib/shippingAddress";
import { DEFAULT_STORE_SETTINGS } from "../../data/storeSettings";
import { calculatePaymentAmounts, normalizePaymentMethod, PAYMENT_METHODS } from "../../lib/paymentRules";

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
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_STORE_SETTINGS.paymentSettings);
  const [summaryOpen, setSummaryOpen] = useState(true);

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
        setPaymentMethod((current) => {
          const configuredDefault = normalizePaymentMethod(result.checkoutSettings?.defaultPayment);
          if (nextPaymentSettings.codEnabled === false && nextPaymentSettings.manualTransferEnabled !== false) return PAYMENT_METHODS.FULL_ADVANCE;
          if (nextPaymentSettings.manualTransferEnabled === false && nextPaymentSettings.codEnabled !== false) return "cod";
          return current === "cod" && configuredDefault === PAYMENT_METHODS.FULL_ADVANCE ? configuredDefault : current;
        });
      })
      .catch(() => {});
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  );
  const paymentAmounts = useMemo(
    () => calculatePaymentAmounts({ subtotal, paymentMethod, paymentSettings }),
    [subtotal, paymentMethod, paymentSettings]
  );

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function placeOrder(event) {
    event.preventDefault();
    if (submitting || !cart.length) return;
    setSubmitting(true);
    setError("");
    const completeAddress = buildShippingAddress(form);
    const customer = { ...form, address: completeAddress };
    const checkoutAttemptId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const response = await fetch("/api/postex/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          paymentMethod,
          checkoutAttemptId,
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
        subtotal: Number(result.productSubtotal ?? paymentAmounts.productSubtotal),
        delivery: Number(result.deliveryCharges ?? paymentAmounts.deliveryCharges),
        total: Number(result.totalOrderValue ?? paymentAmounts.totalOrderValue),
        advanceAmount: Number(result.amountPayableInAdvance ?? paymentAmounts.amountPayableInAdvance),
        payableOnDelivery: Number(result.amountPayableOnDelivery ?? paymentAmounts.amountPayableOnDelivery),
        paymentMethod: normalizePaymentMethod(result.paymentMethod || paymentMethod),
        paymentDetails: result.paymentDetails || paymentSettings,
        paymentStatus: result.paymentStatus || "Awaiting Payment",
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
    return <OrderConfirmation order={order} items={confirmedItems} />;
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
          <p className="checkoutIntro">Complete the details below, choose your payment option, then send the payment screenshot on WhatsApp after placing the order.</p>
          <form onSubmit={placeOrder}>
            <div className="checkoutSectionHeading"><span>01</span><div><b>Contact</b><small>We use these details only for order confirmation and delivery updates.</small></div></div>
            <label>Full name<input required name="fullName" value={form.fullName} onChange={updateField} placeholder="Your full name" /></label>
            <label>Phone number<input required name="phone" value={form.phone} onChange={updateField} type="tel" inputMode="tel" placeholder="Phone / WhatsApp number" /></label>
            <label>Email address (optional)<input name="email" value={form.email} onChange={updateField} type="email" placeholder="you@example.com" /></label>
            <div className="checkoutSectionHeading"><span>02</span><div><b>Delivery</b><small>Enter the address in separate parts so the courier can find you easily.</small></div></div>
            <fieldset className="checkoutAddressFields">
              <legend>Delivery address</legend>
              <p>Please enter each part separately so the courier can find your address easily.</p>
              <div className="checkoutAddressGrid">
                <label>House / Flat No.<input required name="houseNo" value={form.houseNo} onChange={updateField} autoComplete="address-line1" placeholder="e.g. House 24, Flat 3B" /></label>
                <label>Street / Road<input required name="street" value={form.street} onChange={updateField} autoComplete="address-line2" placeholder="e.g. Street 8, Main Boulevard" /></label>
                <label>Block / Area<input required name="block" value={form.block} onChange={updateField} placeholder="e.g. Block C, Gulberg III" /></label>
                <label>Nearby landmark <em>(optional)</em><input name="landmark" value={form.landmark} onChange={updateField} placeholder="e.g. Near Central Mosque" /></label>
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

            <div className="checkoutSectionHeading"><span>03</span><div><b>Shipping method</b><small>Standard delivery is available for your selected city.</small></div></div>
            <div className="shippingMethodBox"><span><b>Standard delivery</b><small>Delivered by our courier partner</small></span><b>{paymentAmounts.deliveryCharges ? `Rs. ${paymentAmounts.deliveryCharges.toLocaleString()}` : "Free"}</b></div>

            <div className="checkoutSectionHeading"><span>04</span><div><b>Payment</b><small>Select a payment option. We will show the exact transfer instructions before you place your order.</small></div></div>
            <label className={paymentMethod === PAYMENT_METHODS.COD_ADVANCE_DELIVERY ? "paymentBox" : "paymentBox paymentChoice"}>
              <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === "cod"} disabled={paymentSettings.codEnabled === false} onChange={() => setPaymentMethod("cod")} />
              <div className="paymentMethodCopy">
                <div className="paymentMethodTitle"><b>Cash on Delivery</b><span>Pay the delivery charges first. Your products are paid to the courier when delivered.</span></div>
                {paymentMethod === PAYMENT_METHODS.COD_ADVANCE_DELIVERY && <ul className="paymentOptionList">
                  <li><span><strong>Pay now</strong><small>Advance delivery charges to confirm</small></span><b>Rs. {paymentAmounts.deliveryCharges.toLocaleString()}</b></li>
                  <li><span><strong>Pay on delivery</strong><small>Product amount payable to the courier</small></span><b>Rs. {paymentAmounts.amountPayableOnDelivery.toLocaleString()}</b></li>
                </ul>}
              </div>
            </label>
            {paymentSettings.manualTransferEnabled !== false && (
              <label className={paymentMethod === PAYMENT_METHODS.FULL_ADVANCE ? "paymentBox" : "paymentBox paymentChoice"}>
                <input type="radio" name="paymentMethod" value="full_advance" checked={paymentMethod === PAYMENT_METHODS.FULL_ADVANCE} onChange={() => setPaymentMethod(PAYMENT_METHODS.FULL_ADVANCE)} />
                <div className="paymentMethodCopy">
                  <div className="paymentMethodTitle"><b>Full advance payment <em>Free delivery</em></b><span>Pay for the complete order now. There will be nothing left to pay on delivery.</span></div>
                  {paymentMethod === PAYMENT_METHODS.FULL_ADVANCE && <ul className="paymentOptionList">
                    <li><span><strong>Pay now</strong><small>Complete product payment</small></span><b>Rs. {paymentAmounts.amountPayableInAdvance.toLocaleString()}</b></li>
                    <li><span><strong>Delivery</strong><small>Included with your prepaid order</small></span><b>Free</b></li>
                    <li><span><strong>Pay on delivery</strong><small>No payment will be collected by the courier</small></span><b>Rs. 0</b></li>
                  </ul>}
                </div>
              </label>
            )}
            <div className="advancePaymentNote">
              <b>{paymentAmounts.paymentLabel}</b>
              <span>{paymentMethod === PAYMENT_METHODS.FULL_ADVANCE ? paymentSettings.instructions : paymentSettings.codInstructions}</span>
              <div className="checkoutPaymentBreakdown"><span>Product subtotal <b>Rs. {paymentAmounts.productSubtotal.toLocaleString()}</b></span><span>Delivery charges <b>{paymentAmounts.deliveryCharges ? `Rs. ${paymentAmounts.deliveryCharges.toLocaleString()}` : "Free"}</b></span><span>Total order value <b>Rs. {paymentAmounts.totalOrderValue.toLocaleString()}</b></span><span>Pay now <b>Rs. {paymentAmounts.amountPayableInAdvance.toLocaleString()}</b></span><span>Pay on delivery <b>Rs. {paymentAmounts.amountPayableOnDelivery.toLocaleString()}</b></span></div>
              <div className="bankPaymentDetails">{paymentSettings.bankName && <span><b>Bank / wallet</b>{paymentSettings.bankName}</span>}{paymentSettings.bankTitle && <span><b>Account title</b>{paymentSettings.bankTitle}</span>}{paymentSettings.bankAccountNumber && <span><b>Account no.</b>{paymentSettings.bankAccountNumber}</span>}{paymentSettings.bankIban && <span><b>IBAN</b>{paymentSettings.bankIban}</span>}</div>
            </div>
            {error && <p className="checkoutError" role="alert">{error}</p>}
            <div className="checkoutSubmitBar"><div><span>Total</span><b>Rs. {paymentAmounts.totalOrderValue.toLocaleString()}</b></div><button className="placeOrder" type="submit" disabled={!cart.length || submitting}>{submitting ? "Placing order..." : "Complete order"}</button></div>
            <p className="checkoutPrivacy"><Lock size={13} /> Your information is used only to process this order securely.</p>
          </form>
        </section>

        <aside className={`orderSummary ${summaryOpen ? "isOpen" : ""}`}>
          <button className="orderSummaryToggle" type="button" onClick={() => setSummaryOpen((current) => !current)} aria-expanded={summaryOpen} aria-controls="checkout-order-summary"><span>Order summary <ChevronDown size={16} /></span><b>Rs. {paymentAmounts.totalOrderValue.toLocaleString()}</b></button>
          <div id="checkout-order-summary" className="orderSummaryContent">
          <div className="orderSummaryHead"><p>ORDER SUMMARY</p><h2>Your order <span>({cart.reduce((n, item) => n + item.quantity, 0)})</span></h2></div>
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
            <div><span>Product subtotal</span><span>Rs. {paymentAmounts.productSubtotal.toLocaleString()}</span></div>
            <div><span>Delivery charges</span><span>{paymentAmounts.deliveryCharges ? `Rs. ${paymentAmounts.deliveryCharges.toLocaleString()}` : "Free"}</span></div>
            <div><span>Pay now</span><span>Rs. {paymentAmounts.amountPayableInAdvance.toLocaleString()}</span></div>
            <div><span>Pay on delivery</span><span>Rs. {paymentAmounts.amountPayableOnDelivery.toLocaleString()}</span></div>
            <div className="totalLine"><b>Total order value</b><b>Rs. {paymentAmounts.totalOrderValue.toLocaleString()}</b></div>
          </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function OrderConfirmation({ order, items }) {
  const paymentDetails = order.paymentDetails || {};
  const isFullAdvance = normalizePaymentMethod(order.paymentMethod) === PAYMENT_METHODS.FULL_ADVANCE;
  const paymentAmount = Number(order.advanceAmount || 0);
  const whatsappNumber = String(paymentDetails.whatsappNumber || "").replace(/\D/g, "");
  const whatsappMessage = `Assalam-o-Alaikum, I have placed Order #${order.orderRef}. I selected ${isFullAdvance ? "Full Advance Payment" : "Cash on Delivery"} and transferred Rs. ${paymentAmount.toLocaleString()}. I am sending the payment screenshot for verification.`;
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}` : "";
  return (
    <main className="checkoutPage">
      <header className="checkoutHeader">
        <a className="brand" href="/"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
        <span><Lock size={14} /> Payment verification required</span>
      </header>
      <section className="orderSuccess shopifySuccess">
        <div className="confirmationPanel">
          <div className="confirmationHero">
            <span className="successMark"><CheckCircle2 /></span>
            <div>
              <p className="eyebrow">ORDER {order.orderRef}</p>
              <h1>Thank you, {order.customer?.fullName || "there"}!</h1>
            <p>Your order is saved. Transfer the required amount, then send its screenshot on WhatsApp; we will confirm it before dispatch.</p>
            </div>
          </div>

          <div className="confirmationCard deliveryCard">
            <div><Truck /><span><b>Payment verification pending</b>We&apos;ve saved your order. We will confirm and prepare it after the required payment is verified.</span></div>
            <small>Payment status: <b>{order.paymentStatus || "Awaiting Payment"}</b></small>
          </div>
          <div className="confirmationCard paymentVerificationCard">
            <h2>{isFullAdvance ? "Full advance payment" : "COD delivery charges"}</h2>
            <p>Transfer <b>Rs. {paymentAmount.toLocaleString()}</b> using the details below, then send the payment screenshot on WhatsApp. No transaction/reference ID is required.</p>
            <div className="bankPaymentDetails">{paymentDetails.bankName && <span><b>Bank / wallet</b>{paymentDetails.bankName}</span>}{paymentDetails.bankTitle && <span><b>Account title</b>{paymentDetails.bankTitle}</span>}{paymentDetails.bankAccountNumber && <span><b>Account no.</b>{paymentDetails.bankAccountNumber}</span>}{paymentDetails.bankIban && <span><b>IBAN</b>{paymentDetails.bankIban}</span>}</div>
            {paymentDetails.instructions && <p>{paymentDetails.instructions}</p>}
            <ol className="paymentScreenshotSteps"><li>Transfer the exact amount shown above.</li><li>Take a screenshot of the successful payment.</li><li>Tap WhatsApp below and attach the screenshot.</li></ol>
            {whatsappHref && <a className="whatsappPaymentButton" href={whatsappHref} target="_blank" rel="noreferrer">Send Payment Screenshot on WhatsApp</a>}
          </div>

          <div className="confirmationGrid">
            <div className="confirmationCard">
              <h2>Customer information</h2>
              <span><b>Contact</b>{order.customer?.email || order.customer?.phone}</span>
              <span><b>Ship to</b>{order.customer?.address}, {order.customer?.city}</span>
              <span><b>Payment</b>{isFullAdvance ? "Full Advance Payment — Free Delivery" : "COD — delivery charges paid in advance"}</span>
            </div>
            <div className="confirmationCard">
              <h2>Order details</h2>
              <span><b>Order number</b>{order.orderRef}</span>
              <span><b>Confirmation</b>Pending payment verification</span>
              <span><b>Pay now</b>Rs. {paymentAmount.toLocaleString()}</span>
              <span><b>Pay on delivery</b>Rs. {Number(order.payableOnDelivery || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="confirmationActions">
            <a className="primaryButton" href="/">Continue shopping</a>
            {whatsappHref && <a className="secondaryButton" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp payment proof</a>}
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
            <div><span>Product subtotal</span><span>Rs. {Number(order.subtotal || 0).toLocaleString()}</span></div>
            <div><span>Delivery charges</span><span>{Number(order.delivery || 0) ? `Rs. ${Number(order.delivery).toLocaleString()}` : "Free"}</span></div>
            <div><span>Pay now</span><span>Rs. {paymentAmount.toLocaleString()}</span></div>
            <div><span>Pay on delivery</span><span>Rs. {Number(order.payableOnDelivery || 0).toLocaleString()}</span></div>
            <div className="totalLine"><b>Total order value</b><b>Rs. {Number(order.total).toLocaleString()}</b></div>
          </div>
        </aside>
      </section>
    </main>
  );
}
