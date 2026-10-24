export default function CheckoutLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "#ffffff" }} aria-busy="true" aria-label="Loading secure checkout">
      {/* 1. Checkout Minimal Top Header */}
      <header
        style={{
          borderBottom: "1px solid #e8e3d9",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1240px",
          margin: "0 auto",
        }}
      >
        <span className="bs-skeleton" style={{ width: "130px", height: "36px", borderRadius: "6px" }} />
        <span className="bs-skeleton bs-skeleton--badge" style={{ width: "90px" }} />
      </header>

      {/* 2. Main 2-Column Checkout Layout */}
      <main className="bs-checkoutSkeletonGrid">
        {/* Left Column: Form Fields */}
        <div className="bs-checkoutSkeletonMain" aria-hidden="true">
          {/* Express Checkout Pill */}
          <span className="bs-skeleton" style={{ height: "46px", borderRadius: "8px", width: "100%" }} />

          {/* Contact Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span className="bs-skeleton bs-skeleton--subheading" style={{ width: "150px" }} />
            <span className="bs-skeleton bs-skeleton--input" style={{ width: "100%" }} />
          </div>

          {/* Delivery Address Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span className="bs-skeleton bs-skeleton--subheading" style={{ width: "170px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <span className="bs-skeleton bs-skeleton--input" />
              <span className="bs-skeleton bs-skeleton--input" />
            </div>
            <span className="bs-skeleton bs-skeleton--input" style={{ width: "100%" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <span className="bs-skeleton bs-skeleton--input" />
              <span className="bs-skeleton bs-skeleton--input" />
            </div>
          </div>

          {/* Shipping Method Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span className="bs-skeleton bs-skeleton--subheading" style={{ width: "140px" }} />
            <span className="bs-skeleton" style={{ height: "56px", borderRadius: "8px" }} />
          </div>

          {/* Payment Method Selector Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span className="bs-skeleton bs-skeleton--subheading" style={{ width: "130px" }} />
            <span className="bs-skeleton" style={{ height: "96px", borderRadius: "8px" }} />
          </div>

          {/* Place Order Button */}
          <span className="bs-skeleton bs-skeleton--btn" style={{ width: "100%", height: "54px" }} />
        </div>

        {/* Right Column: Order Items & Totals */}
        <div className="bs-checkoutSkeletonSidebar" aria-hidden="true">
          <span className="bs-skeleton bs-skeleton--subheading" style={{ width: "130px" }} />
          <hr style={{ border: "none", borderTop: "1px solid #e8e3d9", margin: "2px 0" }} />

          {/* 2 Items */}
          {[1, 2].map((idx) => (
            <div key={idx} style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <span className="bs-skeleton" style={{ width: "64px", height: "76px", borderRadius: "6px", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                <span className="bs-skeleton bs-skeleton--line" style={{ width: "75%" }} />
                <span className="bs-skeleton bs-skeleton--line" style={{ width: "40%", height: "0.65rem" }} />
              </div>
              <span className="bs-skeleton bs-skeleton--line" style={{ width: "60px" }} />
            </div>
          ))}

          <hr style={{ border: "none", borderTop: "1px solid #e8e3d9", margin: "4px 0" }} />

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "70px" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "80px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "60px" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "50px" }} />
          </div>
          <hr style={{ border: "none", borderTop: "1px solid #e8e3d9", margin: "4px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="bs-skeleton bs-skeleton--subheading" style={{ width: "50px" }} />
            <span className="bs-skeleton bs-skeleton--heading" style={{ width: "110px", height: "1.75rem" }} />
          </div>
        </div>
      </main>
    </div>
  );
}
