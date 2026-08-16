import { MessageCircle } from "lucide-react";

function normaliseWhatsAppNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function WhatsAppSupportButton({ phoneNumber, storeName = "Bustaniya" }) {
  const number = normaliseWhatsAppNumber(phoneNumber);
  if (!number) return null;

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
      <MessageCircle aria-hidden="true" size={22} strokeWidth={2.25} />
      <span>WhatsApp us</span>
    </a>
  );
}
