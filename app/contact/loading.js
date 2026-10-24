import SiteHeader from "../../components/SiteHeader";

export default function ContactLoading() {
  return (
    <>
      <SiteHeader />
      <main className="bs-loadingSection" aria-busy="true" aria-label="Loading contact details">
        <div className="bs-editorialSkeleton" aria-hidden="true">
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <span className="bs-skeleton bs-skeleton--heading" style={{ width: "220px" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "360px", maxWidth: "90%" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "36px", marginTop: "16px" }}>
            {/* Form Skeleton */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <span className="bs-skeleton bs-skeleton--input" />
              <span className="bs-skeleton bs-skeleton--input" />
              <span className="bs-skeleton bs-skeleton--input" />
              <span className="bs-skeleton" style={{ height: "110px", borderRadius: "8px" }} />
              <span className="bs-skeleton bs-skeleton--btn" style={{ width: "160px" }} />
            </div>

            {/* Showroom info skeleton */}
            <div
              style={{
                padding: "28px",
                background: "#fbf9f4",
                border: "1px solid #e8e3d9",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <span className="bs-skeleton bs-skeleton--subheading" style={{ width: "160px" }} />
              <span className="bs-skeleton bs-skeleton--line" style={{ width: "85%" }} />
              <span className="bs-skeleton bs-skeleton--line" style={{ width: "70%" }} />
              <hr style={{ border: "none", borderTop: "1px solid #e8e3d9" }} />
              <span className="bs-skeleton bs-skeleton--line" style={{ width: "50%" }} />
              <span className="bs-skeleton bs-skeleton--line" style={{ width: "65%" }} />
              <span className="bs-skeleton" style={{ height: "130px", borderRadius: "8px", marginTop: "auto" }} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
