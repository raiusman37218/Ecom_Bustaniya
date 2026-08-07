"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    .map((item, index) => ({
      id: item.id || `announcement-${index}`,
      text: String(item.text || "").trim(),
      linkLabel: String(item.linkLabel || "").trim(),
      linkHref: String(item.linkHref || "").trim(),
    }));
}

export default function AnnouncementBar({ storeSettings = DEFAULT_STORE_SETTINGS, className = "" }) {
  const announcements = useMemo(() => activeAnnouncements(storeSettings), [storeSettings]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (announcements.length <= 1) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex(0);
  }, [announcements.length]);

  useEffect(() => {
    if (announcements.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % announcements.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [announcements.length]);

  if (storeSettings.announcementEnabled === false || !announcements.length) return null;

  const announcement = announcements[activeIndex] || announcements[0];

  const handlePrev = () => {
    setActiveIndex((current) => (current > 0 ? current - 1 : announcements.length - 1));
  };

  const handleNext = () => {
    setActiveIndex((current) => (current + 1) % announcements.length);
  };

  return (
    <div className={["lucknawiAnnouncementBar", className].filter(Boolean).join(" ")}>
      <button type="button" className="announcementArrowBtn" onClick={handlePrev} aria-label="Previous announcement">
        <ChevronLeft size={16} />
      </button>
      <div className="announcementContent">
        <span className="announcementText" key={announcement.id}>{announcement.text}</span>
        {announcement.linkLabel && announcement.linkHref && (
          <a href={announcement.linkHref} className="announcementLink">{announcement.linkLabel}</a>
        )}
      </div>
      <button type="button" className="announcementArrowBtn" onClick={handleNext} aria-label="Next announcement">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
