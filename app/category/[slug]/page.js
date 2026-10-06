import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import CategoryProductsGrid from "../../../components/CategoryProductsGrid";
import { normalizeCategory } from "../../../data/store";
import { getCatalogCategories, subcategoryOptions } from "../../../lib/categories";
import { getCatalogProducts } from "../../../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, collectionSchema } from "../../../lib/seo";
import { getStoreSettings } from "../../../lib/storeSettings";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../../../lib/images";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const categories = await getCatalogCategories();
  const category = categories.find((item) => item.slug === slug && !item.parentSlug);
  if (!category) return {};
  return buildMetadata({
    title: `${category.name} Collection`,
    description: `${category.description} Shop ${category.name.toLowerCase()} online from Bustaniya with delivery across Pakistan.`,
    path: `/category/${slug}`,
    image: category.image,
  });
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const categories = await getCatalogCategories();
  const category = categories.find((item) => item.slug === slug && !item.parentSlug);
  if (!category) notFound();
  const [products, storeSettings] = await Promise.all([getCatalogProducts(), getStoreSettings()]);
  const mainCategories = categories.filter((item) => !item.parentSlug);
  const subcategories = subcategoryOptions(categories, category.slug);

  const categoryProducts = products.filter(
    (product) => normalizeCategory(product.category) === category.name
  );

  return (
    <>
      <JsonLd
        data={collectionSchema({
          name: `${category.name} Collection`,
          description: category.description,
          path: `/category/${slug}`,
          products: categoryProducts,
        })}
      />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: category.name, path: `/category/${slug}` },
      ])} />
      <SiteHeader storeSettings={storeSettings} categories={categories} activeNav={slug} />

      <main className="categoryPage">
        <section className="collectionHeader">
        <nav className="collectionBreadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="collectionBreadcrumbCurrent">{category.name}</span>
        </nav>
        <h1>{category.name}</h1>
        {category.description && <p className="collectionIntro">{category.description}</p>}

        {!!subcategories.length && (
          <nav className="subCategoryNav" aria-label={`Shop ${category.name} by style`}>
            <Link className="subCategoryPill isActive" href={`/category/${category.slug}`}>All {category.name}</Link>
            {subcategories.map((item) => (
              <Link className="subCategoryPill" href={`/category/${category.slug}/${item.slug}`} key={item.slug}>
                {item.name}
              </Link>
            ))}
          </nav>
        )}
      </section>

      <section className="collectionArea">
        <CategoryProductsGrid
          initialProducts={categoryProducts}
          storeSettings={storeSettings}
          categoryName={category.name}
        />
      </section>
      </main>

      <SiteFooter categories={categories} storeSettings={storeSettings} />
    </>
  );
}
