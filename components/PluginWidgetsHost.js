"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Clock, Copy, Check, X, Sparkles } from "lucide-react";

export default function PluginWidgetsHost({ initialWidgets = [] }) {
  const [widgets, setWidgets] = useState(initialWidgets);
  const [copiedCode, setCopiedCode] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    // If we didn't get initialWidgets or want to refresh on client mount
    if (!initialWidgets || initialWidgets.length === 0) {
      fetch("/api/plugins/active-widgets")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.widgets) setWidgets(data.widgets);
        })
        .catch(() => {});
    }
  }, [initialWidgets]);

  // Flash Sale Timer
  const flashSale = widgets.find((w) => w.id === "flash-sale-countdown");
  const whatsApp = widgets.find((w) => w.id === "whatsapp-live-chat");

  useEffect(() => {
    if (!flashSale) return;
    const minutes = Number(flashSale.settings?.countdownMinutes || 180);
    let totalSeconds = minutes * 60;

    const interval = setInterval(() => {
      totalSeconds -= 1;
      if (totalSeconds <= 0) {
        clearInterval(interval);
        setTimeLeft("00:00:00");
        return;
      }
      const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
      const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
      const s = String(totalSeconds % 60).padStart(2, "0");
      setTimeLeft(`${h}:${m}:${s}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [flashSale]);

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <>
      {/* 1. Flash Sale & Promo Banner Widget */}
      {flashSale && !bannerDismissed && (
        <div
          className="pluginPromoBanner"
          style={{ background: flashSale.settings?.bannerBackground || "#173d29" }}
        >
          <div className="pluginPromoBannerContent">
            <span className="pluginPromoBadge">
              <Sparkles size={12} />
              <span>FLASH SALE</span>
            </span>
            <span className="pluginPromoText">{flashSale.settings?.bannerText}</span>

            {timeLeft && (
              <div className="pluginPromoTimer">
                <Clock size={12} />
                <span>Ends in: <b>{timeLeft}</b></span>
              </div>
            )}

            {flashSale.settings?.couponCode && (
              <button
                type="button"
                className="pluginPromoCoupon"
                onClick={() => handleCopyCode(flashSale.settings.couponCode)}
                title="Click to copy promo code"
              >
                <span>Code: <b>{flashSale.settings.couponCode}</b></span>
                {copiedCode ? <Check size={12} /> : <Copy size={12} />}
              </button>
            )}

            {flashSale.settings?.buttonLabel && (
              <a
                href={flashSale.settings.buttonLink || "/#products"}
                className="pluginPromoButton"
              >
                {flashSale.settings.buttonLabel} →
              </a>
            )}
          </div>

          <button
            type="button"
            className="pluginPromoDismiss"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss announcement"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. Floating WhatsApp Widget */}
      {whatsApp && (
        <div
          className={`pluginWhatsAppFloat ${whatsApp.settings?.position === "bottom-left" ? "pos-left" : "pos-right"}`}
        >
          <a
            href={`https://wa.me/${encodeURIComponent(whatsApp.settings?.phoneNumber || "923053530008")}?text=${encodeURIComponent(whatsApp.settings?.welcomeMessage || "Salam! I have a question about Bustaniya.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pluginWhatsAppBtn"
            style={{ background: whatsApp.settings?.accentColor || "#25D366" }}
            aria-label="Chat on WhatsApp"
          >
            {whatsApp.settings?.showNotificationBadge && <span className="pluginWhatsAppPulse" />}
            <MessageSquare size={22} color="#ffffff" />
            <span className="pluginWhatsAppTooltip">Chat with Bustaniya</span>
          </a>
        </div>
      )}
    </>
  );
}
