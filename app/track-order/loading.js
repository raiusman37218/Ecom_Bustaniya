import SiteHeader from "../../components/SiteHeader";

export default function TrackOrderLoading() {
  return (
    <>
      <SiteHeader />
      <main className="bs-loadingSection" aria-busy="true" aria-label="Loading order tracker">
        <div className="bs-trackSkeletonWrap" aria-hidden="true">
          <span className="bs-skeleton bs-skeleton--circle" style={{ width: "56px", height: "56px" }} />
          <span className="bs-skeleton bs-skeleton--heading" style={{ width: "260px" }} />
          <span className="bs-skeleton bs-skeleton--line" style={{ width: "380px", maxWidth: "90%" }} />

          {/* Search Input Bar */}
          <div style={{ width: "100%", display: "flex", gap: "10px", marginTop: "12px" }}>
            <span className="bs-skeleton bs-skeleton--input" style={{ flex: 1 }} />
            <span className="bs-skeleton bs-skeleton--btn" style={{ width: "130px" }} />
          </div>

          <hr style={{ width: "100%", border: "none", borderTop: "1px solid #e8e3d9", margin: "16px 0" }} />

          {/* Stepper Milestones */}
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {[1, 2, 3, 4].map((step) => (
              <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <span className="bs-skeleton bs-skeleton--circle" style={{ width: "38px", height: "38px" }} />
                <span className="bs-skeleton bs-skeleton--line" style={{ width: "65px" }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
