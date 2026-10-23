// UK cart. Without this the page inherited the Pakistani site default and told
// British shoppers they were on "Bustaniya - Pakistani Women's Clothing Online
// in Pakistan".
export const metadata = {
  title: { absolute: "Shopping Bag | Bustaniya UK" },
  description: "Review the pieces in your Bustaniya UK shopping bag before checkout.",
  robots: { index: false, follow: true },
};

export default function UkCartLayout({ children }) {
  return children;
}
