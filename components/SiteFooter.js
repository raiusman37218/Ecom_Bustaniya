"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";

function formatWhatsAppNumber(phone) {
  let cleaned = String(phone || "").replace(/\D/g, "");
  if (!cleaned) return "923053530008";
  if (cleaned.startsWith("0")) cleaned = "92" + cleaned.slice(1);
  else if (cleaned.startsWith("3") && cleaned.length === 10) cleaned = "92" + cleaned;
  return cleaned;
}

const FALLBACK_SHOP_NAV = [
  { name: "Kurtis", slug: "kurtis" },
  { name: "Co-ord Sets", slug: "coord-sets" },
  { name: "3 Piece Suits", slug: "3-piece-suits" },
  { name: "Bottoms", slug: "bottoms" },
];

/**
 * Footer + newsletter band, ported from the imported design.
 *
 * The import puts the newsletter inside the shared chrome, so it appears on
 * every page. Here it stays switchable: the home page already renders an
 * admin-ordered newsletter section, so it passes showNewsletter={false} and
 * the owner keeps one place to turn it on or off.
 */
export default function SiteFooter({
  categories = [],
  storeSettings = DEFAULT_STORE_SETTINGS,
  showNewsletter = true,
  /** Supply a handler once an email-capture endpoint exists. Without one the
   *  form stays inert rather than claiming a subscription that never happened. */
  onSubscribe = null,
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ done: false, err: "" });

  const rawWhatsapp = formatWhatsAppNumber(
    storeSettings?.paymentSettings?.whatsappNumber ||
    storeSettings?.whatsappNumber ||
    DEFAULT_STORE_SETTINGS.paymentSettings?.whatsappNumber ||
    "923053530008"
  );

  const supportEmail = String(storeSettings?.supportEmail || storeSettings?.email || "support@bustaniya.pk").trim();

  const instagramRaw = String(
    storeSettings?.instagramHandle || storeSettings?.instagramUrl || DEFAULT_STORE_SETTINGS.instagramHandle || "@bustaniya_"
  ).trim();
  const instagramUrl = instagramRaw.startsWith("http")
    ? instagramRaw
    : `https://www.instagram.com/${instagramRaw.replace("@", "")}/`;

  const tiktokRaw = String(
    storeSettings?.tiktokHandle || storeSettings?.tiktokUrl || DEFAULT_STORE_SETTINGS.tiktokHandle || "@bustaniya_"
  ).trim();
  const tiktokUrl = tiktokRaw.startsWith("http")
    ? tiktokRaw
    : `https://www.tiktok.com/${tiktokRaw.startsWith("@") ? tiktokRaw : `@${tiktokRaw}`}`;

  // Footer shop column follows admin: top-level categories flagged for the
  // footer, falling back to every top-level category, then to the brand four.
  const topLevel = (categories || []).filter((category) => category && !category.parentSlug);
  const flagged = topLevel.filter((category) => category.showInFooter);
  const shopNav = (flagged.length ? flagged : topLevel).map((category) => ({
    name: category.name,
    slug: category.slug,
  }));
  const displayCategories = shopNav.length ? shopNav : FALLBACK_SHOP_NAV;

  async function handleSubscribe(event) {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setState({ done: false, err: "Enter a valid email address." });
      return;
    }
    if (typeof onSubscribe !== "function") {
      try {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: value, source: "footer" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState({ done: false, err: data?.error || "Subscription failed. Please try again." });
          return;
        }
        setState({ done: true, err: "" });
        setEmail("");
        return;
      } catch {
        setState({ done: false, err: "Something went wrong. Please try again." });
        return;
      }
    }
    try {
      await onSubscribe(value);
      setState({ done: true, err: "" });
      setEmail("");
    } catch {
      setState({ done: false, err: "Something went wrong. Please try again." });
    }
  }

  return (
    <>
      {showNewsletter && (
        <section className="bs-st-nl" aria-labelledby="bs-st-nl-heading">
          <div className="bs-st-nl__inner">
            <h2 id="bs-st-nl-heading" className="bs-st-display bs-st-display--xl">
              <span style={{ display: "block" }}>Stay in</span>
              <span style={{ display: "block" }}>the loop.</span>
            </h2>

            <div className="bs-st-nl__copy">
              <p>Get first access to new collections, exclusive drops and private offers.</p>

              {state.done && (
                <p className="bs-st-nl__done" role="status">
                  <Check size={18} /> You’re on the list! Use code <strong>WELCOME10</strong> for 10% off.
                </p>
              )}

              <form className="bs-st-nl__form" onSubmit={handleSubscribe} noValidate>
                <label className="bs-st-visually-hidden" htmlFor="bs-st-nl-email">Email address</label>
                <input
                  id="bs-st-nl-email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <button type="submit">
                  JOIN US <ArrowRight size={16} />
                </button>
              </form>

              {state.err && <span className="bs-st-nl__err" role="alert">{state.err}</span>}

              <span className="bs-st-nl__fine">
                By subscribing, you agree to our <Link href="/privacy-policy">Privacy Policy</Link>.
              </span>
            </div>
          </div>
        </section>
      )}

      <footer id="footer" className="bs-st-footer">
        <div className="bs-st-footer__inner">
          <div className="bs-st-footer__cols">
            <div className="bs-st-footer__brand">
              <Link href="/" aria-label="Bustaniya home" style={{ lineHeight: 0 }}>
                <img src="/bustaniya-logo-v2.png" alt="Bustaniya" width={180} height={48} loading="lazy" />
              </Link>
              <p>Rooted in tradition. Made for now.</p>
            </div>

            <nav className="bs-st-footer__nav" aria-label="Shop">
              <span>SHOP</span>
              {displayCategories.map((category) => (
                <Link key={category.slug} href={`/category/${category.slug}`}>{category.name}</Link>
              ))}
              <Link href="/cart">Shopping Bag</Link>
            </nav>

            <nav className="bs-st-footer__nav" aria-label="Help">
              <span>HELP</span>
              <Link href="/contact">Contact</Link>
              <Link href="/shipping-policy">Shipping</Link>
              <Link href="/exchange-return-policy">Exchanges</Link>
              <Link href="/faqs">FAQ</Link>
              <Link href="/track-order">Track Order</Link>
            </nav>

            <nav className="bs-st-footer__nav" aria-label="Company">
              <span>COMPANY</span>
              <Link href="/about">About</Link>
              <a
                href={`https://wa.me/${rawWhatsapp}?text=${encodeURIComponent("Assalam-o-Alaikum Bustaniya! I need assistance with an order.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
              <a href={`mailto:${supportEmail}`}>Email Support</a>
              <Link href="/privacy-policy">Privacy</Link>
              <Link href="/terms-and-conditions">Terms</Link>
            </nav>
          </div>

          <div className="bs-st-footer__mark" aria-hidden="true">Bustaniya</div>

          <div className="bs-st-footer__legal">
            <span>© {new Date().getFullYear()} Bustaniya</span>
            <span className="bs-st-footer__social">
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer">INSTAGRAM</a>
              <a href={tiktokUrl} target="_blank" rel="noopener noreferrer">TIKTOK</a>
              <a
                href={`https://wa.me/${rawWhatsapp}?text=${encodeURIComponent("Assalam-o-Alaikum Bustaniya! 🌸")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WHATSAPP
              </a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
