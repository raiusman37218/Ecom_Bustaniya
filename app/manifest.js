import { absoluteUrl, siteConfig } from "../lib/seo";

export default function manifest() {
  return {
    name: "Bustaniya",
    short_name: "Bustaniya",
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fcfaf5",
    theme_color: "#16452c",
    icons: [
      {
        src: absoluteUrl("/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: absoluteUrl("/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
