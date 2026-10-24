const fs = require('fs');

const file = 'components/AdminDashboard.js';
const content = fs.readFileSync(file, 'utf8');

const startMarker = `  return (
    <>
      <div className="adminOverlay" onClick={onClose} />
      <aside className="orderDetailDrawer"`;

const endMarker = `        </div>
      </aside>
    </>
  );
}`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex === -1) {
  console.error("Could not find startMarker!");
  process.exit(1);
}
if (endIndex === -1) {
  console.error("Could not find endMarker!");
  process.exit(1);
}

const replacement = `  return (
    <div
      className="shopifyOrderModalOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="shopifyOrderModalContainer">
        {/* Shopify Sticky Top Bar */}
        <header className="shopifyOrderTopBar">
          <div className="shopifyOrderTopLeft">
            <button
              type="button"
              className="shopifyBackBtn"
              onClick={onClose}
              title="Back to orders list"
              aria-label="Back to orders"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="shopifyOrderTopInfo">
              <div className="shopifyOrderTopTitleRow">
                <h2 className="shopifyOrderTopTitle">Order {order.id}</h2>
                <button
                  type="button"
                  className="shopifyOrderCopyBtn"
                  onClick={copyOrderNumberToClipboard}
                  title="Copy order number"
                >
                  {copiedOrderNumber ? "✓ Copied" : "📋 Copy"}
                </button>
                {/* Payment pill */}
                {paymentStatus.toLowerCase().includes("paid") || paymentStatus.toLowerCase().includes("verified") ? (
                  <span className="shopifyPill paid"><span className="pillDot" /> Paid</span>
                ) : Number(advancePaidAmount || 0) > 0 ? (
                  <span className="shopifyPill partially_paid"><span className="pillDot" /> Adv Paid</span>
                ) : (
                  <span className="shopifyPill pending"><span className="pillDot" /> {paymentStatus}</span>
                )}
                {/* Fulfillment pill */}
                {isDelivered ? (
                  <span className="shopifyPill delivered"><span className="pillDot" /> Delivered</span>
                ) : isBooked ? (
                  <span className="shopifyPill in_transit"><span className="pillDot" /> In transit</span>
                ) : (
                  <span className="shopifyPill unfulfilled"><span className="pillDot" /> Unfulfilled</span>
                )}
              </div>
              <div className="shopifyOrderTopSub">
                <span>{order.date}</span>
                <span> · </span>
                <span>👤 {order.customer || "Guest Customer"}</span>
                <span> · </span>
                <span>📍 {order.city || "Pakistan"}</span>
                <span> · </span>
                <span>{orderSourceBadge(order.source).icon} {orderSourceBadge(order.source).label}</span>
              </div>
            </div>
          </div>

          <div className="shopifyOrderTopRight">
            {/* Print Document Group */}
            <button
              type="button"
              className="shopifyBtnSecondary"
              onClick={printInvoice}
              title="Print Customer Invoice Receipt"
            >
              📄 Invoice
            </button>
            <button
              type="button"
              className="shopifyBtnSecondary"
              onClick={printPackingSlip}
              title="Print Warehouse Packing Slip"
            >
              📦 Packing slip
            </button>
            <button
              type="button"
              className="shopifyBtnSecondary"
              onClick={() => generateBulkOrdersPdf({ orders: [order], type: "stitching" })}
              title="Print Workshop Stitching Slip"
            >
              🧵 Stitching slip
            </button>

            {onDelete && (
              <button
                type="button"
                className="shopifyRowBtn danger"
                onClick={() => onDelete(order)}
                style={{ padding: "8px 14px", fontSize: "13px" }}
                title="Delete this order permanently"
              >
                🗑️ Delete
              </button>
            )}

            <button
              type="button"
              className="shopifyBtnPrimary"
              onClick={() => saveChanges()}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                "💾 Save Changes"
              )}
            </button>

            <button
              type="button"
              className="shopifyBackBtn"
              onClick={onClose}
              title="Close"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Alerts & Messages */}
        <div style={{ maxWidth: "1140px", width: "100%", margin: "16px auto 0", padding: "0 20px" }}>
          {saveError && (
            <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", color: "#991b1b", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⚠️</span> {saveError}
            </div>
          )}
          {saveMessage && (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", color: "#166534", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>✅</span> {saveMessage}
            </div>
          )}
          {unsavedTotalChange && (
            <div style={{ background: "#eff6ff", border: "1.5px solid #93c5fd", color: "#1e40af", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>ℹ️</span> Edits pending: Subtotal or advance modified. Press <b>Save Changes</b> in the top bar to persist.
            </div>
          )}
          {savedMoney.codMismatch && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", color: "#92400e", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⚠️</span> PostEx booking COD mismatch: PostEx is set to collect Rs. {savedMoney.bookedCod?.toLocaleString()}. Due amount is Rs. {savedMoney.cod?.toLocaleString()}.
            </div>
          )}
        </div>

        {/* 2-Column Shopify Grid */}
        <div className="shopifyOrderGrid">
          {/* LEFT MAIN COLUMN (65%) */}
          <div className="shopifyOrderMainCol">
            {/* 1. FULFILLMENT & ITEMS CARD */}
            <div className="shopifySectionCard">
              <div className="shopifySectionHeader">
                <h3>
                  <span>👗</span> Ordered Items &amp; Fulfillment ({orderItems.length})
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {!tracking ? (
                    <button
                      type="button"
                      className="shopifyBtnPrimary"
                      onClick={bookWithPostex}
                      disabled={saving || bookingPostex}
                      style={{ fontSize: "12px", padding: "6px 14px" }}
                    >
                      {bookingPostex ? "Booking with PostEx..." : "⚡ Book PostEx Courier (1-Click)"}
                    </button>
                  ) : (
                    <>
                      <a
                        href={\`https://postex.pk/tracking?cn=\${tracking}\`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shopifyTrackingLink"
                        style={{ margin: 0, padding: "5px 10px" }}
                      >
                        🔗 Live PostEx Tracking ({tracking})
                      </a>
                      <button
                        type="button"
                        className="shopifyRowBtn"
                        onClick={checkLivePostexStatus}
                        disabled={saving || checkingPostex}
                        style={{ padding: "5px 10px", fontSize: "11.5px" }}
                      >
                        {checkingPostex ? "Checking..." : "🔄 Refresh Status"}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="shopifyRowBtn"
                    onClick={() => setIsEditingItems((prev) => !prev)}
                    style={{ padding: "5px 10px", fontSize: "11.5px" }}
                  >
                    {isEditingItems ? "✓ Done Editing" : "✏️ Edit items"}
                  </button>
                  {isEditingItems && (
                    <button
                      type="button"
                      className="shopifyRowBtn"
                      onClick={handleAddProductItem}
                      style={{ padding: "5px 10px", fontSize: "11.5px", background: "#f0fdf4", color: "#166534", borderColor: "#86efac" }}
                    >
                      + Add Suit
                    </button>
                  )}
                </div>
              </div>

              <div className="shopifySectionBody">
                {/* Contextual Smart Action Banner */}
                <div className={\`shopifyNextStepBanner \${isDelivered ? "ready" : isBooked ? "ready" : "urgent"}\`}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "20px" }}>{nextStepInfo.icon}</span>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        اگلا قدم (Next Action): {nextStepInfo.step}
                      </div>
                      <div style={{ fontSize: "13.5px", fontWeight: 750, marginTop: "2px" }}>
                        {nextStepInfo.actionUrdu}
                      </div>
                      <div style={{ fontSize: "11.5px", opacity: 0.85, marginTop: "1px" }}>
                        {nextStepInfo.actionEng}
                      </div>
                    </div>
                  </div>

                  <div>
                    {nextStepInfo.ctaText && (
                      nextStepInfo.ctaType === "link" ? (
                        <a
                          href={nextStepInfo.ctaHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shopifyWaBtn"
                          style={{ padding: "7px 14px", fontSize: "12px", fontWeight: 800 }}
                        >
                          {nextStepInfo.ctaText}
                        </a>
                      ) : nextStepInfo.ctaType === "book_postex" ? (
                        <button
                          type="button"
                          className="shopifyBtnPrimary"
                          onClick={bookWithPostex}
                          disabled={saving || bookingPostex}
                          style={{ padding: "7px 14px", fontSize: "12px" }}
                        >
                          {bookingPostex ? "Booking..." : nextStepInfo.ctaText}
                        </button>
                      ) : nextStepInfo.ctaType === "packing_slip" ? (
                        <button
                          type="button"
                          className="shopifyBtnSecondary"
                          onClick={printPackingSlip}
                          style={{ padding: "7px 14px", fontSize: "12px" }}
                        >
                          {nextStepInfo.ctaText}
                        </button>
                      ) : nextStepInfo.ctaType === "check_status" ? (
                        <button
                          type="button"
                          className="shopifyBtnSecondary"
                          onClick={checkLivePostexStatus}
                          disabled={checkingPostex}
                          style={{ padding: "7px 14px", fontSize: "12px" }}
                        >
                          {checkingPostex ? "Checking..." : nextStepInfo.ctaText}
                        </button>
                      ) : null
                    )}
                  </div>
                </div>

                {/* Items View List */}
                {!isEditingItems ? (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {orderItems.map((item, index) => {
                      const qty = Number(item.quantity || 1);
                      const price = Number(item.price || 0);
                      const lineTotal = qty * price;
                      const rawSize = String(item.size || "").trim();
                      const isCustomSize = !rawSize || rawSize.toLowerCase().includes("custom") || isCustomItemSize(rawSize);

                      // Image resolver
                      let imgSource = item.imageUrl || item.image_url || "";
                      if (!imgSource && catalogProducts.length > 0) {
                        const match = catalogProducts.find((p) => p.name === (item.name || item.title) || p.id === item.productId);
                        if (match) imgSource = match.img || match.images?.[0] || "";
                      }

                      return (
                        <div key={item.id || index} className="shopifyItemRow">
                          <div className="shopifyItemRowLeft">
                            {imgSource ? (
                              <img src={imgSource} alt={item.name} className="shopifyItemThumb" />
                            ) : (
                              <div className="shopifyItemThumb">👗</div>
                            )}
                            <div className="shopifyItemDetails">
                              <span className="itemTitle">{item.name || item.title || "Suit"}</span>
                              <div className="itemVariant">
                                <span className={isCustomSize ? "shopifyCustomSizeTag" : "shopifySizeTag"}>
                                  {isCustomSize ? \`✂️ Custom: \${item.size || "Measurements"}\` : \`Size: \${item.size || "Standard"}\`}
                                </span>
                                {item.color && (
                                  <span style={{ fontSize: "11px", color: "#55675c", background: "#f0f4f1", border: "1px solid #d4ded6", padding: "1px 6px", borderRadius: "4px" }}>
                                    Color: {item.color}
                                  </span>
                                )}
                                {item.sku && (
                                  <span style={{ fontSize: "11px", color: "#8c9c91" }}>
                                    SKU: {item.sku}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shopifyItemRowRight">
                            <span className="priceTotal">Rs. {lineTotal.toLocaleString()}</span>
                            <span className="priceCalculation">
                              {qty} × Rs. {price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Editable Mode */
                  <div className="shopifyTableWrap">
                    <table className="shopifyOrderTable">
                      <thead>
                        <tr>
                          <th>Suit / Product</th>
                          <th style={{ width: "130px" }}>Size</th>
                          <th style={{ width: "100px" }}>Color</th>
                          <th style={{ width: "60px" }}>Qty</th>
                          <th style={{ width: "100px" }}>Price</th>
                          <th>Total</th>
                          <th style={{ width: "36px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.map((item, index) => {
                          const standardSizes = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];
                          const isCustom = item.size && !standardSizes.includes(item.size);

                          return (
                            <tr key={item.id || index}>
                              <td>
                                <select
                                  value={catalogProducts.some((p) => p.name === (item.name || item.title)) ? (item.name || item.title) : "__custom__"}
                                  onChange={(e) => handleSelectProduct(index, e.target.value)}
                                  style={{ padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "100%" }}
                                >
                                  <optgroup label="Store Catalog Products">
                                    {catalogProducts.map((p) => (
                                      <option key={p.id || p.name} value={p.name}>
                                        {p.name} (Rs. {Number(p.price || 0).toLocaleString()})
                                      </option>
                                    ))}
                                  </optgroup>
                                  <option value="__custom__">✏️ Custom Suit Name</option>
                                </select>
                                {(!catalogProducts.some((p) => p.name === (item.name || item.title)) || item.name === "Custom Product") && (
                                  <input
                                    type="text"
                                    value={item.name || item.title || ""}
                                    onChange={(e) => updateItemField(index, "name", e.target.value)}
                                    placeholder="Enter suit name..."
                                    style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "5px", border: "1px solid #173d29", marginTop: "4px", width: "100%" }}
                                  />
                                )}
                              </td>
                              <td>
                                <select
                                  value={standardSizes.includes(item.size) ? item.size : "Custom"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateItemField(index, "size", val === "Custom" ? (item.size || "Custom") : val);
                                  }}
                                  style={{ padding: "5px", fontSize: "11.5px", borderRadius: "5px", width: "100%" }}
                                >
                                  {standardSizes.map((s) => <option key={s} value={s}>{s}</option>)}
                                  <option value="Custom">Custom...</option>
                                </select>
                                {(isCustom || item.size === "Custom") && (
                                  <input
                                    type="text"
                                    value={item.size || ""}
                                    onChange={(e) => updateItemField(index, "size", e.target.value)}
                                    placeholder="Custom size..."
                                    style={{ padding: "4px", fontSize: "11px", marginTop: "3px", width: "100%" }}
                                  />
                                )}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={item.color || ""}
                                  onChange={(e) => updateItemField(index, "color", e.target.value)}
                                  placeholder="Color"
                                  style={{ padding: "5px", fontSize: "11.5px", width: "100%" }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity || 1}
                                  onChange={(e) => updateItemField(index, "quantity", Math.max(1, Number(e.target.value) || 1))}
                                  style={{ width: "50px", padding: "5px", fontSize: "11.5px", textAlign: "center" }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.price || 0}
                                  onChange={(e) => updateItemField(index, "price", Math.max(0, Number(e.target.value) || 0))}
                                  style={{ width: "90px", padding: "5px", fontSize: "11.5px" }}
                                />
                              </td>
                              <td style={{ fontSize: "12px", fontWeight: 750 }}>
                                Rs. {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
                              </td>
                              <td>
                                {orderItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveProductItem(index)}
                                    style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "14px" }}
                                    title="Remove item"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 2. PAYMENT & ADVANCE SUMMARY CARD */}
            <div className="shopifySectionCard">
              <div className="shopifySectionHeader">
                <h3>
                  <span>💰</span> Payment &amp; Financial Accounting
                </h3>
                {paymentStatus.toLowerCase().includes("paid") || paymentStatus.toLowerCase().includes("verified") ? (
                  <span className="shopifyPill paid"><span className="pillDot" /> Paid</span>
                ) : (
                  <span className="shopifyPill pending"><span className="pillDot" /> {paymentStatus}</span>
                )}
              </div>

              <div className="shopifySectionBody">
                {/* 1-Click Accounting Shortcuts */}
                <div className="shopifyAccountingBar">
                  <span style={{ fontSize: "11.5px", fontWeight: 750, color: "#3a4c41" }}>Quick Accounting:</span>
                  <button
                    type="button"
                    className="shopifyAccountBtn fullAdvance"
                    onClick={() => { setAdvancePaidAmount(calculatedOrderTotal); setPaymentStatus("Payment Verified"); }}
                  >
                    🟢 100% Full Advance (Rs. {calculatedOrderTotal.toLocaleString()})
                  </button>
                  <button
                    type="button"
                    className="shopifyAccountBtn deliveryAdvance"
                    onClick={() => { setAdvancePaidAmount(deliveryChargeVal || 250); setPaymentStatus("Payment Verified"); }}
                  >
                    🟡 Delivery Advance (Rs. {(deliveryChargeVal || 250).toLocaleString()})
                  </button>
                  <button
                    type="button"
                    className="shopifyAccountBtn fullCod"
                    onClick={() => { setAdvancePaidAmount(0); setPaymentStatus("COD pending"); }}
                  >
                    ⚪ Full COD (Rs. 0 Advance)
                  </button>
                </div>

                {/* Financial Breakdown Table */}
                <div className="shopifyFinancialBreakdown">
                  <div className="shopifyFinancialRow">
                    <span>Items Subtotal ({orderItems.length} items)</span>
                    <b>Rs. {calculatedItemsTotal.toLocaleString()}</b>
                  </div>
                  <div className="shopifyFinancialRow">
                    <span>Shipping / Delivery charges</span>
                    <b>Rs. {deliveryChargeVal.toLocaleString()}</b>
                  </div>
                  <div className="shopifyFinancialRow">
                    <span>Advance payment received</span>
                    <b style={{ color: Number(advancePaidAmount || 0) > 0 ? "#15803d" : "#68796e" }}>
                      − Rs. {Number(advancePaidAmount || 0).toLocaleString()}
                    </b>
                  </div>
                  <div className="shopifyFinancialRow total">
                    <span>Total Order Value</span>
                    <b>Rs. {calculatedOrderTotal.toLocaleString()}</b>
                  </div>
                </div>

                {/* Net Cash to Collect Box */}
                <div className={\`shopifyCodHighlightBox \${currentCod === 0 ? "prepaid" : ""}\`}>
                  <div>
                    <div className="shopifyCodTitle">
                      {currentCod === 0 ? "✅ 100% PREPAID (ZERO COD TO COLLECT)" : "💰 CASH TO COLLECT ON DELIVERY (RIDER COD)"}
                    </div>
                    <div className="shopifyCodAmount">
                      {currentCod === 0 ? "Rs. 0 (Prepaid)" : \`Rs. \${currentCod.toLocaleString()}\`}
                    </div>
                  </div>
                  <div className="shopifyCodHint">
                    {currentCod === 0 ? "Parcel is 100% paid. Rider will not collect any money." : "💡 Rider customer se yeh raqam wasool kare ga."}
                  </div>
                </div>

                {/* Payment Form Fields */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", borderTop: "1px solid #edf1ee", paddingTop: "14px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#495a4f" }}>Advance Received (PKR)</span>
                    <input
                      type="number"
                      min="0"
                      max={calculatedOrderTotal}
                      value={advancePaidAmount}
                      onChange={(event) => setAdvancePaidAmount(event.target.value)}
                      placeholder="0"
                      style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d5dfd6" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#495a4f" }}>Transaction TID / Ref</span>
                    <input
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder="NayaPay, Bank, JazzCash TID..."
                      style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d5dfd6" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#495a4f" }}>Payment Status</span>
                    <select
                      value={paymentStatus}
                      onChange={(event) => setPaymentStatus(event.target.value)}
                      style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d5dfd6" }}
                    >
                      <option>COD pending</option>
                      <option>Advance Pending</option>
                      <option>Proof Submitted</option>
                      <option>Payment Verified</option>
                      <option>Paid</option>
                      <option>Payment Rejected</option>
                      <option>Refunded</option>
                    </select>
                  </label>
                </div>

                {/* Verification Actions */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus("Payment Verified");
                      setFulfillmentStatus("Packing");
                      saveChanges({ paymentStatus: "Payment Verified", paymentReference, amountPayableInAdvance: Number(advancePaidAmount || 0), fulfillmentStatus: "Packing", confirmationStatus: "Confirmed" });
                    }}
                    disabled={saving}
                    className="shopifyBtnPrimary"
                    style={{ fontSize: "12px", padding: "7px 16px" }}
                  >
                    ✅ Verify Payment &amp; Move to Packing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus("Payment Rejected");
                      saveChanges({ paymentStatus: "Payment Rejected", paymentReference, confirmationStatus: "Confirmed" });
                    }}
                    disabled={saving}
                    className="shopifyRowBtn danger"
                    style={{ fontSize: "12px", padding: "7px 14px" }}
                  >
                    ❌ Reject Payment
                  </button>
                </div>
              </div>
            </div>

            {/* 3. ACTIVITY TIMELINE & INTERNAL NOTES CARD */}
            <div className="shopifySectionCard">
              <div className="shopifySectionHeader">
                <h3>
                  <span>📝</span> Internal Team Notes &amp; Activity Timeline
                </h3>
              </div>

              <div className="shopifySectionBody">
                <div>
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#122a1e" }}>Private Notes / Workshop Stitching Instructions:</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows="3"
                    placeholder="Add stitching notes, custom instructions, or delivery notes here..."
                    style={{ width: "100%", padding: "10px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d5ded6", marginTop: "6px" }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                    <button
                      type="button"
                      className="shopifyBtnSecondary"
                      onClick={() => saveChanges({ notes })}
                      disabled={saving}
                      style={{ fontSize: "12px", padding: "6px 14px" }}
                    >
                      💾 Save Note
                    </button>
                  </div>
                </div>

                {/* Collapsible Returns Workflow */}
                <details style={{ background: "#f8faf8", border: "1px solid #dce4dd", borderRadius: "8px", padding: "12px 16px" }}>
                  <summary style={{ fontSize: "13px", fontWeight: 750, color: "#243b2e", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                    <span>🔄 Returns &amp; Exchanges Workflow {returnStatus !== "No return" ? \`(\${returnStatus})\` : ""}</span>
                    <span style={{ fontSize: "11px", color: "#6a7c70" }}>Expand ▼</span>
                  </summary>
                  <div style={{ marginTop: "12px", borderTop: "1px solid #e2ece4", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#495a4f" }}>Return Status</span>
                        <select value={returnStatus} onChange={(event) => setReturnStatus(event.target.value)} style={{ padding: "6px", fontSize: "12px" }}>
                          {returnStatusOptions.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#495a4f" }}>Return Reason</span>
                        <input value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Size issue, defect..." style={{ padding: "6px", fontSize: "12px" }} />
                      </label>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#495a4f" }}>Resolution Notes</span>
                        <input value={returnResolution} onChange={(event) => setReturnResolution(event.target.value)} placeholder="Replacement dispatched..." style={{ padding: "6px", fontSize: "12px" }} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#495a4f" }}>Refund Amount (PKR)</span>
                        <input type="number" min="0" max={calculatedOrderTotal} value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} disabled={!canRecordRefund} style={{ padding: "6px", fontSize: "12px" }} />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="shopifyBtnPrimary"
                      onClick={() => saveChanges()}
                      disabled={saving}
                      style={{ fontSize: "12px", padding: "6px 14px", alignSelf: "flex-end" }}
                    >
                      Save Return Status
                    </button>
                  </div>
                </details>

                {/* Order Activity Timeline */}
                <div style={{ borderTop: "1px solid #edf1ee", paddingTop: "14px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 750, color: "#122a1e", marginBottom: "10px", display: "block" }}>Order Timeline</span>
                  <div className="shopifyTimeline">
                    <div className="shopifyTimelineItem">
                      <div className="shopifyTimelineDot" />
                      <span className="shopifyTimelineText">Order Placed</span>
                      <span className="shopifyTimelineTime">{order.date}</span>
                    </div>
                    {order.tracking && (
                      <div className="shopifyTimelineItem">
                        <div className="shopifyTimelineDot" />
                        <span className="shopifyTimelineText">PostEx Tracking Assigned: {order.tracking}</span>
                        <span className="shopifyTimelineTime">Live Courier Consignment</span>
                      </div>
                    )}
                    {(order.operationEvents || []).map((event, index) => (
                      <div key={\`\${event.created_at || "event"}-\${index}\`} className="shopifyTimelineItem">
                        <div className="shopifyTimelineDot" />
                        <span className="shopifyTimelineText">
                          {event.event_type === "order_operation_updated" ? "Return / refund workflow updated" : formatOrderStatus(event.event_type)}
                        </span>
                        <span className="shopifyTimelineTime">
                          {event.created_at ? new Date(event.created_at).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Just now"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR COLUMN (35%) */}
          <div className="shopifyOrderSideCol">
            {/* 1. CUSTOMER PROFILE CARD */}
            <div className="shopifySectionCard">
              <div className="shopifySectionHeader">
                <h3><span>👤</span> Customer</h3>
                <span className="shopifyCityPill">📍 {order.city || "Pakistan"}</span>
              </div>

              <div className="shopifySectionBody">
                <div className="shopifyCustomerProfile">
                  <div className="shopifyCustomerAvatar">{customerInitials}</div>
                  <div>
                    <div className="shopifyCustomerNameLarge">{order.customer || "Guest Customer"}</div>
                    <div style={{ fontSize: "12px", color: "#6a7c70" }}>Customer since {order.date}</div>
                  </div>
                </div>

                {/* Contact Actions */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {rawPhoneDigits && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shopifyWaBtn"
                      style={{ padding: "8px 14px", fontSize: "12.5px", fontWeight: 800, flex: 1, justifyContent: "center" }}
                      title="Open WhatsApp with pre-filled Urdu confirmation message"
                    >
                      💬 WhatsApp Customer
                    </a>
                  )}
                  {rawPhoneDigits && (
                    <a
                      href={\`tel:\${order.phone}\`}
                      className="shopifyBtnSecondary"
                      style={{ padding: "8px 14px", fontSize: "12.5px" }}
                    >
                      📞 {order.phone}
                    </a>
                  )}
                </div>

                {/* Shipping Address */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#63756a", textTransform: "uppercase" }}>Delivery Address</span>
                    <button
                      type="button"
                      className="shopifyOrderCopyBtn"
                      onClick={copyAddressToClipboard}
                    >
                      {copiedAddress ? "✓ Copied" : "📋 Copy"}
                    </button>
                  </div>
                  <div className="shopifyAddressBlock">
                    <div>{order.address || order.city || "No street address provided"}</div>
                    {order.city && (
                      <div style={{ fontSize: "12px", color: "#55675c" }}>City: <b style={{ color: "#173d29" }}>{order.city}</b></div>
                    )}
                    {order.email && (
                      <div style={{ fontSize: "12px", color: "#6a7c70" }}>✉️ {order.email}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. LOGISTICS & POSTEX DISPATCH CARD */}
            <div className="shopifySectionCard">
              <div className="shopifySectionHeader">
                <h3><span>🚚</span> Logistics &amp; Courier</h3>
                <span className={\`shopifyPill \${tracking ? "in_transit" : "unfulfilled"}\`}>
                  <span className="pillDot" /> {tracking ? "Booked" : "Unbooked"}
                </span>
              </div>

              <div className="shopifySectionBody">
                <div>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#63756a", textTransform: "uppercase" }}>Tracking Number</span>
                  {!tracking ? (
                    <div style={{ marginTop: "6px" }}>
                      <div style={{ fontSize: "13px", color: "#b45309", fontWeight: 700 }}>
                        📦 Not booked with courier yet
                      </div>
                      <button
                        type="button"
                        className="shopifyBtnPrimary"
                        onClick={bookWithPostex}
                        disabled={saving || bookingPostex}
                        style={{ marginTop: "8px", width: "100%", justifyContent: "center" }}
                      >
                        {bookingPostex ? "Booking with PostEx..." : "⚡ Book PostEx Courier (1-Click)"}
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <code style={{ fontSize: "14px", fontWeight: 800, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "4px 8px", borderRadius: "5px", flex: 1 }}>
                          {tracking}
                        </code>
                        <button
                          type="button"
                          className="shopifyOrderCopyBtn"
                          onClick={copyTrackingToClipboard}
                        >
                          {copiedTracking ? "✓ Copied" : "📋 Copy"}
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <a
                          href={\`https://postex.pk/tracking?cn=\${tracking}\`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shopifyTrackingLink"
                          style={{ margin: 0, flex: 1, justifyContent: "center", padding: "6px" }}
                        >
                          🔗 Open PostEx.pk
                        </a>
                        <button
                          type="button"
                          className="shopifyRowBtn"
                          onClick={checkLivePostexStatus}
                          disabled={saving || checkingPostex}
                        >
                          {checkingPostex ? "..." : "🔄 Status"}
                        </button>
                      </div>

                      {!orderStage.toLowerCase().includes("deliver") && (
                        <button
                          type="button"
                          onClick={unbookOrder}
                          disabled={saving || checkingPostex}
                          className="shopifyRowBtn danger"
                          style={{ fontSize: "11.5px", justifyContent: "center", marginTop: "4px" }}
                        >
                          ↩️ Mark as Unbooked (Return to Warehouse)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Overrides */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid #edf1ee", paddingTop: "12px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#495a4f" }}>Delivery Method</span>
                    <select
                      value={deliveryMethod}
                      onChange={(e) => {
                        setDeliveryMethod(e.target.value);
                        saveChanges({ deliveryMethod: e.target.value });
                      }}
                      style={{ padding: "6px", fontSize: "12px", borderRadius: "6px", border: "1px solid #d5ded6" }}
                    >
                      <option>PostEx</option>
                      <option>Rider / same city</option>
                      <option>Customer pickup</option>
                      <option>Staff delivery</option>
                      <option>Manual courier</option>
                    </select>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#495a4f" }}>Courier Stage</span>
                    <select
                      value={orderStage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOrderStage(val);
                        const isUnbook = val.toLowerCase().includes("unbook");
                        if (isUnbook) setFulfillmentStatus("Unfulfilled");
                        saveChanges({ postexStatus: val, status: val, orderStage: val, ...(isUnbook ? { fulfillmentStatus: "Unfulfilled" } : {}) });
                      }}
                      style={{ padding: "6px", fontSize: "12px", borderRadius: "6px", border: "1px solid #d5ded6" }}
                    >
                      {customOrderStatusOptions.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#495a4f" }}>Fulfillment Status</span>
                    <select
                      value={fulfillmentStatus}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFulfillmentStatus(val);
                        saveChanges({ fulfillmentStatus: val });
                      }}
                      style={{ padding: "6px", fontSize: "12px", borderRadius: "6px", border: "1px solid #d5ded6" }}
                    >
                      <option>Unfulfilled</option>
                      <option>Packing</option>
                      <option>Booked with PostEx</option>
                      <option>Shipped</option>
                      <option>Delivered</option>
                      <option>On hold</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {/* 3. CHANNEL & TAGS CARD */}
            <div className="shopifySectionCard">
              <div className="shopifySectionHeader">
                <h3><span>🏷️</span> Channel &amp; Tags</h3>
              </div>

              <div className="shopifySectionBody">
                <div>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#63756a", textTransform: "uppercase" }}>Order Channel</span>
                  <div style={{ marginTop: "4px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#f1f5f2", border: "1px solid #d4ded6", padding: "4px 10px", borderRadius: "6px", fontSize: "12.5px", fontWeight: 700, color: "#173d29" }}>
                      {orderSourceBadge(order.source).icon} {orderSourceBadge(order.source).label}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#63756a", textTransform: "uppercase" }}>Order Tags</span>
                  <input
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="e.g. VIP, Urgent, Stitching"
                    style={{ width: "100%", padding: "7px 10px", fontSize: "12.5px", borderRadius: "6px", border: "1px solid #d5ded6", marginTop: "4px" }}
                  />
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
                    {tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                      <span key={tag} style={{ background: "#edf4ef", border: "1px solid #c8d9cc", color: "#173d29", padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Meta Pixel & Events Log Link */}
                <div style={{ borderTop: "1px solid #edf1ee", paddingTop: "10px", fontSize: "12px", color: "#6a7c70" }}>
                  <div>Shared Event ID: <code style={{ color: "#173d29" }}>{order.order_number || String(order.id).replace(/^#/, "")}</code></div>
                  <div style={{ marginTop: "6px", display: "flex", gap: "6px" }}>
                    {onNavigateToEvents && (
                      <button
                        type="button"
                        onClick={() => onNavigateToEvents(order.order_number || order.id)}
                        className="shopifyRowBtn"
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                      >
                        🔍 Events Log
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={resyncOrderMetaPurchase}
                      disabled={resyncingCapi || saving}
                      className="shopifyRowBtn"
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                    >
                      {resyncingCapi ? "..." : "⚡ Sync Meta"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`;

const newContent = content.slice(0, startIndex) + replacement + content.slice(endIndex + endMarker.length);
fs.writeFileSync(file, newContent, 'utf8');
console.log("Successfully replaced OrderDetailDrawer with Shopify 2-Column Experience!");
