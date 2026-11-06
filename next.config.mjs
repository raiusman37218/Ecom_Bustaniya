/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "color-namer", "react-colorful"],
  },
  images: {
    loader: "custom",
    loaderFile: "./lib/cloudinaryLoader.js",
    // Deliberately short lists. Every distinct width is a distinct Cloudinary
    // derivative, and the first request for one is generated on demand — slow,
    // and slow again for the next device that asks for a width nobody has
    // asked for yet. Four widths chosen to land on what real devices actually
    // request keep the CDN warm, so the second visitor on a given phone gets a
    // cache hit instead of a cold transform:
    //   640  — 2-up grid on a 390pt iPhone at 3x, 33vw tablet at 2x
    //   750  — 2-up grid on a 430pt iPhone at 3x, 25vw desktop at 2x
    //   1080 — single-column phone hero, 50vw desktop
    //   1920 — full-bleed desktop
    deviceSizes: [640, 750, 1080, 1920],
    imageSizes: [64, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "rjkdjbcmyexcbawxgjrd.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff|woff2|webmanifest))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/terms",
        destination: "/terms-and-conditions",
        permanent: true,
      },
      {
        source: "/terms-of-service",
        destination: "/terms-and-conditions",
        permanent: true,
      },
      {
        source: "/faq",
        destination: "/faqs",
        permanent: true,
      },
      {
        source: "/track",
        destination: "/track-order",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
