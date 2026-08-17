"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "../lib/trackEvent";

export default function MetaPixel({ pixelId }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  // Every PageView (including the first) is fired through the shared
  // trackEvent() helper so it also gets logged server-side into
  // pixel_events, matching the browser fbq call by event_id for Meta's
  // deduplication. See lib/trackEvent.js and Admin > Events.
  useEffect(() => {
    if (isAdminRoute) return;
    trackEvent("PageView");
  }, [isAdminRoute, pathname]);

  if (!pixelId || isAdminRoute) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
