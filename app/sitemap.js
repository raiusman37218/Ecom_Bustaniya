import { categoryDetails, kurtiSubcategories } from "../data/store";
import { getCatalogProducts } from "../lib/catalog";
import { absoluteUrl, infoPages, productSlug } from "../lib/seo";

export default async function sitemap() {
  const now = new Date();
  const products = await getCatalogProducts();

  const staticRoutes = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    ...Object.keys(categoryDetails).map((slug) => ({
      url: absoluteUrl(`/category/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
    ...Object.keys(kurtiSubcategories).map((slug) => ({
      url: absoluteUrl(`/category/kurtis/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...infoPages.map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    })),
  ];

  const productRoutes = products.map((product) => ({
    url: absoluteUrl(productSlug(product)),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticRoutes, ...productRoutes];
}
