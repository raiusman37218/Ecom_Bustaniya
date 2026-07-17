export const siteConfig = {
  name: "Bustaniya",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://bustaniya.com",
  title: "Bustaniya - Pakistani Women's Clothing Online in Pakistan",
  description:
    "Shop Bustaniya for Pakistani women's clothing, kurtis, co-ord sets, bottoms and 3 piece suits with nationwide delivery.",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
  currency: "PKR",
  logo: "/bustaniya-logo-v2.png",
  defaultImage: "/bustaniya-campaign-hero-v5.png",
};

export const infoPages = [
  {
    path: "/about",
    title: "About Bustaniya",
    description:
      "Learn about Bustaniya, a Pakistani women's clothing store focused on graceful eastern wear, kurtis, co-ord sets and everyday style.",
  },
  {
    path: "/contact",
    title: "Contact Bustaniya",
    description:
      "Contact Bustaniya for order questions, product details, delivery support and Pakistani women's clothing assistance.",
  },
  {
    path: "/shipping-policy",
    title: "Shipping Policy",
    description:
      "Read Bustaniya's shipping policy for Pakistani clothing orders, delivery fees, courier handling and order confirmation notes.",
  },
  {
    path: "/exchange-return-policy",
    title: "Exchange and Return Policy",
    description:
      "Read Bustaniya's exchange and return policy for Pakistani women's clothing orders before you shop online.",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy",
    description:
      "Read how Bustaniya handles customer information for orders, delivery, support and website communication.",
  },
  {
    path: "/terms-and-conditions",
    title: "Terms and Conditions",
    description:
      "Read Bustaniya's terms and conditions for online shopping, product information, payments and order processing.",
  },
];

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url.replace(/\/$/, "")}${normalizedPath}`;
}

export function productSlug(product) {
  return `/product/${product.id}`;
}

export function seoImage(image) {
  return absoluteUrl(image || siteConfig.defaultImage);
}

export function buildMetadata({
  title = siteConfig.title,
  description = siteConfig.description,
  path = "/",
  image = siteConfig.defaultImage,
  type = "website",
  robots,
} = {}) {
  const canonical = absoluteUrl(path);
  const fullTitle = title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`;

  return {
    metadataBase: new URL(siteConfig.url),
    title: fullTitle,
    description,
    alternates: { canonical },
    robots,
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      type,
      locale: "en_PK",
      images: [{ url: seoImage(image), width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [seoImage(image)],
    },
    icons: {
      icon: [
        { url: "/bustaniya-logo-key.png", sizes: "192x192", type: "image/png" },
        { url: "/bustaniya-logo-v2-key.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/bustaniya-logo-v2-key.png",
    },
  };
}

export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function organizationSchema() {
  const sameAs = [siteConfig.instagram].filter(Boolean);
  const contactPoint = siteConfig.phone || siteConfig.email ? [{
    "@type": "ContactPoint",
    telephone: siteConfig.phone || undefined,
    email: siteConfig.email || undefined,
    contactType: "customer service",
    areaServed: "PK",
    availableLanguage: ["en", "ur"],
  }] : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl(siteConfig.logo),
    sameAs,
    contactPoint,
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

export function productDescription(product) {
  return product.description ||
    `${product.name} from Bustaniya. Product fabric, fit and care details will be updated when confirmed.`;
}

export function productSchema(product) {
  const stock = Number(product.stock || 0);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: productDescription(product),
    image: (product.images?.length ? product.images : [product.image]).map(seoImage),
    brand: { "@type": "Brand", name: siteConfig.name },
    category: product.category,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(productSlug(product)),
      priceCurrency: siteConfig.currency,
      price: Number(product.price || 0),
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  if (product.sku || product.articleNumber) {
    schema.sku = product.sku || product.articleNumber;
  }
  return schema;
}

export function collectionSchema({ name, description, path, products = [] }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.slice(0, 24).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(productSlug(product)),
        name: product.name,
      })),
    },
  };
}

export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
