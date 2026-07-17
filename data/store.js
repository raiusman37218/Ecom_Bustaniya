// Baad mein isi data ko Supabase se load karenge.
export const categories = ["All", "Kurtis", "Bottoms", "Co-ord Sets", "3 Piece Suits"];
const categoryMetaSeparator = "||";

const categoryAliases = {
  kurtis: "Kurtis",
  kurti: "Kurtis",
  bottoms: "Bottoms",
  bottom: "Bottoms",
  trousers: "Bottoms",
  trouser: "Bottoms",
  pants: "Bottoms",
  "co ord sets": "Co-ord Sets",
  "co ord set": "Co-ord Sets",
  "coord sets": "Co-ord Sets",
  "coord set": "Co-ord Sets",
  "co-ord sets": "Co-ord Sets",
  "co-ord set": "Co-ord Sets",
  "3 piece suits": "3 Piece Suits",
  "3 piece suit": "3 Piece Suits",
  "three piece suits": "3 Piece Suits",
  "three piece suit": "3 Piece Suits",
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
  if (normalized === "Co-ord Sets") return "coord-sets";
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
  kurtis: {
    name: "Kurtis",
    description: "Shop Pakistani kurtis for women, including simple kurtis, corset kurtis and jacket kurtis for everyday eastern wear.",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85"
  },
  bottoms: {
    name: "Bottoms",
    description: "Shop women's bottoms in Pakistan, including trousers and pants that complete kurtis, co-ord sets and eastern outfits.",
    image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1600&q=85"
  },
  "coord-sets": {
    name: "Co-ord Sets",
    description: "Shop women's co-ord sets online in Pakistan for easy matching outfits, casual plans and polished everyday dressing.",
    image: "https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=1600&q=85"
  },
  "3-piece-suits": {
    name: "3 Piece Suits",
    description: "Shop Pakistani 3 piece suits for women with complete eastern outfits for festive, semi-formal and everyday occasions.",
    image: "/bustaniya-campaign-hero-v4.png"
  }
};

export const kurtiSubcategories = {
  "corset-kurti": {
    name: "Corset Kurti",
    description: "Shop corset kurtis in Pakistan for a modern eastern wear look with defined shape and feminine styling.",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1400&q=85"
  },
  "jacket-kurti": {
    name: "Jacket Kurti",
    description: "Shop jacket kurtis online in Pakistan for layered eastern wear styling and statement everyday outfits.",
    image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1400&q=85"
  },
  "simple-kurti": {
    name: "Simple Kurti",
    description: "Shop simple kurtis for women in Pakistan, made for everyday styling, university looks and casual eastern wear.",
    image: "https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=1400&q=85"
  }
};

export const products = [
  { id: 1, name: "Gulnaar Corset Kurti", category: "Kurtis", subcategory: "corset-kurti", price: 4490, badge: "New", description: "A corset kurti for women who want a modern Pakistani eastern wear look. Confirm fabric, length and measurements before ordering.", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85" },
  { id: 2, name: "Mehr Co-ord Set", category: "Co-ord Sets", price: 7990, badge: "Bestseller", description: "A women's co-ord set for easy matching style in Pakistan. Confirm fabric, pieces included and size measurements before ordering.", image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=900&q=85" },
  { id: 3, name: "Sahar Simple Kurti", category: "Kurtis", subcategory: "simple-kurti", price: 4590, description: "A simple kurti for everyday eastern wear, casual plans and university styling. Confirm fabric, length and measurements before ordering.", image: "https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=900&q=85" },
  { id: 4, name: "Zarmina Festive Co-ord", category: "Co-ord Sets", price: 12990, badge: "Limited", description: "A festive co-ord set for Pakistani women's occasion wear. Confirm fabric, pieces included and measurements before ordering.", image: "https://images.unsplash.com/photo-1597983073514-4a0c3e18d892?auto=format&fit=crop&w=900&q=85" },
  { id: 5, name: "Ivory Wide-Leg Trouser", category: "Bottoms", price: 3490, badge: "New", description: "A women's wide-leg trouser for pairing with kurtis, tops and eastern outfits. Confirm fabric, waist and length measurements before ordering.", image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=85" },
  { id: 6, name: "Mushk Straight Pants", category: "Bottoms", price: 2990, description: "Straight pants for women to complete everyday Pakistani outfits. Confirm fabric, waist and length measurements before ordering.", image: "https://images.unsplash.com/photo-1590159983013-d4ff5fc71c1d?auto=format&fit=crop&w=900&q=85" },
  { id: 7, name: "Neelum Corset Kurti", category: "Kurtis", subcategory: "corset-kurti", price: 4990, badge: "Bestseller", description: "A corset kurti with a modern eastern wear mood for Pakistani shoppers. Confirm fabric, length and measurements before ordering.", image: "https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=900&q=85" },
  { id: 8, name: "Rooh Layered Jacket Kurti", category: "Kurtis", subcategory: "jacket-kurti", price: 6490, badge: "New", description: "A jacket kurti for layered Pakistani styling and statement everyday wear. Confirm fabric, layers and measurements before ordering.", image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=900&q=85" },
  { id: 9, name: "Meher Long Jacket Kurti", category: "Kurtis", subcategory: "jacket-kurti", price: 6990, description: "A long jacket kurti for women who prefer layered eastern wear. Confirm fabric, length and measurements before ordering.", image: "https://images.unsplash.com/photo-1597983073514-4a0c3e18d892?auto=format&fit=crop&w=900&q=85" },
  { id: 10, name: "Noor Everyday Kurti", category: "Kurtis", subcategory: "simple-kurti", price: 3990, description: "An everyday kurti for Pakistani women's casual eastern wear. Confirm fabric, length and measurements before ordering.", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85" },
  { id: 11, name: "Gulbahar 3 Piece Suit", category: "3 Piece Suits", price: 10990, badge: "New", description: "A Pakistani 3 piece suit for women looking for a complete eastern outfit. Confirm fabric, included pieces and measurements before ordering.", image: "/bustaniya-campaign-hero-v4.png" },
  { id: 12, name: "Zeenat Festive 3 Piece", category: "3 Piece Suits", price: 13990, badge: "Limited", description: "A festive 3 piece suit for Pakistani women's occasion dressing. Confirm fabric, included pieces and measurements before ordering.", image: "https://images.unsplash.com/photo-1597983073514-4a0c3e18d892?auto=format&fit=crop&w=900&q=85" }
];
