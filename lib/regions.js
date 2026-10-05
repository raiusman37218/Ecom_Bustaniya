/**
 * Multi-Region Configuration System for Bustaniya
 * 
 * Supports extensible regional localization (currencies, conversion rates,
 * contact info, company addresses, delivery rules, and navigation roots).
 * 
 * Default Region: 'pk' (Pakistan - PKR)
 * Supported Regions: 'pk' (/), 'uk' (/uk), extensible to 'us', 'ae', etc.
 */

// Exchange rate configuration:
// Default: 1 GBP = ~360 PKR (or set via NEXT_PUBLIC_GBP_EXCHANGE_RATE)
function resolveGbpRate() {
  const envVal = process.env.NEXT_PUBLIC_GBP_EXCHANGE_RATE || process.env.GBP_EXCHANGE_RATE;
  if (envVal) {
    const parsed = parseFloat(envVal);
    if (!isNaN(parsed) && parsed > 0) {
      // If user provided PKR per GBP (e.g. 360), return 1 / 360
      return parsed > 1 ? 1 / parsed : parsed;
    }
  }
  // Default fallback: 1 GBP = 360 PKR => 1 PKR = 0.002778 GBP
  return 1 / 360;
}

export const REGIONS = {
  pk: {
    code: "pk",
    name: "Pakistan",
    basePath: "",
    locale: "en-PK",
    currency: {
      code: "PKR",
      symbol: "Rs.",
      prefix: "Rs. ",
      suffix: "",
      decimals: 0,
    },
    contact: {
      phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+92 305 3530008",
      email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@bustaniya.com",
      whatsapp: "923053530008",
      whatsappDisplay: "+92 305 3530008",
      supportHours: "Mon – Sat, 10:00 AM – 7:00 PM PKT",
      companyName: "Bustaniya",
      address: {
        line1: "Lahore, Pakistan",
        country: "Pakistan",
      },
    },
    delivery: {
      standardFee: 200,
      freeThreshold: 5000,
      estimatedDays: "8-9 delivery days",
      codAvailable: true,
      text: "Rs. 200 standard delivery nationwide · Free above Rs. 5,000",
      pillText: "Nationwide Delivery",
    },
    seo: {
      titleSuffix: "Bustaniya",
      defaultTitle: "Pakistani Women's Wear, Kurtis, Co-ord Sets & 3 Piece Suits",
      defaultDescription:
        "Shop Bustaniya for Pakistani women's wear, everyday kurtis, elegant co-ord sets, bottoms and festive 3 piece suits with nationwide delivery.",
      priceRange: "PKR",
    },
    cartStorageKey: "bustaniya-cart",
  },
  uk: {
    code: "uk",
    name: "United Kingdom",
    basePath: "/uk",
    locale: "en-GB",
    currency: {
      code: "GBP",
      symbol: "£",
      prefix: "£",
      suffix: "",
      decimals: 2,
    },
    get exchangeRateFromPKR() {
      return resolveGbpRate();
    },
    contact: {
      phone: process.env.NEXT_PUBLIC_UK_CONTACT_PHONE || "+44 7418 359143",
      email: process.env.NEXT_PUBLIC_UK_CONTACT_EMAIL || "uk@bustaniya.com",
      whatsapp: process.env.NEXT_PUBLIC_UK_WHATSAPP || "923053530008",
      whatsappDisplay: process.env.NEXT_PUBLIC_UK_WHATSAPP_DISPLAY || "+92 305 3530008",
      supportHours: "Mon – Sat, 9:00 AM – 6:00 PM GMT",
      companyName: "BUSTANIYA LTD",
      companyNumber: "17414024",
      registeredOffice: "Unit A1099 Siu Office, 4–6 Greatorex Street, London, United Kingdom, E1 5NF",
      sic: "SIC 47910 — Retail sale via mail order houses or via Internet",
      address: {
        company: "BUSTANIYA LTD",
        line1: "Unit A1099 Siu Office, 4–6 Greatorex Street",
        city: "London",
        postalCode: "E1 5NF",
        country: "United Kingdom",
      },
    },
    delivery: {
      standardFee: 4.99,
      freeThreshold: 75,
      estimatedDays: "2-4 business days",
      codAvailable: false,
      text: "£4.99 standard UK delivery · Free on orders over £75",
      pillText: "Tracked UK Delivery",
    },
    seo: {
      titleSuffix: "Bustaniya UK",
      defaultTitle: "Pakistani Designer Wear & Kurtis in the UK | Bustaniya",
      defaultDescription:
        "Shop premium Pakistani women's eastern wear, designer kurtis, co-ord sets and 3 piece suits in the UK. Tracked delivery across Great Britain.",
      priceRange: "GBP",
    },
    cartStorageKey: "bustaniya-cart-uk",
  },
};

/**
 * Get region config from code or pathname
 */
export function getRegion(pathOrCode = "pk") {
  if (!pathOrCode) return REGIONS.pk;
  if (typeof pathOrCode === "string") {
    const clean = pathOrCode.trim().toLowerCase();
    if (clean === "uk" || clean.startsWith("/uk")) return REGIONS.uk;
    if (REGIONS[clean]) return REGIONS[clean];
  }
  return REGIONS.pk;
}

/**
 * Generate a region-prefixed internal link
 */
export function regionPath(path = "/", regionCode = "pk") {
  const region = getRegion(regionCode);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (region.code === "pk" || !region.basePath) {
    return cleanPath;
  }
  if (cleanPath === "/") {
    return region.basePath;
  }
  if (cleanPath.startsWith(region.basePath)) {
    return cleanPath;
  }
  return `${region.basePath}${cleanPath}`;
}

/**
 * Convert a numeric price from PKR to the target region's currency
 */
export function convertPrice(amountInPkr, regionCode = "pk") {
  const pkr = Number(amountInPkr || 0);
  if (pkr <= 0) return 0;
  const region = getRegion(regionCode);
  if (region.code === "pk") {
    return Math.round(pkr);
  }
  const rate = resolveGbpRate();
  const rawGbp = pkr * rate;
  // Format to standard 2 decimal currency (e.g. 12.47 or 12.50)
  return Math.round(rawGbp * 100) / 100;
}

/**
 * Format a price value with currency symbol
 */
export function formatPrice(amount, regionCode = "pk", options = {}) {
  const region = getRegion(regionCode);
  const num = Number(amount || 0);
  if (region.code === "uk") {
    const formatted = num.toFixed(2).replace(/\.00$/, "");
    return `£${formatted}`;
  }
  return `Rs. ${Math.round(num).toLocaleString()}`;
}

/**
 * Convert a catalog product object to target region without mutating the original
 */
export function convertProductToRegion(product, regionCode = "pk") {
  if (!product) return product;
  const region = getRegion(regionCode);
  if (region.code === "pk") return product;

  const originalPkrPrice = Number(product.price || 0);
  const originalPkrCompare = Number(product.compareAtPrice || product.compare_at_price || 0);

  const convertedPrice = convertPrice(originalPkrPrice, regionCode);
  const convertedCompareAtPrice = originalPkrCompare > 0 ? convertPrice(originalPkrCompare, regionCode) : 0;

  return {
    ...product,
    price: convertedPrice,
    compareAtPrice: convertedCompareAtPrice,
    compare_at_price: convertedCompareAtPrice,
    currency: region.currency.code,
    currencySymbol: region.currency.symbol,
    formattedPrice: formatPrice(convertedPrice, regionCode),
    formattedCompareAtPrice: convertedCompareAtPrice > 0 ? formatPrice(convertedCompareAtPrice, regionCode) : "",
    regionCode: region.code,
  };
}

/**
 * Batch convert an array of products
 */
export function convertProductsToRegion(products = [], regionCode = "pk") {
  if (!Array.isArray(products) || regionCode === "pk") return products;
  return products.map((p) => convertProductToRegion(p, regionCode));
}
