import namer from "color-namer";

export const apparelSizes = [
  "XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL",
  "One Size", "Custom",
  "UK 4", "UK 6", "UK 8", "UK 10", "UK 12", "UK 14", "UK 16", "UK 18", "UK 20", "UK 22", "UK 24", "UK 26", "UK 28", "UK 30", "UK 32",
  "EU 32", "EU 34", "EU 36", "EU 38", "EU 40", "EU 42", "EU 44", "EU 46", "EU 48", "EU 50", "EU 52", "EU 54", "EU 56", "EU 58", "EU 60",
  "US 0", "US 2", "US 4", "US 6", "US 8", "US 10", "US 12", "US 14", "US 16", "US 18", "US 20", "US 22", "US 24",
  "Waist 24", "Waist 26", "Waist 28", "Waist 30", "Waist 32", "Waist 34", "Waist 36", "Waist 38", "Waist 40", "Waist 42", "Waist 44", "Waist 46", "Waist 48", "Waist 50"
];

export const fashionColorCategories = [
  { id: "all", label: "All Colors" },
  { id: "festive", label: "Festive & Eastern" },
  { id: "pastels", label: "Summer Pastels" },
  { id: "neutrals", label: "Neutrals & Monochromes" },
  { id: "earthy", label: "Earthy & Warm" },
  { id: "jewel", label: "Jewel & Royal" },
];

export const fashionColors = [
  // Neutrals & Monochromes
  { name: "Black", hex: "#171717", category: "neutrals" },
  { name: "Jet Black", hex: "#0a0a0a", category: "neutrals" },
  { name: "White", hex: "#ffffff", category: "neutrals" },
  { name: "Off White", hex: "#f7f4ed", category: "neutrals" },
  { name: "Ivory", hex: "#fffff0", category: "neutrals" },
  { name: "Cream", hex: "#fffdd0", category: "neutrals" },
  { name: "Beige", hex: "#d8c3a5", category: "neutrals" },
  { name: "Fawn", hex: "#c8b39b", category: "neutrals" },
  { name: "Biscuit", hex: "#e3d2be", category: "neutrals" },
  { name: "Champagne", hex: "#f7e7ce", category: "neutrals" },
  { name: "Sand", hex: "#c2a477", category: "neutrals" },
  { name: "Camel", hex: "#b98c5b", category: "neutrals" },
  { name: "Grey", hex: "#808080", category: "neutrals" },
  { name: "Ash Grey", hex: "#b2beb5", category: "neutrals" },
  { name: "Charcoal", hex: "#36454f", category: "neutrals" },
  { name: "Smoke Grey", hex: "#708090", category: "neutrals" },
  { name: "Silver", hex: "#c0c0c0", category: "neutrals" },
  { name: "Zinc", hex: "#7b8794", category: "neutrals" },

  // Festive & Eastern Favorites
  { name: "Maroon", hex: "#800000", category: "festive" },
  { name: "Deep Maroon", hex: "#5b0e14", category: "festive" },
  { name: "Bottle Green", hex: "#004225", category: "festive" },
  { name: "Forest Green", hex: "#173d29", category: "festive" },
  { name: "Emerald Green", hex: "#046307", category: "festive" },
  { name: "Rust", hex: "#b7410e", category: "festive" },
  { name: "Mustard", hex: "#d19a20", category: "festive" },
  { name: "Ochre", hex: "#cc7722", category: "festive" },
  { name: "Plum", hex: "#673147", category: "festive" },
  { name: "Wine", hex: "#722f37", category: "festive" },
  { name: "Burgundy", hex: "#681b2b", category: "festive" },
  { name: "Ruby Red", hex: "#9b111e", category: "festive" },
  { name: "Crimson", hex: "#dc143c", category: "festive" },
  { name: "Deep Red", hex: "#b30000", category: "festive" },
  { name: "Magenta", hex: "#c2185b", category: "festive" },
  { name: "Hot Pink", hex: "#ff2d87", category: "festive" },
  { name: "Shocking Pink", hex: "#fc0fc0", category: "festive" },
  { name: "Gold", hex: "#d4af37", category: "festive" },
  { name: "Antique Gold", hex: "#b59410", category: "festive" },
  { name: "Dull Gold", hex: "#c5a059", category: "festive" },
  { name: "Copper", hex: "#b87333", category: "festive" },
  { name: "Bronze", hex: "#cd7f32", category: "festive" },

  // Summer Pastels
  { name: "Powder Blue", hex: "#b0e0e6", category: "pastels" },
  { name: "Sky Blue", hex: "#87ceeb", category: "pastels" },
  { name: "Ice Blue", hex: "#d0f0fd", category: "pastels" },
  { name: "Baby Pink", hex: "#f4c2c2", category: "pastels" },
  { name: "Blush Pink", hex: "#de9ca7", category: "pastels" },
  { name: "Dusty Rose", hex: "#dcae96", category: "pastels" },
  { name: "Peach", hex: "#ffcba4", category: "pastels" },
  { name: "Coral", hex: "#ff7f50", category: "pastels" },
  { name: "Salmon", hex: "#fa8072", category: "pastels" },
  { name: "Mint Green", hex: "#98ff98", category: "pastels" },
  { name: "Pistachio", hex: "#93c572", category: "pastels" },
  { name: "Sage Green", hex: "#9caf88", category: "pastels" },
  { name: "Sea Green", hex: "#2e8b57", category: "pastels" },
  { name: "Lilac", hex: "#c8a2c8", category: "pastels" },
  { name: "Lavender", hex: "#b69ad4", category: "pastels" },
  { name: "Mauve", hex: "#e0b0ff", category: "pastels" },
  { name: "Pastel Yellow", hex: "#fff9a6", category: "pastels" },
  { name: "Lemon", hex: "#fff44f", category: "pastels" },
  { name: "Vanilla", hex: "#f3e5ab", category: "pastels" },

  // Jewel & Royal Shades
  { name: "Royal Blue", hex: "#2546a8", category: "jewel" },
  { name: "Navy Blue", hex: "#172a53", category: "jewel" },
  { name: "Midnight Blue", hex: "#191970", category: "jewel" },
  { name: "Sapphire", hex: "#0f52ba", category: "jewel" },
  { name: "Teal", hex: "#187b7b", category: "jewel" },
  { name: "Turquoise", hex: "#40e0d0", category: "jewel" },
  { name: "Peacock Blue", hex: "#005f73", category: "jewel" },
  { name: "Indigo", hex: "#4b0082", category: "jewel" },
  { name: "Deep Purple", hex: "#3b1e54", category: "jewel" },
  { name: "Amethyst", hex: "#9966cc", category: "jewel" },
  { name: "Violet", hex: "#8a2be2", category: "jewel" },

  // Earthy & Warm
  { name: "Olive Green", hex: "#556b2f", category: "earthy" },
  { name: "Khaki", hex: "#c3b091", category: "earthy" },
  { name: "Terracotta", hex: "#e2725b", category: "earthy" },
  { name: "Brick Red", hex: "#cb4154", category: "earthy" },
  { name: "Rust Orange", hex: "#c04000", category: "earthy" },
  { name: "Amber", hex: "#ffbf00", category: "earthy" },
  { name: "Brown", hex: "#704a32", category: "earthy" },
  { name: "Chocolate", hex: "#4e2a1e", category: "earthy" },
  { name: "Mocha", hex: "#967969", category: "earthy" },
  { name: "Coffee", hex: "#6f4e37", category: "earthy" },
  { name: "Tan", hex: "#d2b48c", category: "earthy" },
  { name: "Multi Colour", hex: "linear-gradient(135deg,#db4c77,#f2cf32,#237542,#3267a8)", category: "festive" },
];

export const fashionColorsMap = Object.fromEntries(
  fashionColors.map((c) => [c.name.toLowerCase().replace(/[^a-z0-9]/g, ""), c.hex])
);

export function suggestColorName(hex) {
  if (!hex) return "Custom";
  try {
    const formatted = hex.startsWith("#") ? hex : `#${hex}`;
    const cleanHex = formatted.slice(0, 7);
    if (!/^#[0-9a-f]{6}$/i.test(cleanHex)) return "Custom";
    const res = namer(cleanHex, { pick: ["ntc", "basic"] });
    if (res.ntc && res.ntc[0] && res.ntc[0].name) {
      return res.ntc[0].name;
    }
    if (res.basic && res.basic[0] && res.basic[0].name) {
      const b = res.basic[0].name;
      return b.charAt(0).toUpperCase() + b.slice(1);
    }
  } catch {}
  return "Custom";
}

export function getColorHex(colorName, fallback = "#64748b") {
  if (!colorName) return fallback;
  const clean = String(colorName).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fashionColorsMap[clean]) return fashionColorsMap[clean];
  if (/^#[0-9a-f]{3,8}$/i.test(colorName) || /^rgb/i.test(colorName) || /^hsl/i.test(colorName)) return colorName;
  return fallback;
}

