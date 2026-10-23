import UkHeader from "../../../../components/uk/UkHeader";
import CollectionLoadingSkeleton from "../../../../components/CollectionLoadingSkeleton";

// The UK product page reuses the listing skeleton rather than a bespoke one:
// it is the same shape of wait, and one skeleton is one thing to keep correct.
export default function UkProductLoading() {
  return (
    <>
      <UkHeader />
      <CollectionLoadingSkeleton cards={4} />
    </>
  );
}
