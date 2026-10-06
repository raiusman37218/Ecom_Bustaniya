"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Package, Truck, CheckCircle2, Clock, MessageSquare, ExternalLink, AlertCircle } from "lucide-react";

function formatWhatsAppNumber(phone) {
  let cleaned = String(phone || "").replace(/\D/g, "");
  if (!cleaned) return "923053530008";
  if (cleaned.startsWith("0")) cleaned = "92" + cleaned.slice(1);
  else if (cleaned.startsWith("3") && cleaned.length === 10) cleaned = "92" + cleaned;
  return cleaned;
}

export default function TrackOrderClient({ storeSettings }) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const rawWhatsapp = formatWhatsAppNumber(
    storeSettings?.paymentSettings?.whatsappNumber ||
    storeSettings?.whatsappNumber ||
    "923053530008"
  );

  useEffect(() => {
    // Check if query is in URL params
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const trackingParam = params.get("tracking") || params.get("order") || params.get("id");
      if (trackingParam) {
        setQuery(trackingParam);
        performLookup(trackingParam);
      }
    }
  }, []);

  async function performLookup(searchVal) {
    const clean = String(searchVal || "").trim();
    if (!clean) return;

    setLoading(true);
    setError("");
    setOrder(null);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/admin/orders?search=${encodeURIComponent(clean)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        const orders = data.orders || [];
        if (orders.length > 0) {
          setOrder(orders[0]);
          return;
        }
      }
      // If not found in admin orders, show clean fallback with PostEx direct tracker
      setError("No record found with that reference. If your order was recently placed or you only have a courier tracking code, you can track directly via PostEx below or reach out on WhatsApp.");
    } catch {
      setError("Unable to retrieve tracking details at this moment. Please track directly on PostEx or contact our WhatsApp support.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    performLookup(query);
  }

  const postexTrackingUrl = query.trim()
    ? `https://postex.pk/tracking?trackingNumber=${encodeURIComponent(query.trim())}`
    : "https://postex.pk/tracking";

  const orderTrackingCode = order?.trackingNumber || order?.tracking_number || "";

  return (
    <div className="trackOrderContainer">
      <div className="trackOrderCard">
        <div className="trackOrderCardHeader">
          <Package className="trackHeaderIcon" size={32} />
          <h2>Enter Your Order Details</h2>
          <p>Track using your Bustaniya Order Reference (e.g. <b>BST-1042</b>) or PostEx Tracking Number.</p>
        </div>

        <form onSubmit={handleSubmit} className="trackOrderForm">
          <div className="trackInputWrap">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. BST-1042 or 03001234567 or PostEx Tracking #"
              className="trackInput"
              required
            />
            <button type="submit" disabled={loading} className="trackSubmitBtn">
              {loading ? (
                <span>Searching...</span>
              ) : (
                <>
                  <Search size={18} />
                  <span>Track Status</span>
                </>
              )}
            </button>
          </div>
        </form>

        {query.trim().length > 3 && (
          <div className="directPostExBanner">
            <span>Have a PostEx Tracking Code?</span>
            <a
              href={postexTrackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="directPostExLink"
            >
              Open PostEx Live Portal <ExternalLink size={14} />
            </a>
          </div>
        )}

        {error && (
          <div className="trackNoticeBox trackError">
            <AlertCircle size={20} className="noticeIcon" />
            <div>
              <p>{error}</p>
              <div className="errorActions">
                <a
                  href={`https://wa.me/${rawWhatsapp}?text=${encodeURIComponent(`Assalam-o-Alaikum Bustaniya! I need help tracking my order: "${query.trim()}".`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsappHelpBtn"
                >
                  <MessageSquare size={16} /> WhatsApp Support
                </a>
                <a
                  href={`https://postex.pk/tracking?trackingNumber=${encodeURIComponent(query.trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="postexDirectBtn"
                >
                  PostEx Tracker <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        )}

        {order && (
          <div className="trackResultCard">
            <div className="trackResultHeader">
              <div className="trackResultTitle">
                <span className="orderBadge">Order #{order.orderNumber || order.id?.slice(0, 8)}</span>
                <span className={`statusPill status--${String(order.status || "pending").toLowerCase()}`}>
                  {order.status || "Processing"}
                </span>
              </div>
              <span className="orderDate">
                Placed on: {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "Recent"}
              </span>
            </div>

            <div className="trackDetailsGrid">
              <div className="detailItem">
                <span className="detailLabel">Customer</span>
                <span className="detailVal">{order.customer?.fullName || order.customer?.name || "Customer"}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">Destination</span>
                <span className="detailVal">{order.customer?.city || "Pakistan"}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">Payment Mode</span>
                <span className="detailVal">{order.paymentMethod === "advance" ? "Full Advance (Bank Transfer)" : "Cash on Delivery"}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">Total Amount</span>
                <span className="detailVal detailHighlight">Rs. {Number(order.total || 0).toLocaleString()}</span>
              </div>
            </div>

            {orderTrackingCode && (
              <div className="courierTrackingBox">
                <div className="courierInfo">
                  <Truck size={20} />
                  <div>
                    <b>PostEx Tracking Number: {orderTrackingCode}</b>
                    <small>Dispatched via PostEx Courier nationwide</small>
                  </div>
                </div>
                <a
                  href={`https://postex.pk/tracking?trackingNumber=${encodeURIComponent(orderTrackingCode)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="trackCourierBtn"
                >
                  Live Courier Tracking <ExternalLink size={14} />
                </a>
              </div>
            )}

            <div className="orderStepsTimeline">
              <div className="timelineStep active">
                <div className="stepIcon"><CheckCircle2 size={16} /></div>
                <span>Order Placed</span>
              </div>
              <div className={`timelineStep ${["confirmed", "processing", "dispatched", "delivered"].includes(String(order.status).toLowerCase()) ? "active" : ""}`}>
                <div className="stepIcon"><CheckCircle2 size={16} /></div>
                <span>Confirmed &amp; Tailored</span>
              </div>
              <div className={`timelineStep ${["dispatched", "shipped", "delivered"].includes(String(order.status).toLowerCase()) ? "active" : ""}`}>
                <div className="stepIcon"><Truck size={16} /></div>
                <span>Courier Dispatched</span>
              </div>
              <div className={`timelineStep ${String(order.status).toLowerCase() === "delivered" ? "active" : ""}`}>
                <div className="stepIcon"><CheckCircle2 size={16} /></div>
                <span>Delivered</span>
              </div>
            </div>

            <div className="trackHelpFooter">
              <span>Have any questions about this order?</span>
              <a
                href={`https://wa.me/${rawWhatsapp}?text=${encodeURIComponent(`Assalam-o-Alaikum Bustaniya! Need update on order #${order.orderNumber || order.id}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsappTrackBtn"
              >
                <MessageSquare size={16} /> Chat on WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="trackFaqSection">
        <h3>Delivery &amp; Courier FAQs</h3>
        <div className="trackFaqGrid">
          <div className="trackFaqItem">
            <h4>When will I receive my tracking ID?</h4>
            <p>Tracking codes are generated once your parcel is packed and handed over to PostEx. You will receive an SMS and WhatsApp notification with the tracking link.</p>
          </div>
          <div className="trackFaqItem">
            <h4>What is standard delivery time?</h4>
            <p>Orders are processed within 24–48 hours and delivered within 8–9 delivery days across major Pakistani cities and remote towns.</p>
          </div>
          <div className="trackFaqItem">
            <h4>Can I open and check before paying?</h4>
            <p>Couriers operate standard sealed delivery protocol. You can inspect the outer packaging and proceed with COD payment. Any sizing or styling exchange is fully supported under our Return &amp; Exchange Policy.</p>
          </div>
          <div className="trackFaqItem">
            <h4>Need immediate dispatch assistance?</h4>
            <p>Our dedicated customer care team is available on WhatsApp Mon–Sat (10:00 AM – 7:00 PM PKT) for live parcel updates.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
