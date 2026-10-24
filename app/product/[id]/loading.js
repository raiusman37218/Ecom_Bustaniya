import SiteHeader from "../../../components/SiteHeader";

export default function ProductLoading() {
  return (
    <>
      <SiteHeader />
      <main className="productPage" aria-busy="true" aria-label="Loading product details">
        <div className="productDetailLayout">
          {/* Gallery Skeleton */}
          <div className="productGallery mariabGallery">
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "220px", height: "14px", marginBottom: "18px" }} />
            <div className="galleryWorkspace hasThumbnails">
              <div className="galleryThumbnails" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className="bs-skeleton" style={{ width: "70px", height: "94px", borderRadius: "6px" }} />
                ))}
              </div>
              <div className="galleryMainView" style={{ aspectRatio: "3/4", minHeight: "560px", borderRadius: "10px" }}>
                <span className="bs-skeleton" style={{ width: "100%", height: "100%", display: "block" }} />
              </div>
            </div>
          </div>

          {/* Purchase Details Skeleton */}
          <div className="productPurchase" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "120px", height: "13px" }} />
            <span className="bs-skeleton" style={{ width: "85%", height: "36px", borderRadius: "4px" }} />
            <div style={{ display: "flex", gap: "12px", alignItems: "baseline", margin: "6px 0 10px" }}>
              <span className="bs-skeleton" style={{ width: "130px", height: "28px", borderRadius: "4px" }} />
              <span className="bs-skeleton" style={{ width: "80px", height: "20px", borderRadius: "4px" }} />
            </div>
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "65%", height: "14px" }} />

            <hr className="bs-divider" style={{ margin: "14px 0" }} />

            {/* Sizes */}
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "90px", height: "12px" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="bs-skeleton" style={{ width: "52px", height: "42px", borderRadius: "6px" }} />
              ))}
            </div>

            {/* Buttons */}
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <span className="bs-skeleton" style={{ width: "100%", height: "50px", borderRadius: "8px" }} />
              <span className="bs-skeleton" style={{ width: "100%", height: "50px", borderRadius: "8px" }} />
            </div>

            {/* Accordions */}
            <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <span className="bs-skeleton" style={{ width: "100%", height: "46px", borderRadius: "6px" }} />
              <span className="bs-skeleton" style={{ width: "100%", height: "46px", borderRadius: "6px" }} />
              <span className="bs-skeleton" style={{ width: "100%", height: "46px", borderRadius: "6px" }} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
