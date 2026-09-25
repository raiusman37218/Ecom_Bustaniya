"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Scissors,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Eye,
  Trash2,
  Save,
  X,
  Phone,
  MapPin,
  Calendar,
  Layers,
  Ruler,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const STATUS_OPTIONS = [
  { id: "pending", label: "Pending", color: "#f59f00", bg: "#fff9db" },
  { id: "contacted", label: "Contacted", color: "#1971c2", bg: "#e7f5ff" },
  { id: "confirmed", label: "Confirmed", color: "#2f9e44", bg: "#ebfbee" },
  { id: "in_stitching", label: "In Stitching", color: "#7048e8", bg: "#f3f0ff" },
  { id: "ready", label: "Ready / Packed", color: "#0ca678", bg: "#e6fcf5" },
  { id: "delivered", label: "Delivered", color: "#1098ad", bg: "#e3fafc" },
  { id: "cancelled", label: "Cancelled", color: "#e03131", bg: "#ffe3e3" },
];

export default function CustomOrdersWorkspace() {
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, contacted: 0, in_stitching: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected order for detail drawer
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form edit state in drawer
  const [editStatus, setEditStatus] = useState("pending");
  const [editQuotedPrice, setEditQuotedPrice] = useState(0);
  const [editAdvancePaid, setEditAdvancePaid] = useState(0);
  const [editAdminNotes, setEditAdminNotes] = useState("");

  // Fullscreen image preview
  const [previewImage, setPreviewImage] = useState(null);

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      let url = "/api/admin/custom-orders?limit=100";
      if (statusFilter !== "all") url += `&status=${encodeURIComponent(statusFilter)}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load custom dress orders.");

      setOrders(data.orders || []);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      setError(err.message || "Failed to load custom orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadOrders();
  }

  function openOrderDetail(order) {
    setSelectedOrder(order);
    setEditStatus(order.status || "pending");
    setEditQuotedPrice(order.quoted_price || 0);
    setEditAdvancePaid(order.advance_paid || 0);
    setEditAdminNotes(order.admin_notes || "");
    setSaveSuccess(false);
  }

  async function handleSaveOrderUpdates(e) {
    e.preventDefault();
    if (!selectedOrder) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/admin/custom-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedOrder.id,
          status: editStatus,
          quoted_price: editQuotedPrice,
          advance_paid: editAdvancePaid,
          admin_notes: editAdminNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order.");

      // Update in state
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? { ...o, ...data.order } : o))
      );
      setSelectedOrder((prev) => (prev ? { ...prev, ...data.order } : null));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOrder(id) {
    if (!window.confirm("Are you sure you want to delete this custom order request?")) return;
    try {
      const res = await fetch("/api/admin/custom-orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete.");

      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (selectedOrder?.id === id) setSelectedOrder(null);
    } catch (err) {
      alert("Failed to delete order: " + err.message);
    }
  }

  // Pre-generate WhatsApp quotation message
  function getWhatsAppQuoteLink(order) {
    if (!order?.customer_phone) return "#";
    const cleanPhone = order.customer_phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `92${cleanPhone.slice(1)}` : cleanPhone.startsWith("92") ? cleanPhone : `92${cleanPhone}`;

    const priceText = editQuotedPrice > 0 ? `Rs. ${Number(editQuotedPrice).toLocaleString()}` : "Price Quote";

    const msg = [
      `Assalam-o-Alaikum ${order.customer_name}! 🌸`,
      `Bustaniya se rabta kiya ja raha hai aapki Custom Dress Request (${order.order_number}) ke silsilay mein.`,
      "",
      `Outfit: ${order.dress_type}`,
      order.fabric_details ? `Fabric: ${order.fabric_details}` : "",
      editQuotedPrice > 0 ? `Estimated Price: ${priceText}` : "",
      "",
      "Aapka design aur naap hamare master tailor ne review kar liya hai. Kindly details aur advance payment confirm kar dein taake stitching process shuru kiya ja sake. Shukriya!",
    ]
      .filter(Boolean)
      .join("\n");

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="customOrdersWorkspace">
      {/* 1. Header Toolbar & Quick Stats */}
      <div className="cdoHeader">
        <div>
          <h2>
            <Scissors size={22} /> Custom Dress & Bespoke Tailoring
          </h2>
          <p>Manage custom made-to-measure orders, review reference pictures & send quotes on WhatsApp.</p>
        </div>
        <button type="button" className="btnRefreshCdo" onClick={loadOrders} title="Refresh orders">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats Counter Bar */}
      <div className="cdoStatsRow">
        <div className="cdoStatCard">
          <span>Total Requests</span>
          <b>{counts.total || orders.length}</b>
        </div>
        <div className="cdoStatCard pending">
          <span>Pending Quote</span>
          <b>{counts.pending || 0}</b>
        </div>
        <div className="cdoStatCard inStitching">
          <span>In Stitching</span>
          <b>{counts.in_stitching || 0}</b>
        </div>
        <div className="cdoStatCard delivered">
          <span>Delivered</span>
          <b>{counts.delivered || 0}</b>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="cdoFilterBar">
        <div className="statusTabsList">
          <button
            type="button"
            className={`statusTabBtn ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All ({counts.total || 0})
          </button>
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st.id}
              type="button"
              className={`statusTabBtn ${statusFilter === st.id ? "active" : ""}`}
              onClick={() => setStatusFilter(st.id)}
            >
              {st.label} ({counts[st.id] || 0})
            </button>
          ))}
        </div>

        <form className="cdoSearchForm" onSubmit={handleSearchSubmit}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name, phone, order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => { setSearch(""); loadOrders(); }}>
              <X size={14} />
            </button>
          )}
        </form>
      </div>

      {/* 3. Orders Grid / Table */}
      {loading ? (
        <div className="cdoLoadingState">
          <span className="spinner" /> Loading custom dress requests...
        </div>
      ) : error ? (
        <div className="cdoErrorState">
          <AlertCircle size={24} /> {error}
        </div>
      ) : !orders.length ? (
        <div className="cdoEmptyState">
          <Scissors size={48} />
          <h3>No Custom Orders Found</h3>
          <p>Jab customer website par custom dress ka naap aur design bhejey ga, woh yahan nazar aaye ga.</p>
        </div>
      ) : (
        <div className="cdoOrdersTableWrap">
          <table className="cdoTable">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Outfit Type</th>
                <th>Photos</th>
                <th>Size Mode</th>
                <th>Status</th>
                <th>Quoted Price</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const statusMeta = STATUS_OPTIONS.find((s) => s.id === order.status) || STATUS_OPTIONS[0];
                const photos = Array.isArray(order.reference_images) ? order.reference_images : [];

                return (
                  <tr
                    key={order.id}
                    className={selectedOrder?.id === order.id ? "rowSelected" : ""}
                    onClick={() => openOrderDetail(order)}
                  >
                    <td>
                      <b className="orderNumBadge">{order.order_number}</b>
                    </td>
                    <td>
                      <div className="customerCell">
                        <b>{order.customer_name}</b>
                        <span>
                          <Phone size={12} /> {order.customer_phone}
                        </span>
                        {order.customer_city && (
                          <small>
                            <MapPin size={11} /> {order.customer_city}
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <b>{order.dress_type}</b>
                      {order.color_preference && <small className="cellSubtext">{order.color_preference}</small>}
                    </td>
                    <td>
                      {photos.length > 0 ? (
                        <div className="photoThumbStack">
                          <img src={photos[0]} alt="Ref" />
                          {photos.length > 1 && <span className="moreCount">+{photos.length - 1}</span>}
                        </div>
                      ) : (
                        <span className="noPhoto">—</span>
                      )}
                    </td>
                    <td>
                      <span className="sizeModeTag">
                        {order.size_preference === "custom" ? "Custom Naap" : `Std (${order.standard_size || "M"})`}
                      </span>
                    </td>
                    <td>
                      <span
                        className="cdoStatusPill"
                        style={{ color: statusMeta.color, background: statusMeta.bg }}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td>
                      {order.quoted_price > 0 ? (
                        <b className="priceText">Rs. {Number(order.quoted_price).toLocaleString()}</b>
                      ) : (
                        <span className="pendingPrice">Not quoted</span>
                      )}
                    </td>
                    <td>
                      <span className="dateCell">
                        {new Date(order.created_at).toLocaleDateString("en-PK", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </td>
                    <td>
                      <div className="actionButtons" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btnViewDetail"
                          onClick={() => openOrderDetail(order)}
                          title="View measurements & photos"
                        >
                          <Eye size={16} />
                        </button>
                        <a
                          href={getWhatsAppQuoteLink(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btnQuickWhatsApp"
                          title="Open WhatsApp chat with quote"
                        >
                          <img src="/whatsapp-icon.png" alt="WA" width={16} height={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Order Detail Drawer / Modal */}
      {selectedOrder && (
        <div className="cdoDrawerBackdrop" onClick={() => setSelectedOrder(null)}>
          <div className="cdoDrawerContent" onClick={(e) => e.stopPropagation()}>
            <div className="drawerHeader">
              <div>
                <span className="drawerSub">CUSTOM DRESS REQUEST</span>
                <h3>{selectedOrder.order_number}</h3>
              </div>
              <button
                type="button"
                className="btnCloseDrawer"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawerBody">
              {/* Customer Contact Box */}
              <div className="drawerBox customerBox">
                <div className="boxTitle">
                  <h4>Customer Information</h4>
                  <a
                    href={getWhatsAppQuoteLink(selectedOrder)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btnWhatsAppInDrawer"
                  >
                    <img src="/whatsapp-icon.png" alt="WhatsApp" width={18} height={18} />
                    Message on WhatsApp
                  </a>
                </div>

                <div className="infoGrid">
                  <div>
                    <span>Name:</span>
                    <b>{selectedOrder.customer_name}</b>
                  </div>
                  <div>
                    <span>WhatsApp Phone:</span>
                    <b>{selectedOrder.customer_phone}</b>
                  </div>
                  <div>
                    <span>City:</span>
                    <b>{selectedOrder.customer_city || "—"}</b>
                  </div>
                  <div>
                    <span>Email:</span>
                    <b>{selectedOrder.customer_email || "—"}</b>
                  </div>
                  <div className="fullRow">
                    <span>Address:</span>
                    <p>{selectedOrder.customer_address || "Not provided"}</p>
                  </div>
                </div>
              </div>

              {/* Outfit & Fabric Specs */}
              <div className="drawerBox">
                <h4>Outfit & Fabric Details</h4>
                <div className="infoGrid">
                  <div>
                    <span>Outfit Type:</span>
                    <b>{selectedOrder.dress_type}</b>
                  </div>
                  <div>
                    <span>Fabric Choice:</span>
                    <b>{selectedOrder.fabric_details || "—"}</b>
                  </div>
                  <div>
                    <span>Color Preference:</span>
                    <b>{selectedOrder.color_preference || "—"}</b>
                  </div>
                  <div>
                    <span>Size Preference:</span>
                    <b>
                      {selectedOrder.size_preference === "custom"
                        ? "Custom Measurements"
                        : `Standard Size ${selectedOrder.standard_size || "M"}`}
                    </b>
                  </div>
                </div>
                {selectedOrder.design_notes && (
                  <div className="designNotesBox">
                    <span>Design & Stitching Notes:</span>
                    <p>{selectedOrder.design_notes}</p>
                  </div>
                )}
              </div>

              {/* Reference Photos Gallery */}
              <div className="drawerBox">
                <h4>
                  Reference Photos ({Array.isArray(selectedOrder.reference_images) ? selectedOrder.reference_images.length : 0})
                </h4>
                {Array.isArray(selectedOrder.reference_images) && selectedOrder.reference_images.length > 0 ? (
                  <div className="drawerPhotosGrid">
                    {selectedOrder.reference_images.map((imgUrl, i) => (
                      <div
                        key={i}
                        className="drawerPhotoCard"
                        onClick={() => setPreviewImage(imgUrl)}
                        title="Click to view high-res image"
                      >
                        <img src={imgUrl} alt={`Ref ${i + 1}`} />
                        <span className="zoomOverlay">
                          <Eye size={18} />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="noDataNotice">No reference pictures attached.</p>
                )}
              </div>

              {/* Complete Measurements Breakdown */}
              <div className="drawerBox">
                <h4>
                  <Ruler size={18} /> Body Measurements (
                  {selectedOrder.measurements?.unit || "inches"})
                </h4>

                {/* Shirt Table */}
                <div className="measCategoryBlock">
                  <h5>Shirt / Kameez Measurements</h5>
                  <div className="measDetailsTable">
                    <div className="measCell">
                      <span>Shirt Length:</span>
                      <b>{selectedOrder.measurements?.shirtLength || "—"}</b>
                    </div>
                    <div className="measCell">
                      <span>Chest / Bust:</span>
                      <b>{selectedOrder.measurements?.chest || "—"}</b>
                    </div>
                    <div className="measCell">
                      <span>Waist:</span>
                      <b>{selectedOrder.measurements?.waist || "—"}</b>
                    </div>
                    <div className="measCell">
                      <span>Hip / Daman:</span>
                      <b>{selectedOrder.measurements?.hips || "—"}</b>
                    </div>
                    <div className="measCell">
                      <span>Shoulder / Teera:</span>
                      <b>{selectedOrder.measurements?.shoulder || "—"}</b>
                    </div>
                    <div className="measCell">
                      <span>Sleeves Length:</span>
                      <b>{selectedOrder.measurements?.sleevesLength || "—"}</b>
                    </div>
                    <div className="measCell">
                      <span>Armhole / Mudha:</span>
                      <b>{selectedOrder.measurements?.armhole || "—"}</b>
                    </div>
                    <div className="measCell">
                      <span>Neck Depth:</span>
                      <b>{selectedOrder.measurements?.neckDepth || "—"}</b>
                    </div>
                  </div>
                </div>

                {/* Bottom Table */}
                {selectedOrder.dress_type !== "Kurti" && (
                  <div className="measCategoryBlock">
                    <h5>
                      Bottom ({selectedOrder.measurements?.bottomStyle || "Trouser"})
                    </h5>
                    <div className="measDetailsTable">
                      <div className="measCell">
                        <span>Bottom Length:</span>
                        <b>{selectedOrder.measurements?.bottomLength || "—"}</b>
                      </div>
                      <div className="measCell">
                        <span>Bottom Waist / Asan:</span>
                        <b>{selectedOrder.measurements?.bottomWaist || "—"}</b>
                      </div>
                      <div className="measCell">
                        <span>Thigh:</span>
                        <b>{selectedOrder.measurements?.thigh || "—"}</b>
                      </div>
                      <div className="measCell">
                        <span>Bottom Opening / Paincha:</span>
                        <b>{selectedOrder.measurements?.bottomOpening || "—"}</b>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Pricing & Status Controls Form */}
              <form className="drawerBox adminControlsBox" onSubmit={handleSaveOrderUpdates}>
                <h4>Admin Controls & Quotation</h4>

                <div className="controlsGrid">
                  <div className="controlGroup">
                    <label>Order Status:</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="controlGroup">
                    <label>Quoted Price (PKR):</label>
                    <input
                      type="number"
                      step="50"
                      value={editQuotedPrice}
                      onChange={(e) => setEditQuotedPrice(e.target.value)}
                      placeholder="e.g. 7500"
                    />
                  </div>

                  <div className="controlGroup">
                    <label>Advance Payment Paid (PKR):</label>
                    <input
                      type="number"
                      step="50"
                      value={editAdvancePaid}
                      onChange={(e) => setEditAdvancePaid(e.target.value)}
                      placeholder="e.g. 2000"
                    />
                  </div>
                </div>

                <div className="controlGroup" style={{ marginTop: 14 }}>
                  <label>Internal Admin Notes:</label>
                  <textarea
                    rows={3}
                    value={editAdminNotes}
                    onChange={(e) => setEditAdminNotes(e.target.value)}
                    placeholder="e.g. Fabric purchased from Liberty market, sent to tailor Master Aslam on 26th Sep..."
                  />
                </div>

                <div className="controlsFooter">
                  <button
                    type="button"
                    className="btnDeleteOrder"
                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>

                  <div className="saveActionWrap">
                    {saveSuccess && <span className="saveSuccessNotice"><CheckCircle2 size={16} /> Saved!</span>}
                    <button type="submit" className="btnSaveUpdates" disabled={saving}>
                      <Save size={16} /> {saving ? "Saving..." : "Save Updates"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. Fullscreen Photo Modal */}
      {previewImage && (
        <div className="cdoPhotoModalOverlay" onClick={() => setPreviewImage(null)}>
          <div className="cdoPhotoModal" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Reference Full View" />
            <button
              type="button"
              className="btnClosePreview"
              onClick={() => setPreviewImage(null)}
            >
              <X size={22} />
            </button>
            <a
              href={previewImage}
              target="_blank"
              rel="noopener noreferrer"
              className="btnOpenOriginal"
            >
              <ExternalLink size={16} /> Open full resolution
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
