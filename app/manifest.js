import { absoluteUrl, siteConfig } from "../lib/seo";

export default function manifest() {
  return {
    name: "Lisette",
    short_name: "Lisette",
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffaf8",
    theme_color: "#4d2637",
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
