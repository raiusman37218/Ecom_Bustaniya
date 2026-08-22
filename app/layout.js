import "./globals.css";
import "./campaign-hero.css";
import Script from "next/script";
import { buildMetadata, siteConfig } from "../lib/seo";
import MetaPixel from "../components/MetaPixel";
import WhatsAppSupportButton from "../components/WhatsAppSupportButton";
import { getStoreSettings } from "../lib/storeSettings";

const RETIRED_META_PIXEL_ID = "5621950704696012";
const ACTIVE_META_PIXEL_ID = "1972532723444962";

export const metadata = {
  ...buildMetadata(),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  applicationName: siteConfig.name,
  keywords: [
    "Pakistani women's wear",
    "Pakistani clothing",
    "kurtis",
    "co-ord sets",
    "3 piece suits",
    "women clothing Pakistan",
    "Bustaniya",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", sizes: "16x16 32x32 48x48 64x64", type: "image/x-icon" },
      { url: "/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=3",
    apple: [{ url: "/apple-icon.png?v=3", sizes: "180x180", type: "image/png" }],
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16452c",
};

export default async function RootLayout({ children }) {
  const storeSettings = await getStoreSettings();
  const gaId = storeSettings?.domainSettings?.analyticsMeasurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const requestedMetaPixelId = storeSettings?.domainSettings?.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID || ACTIVE_META_PIXEL_ID;
  const metaPixelId = requestedMetaPixelId === RETIRED_META_PIXEL_ID ? ACTIVE_META_PIXEL_ID : requestedMetaPixelId;
  const whatsappNumber = storeSettings?.paymentSettings?.whatsappNumber;

  return (
    <html lang="en-PK">
      <body>
        <MetaPixel pixelId={metaPixelId} />
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        )}
        {children}
        <WhatsAppSupportButton phoneNumber={whatsappNumber} storeName={siteConfig.name} />
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4-config" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { send_page_view: true });`}
            </Script>
          </>
        )}
        {gtmId && (
          <Script id="gtm-config" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
        )}
      </body>
    </html>
  );
}
