import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import UkHeader from "../../../../../components/uk/UkHeader";
import UkFooter from "../../../../../components/uk/UkFooter";
import { normalizeCategory } from "../../../../../data/store";
import { getCatalogCategories, subcategoryOptions } from "../../../../../lib/categories";
import { getCatalogProducts } from "../../../../../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, collectionSchema } from "../../../../../lib/seo";
import { getStoreSettings } from "../../../../../lib/storeSettings";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../../../../../lib/images";
import { convertProductsToRegion, formatPrice } from "../../../../../lib/regions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug, subcategory } = await params;
  const categories = await getCatalogCategories();
  const parent = categories.find((item) => item.slug === slug && !item.parentSlug);
  const details = subcategoryOptions(categories, slug).find((item) => item.slug === subcategory);
  return parent && details ? buildMetadata({
    title: `${details.name} ${parent.name} in the UK`,
    description: `${details.description} Shop ${details.name.toLowerCase()} in the UK from Bustaniya.`,
    path: `/uk/category/${slug}/${subcategory}`,
    image: details.image,
  }) : {};
}

export default async function UkSubcategoryPage({ params }) {
  const { slug, subcategory } = await params;
  const categories = await getCatalogCategories();
  const parent = categories.find((item) => item.slug === slug && !item.parentSlug);
  const details = subcategoryOptions(categories, slug).find((item) => item.slug === subcategory);
  if (!parent || !details) notFound();

  const [rawProducts, storeSettings] = await Promise.all([getCatalogProducts(), getStoreSettings()]);
  const rawItems = rawProducts.filter(
    (product) => normalizeCategory(product.category) === parent.name && product.subcategory === subcategory
  );
  const items = convertProductsToRegion(rawItems, "uk");
  const coverImage = items[0]?.image || details.image;

  return (
    <main className="categoryPage">
      <JsonLd
        data={collectionSchema({
          name: `${details.name} ${parent.name} - UK`,
          description: details.description,
          path: `/uk/category/${slug}/${subcategory}`,
          products: items,
        })}
      />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", path: "/uk" },
        { name: parent.name, path: `/uk/category/${slug}` },
        { name: details.name, path: `/uk/category/${slug}/${subcategory}` },
      ])} />
      <UkHeader storeSettings={storeSettings} categories={categories} activeNav={slug} />

      <section
        className="categoryHero subcategoryHero"
        style={{ backgroundImage: `linear-gradient(90deg, #f4f7eef0, #f4f7ee30), url(${optimizedImageUrl(coverImage, CLOUDINARY_IMAGE_PRESETS.heroDesktop)})` }}
      >
        <a href={`/uk/category/${slug}`}><ArrowLeft size={16} /> All {parent.name}</a>
        <div>
          <p className="eyebrow">BUSTANIYA UK - {parent.name.toUpperCase()}</p>
          <h1>{details.name}</h1>
          <p>{details.description}</p>
        </div>
      </section>

      <section className="collectionArea">
        <div className="collectionTop">
          <p>{items.length} products</p>
          <span>Sort by: Featured</span>
        </div>
        <div className="productGrid">
          {items.map((product) => {
            const compareAtPrice = Number(product.compareAtPrice || product.compare_at_price || 0);
            const onSale = compareAtPrice > product.price;
            return (
              <article className={`productCard productCard--${storeSettings.productCardStyle || "connected"}`} key={product.id}>
                <a href={`/uk/product/${product.id}`} className="productImage">
                  <Image
                    src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)}
                    alt={`${product.name} - ${details.name} by Bustaniya UK`}
                    fill
                    sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                  />
                  {product.badge && <span className="badge">{product.badge}</span>}
                  <span className="quickAdd">Choose options</span>
                </a>
                <div className="productInfo">
                  <div><p>{details.name}</p><h3><a href={`/uk/product/${product.id}`}>{product.name}</a></h3></div>
                  <div className="productPrice"><span>{formatPrice(product.price, "uk")}</span>{onSale && <del>{formatPrice(compareAtPrice, "uk")}</del>}</div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <UkFooter categories={categories} storeSettings={storeSettings} />
    </main>
  );
}
