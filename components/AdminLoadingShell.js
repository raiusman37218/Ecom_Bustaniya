export default function AdminLoadingShell() {
  return (
    <main className="adminShell adminLoadingShell" aria-busy="true" aria-label="Loading Bustaniya admin">
      <aside className="adminSidebar adminLoadingSidebar" aria-hidden="true">
        <div className="adminLoadingBrand">
          <span className="adminSkeleton adminLoadingMark" />
          <span className="adminSkeleton adminLoadingBrandName" />
        </div>
        <div className="adminLoadingNavigation">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <span className="adminSkeleton adminLoadingNavItem" key={item} />
          ))}
        </div>
        <span className="adminSkeleton adminLoadingAccount" />
      </aside>
      <section className="adminMain">
        <header className="adminTopbar adminLoadingTopbar" aria-hidden="true">
          <span className="adminSkeleton adminLoadingSearch" />
          <div className="adminLoadingTopActions">
            <span className="adminSkeleton adminLoadingAction" />
            <span className="adminSkeleton adminLoadingAvatar" />
          </div>
        </header>
        <div className="adminContent adminLoadingContent">
          <div className="adminLoadingHeading">
            <span className="adminSkeleton adminLoadingEyebrow" />
            <span className="adminSkeleton adminLoadingTitle" />
            <span className="adminSkeleton adminLoadingSubtitle" />
          </div>
          <div className="adminLoadingMetricGrid" aria-hidden="true">
            {[1, 2, 3, 4].map((item) => (
              <div className="adminLoadingMetric" key={item}>
                <span className="adminSkeleton" />
                <span className="adminSkeleton" />
                <span className="adminSkeleton" />
              </div>
            ))}
          </div>
          <section className="adminLoadingPanel" aria-hidden="true">
            <div>
              <span className="adminSkeleton adminLoadingPanelTitle" />
              <span className="adminSkeleton adminLoadingPanelAction" />
            </div>
            {[1, 2, 3, 4, 5].map((item) => (
              <span className="adminSkeleton adminLoadingRow" key={item} />
            ))}
          </section>
          <p className="adminLoadingStatus">Opening Bustaniya Admin…</p>
        </div>
      </section>
    </main>
  );
}

export { AdminLoadingShell };
