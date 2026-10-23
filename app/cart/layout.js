// The cart page is a client component and cannot export metadata itself, so it
// gets a layout for it. `absolute` keeps the root template from appending a
// second "| Bustaniya"; a cart has nothing to index.
export const metadata = {
  title: { absolute: "Shopping Bag | Bustaniya" },
  description: "Review the pieces in your Bustaniya shopping bag before checkout.",
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }) {
  return children;
}
