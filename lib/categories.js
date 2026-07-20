import {
  categories as fallbackCategoryNames,
  categoryDetails,
  categoryToSlug,
  kurtiSubcategories,
  slugifyCategory,
} from "../data/store";
import { optimizedImageUrl } from "./images";
import { supabaseAdminRequest, supabaseRequest } from "./supabaseRest";

const DEFAULT_CATEGORY_IMAGE = "/bustaniya-campaign-hero-v4.png";

export function normalizeCategoryRecord(record = {}) {
  const name = String(record.name || "").trim();
  const slug = String(record.slug || slugifyCategory(name)).trim();
  const parentSlug = String(record.parent_slug || record.parentSlug || "").trim();
  return {
    id: record.id || slug,
    name,
    slug,
    description: record.description || `Shop ${name.toLowerCase()} online from Bustaniya with delivery across Pakistan.`,
    image: optimizedImageUrl(record.image || DEFAULT_CATEGORY_IMAGE),
    parentSlug,
    status: record.status || "Active",
    sortOrder: Number(record.sort_order ?? record.sortOrder ?? 0),
    showInHeader: record.show_in_header ?? record.showInHeader ?? true,
    showOnHomepage: record.show_on_homepage ?? record.showOnHomepage ?? true,
    showInFooter: record.show_in_footer ?? record.showInFooter ?? false,
    showInSearch: record.show_in_search ?? record.showInSearch ?? true,
    seoTitle: record.seo_title || record.seoTitle || "",
    seoDescription: record.seo_description || record.seoDescription || "",
    imageAlt: record.image_alt || record.imageAlt || name,
  };
}

export function fallbackCategories() {
  const mainCategories = fallbackCategoryNames
    .filter((category) => category !== "All")
    .map((name, index) => {
      const slug = categoryToSlug(name);
      const details = categoryDetails[slug] || {};
      return normalizeCategoryRecord({
        id: slug,
        name,
        slug,
        description: details.description,
        image: details.image,
        sort_order: (index + 1) * 10,
      });
    });

  const subcategories = Object.entries(kurtiSubcategories).map(([slug, item], index) =>
    normalizeCategoryRecord({
      id: `kurtis-${slug}`,
      name: item.name,
      slug,
      parent_slug: "kurtis",
      description: item.description,
      image: item.image,
      sort_order: (index + 1) * 10,
    })
  );

  return [...mainCategories, ...subcategories];
}

function sortCategories(items) {
  return [...items].sort((a, b) =>
    a.parentSlug.localeCompare(b.parentSlug) ||
    a.sortOrder - b.sortOrder ||
    a.name.localeCompare(b.name)
  );
}

export async function getCatalogCategories({ admin = false, includeInactive = false } = {}) {
  try {
    const select = "catalog_categories?select=*&order=parent_slug.asc.nullsfirst,sort_order.asc,name.asc";
    const rows = admin
      ? await supabaseAdminRequest(select)
      : await supabaseRequest(includeInactive ? select : `${select}&status=eq.Active`);
    const formatted = (rows || []).map(normalizeCategoryRecord).filter((item) => item.name && item.slug);
    return formatted.length ? sortCategories(formatted) : fallbackCategories();
  } catch {
    return fallbackCategories();
  }
}

export function categoryOptions(categories = []) {
  return categories.filter((category) => !category.parentSlug && category.status !== "Archived");
}

export function subcategoryOptions(categories = [], parentSlug) {
  return categories.filter((category) => category.parentSlug === parentSlug && category.status !== "Archived");
}
