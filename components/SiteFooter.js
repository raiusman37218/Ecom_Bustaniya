"use client";

import Link from "next/link";
import { ShieldCheck, Truck } from "lucide-react";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";

function WhatsAppIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.77 14.19c-.24.68-1.4 1.25-1.94 1.33-.51.07-1.18.11-3.41-.81-2.85-1.18-4.69-4.08-4.83-4.27-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09 1-2.37.24-.28.53-.35.71-.35.18 0 .35 0 .5.01.16.01.37-.06.58.44.22.52.74 1.82.81 1.96.07.14.12.3.02.49-.09.2-.14.32-.28.49-.14.17-.3.38-.43.51-.14.14-.29.3-.12.59.16.29.74 1.21 1.58 1.96 1.09.97 2.01 1.28 2.28 1.44.28.16.44.14.61-.05.17-.19.73-.85.92-1.14.19-.29.39-.24.65-.15.26.09 1.66.78 1.94.92.29.14.48.21.55.33.07.12.07.72-.17 1.4z" />
    </svg>
  );
}

function InstagramIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function TikTokIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.3 6.3 0 0 0 1.89-4.48V8.71a8.21 8.21 0 0 0 4.88 1.6V6.86a4.88 4.88 0 0 1-1-.17z" />
    </svg>
  );
}

function formatWhatsAppNumber(phone) {
  let cleaned = String(phone || "").replace(/\D/g, "");
  if (!cleaned) return "923053530008";
  if (cleaned.startsWith("0")) cleaned = "92" + cleaned.slice(1);
  else if (cleaned.startsWith("3") && cleaned.length === 10) cleaned = "92" + cleaned;
  return cleaned;
}

const STANDARD_CATEGORY_NAV = [
  { name: "Kurtis", slug: "kurtis" },
  { name: "Co-ord Sets", slug: "coord-sets" },
  { name: "3 Piece Suits", slug: "3-piece-suits" },
  { name: "Bottoms & Trousers", slug: "bottoms" },
];

export default function SiteFooter({ categories = [], storeSettings = DEFAULT_STORE_SETTINGS }) {
  const rawWhatsapp = formatWhatsAppNumber(
    storeSettings?.paymentSettings?.whatsappNumber ||
    storeSettings?.whatsappNumber ||
    DEFAULT_STORE_SETTINGS.paymentSettings?.whatsappNumber ||
    "923053530008"
  );

  const supportEmail = String(
    storeSettings?.supportEmail ||
    storeSettings?.email ||
    "support@bustaniya.pk"
  ).trim();

  const instagramRaw = String(
    storeSettings?.instagramHandle ||
    storeSettings?.instagramUrl ||
    DEFAULT_STORE_SETTINGS.instagramHandle ||
    "@bustaniya_"
  ).trim();

  const instagramUrl = instagramRaw.startsWith("http")
    ? instagramRaw
    : `https://www.instagram.com/${instagramRaw.replace("@", "")}/`;

  const tiktokRaw = String(
    storeSettings?.tiktokHandle ||
    storeSettings?.tiktokUrl ||
    DEFAULT_STORE_SETTINGS.tiktokHandle ||
    "@bustaniya_"
  ).trim();

  const tiktokUrl = tiktokRaw.startsWith("http")
    ? tiktokRaw
    : `https://www.tiktok.com/${tiktokRaw.startsWith("@") ? tiktokRaw : `@${tiktokRaw}`}`;

  const displayCategories = STANDARD_CATEGORY_NAV;

  return (
    <footer id="footer" className="siteFooterWrapper">
      {/* Main Multi-Column Links Section */}
      <div className="footerMainGrid">
        {/* Brand Bio Column */}
        <div className="footerBrandCol">
          <Link className="footerLogoLink" href="/" aria-label="Bustaniya home">
            <img src="/bustaniya-logo-v2.png" alt="Bustaniya" />
          </Link>
          <p className="footerTagline">Pakistani clothing, rooted in grace.</p>
          <span className="footerBio">
            Thoughtfully designed eastern silhouettes crafted with pure fabrics, fine embroidery, and modern tailoring for everyday elegance and festive occasions.
          </span>
          <div className="footerTrustPills">
            <span><Truck size={13} /> Nationwide Delivery</span>
            <span><ShieldCheck size={13} /> Return &amp; Exchange Policy</span>
          </div>
        </div>

        {/* Column 1: Shop (Uniform across all pages) */}
        <div className="footerNavCol">
          <h4 className="footerColHeading">Shop</h4>
          <ul className="footerNavList">
            <li><Link href="/">Home</Link></li>
            {displayCategories.map((category) => (
              <li key={category.slug}>
                <Link href={`/category/${category.slug}`}>{category.name}</Link>
              </li>
            ))}
            <li><Link href="/custom-order">✨ Custom Dress &amp; Tailoring</Link></li>
            <li><Link href="/cart">Shopping Bag</Link></li>
          </ul>
        </div>

        {/* Column 2: Customer Care */}
        <div className="footerNavCol">
          <h4 className="footerColHeading">Customer Care</h4>
          <ul className="footerNavList">
            <li><Link href="/contact">Contact Us</Link></li>
            <li><Link href="/shipping-policy">Shipping &amp; Delivery Info</Link></li>
            <li><Link href="/exchange-return-policy">Return &amp; Exchange Policy</Link></li>
            <li>
              <a
                href={`https://wa.me/${rawWhatsapp}?text=${encodeURIComponent("Assalam-o-Alaikum Bustaniya! I need assistance with an order.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Order on WhatsApp
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Contact & Help */}
        <div className="footerNavCol">
          <h4 className="footerColHeading">Quick Help</h4>
          <ul className="footerNavList">
            <li><Link href="/track-order">Track My Order</Link></li>
            <li><Link href="/faqs">Frequently Asked Questions</Link></li>
            <li><a href={`mailto:${supportEmail}`}>Email Support</a></li>
            <li><Link href="/privacy-policy">Privacy Policy</Link></li>
            <li><Link href="/terms-and-conditions">Terms of Service</Link></li>
          </ul>
        </div>

        {/* Column 4: Stay Connected */}
        <div className="footerSocialCol">
          <h4 className="footerColHeading">Connect With Us</h4>
          <p className="footerSocialSubtitle">Reach out directly on social or chat with our team.</p>
          <div className="footerSocialList">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footerSocialItem"
              aria-label="Instagram"
            >
              <div className="socialIconWrap socialIcon--instagram">
                <InstagramIcon size={16} />
              </div>
              <div className="socialDetails">
                <b>Instagram</b>
                <small>{instagramRaw.startsWith("@") ? instagramRaw : "@bustaniya_"}</small>
              </div>
            </a>

            <a
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footerSocialItem"
              aria-label="TikTok"
            >
              <div className="socialIconWrap socialIcon--tiktok">
                <TikTokIcon size={16} />
              </div>
              <div className="socialDetails">
                <b>TikTok</b>
                <small>{tiktokRaw.startsWith("@") ? tiktokRaw : `@${tiktokRaw}`}</small>
              </div>
            </a>

            {rawWhatsapp && (
              <a
                href={`https://wa.me/${rawWhatsapp}?text=${encodeURIComponent("Assalam-o-Alaikum Bustaniya! 🌸")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="footerSocialItem"
                aria-label="WhatsApp Support"
              >
                <div className="socialIconWrap socialIcon--whatsapp">
                  <img src="/whatsapp-icon.png" alt="WhatsApp" width={20} height={20} style={{ display: "block", objectFit: "contain" }} />
                </div>
                <div className="socialDetails">
                  <b>WhatsApp Support</b>
                  <small>
                    {rawWhatsapp.startsWith("92")
                      ? `+92 ${rawWhatsapp.slice(2, 5)} ${rawWhatsapp.slice(5)}`
                      : rawWhatsapp.startsWith("0")
                      ? `${rawWhatsapp.slice(0, 4)} ${rawWhatsapp.slice(4)}`
                      : `+92 ${rawWhatsapp}`}
                  </small>
                </div>
              </a>
            )}
          </div>
          <div className="footerWorkingHours">
            <small>Support Hours: Mon – Sat, 10:00 AM – 7:00 PM PKT</small>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright, Payment Badges & Policies */}
      <div className="footerBottomBar">
        <div className="footerBottomContent">
          <p className="footerCopyright">
            &copy; {`${new Date().getFullYear()} Bustaniya`}. Crafted with pride in Pakistan. All rights reserved.
          </p>

          <div className="footerPaymentBadges">
            <span className="paymentPill">Cash on Delivery</span>
            <span className="paymentPill">Bank Transfer</span>
            <span className="paymentPill">Secure Checkout</span>
          </div>

          <div className="footerLegalLinks">
            <a href="/privacy-policy">Privacy</a>
            <span>&middot;</span>
            <a href="/terms-and-conditions">Terms</a>
            <span>&middot;</span>
            <a href="/shipping-policy">Shipping</a>
            <span>&middot;</span>
            <a href="/exchange-return-policy">Return &amp; Exchange</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
