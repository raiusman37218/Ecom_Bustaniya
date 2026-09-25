import { buildMetadata } from "../../lib/seo";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getStoreSettings } from "../../lib/storeSettings";
import CustomOrderClient from "../../components/CustomOrderClient";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Custom Dress & Bespoke Tailoring",
  description:
    "Order custom-tailored Eastern wear with Bustaniya. Choose your style, upload reference design pictures, provide exact measurements, and get handcrafted perfection delivered to your doorstep.",
  path: "/custom-order",
});

export default async function CustomOrderPage() {
  const storeSettings = await getStoreSettings();

  return (
    <>
      <SiteHeader storeSettings={storeSettings} activeNav="custom-order" />
      <main className="customOrderPageShell">
        <CustomOrderClient storeSettings={storeSettings} />
      </main>
      <SiteFooter storeSettings={storeSettings} />
    </>
  );
}
