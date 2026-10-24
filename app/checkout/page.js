"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  HelpCircle,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  Printer,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import "./checkout.css";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../../lib/images";
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

function formatPrice(amount) {
  const num = Number(amount || 0);
  return `Rs ${num.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isValidPakistanMobile(value = "") {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.startsWith("92") && digits.length === 12 ? `0${digits.slice(2)}` : digits;
  return /^03\d{9}$/.test(normalized);
}

function validateCheckoutForm(form) {
  const errors = {};
  if (!form.firstName?.trim() && !form.fullName?.trim()) {
    errors.firstName = "Enter a first name";
  }
  if (!form.lastName?.trim() && (!form.fullName?.trim() || !form.fullName.trim().includes(" "))) {
    if (!form.lastName?.trim()) {
      errors.lastName = "Enter a last name";
    }
  }
  if (!form.address?.trim()) {
    errors.address = "Enter an address";
  }
  if (!form.city?.trim()) {
    errors.city = "Enter a city";
  }
  if (!form.phone?.trim()) {
    errors.phone = "Enter a phone number";
  } else if (!isValidPakistanMobile(form.phone)) {
    errors.phone = "Enter a valid Pakistani mobile number (e.g. 03001234567)";
  }
  if (form.email?.trim() && !/\S+@\S+\.\S+/.test(form.email.trim())) {
    errors.email = "Enter a valid email address";
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
  }

  return (
    <div className="shopifyCityComboboxContainer" ref={containerRef}>
      <div className="shopifyInputWrapper">
        <input
          type="text"
          name="city"
          autoComplete="address-level2"
          className={`shopifyInput ${error ? "hasError" : ""}`}
          placeholder={loading ? "Loading cities..." : "City"}
          value={isOpen ? search : value || ""}
          disabled={disabled || loading}
          onFocus={() => {
            setSearch(value || "");
            setIsOpen(true);
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange({ target: { name: "city", value: e.target.value } });
            if (!isOpen) setIsOpen(true);
          }}
        />
        <ChevronDown size={15} style={{ position: "absolute", right: 12, color: "#737373", pointerEvents: "none" }} />
      </div>
      {error && (
        <div className="shopifyInputErrorMsg">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {isOpen && cities.length > 0 && (
        <div className="shopifyCityDropdownMenu">
          {popularCitiesFiltered.length > 0 && (
            <div className="shopifyCityDropdownHeader">Popular Cities</div>
          )}
          {popularCitiesFiltered.map((city) => (
            <div
              key={city}
              className="shopifyCityDropdownItem"
              onClick={() => handleSelect(city)}
            >
              {city}
            </div>
          ))}
          <div className="shopifyCityDropdownHeader">
            {search.trim() ? `Matching Cities (${filteredCities.length})` : "All Cities"}
          </div>
          {filteredCities.slice(0, 30).map((city) => (
            <div
              key={city}
              className="shopifyCityDropdownItem"
              onClick={() => handleSelect(city)}
            >
              {city}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  const [cart, setCart] = useState([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    fullName: "",
    address: "",
    apartment: "",
    city: "",
    postalCode: "",
    phone: "",
    saveInfo: true,
    newsOffers: false,
    billingSameAsShipping: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_STORE_SETTINGS.paymentSettings);
  // Carries freeDeliveryThreshold, which decides whether the fee applies at all.
  const [deliverySettings, setDeliverySettings] = useState(DEFAULT_STORE_SETTINGS.deliverySettings);
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
        const nameParts = (saved.fullName || "").trim().split(" ");
        const firstName = saved.firstName || nameParts[0] || "";
        const lastName = saved.lastName || nameParts.slice(1).join(" ") || "";
        setForm((current) => ({
          ...current,
          ...saved,
          firstName: current.firstName || firstName,
          lastName: current.lastName || lastName,
          address: current.address || saved.houseNo || saved.address || "",
          apartment: current.apartment || saved.landmark || saved.apartment || "",
        }));
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
        setDeliverySettings(result.deliverySettings || DEFAULT_STORE_SETTINGS.deliverySettings);
        setPaymentMethod((current) => {
          const configuredDefault = normalizePaymentMethod(result.checkoutSettings?.defaultPayment);
          if (nextPaymentSettings.codEnabled === false && nextPaymentSettings.manualTransferEnabled !== false)
            return PAYMENT_METHODS.FULL_ADVANCE;
          if (nextPaymentSettings.manualTransferEnabled === false && nextPaymentSettings.codEnabled !== false)
            return "cod";
          return current === "cod" && configuredDefault === PAYMENT_METHODS.FULL_ADVANCE
            ? configuredDefault
            : current;
        });
      })
      .catch(() => {});
  }, []);

  const hasTrackedCheckout = useRef(false);
  useEffect(() => {
    if (isCartLoaded && cart.length > 0 && !hasTrackedCheckout.current) {
      hasTrackedCheckout.current = true;
      const totalVal = cart.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
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
          firstName: form.firstName || (form.fullName || "").split(" ")[0] || undefined,
          lastName: form.lastName || (form.fullName || "").split(" ").slice(1).join(" ") || undefined,
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
    () => calculatePaymentAmounts({ subtotal, paymentMethod, paymentSettings, deliverySettings }),
    [subtotal, paymentMethod, paymentSettings, deliverySettings]
  );

  const shippingPriceDisplay = useMemo(() => {
    // A zero here is a real "free", not a missing value: the old `|| 350`
    // fallback re-displayed a fee that free delivery had just removed.
    if (paymentAmounts.deliveryCharges === 0) return "Free";
    return formatPrice(paymentAmounts.deliveryCharges);
  }, [paymentAmounts.deliveryCharges]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    let nextValue = type === "checkbox" ? checked : value;

    if (name === "phone") {
      nextValue = value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
    }

    setForm((current) => {
      const next = { ...current, [name]: nextValue };
      if (name === "firstName" || name === "lastName") {
        next.fullName = [next.firstName, next.lastName].filter(Boolean).join(" ").trim();
      }
      if (["phone", "email", "fullName", "city"].includes(name) && nextValue) {
        saveConsentedCustomerData({
          phone: next.phone,
          email: next.email,
          name: next.fullName,
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
      const errorElem = document.querySelector(`[name="${firstErrorField}"]`);

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

    const completeAddress = [form.address, form.apartment].map((s) => String(s || "").trim()).filter(Boolean).join(", ");
    const customer = {
      firstName: form.firstName?.trim() || "",
      lastName: form.lastName?.trim() || "",
      fullName: [form.firstName, form.lastName].filter(Boolean).join(" ").trim() || form.fullName?.trim() || "",
      phone: form.phone?.trim() || "",
      email: form.email?.trim() || "",
      address: completeAddress || form.address?.trim() || "",
      apartment: form.apartment?.trim() || "",
      city: form.city?.trim() || "",
      postalCode: form.postalCode?.trim() || "",
    };

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
        if (form.saveInfo) {
          localStorage.setItem(
            "bustaniya_last_checkout_fields",
            JSON.stringify({
              firstName: form.firstName,
              lastName: form.lastName,
              fullName: customer.fullName,
              phone: form.phone,
              email: form.email,
              address: form.address,
              apartment: form.apartment,
              city: form.city,
              postalCode: form.postalCode,
            })
          );
        }
        localStorage.removeItem("bustaniya-cart");
        localStorage.removeItem("bustaniya_cart");
        window.dispatchEvent(new Event("cartUpdated"));
      }

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

      const orderEventId =
        createdOrder.order_number || createdOrder.orderRef || createdOrder.orderId || createdOrder.id || `BST-${Date.now()}`;
      const totalOrderVal = Number(createdOrder.total || paymentAmounts.totalOrderValue || 0);
      const orderContentIds = (createdOrder.items || cart).map((item) =>
        String(item.article_number || item.articleNumber || item.productId || item.id || "")
      );
      const orderContents = (createdOrder.items || cart).map((item) => ({
        id: String(item.article_number || item.articleNumber || item.productId || item.id || ""),
        quantity: Number(item.quantity || 1),
        item_price: Number(item.price || 0),
      }));
      const orderNumItems = (createdOrder.items || cart).reduce((sum, item) => sum + Number(item.quantity || 1), 0);

      saveConsentedCustomerData({
        phone: form.phone,
        email: form.email,
        name: customer.fullName,
        city: form.city,
      });

      trackEvent("Purchase", {
        eventId: orderEventId,
        userData: {
          phone: form.phone,
          email: form.email,
          firstName: form.firstName || (customer.fullName || "").split(" ")[0] || undefined,
          lastName: form.lastName || (customer.fullName || "").split(" ").slice(1).join(" ") || undefined,
          city: form.city,
          country: "pk",
        },
        customData: {
          value: totalOrderVal,
          contentIds: orderContentIds,
          contents: orderContents,
          numItems: orderNumItems,
        },
      });

      setOrder(createdOrder);
    } catch (err) {
      const errorMsg = err.message || "An unexpected error occurred while placing the order.";
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
      <main className="shopifyCheckoutPage">
        <header className="shopifyCheckoutHeader">
          <Link href="/" className="shopifyCheckoutLogoLink">
            <img src="/bustaniya-logo-v2.png" alt="Bustaniya" className="shopifyCheckoutLogo" />
          </Link>
          <span className="shopifyHeaderSecure">
            <Lock size={14} /> Secure checkout
          </span>
        </header>
        <div style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", color: "#6b7280" }}>
            <Loader2 className="animate-spin" size={24} style={{ color: "#1773b0" }} />
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Loading checkout...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!cart.length) {
    return (
      <main className="shopifyCheckoutPage">
        <header className="shopifyCheckoutHeader">
          <Link href="/" className="shopifyCheckoutLogoLink">
            <img src="/bustaniya-logo-v2.png" alt="Bustaniya" className="shopifyCheckoutLogo" />
          </Link>
          <span className="shopifyHeaderSecure">
            <Lock size={14} /> Checkout
          </span>
        </header>
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <ShoppingBag size={48} style={{ color: "#9ca3af", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#333", margin: "0 0 8px" }}>Your cart is empty</h2>
          <p style={{ color: "#6b7280", margin: "0 0 24px", fontSize: "14px" }}>Looks like you haven&apos;t added any items to your cart yet.</p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              backgroundColor: "#005bd3",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shopifyCheckoutPage">
      {/* 1. Header with Bustaniya Logo */}
      <header className="shopifyCheckoutHeader">
        <Link href="/" className="shopifyCheckoutLogoLink" aria-label="Bustaniya Home">
          <img src="/bustaniya-logo-v2.png" alt="Bustaniya" className="shopifyCheckoutLogo" />
        </Link>
      </header>

      {/* Mobile Accordion Summary Banner */}
      <div
        className="shopifyMobileSummaryBanner"
        onClick={() => setSummaryOpen((prev) => !prev)}
      >
        <div className="shopifyMobileBannerContent">
          <div className="shopifyMobileBannerLeft">
            <ShoppingBag size={16} />
            <span>{summaryOpen ? "Hide order summary" : "Show order summary"}</span>
            <ChevronDown
              size={14}
              style={{
                transform: summaryOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            />
          </div>
          <div className="shopifyMobileBannerRight">
            {formatPrice(paymentAmounts.totalOrderValue)}
          </div>
        </div>
      </div>

      <div className="shopifyCheckoutLayout">
        {/* Left Column: Form */}
        <section className="shopifyCheckoutFormColumn">
          <div className="shopifyCheckoutFormInner">
            <form onSubmit={placeOrder} noValidate>
              {/* CONTACT SECTION */}
              <div className="shopifyContactHeader">
                <h2 className="shopifySectionHeading">Contact</h2>
                <a href="/admin" className="shopifySignInLink">
                  Sign in
                </a>
              </div>

              <div className="shopifyInputWrapper">
                <input
                  type="email"
                  name="email"
                  className={`shopifyInput shopifyInputWithIcon ${fieldErrors.email ? "hasError" : ""}`}
                  placeholder="Email"
                  value={form.email}
                  onChange={updateField}
                  autoComplete="email"
                />
                <span
                  className="shopifyInputHelpIcon"
                  title="In case we need to contact you about your order"
                >
                  <HelpCircle size={16} />
                </span>
              </div>
              {fieldErrors.email && (
                <div className="shopifyInputErrorMsg">
                  <AlertCircle size={12} /> {fieldErrors.email}
                </div>
              )}

              <label className="shopifyCheckboxWrapper">
                <input
                  type="checkbox"
                  name="newsOffers"
                  checked={form.newsOffers}
                  onChange={updateField}
                  className="shopifyCheckbox"
                />
                <span className="shopifyCheckboxLabel">Email me with news and offers</span>
              </label>

              {/* DELIVERY SECTION */}
              <div className="shopifyDeliverySection">
                <h2 className="shopifySectionHeading">Delivery</h2>

                {/* Country / Region */}
                <div className="shopifyCountryBox">
                  <div className="shopifyCountryContent">
                    <span className="shopifyCountryLabel">Country/region</span>
                    <span className="shopifyCountryValue">Pakistan</span>
                  </div>
                  <ChevronDown size={16} className="shopifyCountryChevron" />
                </div>

                {/* First name & Last name */}
                <div className="shopifyFormRow2">
                  <div>
                    <div className="shopifyInputWrapper">
                      <input
                        type="text"
                        name="firstName"
                        className={`shopifyInput ${fieldErrors.firstName ? "hasError" : ""}`}
                        placeholder="First name"
                        value={form.firstName}
                        onChange={updateField}
                        autoComplete="given-name"
                      />
                    </div>
                    {fieldErrors.firstName && (
                      <div className="shopifyInputErrorMsg">
                        <AlertCircle size={12} /> {fieldErrors.firstName}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="shopifyInputWrapper">
                      <input
                        type="text"
                        name="lastName"
                        className={`shopifyInput ${fieldErrors.lastName ? "hasError" : ""}`}
                        placeholder="Last name"
                        value={form.lastName}
                        onChange={updateField}
                        autoComplete="family-name"
                      />
                    </div>
                    {fieldErrors.lastName && (
                      <div className="shopifyInputErrorMsg">
                        <AlertCircle size={12} /> {fieldErrors.lastName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="shopifyInputWrapper">
                  <input
                    type="text"
                    name="address"
                    className={`shopifyInput ${fieldErrors.address ? "hasError" : ""}`}
                    placeholder="Address"
                    value={form.address}
                    onChange={updateField}
                    autoComplete="address-line1"
                  />
                </div>
                {fieldErrors.address && (
                  <div className="shopifyInputErrorMsg">
                    <AlertCircle size={12} /> {fieldErrors.address}
                  </div>
                )}

                {/* Apartment, suite, etc. */}
                <div className="shopifyInputWrapper">
                  <input
                    type="text"
                    name="apartment"
                    className="shopifyInput"
                    placeholder="Apartment, suite, etc. (optional)"
                    value={form.apartment}
                    onChange={updateField}
                    autoComplete="address-line2"
                  />
                </div>

                {/* City & Postal code */}
                <div className="shopifyFormRow2">
                  <CityCombobox
                    value={form.city}
                    onChange={updateField}
                    cities={cities}
                    loading={citiesLoading}
                    disabled={citiesLoading}
                    error={fieldErrors.city}
                  />

                  <div>
                    <div className="shopifyInputWrapper">
                      <input
                        type="text"
                        name="postalCode"
                        className="shopifyInput"
                        placeholder="Postal code (optional)"
                        value={form.postalCode}
                        onChange={updateField}
                        autoComplete="postal-code"
                      />
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="shopifyInputWrapper">
                  <input
                    type="tel"
                    name="phone"
                    className={`shopifyInput shopifyInputWithIcon ${fieldErrors.phone ? "hasError" : ""}`}
                    placeholder="Phone"
                    value={form.phone}
                    onChange={updateField}
                    autoComplete="tel"
                  />
                  <span
                    className="shopifyInputHelpIcon"
                    title="In case we need to contact you about your order"
                  >
                    <HelpCircle size={16} />
                  </span>
                </div>
                {fieldErrors.phone && (
                  <div className="shopifyInputErrorMsg">
                    <AlertCircle size={12} /> {fieldErrors.phone}
                  </div>
                )}

                {/* Save info checkbox */}
                <label className="shopifyCheckboxWrapper">
                  <input
                    type="checkbox"
                    name="saveInfo"
                    checked={form.saveInfo}
                    onChange={updateField}
                    className="shopifyCheckbox"
                  />
                  <span className="shopifyCheckboxLabel">Save this information for next time</span>
                </label>
              </div>

              {/* SHIPPING METHOD SECTION */}
              <div className="shopifyShippingSection">
                <h2 className="shopifySectionHeading">Shipping method</h2>
                <div className="shopifyShippingMethodCard">
                  <span className="shopifyShippingMethodName">Standard</span>
                  <span className="shopifyShippingMethodPrice">{shippingPriceDisplay}</span>
                </div>
              </div>

              {/* PAYMENT SECTION */}
              <div className="shopifyPaymentSection">
                <h2 className="shopifySectionHeading">Payment</h2>
                <p className="shopifySectionSubtitle">All transactions are secure and encrypted.</p>

                <div className="shopifyAccordionCard">
                  {/* COD Option */}
                  <div
                    className={`shopifyAccordionRow ${paymentMethod === "cod" ? "isActive" : ""}`}
                    onClick={() => setPaymentMethod("cod")}
                  >
                    <span className={`shopifyRadioDot ${paymentMethod === "cod" ? "isSelected" : ""}`} />
                    <span className="shopifyAccordionTitle">Cash on Delivery (COD)</span>
                  </div>

                  {paymentMethod === "cod" && (
                    <div className="shopifyAccordionSubpanel">
                      <p className="shopifyAccordionNoticeText">
                        {paymentSettings.codInstructions ||
                          "You'll receive a WhatsApp message within 24 hours for order confirmation. Please note, Rs500 advance is required for confirmation and the remaining amount will be cash on delivery."}
                      </p>
                    </div>
                  )}

                  {/* Bank Deposit Option */}
                  <div
                    className={`shopifyAccordionRow hasBorderTop ${paymentMethod === PAYMENT_METHODS.FULL_ADVANCE ? "isActive" : ""}`}
                    onClick={() => setPaymentMethod(PAYMENT_METHODS.FULL_ADVANCE)}
                  >
                    <span
                      className={`shopifyRadioDot ${paymentMethod === PAYMENT_METHODS.FULL_ADVANCE ? "isSelected" : ""}`}
                    />
                    <span className="shopifyAccordionTitle">Bank Deposit</span>
                  </div>

                  {paymentMethod === PAYMENT_METHODS.FULL_ADVANCE && (
                    <div className="shopifyAccordionSubpanel">
                      <p className="shopifyAccordionNoticeText">
                        {paymentSettings.instructions ||
                          "Please transfer the total amount to our bank account. Send your payment screenshot on WhatsApp for order confirmation."}
                      </p>
                      {(paymentSettings.bankName ||
                        paymentSettings.bankTitle ||
                        paymentSettings.bankAccountNumber ||
                        paymentSettings.bankIban) && (
                        <div className="shopifyBankGrid">
                          {paymentSettings.bankName && (
                            <div className="shopifyBankRow">
                              <span className="shopifyBankLabel">Bank / Wallet</span>
                              <span className="shopifyBankVal">{paymentSettings.bankName}</span>
                            </div>
                          )}
                          {paymentSettings.bankTitle && (
                            <div className="shopifyBankRow">
                              <span className="shopifyBankLabel">Account Title</span>
                              <span className="shopifyBankVal">{paymentSettings.bankTitle}</span>
                            </div>
                          )}
                          {paymentSettings.bankAccountNumber && (
                            <div className="shopifyBankRow">
                              <span className="shopifyBankLabel">Account No.</span>
                              <span className="shopifyBankVal">{paymentSettings.bankAccountNumber}</span>
                            </div>
                          )}
                          {paymentSettings.bankIban && (
                            <div className="shopifyBankRow">
                              <span className="shopifyBankLabel">IBAN</span>
                              <span className="shopifyBankVal">{paymentSettings.bankIban}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* BILLING ADDRESS SECTION */}
              <div className="shopifyBillingSection">
                <h2 className="shopifySectionHeading">Billing address</h2>
                <div className="shopifyAccordionCard">
                  <div
                    className={`shopifyAccordionRow ${form.billingSameAsShipping ? "isActive" : ""}`}
                    onClick={() => setForm((prev) => ({ ...prev, billingSameAsShipping: true }))}
                  >
                    <span
                      className={`shopifyRadioDot ${form.billingSameAsShipping ? "isSelected" : ""}`}
                    />
                    <span className="shopifyAccordionTitle">Same as shipping address</span>
                  </div>

                  <div
                    className={`shopifyAccordionRow hasBorderTop ${!form.billingSameAsShipping ? "isActive" : ""}`}
                    onClick={() => setForm((prev) => ({ ...prev, billingSameAsShipping: false }))}
                  >
                    <span
                      className={`shopifyRadioDot ${!form.billingSameAsShipping ? "isSelected" : ""}`}
                    />
                    <span className="shopifyAccordionTitle">Use a different billing address</span>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    margin: "20px 0 0",
                    padding: "14px 16px",
                    borderRadius: "6px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* COMPLETE ORDER BUTTON */}
              <div className="shopifySubmitWrapper">
                <button
                  type="submit"
                  className="shopifyCompleteOrderBtn"
                  disabled={!cart.length || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Processing order...</span>
                    </>
                  ) : (
                    "Complete order"
                  )}
                </button>
              </div>

              {/* FOOTER POLICY LINKS */}
              <footer className="shopifyPolicyFooter">
                <Link href="/exchange-return-policy" className="shopifyPolicyLink">
                  Refund policy
                </Link>
                <Link href="/shipping-policy" className="shopifyPolicyLink">
                  Shipping
                </Link>
                <Link href="/privacy-policy" className="shopifyPolicyLink">
                  Privacy policy
                </Link>
                <Link href="/terms-and-conditions" className="shopifyPolicyLink">
                  Terms of service
                </Link>
              </footer>
            </form>
          </div>
        </section>

        {/* Right Column: Order Summary */}
        <aside
          className={`shopifyCheckoutSummaryColumn ${summaryOpen ? "isMobileExpanded" : ""}`}
        >
          <div className="shopifyCheckoutSummaryInner">
            <div className="shopifySummaryItemsList">
              {cart.map((item) => (
                <div className="shopifySummaryItem" key={`${item.id}-${item.size || "cart"}`}>
                  <div className="shopifySummaryThumbWrapper">
                    <img
                      src={item.image || "/bustaniya-logo-v2.png"}
                      alt={item.name}
                      className="shopifySummaryThumbImg"
                    />
                    <span className="shopifySummaryQtyBadge">{item.quantity}</span>
                  </div>
                  <div className="shopifySummaryItemDetails">
                    <h3 className="shopifySummaryItemTitle">{item.name}</h3>
                    <p className="shopifySummaryItemVariant">
                      {[item.size && `${item.size}`, item.color].filter(Boolean).join(" / ")}
                    </p>
                  </div>
                  <div className="shopifySummaryItemPrice">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="shopifyCostBreakdown">
              <div className="shopifyCostRow">
                <span className="shopifyCostLabel">Subtotal</span>
                <span className="shopifyCostVal">{formatPrice(subtotal)}</span>
              </div>
              <div className="shopifyCostRow">
                <span className="shopifyCostLabel">
                  Shipping
                  <span className="shopifyCostHelpIcon" title="Standard delivery across Pakistan">
                    <HelpCircle size={14} />
                  </span>
                </span>
                <span className="shopifyCostVal">{shippingPriceDisplay}</span>
              </div>
              <div className="shopifyTotalRow">
                <span className="shopifyTotalLabel">Total</span>
                <div className="shopifyTotalValContainer">
                  <span className="shopifyCurrencyCode">PKR</span>
                  <span className="shopifyTotalAmount">
                    {formatPrice(paymentAmounts.totalOrderValue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function OrderConfirmation({ order, items }) {
  const [copied, setCopied] = useState(false);
  const paymentDetails = order.paymentDetails || {};
  const isFullAdvance = normalizePaymentMethod(order.paymentMethod) === PAYMENT_METHODS.FULL_ADVANCE;
  const paymentAmount = Number(order.advanceAmount || 0);
  const payableOnDelivery = Number(order.payableOnDelivery || 0);
  const whatsappNumber = String(paymentDetails.whatsappNumber || "923053530008").replace(/\D/g, "");

  const orderRef = order.orderRef || order.order_number || order.orderId || order.id || "BST-ORDER";

  const orderItems = useMemo(() => {
    if (Array.isArray(order.items) && order.items.length > 0) return order.items;
    if (Array.isArray(items) && items.length > 0) return items;
    return [];
  }, [order.items, items]);

  const totalItemsCount = orderItems.reduce((acc, it) => acc + Number(it.quantity || 1), 0);
  const subtotal = Number(
    order.subtotal ||
      orderItems.reduce((acc, it) => acc + Number(it.price || 0) * Number(it.quantity || 1), 0)
  );
  const total = Number(order.total || order.totalOrderValue || subtotal);
  const shippingCharge = Number(
    order.shippingFee || order.deliveryCharge || (total > subtotal ? total - subtotal : 0)
  );
  const isFreeDelivery = shippingCharge === 0;

  const itemsText = orderItems
    .map(
      (item) =>
        `• ${item.name}${item.size ? ` (Size: ${item.size})` : ""}${
          item.color ? ` (Color: ${item.color})` : ""
        } x${item.quantity || 1}`
    )
    .join("\n");

  const whatsappMessage = isFullAdvance
    ? `Assalam-o-Alaikum Bustaniya! 🌸\nI have transferred Rs. ${paymentAmount.toLocaleString()} for Order #${orderRef}.\n\n📋 *Order Summary:*\n- Customer: ${
        order.customer?.fullName || order.customer?.firstName || ""
      }\n- City: ${order.customer?.city || ""}\n- Method: Full Advance Payment (Free Delivery)\n- Amount: Rs. ${paymentAmount.toLocaleString()}\n\n📦 *Items:*\n${itemsText}\n\n📎 *Payment Screenshot Attached Below:*`
    : `Assalam-o-Alaikum Bustaniya! 🌸\nI placed COD Order #${orderRef}.\n\n📋 *Order Summary:*\n- Customer: ${
        order.customer?.fullName || order.customer?.firstName || ""
      }\n- City: ${order.customer?.city || ""}\n- Method: Cash on Delivery (COD)\n- Total Payable on Delivery: Rs. ${payableOnDelivery.toLocaleString()}\n\n📦 *Items:*\n${itemsText}`;

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : "";

  const fullAddress = [
    order.customer?.address,
    order.customer?.houseNo,
    order.customer?.street,
    order.customer?.city,
  ]
    .filter(Boolean)
    .join(", ");

  const handleCopyRef = () => {
    if (orderRef && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(orderRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const customerName = order.customer?.firstName || order.customer?.fullName || "Valued Customer";

  return (
    <main className="orderConfirmationPage">
      {/* Header */}
      <header className="orderConfirmationHeader">
        <Link href="/" className="shopifyCheckoutLogoLink" aria-label="Bustaniya Home">
          <img src="/bustaniya-logo-v2.png" alt="Bustaniya" className="orderConfirmationLogo" />
        </Link>
        <span className="orderConfirmationSecureBadge">
          <ShieldCheck size={15} /> Official Order Confirmation
        </span>
      </header>

      <div className="orderConfirmationContainer">
        {/* Hero Success Block */}
        <div className="orderSuccessHero">
          <div className="orderSuccessCheckRing" aria-hidden="true">
            <Check size={32} strokeWidth={2.8} />
          </div>

          <div className="orderRefChipRow">
            <span className="orderRefNumber">ORDER #{orderRef}</span>
            <button
              type="button"
              className={`orderCopyBtn ${copied ? "copied" : ""}`}
              onClick={handleCopyRef}
              title="Copy Order Reference"
            >
              {copied ? (
                <>
                  <Check size={12} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={12} /> Copy
                </>
              )}
            </button>
          </div>

          <h1 className="orderHeroHeading">Thank you, {customerName}!</h1>

          <p className="orderHeroLead">
            {isFullAdvance ? (
              <>
                Your order is reserved. Please transfer <strong>Rs. {paymentAmount.toLocaleString()}</strong> to our official account below and share the payment screenshot on WhatsApp for instant verification.
              </>
            ) : (
              <>
                Your order has been placed successfully via <strong>Cash on Delivery (COD)</strong>. Please keep <strong>Rs. {payableOnDelivery.toLocaleString()}</strong> ready in cash for the courier rider upon delivery.
              </>
            )}
          </p>
        </div>

        {/* 4-Step Order Progress Tracker */}
        <div className="orderStepperWrap">
          <div className="orderStepperGrid">
            <div className="orderStepItem isDone">
              <div className="orderStepIconCircle">
                <Check size={16} strokeWidth={2.5} />
              </div>
              <span className="orderStepTitle">Order Placed</span>
              <span className="orderStepSubtitle">Confirmed</span>
            </div>

            <div className="orderStepItem isCurrent">
              <div className="orderStepIconCircle">
                <Clock size={16} strokeWidth={2.5} />
              </div>
              <span className="orderStepTitle">Verification &amp; Packing</span>
              <span className="orderStepSubtitle">In Progress (24h)</span>
            </div>

            <div className="orderStepItem isPending">
              <div className="orderStepIconCircle">
                <Truck size={16} />
              </div>
              <span className="orderStepTitle">Courier Handover</span>
              <span className="orderStepSubtitle">PostEx Express</span>
            </div>

            <div className="orderStepItem isPending">
              <div className="orderStepIconCircle">
                <Package size={16} />
              </div>
              <span className="orderStepTitle">Doorstep Delivery</span>
              <span className="orderStepSubtitle">3-5 Working Days</span>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="orderConfirmationGrid">
          {/* Left Column: Logistics, Details & Support */}
          <div className="orderLeftColumn">
            {/* Advance Bank Transfer Box (if Full Advance) */}
            {isFullAdvance && (
              <div className="orderCard" style={{ border: "1.5px solid #bbf7d0", background: "#f0fdf4" }}>
                <div className="orderCardHeader">
                  <Receipt size={18} className="orderCardHeaderIcon" style={{ color: "#166534" }} />
                  <h2 className="orderCardHeaderTitle" style={{ color: "#166534" }}>
                    Bank Transfer Details
                  </h2>
                </div>
                <div className="orderCustomerGrid">
                  <div>
                    <span className="orderCustomerColLabel">Bank Name</span>
                    <p className="orderCustomerColValue">{paymentDetails.bankName || "Meezan Bank"}</p>
                  </div>
                  <div>
                    <span className="orderCustomerColLabel">Account Title</span>
                    <p className="orderCustomerColValue">{paymentDetails.accountTitle || "Bustaniya Official"}</p>
                  </div>
                  <div>
                    <span className="orderCustomerColLabel">Account Number</span>
                    <p className="orderCustomerColValue">{paymentDetails.accountNumber || "01020304050607"}</p>
                  </div>
                  <div>
                    <span className="orderCustomerColLabel">Amount Required</span>
                    <p className="orderCustomerColValue" style={{ color: "#166534", fontWeight: 800 }}>
                      Rs. {paymentAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery & Dispatch Timeline */}
            <div className="orderCard">
              <div className="orderCardHeader">
                <Truck size={18} className="orderCardHeaderIcon" />
                <h2 className="orderCardHeaderTitle">Delivery &amp; Tracking Timeline</h2>
              </div>
              <div className="orderLogisticsList">
                <div className="orderLogisticItem">
                  <span className="orderLogisticDot" />
                  <div>
                    <strong>Express Tracked Courier:</strong>
                    <p>Your parcel will be dispatched via <strong>PostEx Courier</strong> with nationwide door-to-door tracking.</p>
                  </div>
                </div>
                <div className="orderLogisticItem">
                  <span className="orderLogisticDot" />
                  <div>
                    <strong>Estimated Delivery Window:</strong>
                    <p>3 to 5 working days from order confirmation.</p>
                  </div>
                </div>
                <div className="orderLogisticItem">
                  <span className="orderLogisticDot" />
                  <div>
                    <strong>Live Tracking SMS:</strong>
                    <p>
                      You will receive an official SMS from PostEx with your tracking link as soon as the rider scans the parcel.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer & Shipping Details */}
            <div className="orderCard">
              <div className="orderCardHeader">
                <MapPin size={18} className="orderCardHeaderIcon" />
                <h2 className="orderCardHeaderTitle">Customer &amp; Shipping Details</h2>
              </div>
              <div className="orderCustomerGrid">
                <div>
                  <span className="orderCustomerColLabel">Contact Phone</span>
                  <p className="orderCustomerColValue">{order.customer?.phone || "—"}</p>
                </div>
                <div>
                  <span className="orderCustomerColLabel">Email Address</span>
                  <p className="orderCustomerColValue">{order.customer?.email || "Not provided"}</p>
                </div>
                <div>
                  <span className="orderCustomerColLabel">Shipping Destination</span>
                  <p className="orderCustomerColValue">{fullAddress || order.customer?.city || "Pakistan"}</p>
                </div>
                <div>
                  <span className="orderCustomerColLabel">Payment Method</span>
                  <p className="orderCustomerColValue">
                    {isFullAdvance ? "Bank Deposit / Online Transfer" : "Cash on Delivery (COD)"}
                  </p>
                </div>
              </div>
            </div>

            {/* Dedicated WhatsApp Support Card */}
            {whatsappHref && (
              <div className="orderWhatsAppHelpCard">
                <div className="orderWhatsAppHelpHeader">
                  <MessageCircle size={22} color="#166534" />
                  <h3 className="orderWhatsAppHelpTitle">Need Help or Size Adjustment?</h3>
                </div>
                <p className="orderWhatsAppHelpText">
                  {isFullAdvance
                    ? "Tap below to open WhatsApp with your order details pre-filled and share your payment receipt."
                    : "Have a question about your order, special delivery timing, or want to update sizing? Our concierge is available on WhatsApp."}
                </p>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="orderWhatsAppActionBtn"
                >
                  <MessageCircle size={17} />
                  {isFullAdvance ? "Send Payment Proof on WhatsApp" : "Chat with Bustaniya Concierge"}
                </a>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary & Amount Due */}
          <div className="orderRightColumn">
            <div className="orderCard orderSummarySticky">
              <div className="orderCardHeader">
                <ShoppingBag size={18} className="orderCardHeaderIcon" />
                <h2 className="orderCardHeaderTitle">
                  Order Summary ({totalItemsCount} {totalItemsCount === 1 ? "item" : "items"})
                </h2>
              </div>

              {/* Items List */}
              <div className="orderItemsList">
                {orderItems.map((item, idx) => {
                  const itemImg = item.image
                    ? optimizedImageUrl(item.image, CLOUDINARY_IMAGE_PRESETS.thumbnail)
                    : "/bustaniya-logo-v2.png";
                  const itemQty = Number(item.quantity || 1);
                  const itemPrice = Number(item.price || 0);
                  const lineTotal = itemPrice * itemQty;

                  return (
                    <div className="orderItemRow" key={`confirm-item-${idx}`}>
                      <div className="orderItemThumbWrap">
                        <img src={itemImg} alt={item.name} className="orderItemThumbImg" />
                        <span className="orderItemQtyBadge">{itemQty}</span>
                      </div>
                      <div className="orderItemContent">
                        <h4 className="orderItemName">{item.name}</h4>
                        <div className="orderItemMeta">
                          {item.size && <span className="orderItemMetaPill">Size: {item.size}</span>}
                          {item.color && <span className="orderItemMetaPill">{item.color}</span>}
                        </div>
                      </div>
                      <span className="orderItemPrice">Rs. {lineTotal.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Cost Breakdown */}
              <div className="orderBreakdownList">
                <div className="orderBreakdownRow">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="orderBreakdownRow">
                  <span>Nationwide Shipping</span>
                  <span>
                    {isFreeDelivery ? (
                      <strong style={{ color: "#15803d" }}>FREE</strong>
                    ) : (
                      `Rs. ${shippingCharge.toLocaleString()}`
                    )}
                  </span>
                </div>
                <div className="orderBreakdownRow isTotal">
                  <span>Total Order Value</span>
                  <span>Rs. {total.toLocaleString()}</span>
                </div>
              </div>

              {/* High-Contrast Amount Due Bar */}
              <div className="orderDueBar">
                <div className="orderDueLabel">
                  <span className="orderDueLabelTitle">
                    {isFullAdvance ? "Total Advance Required" : "Payable on Delivery"}
                  </span>
                  <span className="orderDueLabelSub">
                    {isFullAdvance ? "Via Bank Transfer / Nayapay" : "Cash to courier rider upon parcel receipt"}
                  </span>
                </div>
                <span className="orderDueAmount">
                  Rs. {(isFullAdvance ? paymentAmount : payableOnDelivery).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="orderActionsBar">
          <Link href="/" className="orderPrimaryBtn">
            Continue Shopping <ArrowRight size={15} />
          </Link>

          <Link href={`/track-order?ref=${encodeURIComponent(orderRef)}`} className="orderSecondaryBtn">
            <Truck size={15} /> Track Your Order
          </Link>

          <button type="button" onClick={handlePrint} className="orderSecondaryBtn">
            <Printer size={15} /> Print Receipt
          </button>
        </div>
      </div>
    </main>
  );
}
