"use client";

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

const DEFAULT_CATEGORY_NAV = [
  { name: "Kurtis", slug: "kurtis" },
  { name: "Co-ord Sets", slug: "coord-sets" },
  { name: "Bottoms & Trousers", slug: "bottoms" },
  { name: "3 Piece Suits", slug: "3-piece-suits" },
];

export default function SiteFooter({ categories = [], storeSettings = DEFAULT_STORE_SETTINGS }) {
  const rawWhatsapp = String(
    storeSettings?.paymentSettings?.whatsappNumber ||
    storeSettings?.whatsappNumber ||
    DEFAULT_STORE_SETTINGS.paymentSettings?.whatsappNumber ||
    "923053530008"
  ).replace(/[^0-9]/g, "");

  const instagramRaw = String(
    storeSettings?.instagramHandle ||
    storeSettings?.instagramUrl ||
    DEFAULT_STORE_SETTINGS.instagramHandle ||
    "@bustaniya_"
  ).trim();

  const instagramUrl = instagramRaw.startsWith("http")
    ? instagramRaw
    : `https://www.instagram.com/${instagramRaw.replace("@", "")}/`;

  const categoryList = (categories || []).filter((c) => c && !c.parentSlug);
  const displayCategories = categoryList.length ? categoryList : DEFAULT_CATEGORY_NAV;

  return (
    <footer id="footer" className="siteFooterWrapper">
      {/* Main Multi-Column Links Section */}
      <div className="footerMainGrid">
        {/* Brand Bio Column */}
        <div className="footerBrandCol">
          <a className="footerLogoLink" href="/" aria-label="Bustaniya home">
            <img src="/bustaniya-logo-v2.png" alt="Bustaniya" />
          </a>
          <p className="footerTagline">Pakistani clothing, rooted in grace.</p>
          <span className="footerBio">
            Thoughtfully designed eastern silhouettes crafted with pure fabrics, fine embroidery, and modern tailoring for everyday elegance and festive occasions.
          </span>
          <div className="footerTrustPills">
            <span><Truck size={13} /> Nationwide Delivery</span>
            <span><ShieldCheck size={13} /> Return &amp; Exchange Policy</span>
          </div>
        </div>

        {/* Column 1: Shop */}
        <div className="footerNavCol">
          <h4 className="footerColHeading">Shop</h4>
          <ul className="footerNavList">
            <li><a href="/">Home</a></li>
            {displayCategories.map((category) => (
              <li key={category.slug}>
                <a href={`/category/${category.slug}`}>{category.name}</a>
              </li>
            ))}
            <li><a href="/cart">Shopping Bag</a></li>
          </ul>
        </div>

        {/* Column 2: Customer Care */}
        <div className="footerNavCol">
          <h4 className="footerColHeading">Customer Care</h4>
          <ul className="footerNavList">
            <li><a href="/contact">Contact Us</a></li>
            <li><a href="/shipping-policy">Shipping &amp; Delivery Info</a></li>
            <li><a href="/exchange-return-policy">Return &amp; Exchange Policy</a></li>
            <li>
              <a
                href={rawWhatsapp ? `https://wa.me/${rawWhatsapp}?text=${encodeURIComponent("Assalam-o-Alaikum Bustaniya! I need assistance with an order.")}` : "https://wa.me/923053530008"}
                target="_blank"
                rel="noopener noreferrer"
              >
                Order on WhatsApp
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Company */}
        <div className="footerNavCol">
          <h4 className="footerColHeading">Company</h4>
          <ul className="footerNavList">
            <li><a href="/about">About Bustaniya</a></li>
            <li><a href="/privacy-policy">Privacy Policy</a></li>
            <li><a href="/terms-and-conditions">Terms &amp; Conditions</a></li>
            <li><a href="/shipping-policy">Payment Methods &amp; COD</a></li>
          </ul>
          <address className="footerCompanyDetails">
            <strong>BUSTANIYA LTD</strong>
            <span>Company no. 17414024</span>
            <span>Registered office</span>
            <span>Unit A1099 Siu Office, 4–6 Greatorex Street, London, United Kingdom, E1 5NF</span>
            <span>SIC 47910 — Retail sale via mail order houses or via Internet</span>
          </address>
        </div>

        {/* Column 4: Connect With Us */}
        <div className="footerNavCol footerSocialCol">
          <h4 className="footerColHeading">Connect With Us</h4>
          <p className="footerConnectText">Follow our journey and get in touch with our concierge team:</p>
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

            {rawWhatsapp && (
              <a
                href={`https://wa.me/${rawWhatsapp}?text=${encodeURIComponent("Assalam-o-Alaikum Bustaniya! 🌸")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="footerSocialItem"
                aria-label="WhatsApp Support"
              >
                <div className="socialIconWrap socialIcon--whatsapp">
                  <WhatsAppIcon size={16} />
                </div>
                <div className="socialDetails">
                  <b>WhatsApp Support</b>
                  <small>+92 305 3530008</small>
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
            &copy; {new Date().getFullYear()} Bustaniya. Crafted with pride in Pakistan. All rights reserved.
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
