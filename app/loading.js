import CollectionLoadingSkeleton from "../components/CollectionLoadingSkeleton";

/**
 * Fallback for the root segment.
 *
 * It used to mount the real <SiteHeader /> here. Two problems with that: the
 * root boundary also covers /admin, so the admin route's first paint carried
 * the full storefront chrome — announcement bar, nav, mega menu and both
 * drawers — before the admin shell replaced it; and mounting an interactive
 * client header (scroll listener, modals, drawers) inside a skeleton is a lot
 * of work for something on screen for a few hundred milliseconds.
 *
 * This is a static bar of the same height instead: no nav, no JS, neutral
 * enough to sit under an admin route without looking wrong. Every storefront
 * route that wants the real header during loading already has its own
 * loading.js that renders it (category, product, cart, checkout, search,
 * about, contact, faqs, track-order).
 */
export default function RootLoading() {
  return (
    <>
      <div className="bs-st-loadingChrome" aria-hidden="true">
        <div className="bs-st-loadingChrome__bar" />
      </div>

      <main className="bs-st bs-loadingSection" aria-busy="true" aria-label="Loading Bustaniya luxury collection">
        {/* 1. Hero Banner Skeleton */}
        <div className="bs-heroSkeleton bs-skeleton" />

        {/* 2. Categories Circular Strip Skeleton */}
        <div className="bs-categoriesSkeletonStrip" aria-hidden="true">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div className="bs-categorySkeletonItem" key={idx}>
              <span className="bs-categorySkeletonCircle bs-skeleton" />
              <span className="bs-skeleton bs-skeleton--line" style={{ width: "60px" }} />
            </div>
          ))}
        </div>

        {/* 3. Featured Products Collection Grid Skeleton */}
        <CollectionLoadingSkeleton cards={8} />
      </main>
    </>
  );
}
