"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, ChevronDown, Lock, Search, ShoppingBag, Truck } from "lucide-react";
import { buildShippingAddress } from "../../lib/shippingAddress";
import { DEFAULT_STORE_SETTINGS } from "../../data/storeSettings";
import { calculatePaymentAmounts, normalizePaymentMethod, PAYMENT_METHODS } from "../../lib/paymentRules";

const MAJOR_CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Gujranwala",
  "Sialkot",
  "Hyderabad",
  "Bahawalpur",
  "Sargodha",
  "Sukkur",
  "Abbottabad",
];

function CityCombobox({ value, onChange, cities, loading, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCities = useMemo(() => {
    if (!search.trim()) return cities;
    const query = search.toLowerCase().trim();
    return cities.filter((city) => city.toLowerCase().includes(query));
  }, [cities, search]);

  const popularCitiesFiltered = useMemo(() => {
    if (search.trim()) return [];
    return MAJOR_CITIES.filter((major) =>
      cities.some((c) => c.toLowerCase() === major.toLowerCase())
    );
  }, [cities, search]);

  function handleSelect(city) {
    onChange({ target: { name: "city", value: city } });
    setSearch("");
    setIsOpen(false);
  }

  return (
    <div className="cityComboboxContainer" ref={containerRef}>
      <input
        tabIndex={-1}
        required
        name="city"
        value={value}
        onChange={() => {}}
        onFocus={() => containerRef.current?.querySelector(".citySearchInput")?.focus()}
        className="cityHiddenInput"
      />

      <div
        className={`cityDisplayBox ${isOpen ? "isOpen" : ""}`}
        onClick={() => {
          if (!disabled && !loading) setIsOpen(true);
        }}
      >
        <Search size={15} className="citySearchIcon" />
        <input
          type="text"
          className="citySearchInput"
          placeholder={loading ? "Loading delivery cities..." : "Search or select delivery city..."}
          value={isOpen ? search : value || search}
          disabled={disabled || loading}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
        />
        {value && !isOpen && (
          <button
            type="button"
            className="cityClearBtn"
            title="Clear city selection"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ target: { name: "city", value: "" } });
              setSearch("");
            }}
          >
            &times;
          </button>
        )}
        <ChevronDown size={15} className={`cityArrowIcon ${isOpen ? "isOpen" : ""}`} />
      </div>

      {isOpen && (
        <div className="cityDropdownMenu">
          {popularCitiesFiltered.length > 0 && (
            <div className="cityPopularSection">
              <span className="cityPopularLabel">POPULAR CITIES</span>
              <div className="cityPopularChips">
                {popularCitiesFiltered.map((city) => (
                  <button
                    key={city}
                    type="button"
                    className={`cityChip ${value === city ? "isSelected" : ""}`}
                    onClick={() => handleSelect(city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="cityListOptions">
            <span className="cityListHeader">
              {search.trim() ? `SEARCH RESULTS (${filteredCities.length})` : "ALL CITIES"}
            </span>
            {filteredCities.length === 0 ? (
              <div className="cityNoResult">No city matching &quot;{search}&quot; found</div>
            ) : (
              filteredCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  className={`cityOptionItem ${value === city ? "isSelected" : ""}`}
                  onClick={() => handleSelect(city)}
                >
                  <span>{city}</span>
                  {value === city && <Check size={14} className="cityCheckIcon" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function paymentInstructionPoints(value) {
  const normalized = String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\s+(?=(?:Please|Kindly|Separately|After|Then|Send|Screenshot|Details|Note|Payment)\b)/gi, "\n");

  return normalized
    .split(/\n+|[•●]/)
    .flatMap((line) => line.split(/\.\s+(?=[A-Z])/))
    .map((line) => line.trim().replace(/^[\-–—]\s*/, ""))
    .filter(Boolean)
    .slice(0, 8);
}

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
  const selectedInstructions = paymentMethod === PAYMENT_METHODS.FULL_ADVANCE
    ? paymentSettings.instructions
    : paymentSettings.codInstructions;
  const instructionPoints = useMemo(() => paymentInstructionPoints(selectedInstructions), [selectedInstructions]);

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
          <h1 className="checkoutVisuallyHidden">Bustaniya checkout</h1>
          <form onSubmit={placeOrder}>
            <div className="checkoutSectionHeading"><span>01</span><div><b>Contact</b><small>We use these details only for order confirmation and delivery updates.</small></div></div>
            <label>Full name<input required name="fullName" value={form.fullName} onChange={updateField} placeholder="Your full name" /></label>
            <label>Phone number<input required name="phone" value={form.phone} onChange={updateField} type="tel" inputMode="tel" placeholder="Phone / WhatsApp number" /></label>
            <label>Email address (optional)<input name="email" value={form.email} onChange={updateField} type="email" placeholder="you@example.com" /></label>
            <div className="checkoutSectionHeading"><span>02</span><div><b>Delivery</b><small>Enter the address in separate parts so the courier can find you easily.</small></div></div>
            <fieldset className="checkoutAddressFields">
              <legend>Delivery address</legend>
              <div className="checkoutAddressGrid">
                <label>House / Flat No.<input required name="houseNo" value={form.houseNo} onChange={updateField} autoComplete="address-line1" placeholder="e.g. House 24, Flat 3B" /></label>
                <label>Street / Road<input required name="street" value={form.street} onChange={updateField} autoComplete="address-line2" placeholder="e.g. Street 8, Main Boulevard" /></label>
                <label>Block / Area<input required name="block" value={form.block} onChange={updateField} placeholder="e.g. Block C, Gulberg III" /></label>
                <label>Nearby landmark <em>(optional)</em><input name="landmark" value={form.landmark} onChange={updateField} placeholder="e.g. Near Central Mosque" /></label>
              </div>
            </fieldset>
            <div className="formRow">
              <label className="cityFormLabel">City
                {citiesError ? (
                  <input required name="city" value={form.city} onChange={updateField} placeholder="Enter delivery city" />
                ) : (
                  <CityCombobox
                    value={form.city}
                    onChange={updateField}
                    cities={cities}
                    loading={citiesLoading}
                    disabled={citiesLoading}
                  />
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
              {instructionPoints.length > 0 && <ul className="paymentInstructionList">{instructionPoints.map((point, index) => <li key={`${point}-${index}`}>{point}</li>)}</ul>}
              <div className="checkoutPaymentBreakdown"><span>Product subtotal <b>Rs. {paymentAmounts.productSubtotal.toLocaleString()}</b></span><span>Delivery charges <b>{paymentAmounts.deliveryCharges ? `Rs. ${paymentAmounts.deliveryCharges.toLocaleString()}` : "Free"}</b></span><span>Total order value <b>Rs. {paymentAmounts.totalOrderValue.toLocaleString()}</b></span><span>Pay now <b>Rs. {paymentAmounts.amountPayableInAdvance.toLocaleString()}</b></span><span>Pay on delivery <b>Rs. {paymentAmounts.amountPayableOnDelivery.toLocaleString()}</b></span></div>
              <div className="bankPaymentDetails">{paymentSettings.bankName && <span><b>Bank / wallet</b>{paymentSettings.bankName}</span>}{paymentSettings.bankTitle && <span><b>Account title</b>{paymentSettings.bankTitle}</span>}{paymentSettings.bankAccountNumber && <span><b>Account no.</b>{paymentSettings.bankAccountNumber}</span>}{paymentSettings.bankIban && <span><b>IBAN</b>{paymentSettings.bankIban}</span>}</div>
            </div>
            {error && <p className="checkoutError" role="alert">{error}</p>}
            <div className="checkoutSubmitBar"><div><span>Total</span><b>Rs. {paymentAmounts.totalOrderValue.toLocaleString()}</b></div><button className="placeOrder" type="submit" disabled={!cart.length || submitting}>{submitting ? "Placing order..." : "Complete order"}</button></div>
            <p className="checkoutPrivacy"><Lock size={13} /> Your information is used only to process this order securely.</p>
            <nav className="checkoutPolicyLinks" aria-label="Checkout policies"><a href="/exchange-return-policy">Refund policy</a><a href="/shipping-policy">Shipping</a><a href="/privacy-policy">Privacy policy</a><a href="/terms-and-conditions">Terms of service</a></nav>
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
  const payableOnDelivery = Number(order.payableOnDelivery || 0);
  const whatsappNumber = String(paymentDetails.whatsappNumber || "923053530008").replace(/\D/g, "");

  // Short items summary for WhatsApp message
  const itemsText = items
    .map((item) => `• ${item.name}${item.size ? ` (Size: ${item.size})` : ""} x${item.quantity}`)
    .join("\n");

  // Pre-filled WhatsApp message asking customer to attach payment screenshot
  const whatsappMessage = `Assalam-o-Alaikum Bustaniya! 🌸\nI have transferred Rs. ${paymentAmount.toLocaleString()} for Order #${order.orderRef}.\n\n📋 *Order Summary:*\n- Customer: ${order.customer?.fullName || ""}\n- City: ${order.customer?.city || ""}\n- Method: ${isFullAdvance ? "Full Advance Payment" : "COD (Rs. 250 Delivery Advance)"}\n- Amount Transferred: Rs. ${paymentAmount.toLocaleString()}\n\n📦 *Items:*\n${itemsText}\n\n📎 *Payment Screenshot Attached Below:*`;

  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}` : "";

  const fullAddress = [order.customer?.houseNo, order.customer?.street, order.customer?.block, order.customer?.landmark, order.customer?.city].filter(Boolean).join(", ");

  return (
    <main className="checkoutPage">
      <header className="checkoutHeader">
        <a className="brand" href="/"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
        <span><Lock size={14} /> Order Placed — Verification Pending</span>
      </header>
      <section className="orderSuccess shopifySuccess">
        <div className="confirmationPanel">
          {/* --- Hero --- */}
          <div className="confirmationHero">
            <span className="successMark"><CheckCircle2 size={22} /></span>
            <div>
              <p className="eyebrow">ORDER #{order.orderRef}</p>
              <h1>Thank you, {order.customer?.fullName || "there"}!</h1>
              <p>Your order is saved. Please transfer <b>Rs.&nbsp;{paymentAmount.toLocaleString()}</b> and send your payment screenshot on WhatsApp to confirm your order.</p>
            </div>
          </div>

          {/* --- Step 1: Bank Payment Details Card --- */}
          <div className="confirmationCard paymentVerificationCard">
            <div className="stepHeader">
              <span className="stepNumber">1</span>
              <div>
                <h2>{isFullAdvance ? "Transfer Full Payment" : "Transfer Advance Delivery Fee"}</h2>
                <p>Transfer <b>Rs. {paymentAmount.toLocaleString()}</b> using the account details below:</p>
              </div>
            </div>
            <div className="bankPaymentDetails">
              {paymentDetails.bankName && <span><b>Bank / Wallet</b><small>{paymentDetails.bankName}</small></span>}
              {paymentDetails.bankTitle && <span><b>Account Title</b><small>{paymentDetails.bankTitle}</small></span>}
              {paymentDetails.bankAccountNumber && <span><b>Account No.</b><small>{paymentDetails.bankAccountNumber}</small></span>}
              {paymentDetails.bankIban && <span><b>IBAN</b><small>{paymentDetails.bankIban}</small></span>}
              <span className="requiredTransferRow"><b>Required Transfer</b><small>Rs. {paymentAmount.toLocaleString()} ({isFullAdvance ? "Full Payment" : "COD Advance"})</small></span>
            </div>
          </div>

          {/* --- Step 2: Main WhatsApp Screenshot Submission Card --- */}
          {whatsappHref && (
            <div className="confirmationCard whatsappConfirmMainCard">
              <div className="whatsappConfirmHeader">
                <span className="stepNumber step2Number">2</span>
                <div>
                  <h2>Send Payment Screenshot on WhatsApp</h2>
                  <p>Tap below to open WhatsApp with your order reference, then attach your screenshot for quick verification.</p>
                </div>
              </div>
              <a className="whatsappPrimaryConfirmBtn" href={whatsappHref} target="_blank" rel="noreferrer">
                📸 Send Screenshot on WhatsApp
              </a>
            </div>
          )}

          {/* --- Customer Info Bullet List --- */}
          <div className="confirmationCard confirmationInfoCard">
            <ul className="confirmationBulletList">
              <li>
                <span className="bulletDot">•</span>
                <div className="bulletContent">
                  <strong>Contact:</strong> <span>{order.customer?.phone || "—"}{order.customer?.email ? ` · ${order.customer.email}` : ""}</span>
                </div>
              </li>
              <li>
                <span className="bulletDot">•</span>
                <div className="bulletContent">
                  <strong>Ship to:</strong> <span>{fullAddress || "—"}</span>
                </div>
              </li>
              <li className="bulletTwoColRow">
                <div className="bulletCol">
                  <span className="bulletDot">•</span>
                  <div className="bulletContent">
                    <strong>Method:</strong> <span>{isFullAdvance ? "Full Advance — Free Delivery" : "COD — Rs. 250 Advance"}</span>
                  </div>
                </div>
                <div className="bulletCol">
                  <span className="bulletDot">•</span>
                  <div className="bulletContent">
                    <strong>Pay on delivery:</strong> <span>Rs. {payableOnDelivery.toLocaleString()}</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* --- Actions --- */}
          <div className="confirmationActions">
            <a className="primaryButton" href="/">Continue shopping</a>
            {whatsappHref && <a className="secondaryButton" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp Support</a>}
          </div>
        </div>

        {/* --- Sidebar summary --- */}
        <aside className="orderSummary confirmedSummary">
          <h2>Order summary <span>({items.reduce((n, item) => n + item.quantity, 0)})</span></h2>
          {items.map((item) => (
            <div className="summaryItem" key={`${item.id}-${item.size || "confirmed"}`}>
              <div className="summaryImage" style={{ backgroundImage: `url(${item.image})` }}><span>{item.quantity}</span></div>
              <div><b>{item.name}</b><small>{[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(" · ")}</small></div>
              <p>Rs. {(item.price * item.quantity).toLocaleString()}</p>
            </div>
          ))}
          <div className="summaryTotals">
            <div><span>Subtotal</span><span>Rs. {Number(order.subtotal || 0).toLocaleString()}</span></div>
            <div><span>Delivery</span><span>{Number(order.delivery || 0) ? `Rs. ${Number(order.delivery).toLocaleString()}` : "Free"}</span></div>
            <div className="totalLine"><b>Total</b><b>Rs. {Number(order.total).toLocaleString()}</b></div>
          </div>
        </aside>
      </section>
    </main>
  );
}
