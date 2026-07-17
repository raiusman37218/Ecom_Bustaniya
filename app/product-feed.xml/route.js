import { getCatalogProducts } from "../../lib/catalog";
import { absoluteUrl, productDescription, productSlug, seoImage, siteConfig } from "../../lib/seo";

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const products = await getCatalogProducts();
  const items = products.map((product) => {
    const stock = Number(product.stock || 0);
    const availability = stock > 0 ? "in_stock" : "out_of_stock";
    const id = product.sku || product.articleNumber || product.id;
    return `
      <item>
        <g:id>${xmlEscape(id)}</g:id>
        <g:title>${xmlEscape(product.name)}</g:title>
        <g:description>${xmlEscape(productDescription(product))}</g:description>
        <g:link>${xmlEscape(absoluteUrl(productSlug(product)))}</g:link>
        <g:image_link>${xmlEscape(seoImage(product.image))}</g:image_link>
        <g:availability>${availability}</g:availability>
        <g:price>${xmlEscape(Number(product.price || 0).toFixed(2))} ${siteConfig.currency}</g:price>
        <g:brand>${xmlEscape(siteConfig.name)}</g:brand>
        <g:condition>new</g:condition>
        <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
      </item>`;
  }).join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(siteConfig.name)} Product Feed</title>
    <link>${xmlEscape(siteConfig.url)}</link>
    <description>${xmlEscape(siteConfig.description)}</description>
    ${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
