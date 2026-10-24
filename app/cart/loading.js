import SiteHeader from "../../components/SiteHeader";

export default function CartLoading() {
  return (
    <>
      <SiteHeader />
      <main className="bs-loadingSection" aria-busy="true" aria-label="Loading shopping bag">
        {/* Breadcrumb & Title */}
        <div style={{ marginBottom: "28px" }}>
          <span className="bs-skeleton bs-skeleton--line" style={{ width: "140px", marginBottom: "12px" }} />
          <span className="bs-skeleton bs-skeleton--heading" style={{ width: "240px", marginBottom: "8px" }} />
          <span className="bs-skeleton bs-skeleton--subheading" style={{ width: "160px" }} />
        </div>

        {/* 2-Column Cart Grid */}
        <div className="bs-cartSkeletonGrid">
          {/* Left Column: Cart Items */}
          <div className="bs-cartSkeletonItems" aria-hidden="true">
            {[1, 2].map((i) => (
              <div className="bs-cartSkeletonCard" key={i}>
                <span className="bs-skeleton" style={{ width: "100px", height: "130px", borderRadius: "8px", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                  <span className="bs-skeleton bs-skeleton--line" style={{ width: "65%" }} />
                  <span className="bs-skeleton bs-skeleton--line" style={{ width: "35%", height: "0.65rem" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "auto" }}>
                    <span className="bs-skeleton bs-skeleton--pill" style={{ width: "110px", height: "34px" }} />
                    <span className="bs-skeleton bs-skeleton--line" style={{ width: "80px", marginLeft: "auto" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="bs-cartSkeletonSummary" aria-hidden="true">
            <span className="bs-skeleton bs-skeleton--heading" style={{ height: "1.75rem", width: "55%" }} />
            <hr style={{ border: "none", borderTop: "1px solid #e8e3d9", margin: "4px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="bs-skeleton bs-skeleton--line" style={{ width: "80px" }} />
              <span className="bs-skeleton bs-skeleton--line" style={{ width: "70px" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="bs-skeleton bs-skeleton--line" style={{ width: "60px" }} />
              <span className="bs-skeleton bs-skeleton--line" style={{ width: "50px" }} />
            </div>
            <hr style={{ border: "none", borderTop: "1px solid #e8e3d9", margin: "4px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="bs-skeleton bs-skeleton--subheading" style={{ width: "70px" }} />
              <span className="bs-skeleton bs-skeleton--heading" style={{ width: "100px", height: "1.75rem" }} />
            </div>
            <span className="bs-skeleton bs-skeleton--btn" style={{ width: "100%", marginTop: "8px" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "75%", margin: "0 auto" }} />
          </div>
        </div>
      </main>
    </>
  );
}
