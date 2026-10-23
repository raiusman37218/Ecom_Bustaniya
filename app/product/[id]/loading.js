import SiteHeader from "../../../components/SiteHeader";

/* Shown the instant a product link is clicked, while the server streams the
   real page. Without a loading boundary the browser sat on the previous page
   for the whole round trip, which read as the click not registering.

   The real header renders here (all its props are defaulted) so it does not
   flash away and back during the transition. */
export default function ProductLoading() {
  return (
    <>
      <SiteHeader />
      <main className="bs-container" style={{ paddingBlock: "var(--bs-space-8)" }} aria-busy="true" aria-label="Loading product">
        <span className="bs-skeleton bs-skeleton--line" style={{ width: "260px", marginBottom: "var(--bs-space-8)" }} />

        <div className="bs-productLoading">
          <div className="bs-productLoading__gallery">
            <span className="bs-skeleton" style={{ aspectRatio: ".8", borderRadius: "var(--bs-radius-sm)" }} />
          </div>

          <div className="bs-stack">
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "40%" }} />
            <span className="bs-skeleton" style={{ height: "2.25rem", width: "75%" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "30%", height: "1.25rem" }} />
            <hr className="bs-divider" />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "25%" }} />
            <div className="bs-row">
              {[1, 2, 3].map((n) => <span className="bs-skeleton" key={n} style={{ width: "52px", height: "40px" }} />)}
            </div>
            <span className="bs-skeleton" style={{ height: "var(--bs-control-lg)", borderRadius: "var(--bs-radius-md)" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "90%" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "70%" }} />
          </div>
        </div>
      </main>
    </>
  );
}
