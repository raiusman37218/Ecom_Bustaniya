import Image from "next/image";
import { notFound } from "next/navigation";
import SiteHeader from "../../../../components/SiteHeader";
import SiteFooter from "../../../../components/SiteFooter";
import { normalizeCategory } from "../../../../data/store";
import { getCatalogCategories, subcategoryOptions } from "../../../../lib/categories";
import { getCatalogProducts } from "../../../../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, collectionSchema } from "../../../../lib/seo";
import { getStoreSettings } from "../../../../lib/storeSettings";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../../../../lib/images";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug, subcategory } = await params;
  const categories = await getCatalogCategories();
  const parent = categories.find((item) => item.slug === slug && !item.parentSlug);
  const details = subcategoryOptions(categories, slug).find((item) => item.slug === subcategory);
  return parent && details ? buildMetadata({
    title: `${details.name} ${parent.name}`,
    description: `${details.description} Shop ${details.name.toLowerCase()} online from Bustaniya.`,
    path: `/category/${slug}/${subcategory}`,
    image: details.image,
  }) : {};
}

export default async function SubcategoryPage({ params }) {
  const { slug, subcategory } = await params;
  const categories = await getCatalogCategories();
  const parent = categories.find((item) => item.slug === slug && !item.parentSlug);
  const details = subcategoryOptions(categories, slug).find((item) => item.slug === subcategory);
  if (!parent || !details) notFound();

  const [products, storeSettings] = await Promise.all([getCatalogProducts(), getStoreSettings()]);
  const items = products.filter((product) => normalizeCategory(product.category) === parent.name && product.subcategory === subcategory);
  // The sibling row lets shoppers switch styles without going back up a level.
  const siblings = subcategoryOptions(categories, slug);

  return (
    <main className="categoryPage">
      <JsonLd
        data={collectionSchema({
          name: `${details.name} ${parent.name}`,
          description: details.description,
          path: `/category/${slug}/${subcategory}`,
          products: items,
        })}
      />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: parent.name, path: `/category/${slug}` },
        { name: details.name, path: `/category/${slug}/${subcategory}` },
      ])} />
      <SiteHeader storeSettings={storeSettings} categories={categories} activeNav={slug} />

      <section className="collectionHeader">
        <nav className="collectionBreadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <a href={`/category/${slug}`}>{parent.name}</a>
          <span aria-hidden="true">/</span>
          <span className="collectionBreadcrumbCurrent">{details.name}</span>
        </nav>
        <h1>{details.name}</h1>
        {details.description && <p className="collectionIntro">{details.description}</p>}

        {!!siblings.length && (
          <nav className="subCategoryNav" aria-label={`Shop ${parent.name} by style`}>
            <a className="subCategoryPill" href={`/category/${slug}`}>All {parent.name}</a>
            {siblings.map((item) => (
              <a
                className={item.slug === subcategory ? "subCategoryPill isActive" : "subCategoryPill"}
                href={`/category/${slug}/${item.slug}`}
                key={item.slug}
              >
                {item.name}
              </a>
            ))}
          </nav>
        )}
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
              <a href={`/product/${product.id}`} className="productImage">
                <Image
                  src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)}
                  alt={`${product.name} - ${details.name} by Bustaniya`}
                  fill
                  sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                />
                {product.badge && <span className="badge">{product.badge}</span>}
                <span className="quickAdd">Choose options</span>
              </a>
              <div className="productInfo">
                <div><p>{details.name}</p><h3><a href={`/product/${product.id}`}>{product.name}</a></h3></div>
                <div className="productPrice"><span>Rs. {product.price.toLocaleString()}</span>{onSale && <del>Rs. {compareAtPrice.toLocaleString()}</del>}</div>
              </div>
            </article>
            );
          })}
        </div>
      </section>

      <SiteFooter categories={categories} storeSettings={storeSettings} />
    </main>
  );
}
