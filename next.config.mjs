/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    loader: "custom",
    loaderFile: "./lib/cloudinaryLoader.js",
    deviceSizes: [480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 120, 240, 384],
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
            value: "public, max-age=86400, stale-while-revalidate=604800",
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
        source: "/(favicon.ico|icon-192.png|icon-512.png|apple-icon.png|manifest.webmanifest)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/(bustaniya-.*\\.(?:png|jpg|jpeg|webp|avif|svg))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
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
