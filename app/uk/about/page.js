import { buildMetadata } from "../../../lib/seo";
import UkHeader from "../../../components/uk/UkHeader";
import UkFooter from "../../../components/uk/UkFooter";
import { getStoreSettings } from "../../../lib/storeSettings";
import { REGIONS } from "../../../lib/regions";

export const metadata = buildMetadata({
  title: "About Bustaniya UK",
  description:
    "Bustaniya curates authentic Pakistani women's clothing, kurtis, co-ords and eastern wear for customers across the United Kingdom.",
  path: "/uk/about",
});

export default async function UkAboutPage() {
  const storeSettings = await getStoreSettings();

  return (
    <div className="siteLayout">
      <UkHeader storeSettings={storeSettings} activeNav="about" />
      <main className="infoPage">
        <section className="infoHero">
          <p className="eyebrow">ABOUT BUSTANIYA UK</p>
          <h1>Pakistani Designer Wear with Everyday Grace in the UK</h1>
          <p>
            Bustaniya curates authentic eastern wear for women in the United Kingdom, focusing on pieces
            that embody grace, premium fabrics, and effortless elegance.
          </p>
        </section>
        <section className="infoContent">
          <h2>Our UK Presence</h2>
          <p>
            Operating as <strong>BUSTANIYA LTD</strong> (Company no. 17414024), registered in England and Wales,
            we bring authentic Pakistani couture and pret wear directly to customers across Great Britain and Northern Ireland with fast, tracked courier delivery.
          </p>
          <h2>Collections Available in the UK</h2>
          <p>
            Our current UK catalog includes ready-to-wear kurtis, co-ord sets, trousers, and festive 3-piece suits. All prices are listed in British Pounds (GBP) with no hidden import duties.
          </p>
          <h2>Our Promise to UK Shoppers</h2>
          <p>
            We ensure complete transparency with clear size guides, reliable 2–4 business day tracked delivery via Royal Mail and DPD, and a dedicated UK customer care team.
          </p>
        </section>
      </main>
      <UkFooter storeSettings={storeSettings} />
    </div>
  );
}
