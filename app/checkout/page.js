"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, CheckCircle2, ChevronDown, Loader2, Lock, MessageCircle, Search, ShoppingBag } from "lucide-react";
import { buildShippingAddress } from "../../lib/shippingAddress";
import { DEFAULT_STORE_SETTINGS } from "../../data/storeSettings";
import { calculatePaymentAmounts, normalizePaymentMethod, PAYMENT_METHODS } from "../../lib/paymentRules";
import { trackEvent, saveConsentedCustomerData } from "../../lib/trackEvent";

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

function isValidPakistanMobile(value = "") {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.startsWith("92") && digits.length === 12 ? `0${digits.slice(2)}` : digits;
  return /^03\d{9}$/.test(normalized);
}

function validateCheckoutForm(form) {
  const errors = {};
  if (!form.fullName?.trim()) {
    errors.fullName = "Full name is required";
  }
  if (!form.phone?.trim()) {
    errors.phone = "Phone number is required";
  } else if (!isValidPakistanMobile(form.phone)) {
    errors.phone = "Please enter a valid Pakistani mobile number (e.g. 03001234567)";
  }
  if (form.email?.trim() && !/\S+@\S+\.\S+/.test(form.email.trim())) {
    errors.email = "Please enter a valid email address";
  }
  if (!form.houseNo?.trim()) {
    errors.houseNo = "House / Flat number is required";
  }
  if (!form.street?.trim()) {
    errors.street = "Street / Road name is required";
  }
  if (!form.block?.trim()) {
    errors.block = "Block / Area is required";
  }
  if (!form.city?.trim()) {
    errors.city = "Delivery city is required";
  }
  return errors;
}

function CityCombobox({ value, onChange, cities, loading, disabled, error }) {
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
    if (containerRef.current) {
      const searchInput = containerRef.current.querySelector(".citySearchInput");
      if (searchInput) searchInput.blur();
    }
  }

  return (
    <div className="cityComboboxContainer" ref={containerRef}>
      <input
        tabIndex={-1}
        readOnly
        aria-hidden="true"
        name="city"
        value={value}
        className="cityHiddenInput"
      />

      <div
        className={`cityDisplayBox ${isOpen ? "isOpen" : ""} ${error ? "fieldInputIsError" : ""}`}
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
      {error && <small className="inlineFieldError"><AlertCircle size={12} /> {error}</small>}

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
  if (!value) return [];

  const raw = String(value || "").replace(/\r\n?/g, "\n").trim();
  if (!raw) return [];

  return raw
    .split(/(?<=\.)\s+|\n+|[•●]/)
    .map((line) => line.trim().replace(/^[\-–—]\s*/, ""))
    .filter((line) => line.length > 5)
    .slice(0, 5);
}

export default function CheckoutPage() {
  const [cart, setCart] = useState([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
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
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_STORE_SETTINGS.paymentSettings);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bustaniya-cart") || localStorage.getItem("bustaniya_cart");
      if (stored) setCart(JSON.parse(stored));
    } catch {}
    setIsCartLoaded(true);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("bustaniya_last_checkout_fields");
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        setForm((current) => ({ ...current, ...saved }));
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

  const hasTrackedCheckout = useRef(false);
  useEffect(() => {
    if (isCartLoaded && cart.length > 0 && !hasTrackedCheckout.current) {
      hasTrackedCheckout.current = true;
      const totalVal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
      const contentIds = cart.map((item) => String(item.articleNumber || item.article_number || item.id || ""));
      const contents = cart.map((item) => ({
        id: String(item.articleNumber || item.article_number || item.id || ""),
        quantity: Number(item.quantity || 1),
        item_price: Number(item.price || 0),
      }));
      const numItems = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

      trackEvent("InitiateCheckout", {
        userData: {
          phone: form.phone,
          email: form.email,
          firstName: (form.fullName || form.name || "").split(" ")[0] || undefined,
          lastName: (form.fullName || form.name || "").split(" ").slice(1).join(" ") || undefined,
          city: form.city,
          country: "pk",
        },
        customData: {
          value: totalVal,
          contentIds,
          contents,
          numItems,
        },
      });
    }
  }, [isCartLoaded, cart, form]);

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
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "phone") {
      // Live input filtering: restrict to digits and optional leading +
      nextValue = value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
    }

    setForm((current) => {
      const next = { ...current, [name]: nextValue };
      if (["phone", "email", "fullName", "name", "city"].includes(name) && nextValue) {
        saveConsentedCustomerData({
          phone: next.phone,
          email: next.email,
          name: next.fullName || next.name,
          city: next.city,
        });
      }
      return next;
    });

    if (fieldErrors[name]) {
      setFieldErrors((current) => ({ ...current, [name]: "" }));
    }
  }

  async function placeOrder(event) {
    event.preventDefault();
    if (submitting || !cart.length) return;

    const validationErrors = validateCheckoutForm(form);
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const firstErrorField = Object.keys(validationErrors)[0];
      let errorElem = document.querySelector(`[name="${firstErrorField}"]`);

      if (!errorElem && firstErrorField === "city") {
        errorElem = document.querySelector(`.citySearchInput`) || document.querySelector(`.cityDisplayBox`);
      }

      if (errorElem) {
        errorElem.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          if (typeof errorElem.focus === "function") {
            errorElem.focus();
          }
        }, 150);
      }
      return;
    }

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
      if (!response.ok) throw new Error(result.error || "Failed to place order.");
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "bustaniya_last_checkout_fields",
          JSON.stringify({
            fullName: form.fullName,
            phone: form.phone,
            email: form.email,
            houseNo: form.houseNo,
            street: form.street,
            block: form.block,
            landmark: form.landmark,
            city: form.city,
            postalCode: form.postalCode,
          })
        );
        localStorage.removeItem("bustaniya-cart");
        localStorage.removeItem("bustaniya_cart");
        window.dispatchEvent(new Event("cartUpdated"));
      }
      // result.order (when present) uses different field names (deliveryCharges,
      // amountPayableInAdvance, amountPayableOnDelivery) than what this page and
      // <OrderConfirmation> read (delivery, advanceAmount, payableOnDelivery), so
      // always normalize from the top-level response fields instead of spreading
      // result.order directly — otherwise the confirmation screen shows "Rs. 0" /
      // "Free" even though the real order total was calculated correctly.
      const createdOrder = {
        ...(result.order || {}),
        ...result,
        customer: result.order?.customer || customer,
        items: result.order?.items || [...cart],
        subtotal: Number(result.productSubtotal ?? paymentAmounts.productSubtotal),
        delivery: Number(result.deliveryCharges ?? paymentAmounts.deliveryCharges),
        total: Number(result.totalOrderValue ?? paymentAmounts.totalOrderValue),
        advanceAmount: Number(result.amountPayableInAdvance ?? paymentAmounts.amountPayableInAdvance),
        payableOnDelivery: Number(result.amountPayableOnDelivery ?? paymentAmounts.amountPayableOnDelivery),
        paymentMethod: normalizePaymentMethod(result.paymentMethod || paymentMethod),
        paymentDetails: result.paymentDetails || paymentSettings,
        paymentStatus: result.paymentStatus || "Awaiting Payment",
      };

      const orderEventId = createdOrder.order_number || createdOrder.orderRef || createdOrder.orderId || createdOrder.id || `BST-${Date.now()}`;
      const totalOrderVal = Number(createdOrder.total || paymentAmounts.totalOrderValue || 0);
      const orderContentIds = (createdOrder.items || cart).map((item) => String(item.article_number || item.articleNumber || item.productId || item.id || ""));
      const orderContents = (createdOrder.items || cart).map((item) => ({
        id: String(item.article_number || item.articleNumber || item.productId || item.id || ""),
        quantity: Number(item.quantity || 1),
        item_price: Number(item.price || 0),
      }));
      const orderNumItems = (createdOrder.items || cart).reduce((sum, item) => sum + Number(item.quantity || 1), 0);

      // Save consented customer profile for browser tracking persistence
      saveConsentedCustomerData({
        phone: form.phone,
        email: form.email,
        name: form.fullName || form.name,
        city: form.city,
      });

      trackEvent("Purchase", {
        eventId: orderEventId,
        userData: {
          phone: form.phone,
          email: form.email,
          firstName: (form.fullName || form.name || "").split(" ")[0] || undefined,
          lastName: (form.fullName || form.name || "").split(" ").slice(1).join(" ") || undefined,
          city: form.city,
          country: "pk",
          externalId: orderEventId,
        },
        customData: {
          value: totalOrderVal,
          currency: "PKR",
          orderId: orderEventId,
          contentIds: orderContentIds,
          contents: orderContents,
          numItems: orderNumItems,
        },
      });

      setOrder(createdOrder);
    } catch (err) {
      const errorMsg = err.message || "An error occurred while placing your order.";
      setError(errorMsg);

      if (errorMsg.toLowerCase().includes("phone") || errorMsg.toLowerCase().includes("pakistani mobile")) {
        setFieldErrors((prev) => ({ ...prev, phone: errorMsg }));
        const phoneElem = document.querySelector('[name="phone"]');
        if (phoneElem) {
          phoneElem.scrollIntoView({ behavior: "smooth", block: "center" });
          phoneElem.focus();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return <OrderConfirmation order={order} items={cart} />;
  }

  if (!isCartLoaded) {
    return (
      <main className="checkoutPage">
        <header className="checkoutHeader">
          <a className="brand" href="/"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
          <span><Lock size={14} /> Secure checkout</span>
        </header>
        <div style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", color: "#6b7280" }}>
            <Loader2 className="animate-spin" size={24} style={{ color: "#16452c" }} />
            <span style={{ fontSize: "13px", fontWeight: 500 }}>Loading checkout...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!cart.length) {
    return (
      <main className="checkoutPage">
        <header className="checkoutHeader">
          <a className="brand" href="/"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
          <span><Lock size={14} /> Checkout</span>
        </header>
        <div className="checkoutEmpty">
          <ShoppingBag size={48} />
          <p>Your cart is empty.</p>
          <a href="/">Shop collection</a>
        </div>
      </main>
    );
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
          <form onSubmit={placeOrder} noValidate>
            <div className="checkoutSectionHeading"><span>01</span><div><b>Contact</b><small>We use these details only for order confirmation and delivery updates.</small></div></div>
            <label>
              Full name
              <input name="fullName" value={form.fullName} onChange={updateField} placeholder="Your full name" className={fieldErrors.fullName ? "fieldInputIsError" : ""} />
              {fieldErrors.fullName && <small className="inlineFieldError"><AlertCircle size={12} /> {fieldErrors.fullName}</small>}
            </label>
            <label>
              Phone number
              <input name="phone" value={form.phone} onChange={updateField} type="tel" inputMode="tel" placeholder="Phone / WhatsApp number (e.g. 03001234567)" className={fieldErrors.phone ? "fieldInputIsError" : ""} />
              {fieldErrors.phone && <small className="inlineFieldError"><AlertCircle size={12} /> {fieldErrors.phone}</small>}
            </label>
            <label>
              Email address (optional)
              <input name="email" value={form.email} onChange={updateField} type="email" placeholder="you@example.com" className={fieldErrors.email ? "fieldInputIsError" : ""} />
              {fieldErrors.email && <small className="inlineFieldError"><AlertCircle size={12} /> {fieldErrors.email}</small>}
            </label>
            <div className="checkoutSectionHeading"><span>02</span><div><b>Delivery</b><small>Enter the address in separate parts so the courier can find you easily.</small></div></div>
            <fieldset className="checkoutAddressFields">
              <legend>Delivery address</legend>
              <div className="checkoutAddressGrid">
                <label>
                  House / Flat No.
                  <input name="houseNo" value={form.houseNo} onChange={updateField} autoComplete="address-line1" placeholder="e.g. House 24, Flat 3B" className={fieldErrors.houseNo ? "fieldInputIsError" : ""} />
                  {fieldErrors.houseNo && <small className="inlineFieldError"><AlertCircle size={12} /> {fieldErrors.houseNo}</small>}
                </label>
                <label>
                  Street / Road
                  <input name="street" value={form.street} onChange={updateField} autoComplete="address-line2" placeholder="e.g. Street 8, Main Boulevard" className={fieldErrors.street ? "fieldInputIsError" : ""} />
                  {fieldErrors.street && <small className="inlineFieldError"><AlertCircle size={12} /> {fieldErrors.street}</small>}
                </label>
                <label>
                  Block / Area
                  <input name="block" value={form.block} onChange={updateField} placeholder="e.g. Block C, Gulberg III" className={fieldErrors.block ? "fieldInputIsError" : ""} />
                  {fieldErrors.block && <small className="inlineFieldError"><AlertCircle size={12} /> {fieldErrors.block}</small>}
                </label>
                <label>Nearby landmark <em>(optional)</em><input name="landmark" value={form.landmark} onChange={updateField} placeholder="e.g. Near Central Mosque" /></label>
              </div>
            </fieldset>
            <div className="formRow">
              <div className="cityFormGroup">
                <span className="cityFormLabelText">City</span>
                {citiesError ? (
                  <>
                    <input name="city" value={form.city} onChange={updateField} placeholder="Enter delivery city" className={fieldErrors.city ? "fieldInputIsError" : ""} />
                    {fieldErrors.city && <small className="inlineFieldError"><AlertCircle size={12} /> {fieldErrors.city}</small>}
                  </>
                ) : (
                  <CityCombobox
                    value={form.city}
                    onChange={updateField}
                    cities={cities}
                    loading={citiesLoading}
                    disabled={citiesLoading}
                    error={fieldErrors.city}
                  />
                )}
              </div>
              <label>Postal code (optional)<input name="postalCode" value={form.postalCode} onChange={updateField} placeholder="Postal code" /></label>
            </div>

            <div className="checkoutSectionHeading"><span>03</span><div><b>Shipping method</b><small>Standard delivery is available for your selected city.</small></div></div>
            <div className="shippingMethodBox"><span><b>Standard delivery</b><small>Delivered by our courier partner</small></span><b>{paymentAmounts.deliveryCharges ? `Rs. ${paymentAmounts.deliveryCharges.toLocaleString()}` : "Free"}</b></div>

            <div className="checkoutSectionHeading"><span>04</span><div><b>Payment</b><small>Select a payment option. We will show the exact transfer instructions before you place your order.</small></div></div>
            <label className={paymentMethod === PAYMENT_METHODS.COD_ADVANCE_DELIVERY ? "paymentBox" : "paymentBox paymentChoice"}>
              <input type="radio" name="paymentMethod" value={PAYMENT_METHODS.COD_ADVANCE_DELIVERY} checked={paymentMethod === PAYMENT_METHODS.COD_ADVANCE_DELIVERY} disabled={paymentSettings.codEnabled === false} onChange={() => setPaymentMethod(PAYMENT_METHODS.COD_ADVANCE_DELIVERY)} />
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
              <b>{paymentMethod === PAYMENT_METHODS.FULL_ADVANCE ? (paymentSettings.advanceHeading || "Full Advance Payment Instructions") : (paymentSettings.codHeading || "Cash on Delivery Instructions")}</b>
              {instructionPoints.length > 0 && <ul className="paymentInstructionList">{instructionPoints.map((point, index) => <li key={`${point}-${index}`}>{point}</li>)}</ul>}
              <div className="checkoutPaymentBreakdown"><span>Product subtotal <b>Rs. {paymentAmounts.productSubtotal.toLocaleString()}</b></span><span>Delivery charges <b>{paymentAmounts.deliveryCharges ? `Rs. ${paymentAmounts.deliveryCharges.toLocaleString()}` : "Free"}</b></span><span>Total order value <b>Rs. {paymentAmounts.totalOrderValue.toLocaleString()}</b></span><span>Pay now <b>Rs. {paymentAmounts.amountPayableInAdvance.toLocaleString()}</b></span><span>Pay on delivery <b>Rs. {paymentAmounts.amountPayableOnDelivery.toLocaleString()}</b></span></div>
              {(paymentSettings.bankName || paymentSettings.bankTitle || paymentSettings.bankAccountNumber || paymentSettings.bankIban) && (
                <div className="bankPaymentDetails">{paymentSettings.bankName && <span><b>Bank / Wallet</b><small>{paymentSettings.bankName}</small></span>}{paymentSettings.bankTitle && <span><b>Account Title</b><small>{paymentSettings.bankTitle}</small></span>}{paymentSettings.bankAccountNumber && <span><b>Account No.</b><small>{paymentSettings.bankAccountNumber}</small></span>}{paymentSettings.bankIban && <span><b>IBAN</b><small>{paymentSettings.bankIban}</small></span>}</div>
              )}
            </div>
            {error && <p className="checkoutError" role="alert">{error}</p>}
            <div className="checkoutSubmitBar">
              <div><span>Total</span><b>Rs. {paymentAmounts.totalOrderValue.toLocaleString()}</b></div>
              <button className="placeOrder" type="submit" disabled={!cart.length || submitting}>
                {submitting ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <Loader2 className="animate-spin" size={16} /> Placing order...
                  </span>
                ) : (
                  "Complete order"
                )}
              </button>
            </div>
            <p className="checkoutPrivacy"><Lock size={13} /> Your information is used only to process this order securely.</p>
            <p className="checkoutInlineHelp">Need help? <a href={`https://wa.me/923053530008?text=${encodeURIComponent("Assalam-o-Alaikum Bustaniya! I need help with my checkout.")}`} target="_blank" rel="noreferrer"><MessageCircle size={13} /> Chat on WhatsApp</a></p>
            <nav className="checkoutPolicyLinks" aria-label="Checkout policies"><a href="/exchange-return-policy">Refund policy</a><a href="/shipping-policy">Shipping</a><a href="/privacy-policy">Privacy policy</a><a href="/terms-and-conditions">Terms of service</a></nav>
          </form>
        </section>

        <aside className={`orderSummary ${summaryOpen ? "isOpen" : ""}`}>
          <button className="orderSummaryToggle" type="button" onClick={() => setSummaryOpen((current) => !current)} aria-expanded={summaryOpen} aria-controls="checkout-order-summary">
            <span><ShoppingBag size={16} /> {summaryOpen ? "Hide order summary" : "Show order summary"} <ChevronDown size={14} className="toggleChevron" /></span>
            <b>Rs. {paymentAmounts.totalOrderValue.toLocaleString()}</b>
          </button>
          <div id="checkout-order-summary" className="orderSummaryContent">
            <div className="orderSummaryHead">
              <p>SUMMARY</p>
              <h2>Your order <span>({cart.reduce((n, item) => n + item.quantity, 0)})</span></h2>
            </div>
            {cart.map((item) => (
              <div className="summaryItem" key={`${item.id}-${item.size || "cart"}`}>
                <div className="summaryImage" style={{ backgroundImage: `url(${item.image})` }}><span>{item.quantity}</span></div>
                <div><b>{item.name}</b><small>{[item.category, item.size && `Size ${item.size}`, item.color].filter(Boolean).join(" · ")}</small></div>
                <p>Rs. {(item.price * item.quantity).toLocaleString()}</p>
              </div>
            ))}

            <div className="summaryTotals">
              <div><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
              <div><span>Delivery</span><span>{paymentAmounts.deliveryCharges ? `Rs. ${paymentAmounts.deliveryCharges.toLocaleString()}` : "Free"}</span></div>
              {paymentMethod === PAYMENT_METHODS.FULL_ADVANCE && <div><span>Prepaid discount</span><span>- Rs. {Number(paymentSettings.codDeliveryChargePkr ?? 250).toLocaleString()} (Free Delivery)</span></div>}
              <div className="totalLine"><b>Total</b><b>Rs. {paymentAmounts.totalOrderValue.toLocaleString()}</b></div>
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

  const itemsText = items
    .map((item) => `• ${item.name}${item.size ? ` (Size: ${item.size})` : ""} x${item.quantity}`)
    .join("\n");

  const deliveryChargeAmount = Number(order.delivery || 0);

  const whatsappMessage = `Assalam-o-Alaikum Bustaniya! 🌸\nI have transferred Rs. ${paymentAmount.toLocaleString()} for Order #${order.orderRef}.\n\n📋 *Order Summary:*\n- Customer: ${order.customer?.fullName || ""}\n- City: ${order.customer?.city || ""}\n- Method: ${isFullAdvance ? "Full Advance Payment" : `COD (Rs. ${deliveryChargeAmount.toLocaleString()} Delivery Advance)`}\n- Amount Transferred: Rs. ${paymentAmount.toLocaleString()}\n\n📦 *Items:*\n${itemsText}\n\n📎 *Payment Screenshot Attached Below:*`;

  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}` : "";

  const fullAddress = [order.customer?.houseNo, order.customer?.street, order.customer?.block, order.customer?.landmark, order.customer?.city].filter(Boolean).join(", ");

  return (
    <main className="checkoutPage">
      <header className="checkoutHeader">
        <a className="brand" href="/"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
        <span><Lock size={14} /> Order Placed — Verification Pending</span>
      </header>
      
      <div className="confirmationContainer">
        {/* 1. Thank You / Order # / Status Confirmation Block (Very Top) */}
        <div className="confirmationHero">
          <span className="successMark"><CheckCircle2 size={24} /></span>
          <div>
            <p className="eyebrow">ORDER #{order.orderRef}</p>
            <h1>Thank you, {order.customer?.fullName || "there"}!</h1>
            <p>Your order is saved. Please transfer <b>Rs.&nbsp;{paymentAmount.toLocaleString()}</b> and send your payment screenshot on WhatsApp to confirm your order.</p>
          </div>
        </div>

        {/* 2. Itemized Order Summary (Below Hero) */}
        <div className="confirmationCard confirmedSummaryCard">
          <h2>Order summary <span>({items.reduce((n, item) => n + item.quantity, 0)} {items.reduce((n, item) => n + item.quantity, 0) === 1 ? "item" : "items"})</span></h2>
          <div className="summaryItemsList">
            {items.map((item) => (
              <div className="summaryItem" key={`${item.id}-${item.size || "confirmed"}`}>
                <div className="summaryImage" style={{ backgroundImage: `url(${item.image})` }}><span>{item.quantity}</span></div>
                <div><b>{item.name}</b><small>{[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(" · ")}</small></div>
                <p>Rs. {(item.price * item.quantity).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="summaryTotals">
            <div><span>Subtotal</span><span>Rs. {Number(order.subtotal || 0).toLocaleString()}</span></div>
            <div><span>Delivery</span><span>{Number(order.delivery || 0) ? `Rs. ${Number(order.delivery).toLocaleString()}` : "Free"}</span></div>
            <div className="totalLine"><b>Total</b><b>Rs. {Number(order.total).toLocaleString()}</b></div>
          </div>
        </div>

        {/* 3. Step 1: Bank Payment Details Card */}
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

        {/* 4. Step 2: Main WhatsApp Screenshot Submission Card */}
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

        {/* 5. Customer & Shipping Recap Card */}
        <div className="confirmationCard confirmationRecapCard">
          <div className="confirmationRecapRow">
            <span className="recapLabel">Contact</span>
            <span className="recapValue">{order.customer?.phone || "Not provided"}{order.customer?.email ? ` · ${order.customer.email}` : ""}</span>
          </div>
          <div className="confirmationRecapRow">
            <span className="recapLabel">Ship to</span>
            <span className="recapValue">{fullAddress || "Not provided"}</span>
          </div>
          <div className="confirmationRecapRow">
            <span className="recapLabel">Method</span>
            <span className="recapValue">{isFullAdvance ? "Full Advance Payment (Free Delivery)" : `Cash on Delivery (Rs. ${deliveryChargeAmount.toLocaleString()} Advance)`}</span>
          </div>
          <div className="confirmationRecapRow">
            <span className="recapLabel">Pay on delivery</span>
            <span className="recapValue">Rs. {payableOnDelivery.toLocaleString()}</span>
          </div>
        </div>

        {/* 6. Action Buttons */}
        <div className="confirmationActions">
          <a className="primaryButton" href="/">Continue shopping</a>
          {whatsappHref && <a className="secondaryButton" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp Support</a>}
        </div>
      </div>
    </main>
  );
}
