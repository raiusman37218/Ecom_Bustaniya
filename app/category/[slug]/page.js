import { ArrowLeft, Search, ShoppingBag, UserRound } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import AnnouncementBar from "../../../components/AnnouncementBar";
import { normalizeCategory } from "../../../data/store";
import { getCatalogCategories, subcategoryOptions } from "../../../lib/categories";
import { getCatalogProducts } from "../../../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, collectionSchema } from "../../../lib/seo";
import { getStoreSettings } from "../../../lib/storeSettings";

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
  const categoryCoverImage = categoryProducts[0]?.image || category.image;

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
      <AnnouncementBar storeSettings={storeSettings} className="categoryAnnouncement" />
      <header className="categoryHeader">
        <a className="brand" href="/" aria-label="Bustaniya home"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
        <nav>
          {mainCategories.map((item) => <a href={`/category/${item.slug}`} key={item.slug}>{item.name}</a>)}
        </nav>
        <div>
          <Search />
          <UserRound />
          <ShoppingBag />
        </div>
      </header>

      <section
        className="categoryHero"
        style={{ backgroundImage: `linear-gradient(90deg, #f4f7eeed, #f4f7ee45), url(${categoryCoverImage})` }}
      >
        <a href="/"><ArrowLeft size={16} /> Back to home</a>
        <div>
          <p className="eyebrow">BUSTANIYA COLLECTIONS</p>
          <h1>{category.name}</h1>
          <p>{category.description}</p>
        </div>
      </section>

      <section className="collectionArea">
        {!!subcategories.length && (
          <div className="subCollectionBlock">
            <p className="eyebrow">EXPLORE {category.name.toUpperCase()}</p>
            <h2>Shop by style</h2>
            <div className="subCollectionGrid">
              {subcategories.map((item) => {
                const subcategoryCoverImage =
                  categoryProducts.find((product) => product.subcategory === item.slug)?.image || item.image;
                return (
                <a href={`/category/${category.slug}/${item.slug}`} key={item.slug}>
                  <div style={{ backgroundImage: `url(${subcategoryCoverImage})` }} />
                  <h3>{item.name}</h3>
                  <span>Explore collection</span>
                </a>
              );
              })}
            </div>
          </div>
        )}
        <div className="collectionTop">
          <p>{categoryProducts.length} products</p>
          <span>Sort by: Featured</span>
        </div>
        <div className="productGrid">
          {categoryProducts.map((product) => (
            <article className="productCard" key={product.id}>
              <a href={`/product/${product.id}`} className="productImage">
                <Image
                  src={product.image}
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
                <div className="productPrice"><span>Rs. {product.price.toLocaleString()}</span><small>Regular price Rs. {product.price.toLocaleString()}</small></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
