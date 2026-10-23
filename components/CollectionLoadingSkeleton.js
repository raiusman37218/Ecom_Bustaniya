/* Shared skeleton for every product listing — category, subcategory and search.
   Shaped like the grid that replaces it so the page does not jump when the
   real products arrive. */
export default function CollectionLoadingSkeleton({ cards = 8 }) {
  return (
    <main className="bs-container" style={{ paddingBlock: "var(--bs-space-8)" }} aria-busy="true" aria-label="Loading products">
      <div className="bs-stack" style={{ alignItems: "center", marginBottom: "var(--bs-space-10)" }}>
        <span className="bs-skeleton bs-skeleton--line" style={{ width: "150px" }} />
        <span className="bs-skeleton" style={{ height: "2.5rem", width: "min(320px, 70%)" }} />
      </div>

      <div className="bs-grid">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i}>
            <span className="bs-skeleton bs-skeleton--card" />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "45%", margin: "var(--bs-space-4) auto 0" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "70%", margin: "var(--bs-space-2) auto 0" }} />
            <span className="bs-skeleton bs-skeleton--line" style={{ width: "30%", margin: "var(--bs-space-2) auto 0" }} />
          </div>
        ))}
      </div>
    </main>
  );
}
