import SiteHeader from "../../../components/SiteHeader";
import CollectionLoadingSkeleton from "../../../components/CollectionLoadingSkeleton";

// Also covers /category/[slug]/[subcategory], which nests inside this segment.
export default function CategoryLoading() {
  return (
    <>
      <SiteHeader />
      <CollectionLoadingSkeleton />
    </>
  );
}
