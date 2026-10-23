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
