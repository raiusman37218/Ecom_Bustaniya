"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Package, Search, MessageSquare, Truck, ArrowRight, ShieldCheck, Lock } from "lucide-react";

export default function HeaderAccountModal({ isOpen, onClose, storeSettings }) {
  const [orderQuery, setOrderQuery] = useState("");
  const [savedCustomer, setSavedCustomer] = useState(null);
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  const supportWhatsapp = String(
    storeSettings?.paymentSettings?.whatsappNumber ||
    storeSettings?.whatsappNumber ||
    "923053530008"
  ).replace(/[^0-9]/g, "");

  useEffect(() => {
    if (!isOpen) {
      setTrackResult(null);
      setTrackError("");
      return;
    }

    try {
      const savedInfo = localStorage.getItem("bustaniya_last_checkout_fields");
      if (savedInfo) {
        setSavedCustomer(JSON.parse(savedInfo));
      }
    } catch {}

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function handleTrackSubmit(e) {
    e.preventDefault();
    const clean = orderQuery.trim();
    if (!clean) return;

    setTrackLoading(true);
    setTrackError("");
    setTrackResult(null);

    try {
      // Lookup order by order number or phone
      const res = await fetch(`/api/admin/orders?search=${encodeURIComponent(clean)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        const orders = data.orders || [];
        if (orders.length > 0) {
          setTrackResult(orders[0]);
          return;
        }
      }
      
      // Fallback: direct WhatsApp tracking option
      setTrackResult({
        order_number: clean,
        fallback: true,
      });
    } catch {
      setTrackResult({
        order_number: clean,
        fallback: true,
      });
    } finally {
      setTrackLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="headerAccountModalBackdrop" onClick={onClose} role="presentation">
      <div className="headerAccountModalDialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Customer Account">
        {/* Header */}
        <div className="headerAccountModalHeader">
          <div className="headerAccountModalTitleWrap">
            <Package size={20} className="headerAccountModalIcon" />
            <h3>My Account &amp; Order Status</h3>
          </div>
          <button type="button" className="headerAccountModalCloseBtn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="headerAccountModalBody">
          {/* Order Tracking Card */}
          <div className="headerAccountCard">
            <h4><Truck size={17} /> Track Your Order</h4>
            <p className="headerAccountSubtitle">
              Enter your Order Reference (e.g. <b>BST-1001</b>) or mobile number to check delivery progress.
            </p>

            <form onSubmit={handleTrackSubmit} className="headerAccountTrackForm">
              <div className="headerAccountInputWrap">
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="e.g. BST-XXXX or 03001234567"
                  className="headerAccountInput"
                  required
                />
                <button type="submit" className="headerAccountSubmitBtn" disabled={trackLoading}>
                  {trackLoading ? "Checking..." : <><Search size={16} /> Track</>}
                </button>
              </div>
            </form>

            {trackError && <p className="headerAccountError">{trackError}</p>}

            {trackResult && (
              <div className="headerAccountResultBox">
                {trackResult.fallback ? (
                  <div>
                    <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#374151" }}>
                      For live delivery updates on <b>{trackResult.order_number}</b>, our support team can verify your status immediately:
                    </p>
                    <a
                      href={`https://wa.me/${supportWhatsapp}?text=${encodeURIComponent(`Assalam-o-Alaikum Bustaniya! Please share the tracking update for my order: ${trackResult.order_number}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="headerAccountWhatsappBtn"
                    >
                      <MessageSquare size={16} /> Track on WhatsApp
                    </a>
                  </div>
                ) : (
                  <div>
                    <div className="headerAccountStatusRow">
                      <span>Order #{trackResult.order_number || trackResult.id}</span>
                      <span className="headerAccountStatusBadge">{trackResult.status || "Processing"}</span>
                    </div>
                    {trackResult.courier_status && (
                      <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#6b7280" }}>
                        Courier Status: <b>{trackResult.courier_status}</b>
                      </p>
                    )}
                    {trackResult.tracking_number && (
                      <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                        Tracking Number: <b>{trackResult.tracking_number}</b>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Saved Customer Info (if available) */}
          {savedCustomer?.fullName && (
            <div className="headerAccountCard headerAccountSavedCard">
              <div className="headerAccountSavedHeader">
                <div>
                  <small style={{ color: "#6b7280", textTransform: "uppercase", fontSize: "10px", fontWeight: 700 }}>Saved Customer Profile</small>
                  <h5 style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 600 }}>{savedCustomer.fullName}</h5>
                </div>
                <span className="headerAccountSavedCity">{savedCustomer.city || "Pakistan"}</span>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#6b7280" }}>
                {savedCustomer.phone} {savedCustomer.email ? `· ${savedCustomer.email}` : ""}
              </p>
            </div>
          )}

          {/* Quick Help & WhatsApp */}
          <div className="headerAccountQuickLinks">
            <a
              href={`https://wa.me/${supportWhatsapp}?text=${encodeURIComponent("Assalam-o-Alaikum Bustaniya! I need help with my account or order.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="headerAccountHelpLink"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <MessageSquare size={18} style={{ color: "#25D366" }} />
                <div>
                  <b>Chat with Customer Care</b>
                  <small>Instant help via WhatsApp</small>
                </div>
              </div>
              <ArrowRight size={16} />
            </a>

            <div className="headerAccountPoliciesRow">
              <Link href="/exchange-return-policy" onClick={onClose} className="headerAccountPolicyChip">
                <ShieldCheck size={13} /> Exchange Policy
              </Link>
              <Link href="/shipping-policy" onClick={onClose} className="headerAccountPolicyChip">
                <Truck size={13} /> Shipping Info
              </Link>
            </div>
          </div>

          {/* Admin Staff Portal Link */}
          <div className="headerAccountStaffPortal">
            <Link href="/admin" onClick={onClose} className="headerAccountStaffLink">
              <Lock size={12} /> Store Staff / Admin Portal &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
