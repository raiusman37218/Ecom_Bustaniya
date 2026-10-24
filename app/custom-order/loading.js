import SiteHeader from "../../components/SiteHeader";

export default function CustomOrderLoading() {
  return (
    <>
      <SiteHeader />
      <main className="bs-loadingSection" aria-busy="true" aria-label="Loading bespoke custom studio">
        <div className="bs-customSkeletonWrap" aria-hidden="true">
          {/* Haute Couture Pill & Title */}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
            <span className="bs-skeleton bs-skeleton--pill" style={{ width: "280px" }} />
            <span className="bs-skeleton bs-skeleton--heading" style={{ width: "420px", maxWidth: "90%" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "320px", maxWidth: "80%" }} />
          </div>

          {/* Wizard Steps */}
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            {[1, 2, 3, 4].map((step) => (
              <span key={step} className="bs-skeleton bs-skeleton--pill" style={{ width: "130px", height: "38px" }} />
            ))}
          </div>

          {/* Silhouette Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                style={{
                  padding: "20px",
                  background: "#ffffff",
                  border: "1px solid #e8e3d9",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <span className="bs-skeleton" style={{ width: "100%", aspectRatio: "3 / 4", borderRadius: "8px" }} />
                <span className="bs-skeleton bs-skeleton--line" style={{ width: "60%" }} />
                <span className="bs-skeleton bs-skeleton--line" style={{ width: "40%", height: "0.65rem" }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
