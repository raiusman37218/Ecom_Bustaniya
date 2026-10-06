import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../../../components/SiteHeader";
import SiteFooter from "../../../../components/SiteFooter";
import CategoryProductsGrid from "../../../../components/CategoryProductsGrid";
import { normalizeCategory } from "../../../../data/store";
import { getCatalogCategories, subcategoryOptions } from "../../../../lib/categories";
import { getCatalogProducts } from "../../../../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, collectionSchema } from "../../../../lib/seo";
import { getStoreSettings } from "../../../../lib/storeSettings";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../../../../lib/images";

export const revalidate = 60;

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
    <>
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

      <main className="categoryPage">
        <section className="collectionHeader">
        <nav className="collectionBreadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/category/${slug}`}>{parent.name}</Link>
          <span aria-hidden="true">/</span>
          <span className="collectionBreadcrumbCurrent">{details.name}</span>
        </nav>
        <h1>{details.name}</h1>
        {details.description && <p className="collectionIntro">{details.description}</p>}

        {!!siblings.length && (
          <nav className="subCategoryNav" aria-label={`Shop ${parent.name} by style`}>
            <Link className="subCategoryPill" href={`/category/${slug}`}>All {parent.name}</Link>
            {siblings.map((item) => (
              <Link
                className={item.slug === subcategory ? "subCategoryPill isActive" : "subCategoryPill"}
                href={`/category/${slug}/${item.slug}`}
                key={item.slug}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        )}
      </section>

      <section className="collectionArea">
        <CategoryProductsGrid
          initialProducts={items}
          storeSettings={storeSettings}
          categoryName={details.name}
        />
      </section>
      </main>

      <SiteFooter categories={categories} storeSettings={storeSettings} />
    </>
  );
}
