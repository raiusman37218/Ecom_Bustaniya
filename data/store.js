// Baad mein isi data ko Supabase se load karenge.
export const categories = ["All", "Bras", "Panties", "Lingerie Sets", "Sleepwear"];
const categoryMetaSeparator = "||";

const categoryAliases = {
  bras: "Bras",
  bra: "Bras",
  panties: "Panties",
  panty: "Panties",
  briefs: "Panties",
  "lingerie sets": "Lingerie Sets",
  "lingerie set": "Lingerie Sets",
  sleepwear: "Sleepwear",
  sleep: "Sleepwear",
};

export function normalizeCategory(value) {
  const raw = String(value || "").split(categoryMetaSeparator)[0].trim();
  if (!raw) return "Uncategorized";
  const key = raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");

  return categoryAliases[key] || categories.find((category) => category.toLowerCase() === raw.toLowerCase()) || raw;
}

export function slugifyCategory(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryToSlug(value) {
  const normalized = normalizeCategory(value);
  return slugifyCategory(normalized);
}

export function parseCategorySelection(value) {
  const [category = "", subcategory = "", collection = ""] = String(value || "")
    .split(categoryMetaSeparator)
    .map((part) => part.trim());

  return {
    category: normalizeCategory(category),
    subcategory,
    collection,
  };
}

export function formatCategorySelection({ category, subcategory = "", collection = "" }) {
  const normalizedCategory = normalizeCategory(category);
  const cleanSubcategory = String(subcategory || "").trim();
  const cleanCollection = String(collection || "").trim();
  if (!cleanSubcategory && !cleanCollection) return normalizedCategory;
  return [normalizedCategory, cleanSubcategory, cleanCollection].join(categoryMetaSeparator);
}

export const categoryDetails = {
  bras: { name: "Bras", description: "Everyday bras designed for soft support, a smooth fit and lasting comfort.", image: "/lisette-bra-01.png" },
  panties: { name: "Panties", description: "Comfort-first briefs, bikini cuts and seamless styles for every day.", image: "/lisette-panties-01.png" },
  "lingerie-sets": { name: "Lingerie Sets", description: "Beautifully coordinated sets that make getting dressed feel special.", image: "/lisette-lounge-set-01.png" },
  sleepwear: { name: "Sleepwear", description: "Soft sleep and lounge essentials for slow mornings and restful evenings.", image: "/lisette-sleepwear-01.png" }
};

export const kurtiSubcategories = {};

export const products = [];
