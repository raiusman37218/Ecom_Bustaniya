"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";

function activeAnnouncements(settings) {
  const announcements = Array.isArray(settings?.announcements) && settings.announcements.length
    ? settings.announcements
    : [{
        id: "legacy-announcement",
        text: settings?.announcementText || DEFAULT_STORE_SETTINGS.announcementText,
        linkLabel: settings?.announcementLinkLabel || "",
        linkHref: settings?.announcementLinkHref || "",
        enabled: true,
      }];

  return announcements
    .filter((item) => item?.enabled !== false && String(item?.text || "").trim())
    // The custom-dress feature was removed, but a saved announcement in admin
    // still advertises it and links to the now-dead /custom-order route. Drop
    // it here so the bar never points at a 404; deleting it in admin is the
    // permanent fix.
    .filter((item) => !String(item?.linkHref || "").startsWith("/custom-order"))
    .map((item, index) => ({
      id: item.id || `announcement-${index}`,
      text: String(item.text || "").trim(),
      linkLabel: String(item.linkLabel || "").trim(),
      linkHref: String(item.linkHref || "").trim(),
    }));
}

/**
 * Inverted strip above the header.
 *
 * The imported design rotates a single line with an opacity fade rather than
 * the arrow-stepped carousel this used to be, so the bar never draws attention
 * to itself. Everything it shows still comes from admin: the announcement list,
 * each entry's enabled flag, and its optional link.
 */
export default function AnnouncementBar({ storeSettings = DEFAULT_STORE_SETTINGS, className = "" }) {
  const announcements = useMemo(() => activeAnnouncements(storeSettings), [storeSettings]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    setActiveIndex(0);
  }, [announcements.length]);

  useEffect(() => {
    if (announcements.length <= 1) return undefined;

    const clearTimers = () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };

    const interval = window.setInterval(() => {
      // Fade out, swap the text while it is invisible, then fade back in — the
      // same 300ms opacity transition the import uses.
      setFading(true);
      timers.current.push(
        window.setTimeout(() => {
          setActiveIndex((current) => (current + 1) % announcements.length);
          setFading(false);
        }, 300)
      );
    }, 4500);

    return () => {
      window.clearInterval(interval);
      clearTimers();
    };
  }, [announcements.length]);

  if (storeSettings?.announcementEnabled === false || !announcements.length) return null;

  const announcement = announcements[activeIndex] || announcements[0];

  return (
    <div className={["bs-st-ann", className].filter(Boolean).join(" ")} role="region" aria-label="Announcements">
      <div className="bs-st-ann__inner">
        <span className="bs-st-ann__text" aria-live="polite" data-fading={fading ? "true" : "false"}>
          {announcement.text}
          {announcement.linkLabel && announcement.linkHref ? (
            <>
              {" "}
              <Link href={announcement.linkHref} style={{ color: "inherit" }}>
                {announcement.linkLabel}
              </Link>
            </>
          ) : null}
        </span>
        <span className="bs-st-ann__links">
          <Link href="/faqs">HELP</Link>
          <Link href="/contact">CONTACT</Link>
          <span>PKR Rs</span>
        </span>
      </div>
    </div>
  );
}
