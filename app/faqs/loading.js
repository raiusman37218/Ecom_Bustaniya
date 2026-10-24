import SiteHeader from "../../components/SiteHeader";

export default function FaqsLoading() {
  return (
    <>
      <SiteHeader />
      <main className="bs-loadingSection" aria-busy="true" aria-label="Loading FAQs">
        <div className="bs-editorialSkeleton" aria-hidden="true">
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <span className="bs-skeleton bs-skeleton--pill" style={{ width: "120px" }} />
            <span className="bs-skeleton bs-skeleton--heading" style={{ width: "360px", maxWidth: "90%" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "280px" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "24px" }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  padding: "20px 24px",
                  background: "#ffffff",
                  border: "1px solid #e8e3d9",
                  borderRadius: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span className="bs-skeleton bs-skeleton--line" style={{ width: `${55 + (i % 3) * 15}%` }} />
                <span className="bs-skeleton bs-skeleton--circle" style={{ width: "20px", height: "20px" }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
