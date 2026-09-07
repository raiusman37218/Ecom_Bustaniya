"use client";

import { usePathname } from "next/navigation";

function normaliseWhatsAppNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function WhatsAppSupportButton({ phoneNumber, storeName = "Bustaniya" }) {
  const pathname = usePathname();
  const number = normaliseWhatsAppNumber(phoneNumber || "923227811989");
  if (!number) return null;

  // Completely remove floating WhatsApp button on checkout and admin pages
  const isCheckout = pathname === "/checkout" || pathname?.startsWith("/checkout");
  const isAdmin = pathname === "/admin" || pathname?.startsWith("/admin");
  if (isCheckout || isAdmin) return null;

  const message = `Assalam-o-Alaikum, I need help with ${storeName}.`;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      className="whatsappSupportButton"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp (+92 322 7811989)"
    >
      <img
        src="/whatsapp-icon.png"
        alt="WhatsApp Support"
        className="whatsappSupportIcon"
        width={60}
        height={60}
        loading="eager"
      />
      <span className="whatsappTooltip">Chat on WhatsApp</span>
    </a>
  );
}
