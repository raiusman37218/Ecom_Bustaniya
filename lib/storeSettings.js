import { DEFAULT_ANNOUNCEMENTS, DEFAULT_STORE_SETTINGS } from "../data/storeSettings";
import { supabaseAdminRequest } from "./supabaseRest";

export { DEFAULT_STORE_SETTINGS };

function normalizeAnnouncements(value) {
  const source = Array.isArray(value) ? value : DEFAULT_ANNOUNCEMENTS;
  const normalized = source
    .map((item, index) => ({
      id: String(item?.id || `announcement-${index + 1}`).trim(),
      text: String(item?.text || "").trim(),
      linkLabel: String(item?.linkLabel || "").trim(),
      linkHref: String(item?.linkHref || "").trim(),
      enabled: item?.enabled !== false,
    }))
    .filter((item) => item.text);

  return normalized.length ? normalized : DEFAULT_ANNOUNCEMENTS;
}

function normalizeStoreSettings(record = {}) {
  const legacyAnnouncement = {
    id: "default-advance-payment",
    text: String(record.announcement_text || DEFAULT_STORE_SETTINGS.announcementText).trim(),
    linkLabel: String(record.announcement_link_label || DEFAULT_STORE_SETTINGS.announcementLinkLabel).trim(),
    linkHref: String(record.announcement_link_href || DEFAULT_STORE_SETTINGS.announcementLinkHref).trim(),
    enabled: true,
  };
  const announcements = normalizeAnnouncements(record.announcements || [legacyAnnouncement]);

  return {
    heroProductId: String(record.hero_product_id || ""),
    announcementEnabled: record.announcement_enabled !== false,
    announcementText: announcements[0]?.text || DEFAULT_STORE_SETTINGS.announcementText,
    announcementLinkLabel: announcements[0]?.linkLabel || DEFAULT_STORE_SETTINGS.announcementLinkLabel,
    announcementLinkHref: announcements[0]?.linkHref || DEFAULT_STORE_SETTINGS.announcementLinkHref,
    announcements,
  };
}

export function isStoreSettingsSetupError(error) {
  const message = `${error?.message || ""} ${JSON.stringify(error?.details || {})}`.toLowerCase();
  return error?.status === 404 || message.includes("store_settings") || message.includes("schema cache");
}

export async function getStoreSettings() {
  try {
    const rows = await supabaseAdminRequest("store_settings?select=*&id=eq.1&limit=1");
    return normalizeStoreSettings(rows?.[0]);
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

export async function updateStoreSettings(settings = {}) {
  const announcements = normalizeAnnouncements(settings.announcements || [{
    id: "default-advance-payment",
    text: settings.announcementText,
    linkLabel: settings.announcementLinkLabel,
    linkHref: settings.announcementLinkHref,
    enabled: true,
  }]);
  const firstAnnouncement = announcements[0] || DEFAULT_ANNOUNCEMENTS[0];
  const record = {
    id: 1,
    hero_product_id: settings.heroProductId || null,
    announcement_enabled: settings.announcementEnabled !== false,
    announcement_text: firstAnnouncement.text,
    announcement_link_label: firstAnnouncement.linkLabel,
    announcement_link_href: firstAnnouncement.linkHref,
    announcements,
    updated_at: new Date().toISOString(),
  };

  const rows = await supabaseAdminRequest("store_settings?on_conflict=id&select=*", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: record,
  });

  return normalizeStoreSettings(rows?.[0] || record);
}
