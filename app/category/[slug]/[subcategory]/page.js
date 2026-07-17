import { ArrowLeft, Search, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import AnnouncementBar from "../../../../components/AnnouncementBar";
import { normalizeCategory } from "../../../../data/store";
import { getCatalogCategories, subcategoryOptions } from "../../../../lib/categories";
import { getCatalogProducts } from "../../../../lib/catalog";
import { JsonLd, breadcrumbSchema, buildMetadata, collectionSchema } from "../../../../lib/seo";
import { getStoreSettings } from "../../../../lib/storeSettings";

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
  const coverImage = items[0]?.image || details.image;
  const siblingCategories = subcategoryOptions(categories, slug);

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
      <AnnouncementBar storeSettings={storeSettings} className="categoryAnnouncement" />
      <header className="categoryHeader">
        <a className="brand" href="/" aria-label="Bustaniya home"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
        <nav>
          {siblingCategories.map((item) => <a href={`/category/${slug}/${item.slug}`} key={item.slug}>{item.name}</a>)}
        </nav>
        <div><Search /><ShoppingBag /></div>
      </header>

      <section
        className="categoryHero subcategoryHero"
        style={{ backgroundImage: `linear-gradient(90deg, #f4f7eef0, #f4f7ee30), url(${coverImage})` }}
      >
        <a href={`/category/${slug}`}><ArrowLeft size={16} /> All {parent.name}</a>
        <div>
          <p className="eyebrow">BUSTANIYA - {parent.name.toUpperCase()}</p>
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
          {items.map((product) => (
            <article className="productCard" key={product.id}>
              <a href={`/product/${product.id}`} className="productImage">
                <Image
                  src={product.image}
                  alt={`${product.name} - ${details.name} by Bustaniya`}
                  fill
                  sizes="(max-width: 340px) 100vw, (max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
                />
                {product.badge && <span className="badge">{product.badge}</span>}
                <span className="quickAdd">Choose options</span>
              </a>
              <div className="productInfo">
                <div><p>{details.name}</p><h3><a href={`/product/${product.id}`}>{product.name}</a></h3></div>
                <div className="productPrice"><span>Rs. {product.price.toLocaleString()}</span><small>Regular price Rs. {product.price.toLocaleString()}</small></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
