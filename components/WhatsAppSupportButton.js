"use client";

import { usePathname } from "next/navigation";

function WhatsAppBrandIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.77 14.19c-.24.68-1.4 1.25-1.94 1.33-.51.07-1.18.11-3.41-.81-2.85-1.18-4.69-4.08-4.83-4.27-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09 1-2.37.24-.28.53-.35.71-.35.18 0 .35 0 .5.01.16.01.37-.06.58.44.22.52.74 1.82.81 1.96.07.14.12.3.02.49-.09.2-.14.32-.28.49-.14.17-.3.38-.43.51-.14.14-.29.3-.12.59.16.29.74 1.21 1.58 1.96 1.09.97 2.01 1.28 2.28 1.44.28.16.44.14.61-.05.17-.19.73-.85.92-1.14.19-.29.39-.24.65-.15.26.09 1.66.78 1.94.92.29.14.48.21.55.33.07.12.07.72-.17 1.4z" />
    </svg>
  );
}

function normaliseWhatsAppNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function WhatsAppSupportButton({ phoneNumber, storeName = "Bustaniya" }) {
  const pathname = usePathname();
  const number = normaliseWhatsAppNumber(phoneNumber);
  if (!number) return null;

  // Completely remove floating WhatsApp button on checkout and order confirmation pages
  const isCheckout = pathname === "/checkout" || pathname?.startsWith("/checkout");
  if (isCheckout) return null;

  const message = `Assalam-o-Alaikum, I need help with ${storeName}.`;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      className="whatsappSupportButton"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
    >
      <WhatsAppBrandIcon />
      <span>WhatsApp us</span>
    </a>
  );
}
