import SiteHeader from "../../components/SiteHeader";

export default function AboutLoading() {
  return (
    <>
      <SiteHeader />
      <main className="bs-loadingSection" aria-busy="true" aria-label="Loading our story">
        <div className="bs-editorialSkeleton" aria-hidden="true">
          {/* Editorial Title */}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <span className="bs-skeleton bs-skeleton--pill" style={{ width: "160px" }} />
            <span className="bs-skeleton bs-skeleton--heading" style={{ width: "340px", maxWidth: "90%" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "420px", maxWidth: "80%" }} />
          </div>

          {/* Hero Banner */}
          <span className="bs-skeleton" style={{ width: "100%", height: "320px", borderRadius: "12px", margin: "16px 0" }} />

          {/* Story Paragraphs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "95%" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "90%" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "85%" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "65%" }} />
          </div>

          {/* Values Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginTop: "24px" }}>
            {[1, 2, 3].map((val) => (
              <div
                key={val}
                style={{
                  padding: "24px",
                  background: "#ffffff",
                  border: "1px solid #e8e3d9",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <span className="bs-skeleton bs-skeleton--circle" style={{ width: "44px", height: "44px" }} />
                <span className="bs-skeleton bs-skeleton--subheading" style={{ width: "120px" }} />
                <span className="bs-skeleton bs-skeleton--line" style={{ width: "90%" }} />
                <span className="bs-skeleton bs-skeleton--line" style={{ width: "75%" }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
