import SiteHeader from "../components/SiteHeader";
import CollectionLoadingSkeleton from "../components/CollectionLoadingSkeleton";

export default function RootLoading() {
  return (
    <>
      <SiteHeader />
      <main className="bs-loadingSection" aria-busy="true" aria-label="Loading Bustaniya luxury collection">
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
