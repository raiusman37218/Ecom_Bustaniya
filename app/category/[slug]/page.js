import Image from "next/image";
import { notFound } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import { normalizeCategory } from "../../../data/store";
import { getCatalogCategories, subcategoryOptions } from "../../../lib/categories";
import { getCatalogProducts } from "../../../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, collectionSchema } from "../../../lib/seo";
import { getStoreSettings } from "../../../lib/storeSettings";
import { CLOUDINARY_IMAGE_PRESETS, optimizedImageUrl } from "../../../lib/images";

export const dynamic = "force-dynamic";

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
    <main className="categoryPage">
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

      <section className="collectionHeader">
        <nav className="collectionBreadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <span className="collectionBreadcrumbCurrent">{category.name}</span>
        </nav>
        <h1>{category.name}</h1>
        {category.description && <p className="collectionIntro">{category.description}</p>}

        {!!subcategories.length && (
          <nav className="subCategoryNav" aria-label={`Shop ${category.name} by style`}>
            <a className="subCategoryPill isActive" href={`/category/${category.slug}`}>All {category.name}</a>
            {subcategories.map((item) => (
              <a className="subCategoryPill" href={`/category/${category.slug}/${item.slug}`} key={item.slug}>
                {item.name}
              </a>
            ))}
          </nav>
        )}
      </section>

      <section className="collectionArea">
        <div className="collectionTop">
          <p>{categoryProducts.length} products</p>
          <span>Sort by: Featured</span>
        </div>
        <div className="productGrid">
          {categoryProducts.map((product) => {
            const compareAtPrice = Number(product.compareAtPrice || product.compare_at_price || 0);
            const onSale = compareAtPrice > product.price;
            return (
            <article className={`productCard productCard--${storeSettings.productCardStyle || "connected"}`} key={product.id}>
              <a href={`/product/${product.id}`} className="productImage">
                <Image
                  src={optimizedImageUrl(product.image, CLOUDINARY_IMAGE_PRESETS.card)}
                  alt={`${product.name} - ${product.category} by Bustaniya`}
                  fill
                  sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                />
                {product.badge && <span className="badge">{product.badge}</span>}
                <span className="quickAdd">Choose options</span>
              </a>
              <div className="productInfo">
                <div>
                  <p>{product.category}</p>
                  <h3><a href={`/product/${product.id}`}>{product.name}</a></h3>
                </div>
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
