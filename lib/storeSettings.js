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

function normalizeHeroImages(value, fallback) {
  let source = value;
  if (typeof value === "string") {
    try { source = JSON.parse(value); } catch { source = value; }
  }
  const images = (Array.isArray(source) ? source : [source])
    .map((image) => String(image || "").trim())
    .filter(Boolean);
  return images.length ? images : [fallback];
}

function normalizeFinanceTransactions(value) {
  return (Array.isArray(value) ? value : []).map((item, index) => ({
    id: String(item?.id || `finance-${index + 1}`),
    type: ["business_expense", "owner_withdrawal", "owner_investment"].includes(item?.type) ? item.type : "business_expense",
    title: String(item?.title || "Finance entry").trim(),
    category: String(item?.category || "Other").trim(),
    amount: Math.max(0, Number(item?.amount || 0)),
    date: String(item?.date || "").slice(0, 10),
    note: String(item?.note || "").trim().slice(0, 500),
  })).filter((item) => item.amount > 0);
}

function normalizeFinanceAllocation(value) {
  const marketingPercent = Math.min(100, Math.max(0, Number(value?.marketingPercent ?? 25)));
  const ownerPercent = Math.min(100 - marketingPercent, Math.max(0, Number(value?.ownerPercent ?? 30)));
  return { marketingPercent, ownerPercent, stockPercent: Math.max(0, 100 - marketingPercent - ownerPercent) };
}

function normalizeProductionBatches(value) {
  return (Array.isArray(value) ? value : []).map((batch) => ({
    id: String(batch?.id || ""), productId: String(batch?.productId || ""), productName: String(batch?.productName || ""), quantity: Math.max(1, Number(batch?.quantity || 1)), totalCost: Math.max(0, Number(batch?.totalCost || 0)), unitCost: Math.max(0, Number(batch?.unitCost || 0)), costBreakdown: batch?.costBreakdown || {}, unitCostBreakdown: batch?.unitCostBreakdown || {}, date: String(batch?.date || "").slice(0, 10), note: String(batch?.note || "").slice(0, 500),
  })).filter((batch) => batch.id && batch.productId);
}

function normalizeStoreSettings(record = {}, includeFinance = false) {
  const legacyAnnouncement = {
    id: "default-advance-payment",
    text: String(record.announcement_text || DEFAULT_STORE_SETTINGS.announcementText).trim(),
    linkLabel: String(record.announcement_link_label || DEFAULT_STORE_SETTINGS.announcementLinkLabel).trim(),
    linkHref: String(record.announcement_link_href || DEFAULT_STORE_SETTINGS.announcementLinkHref).trim(),
    enabled: true,
  };
  const announcementData = record.announcements && !Array.isArray(record.announcements) ? record.announcements : {};
  const announcements = normalizeAnnouncements(Array.isArray(record.announcements) ? record.announcements : (announcementData.items || [legacyAnnouncement]));
  const heroDesktopImages = normalizeHeroImages(record.hero_desktop_image, DEFAULT_STORE_SETTINGS.heroDesktopImage);
  const heroMobileImages = normalizeHeroImages(record.hero_mobile_image, DEFAULT_STORE_SETTINGS.heroMobileImage);

  const settings = {
    heroEnabled: record.hero_enabled !== false,
    heroDesktopImage: heroDesktopImages[0],
    heroMobileImage: heroMobileImages[0],
    heroDesktopImages,
    heroMobileImages,
    heroEyebrow: String(record.hero_eyebrow || DEFAULT_STORE_SETTINGS.heroEyebrow).trim(),
    heroHeading: String(record.hero_heading || DEFAULT_STORE_SETTINGS.heroHeading).trim(),
    heroSupportingText: String(record.hero_supporting_text || "").trim(),
    heroPrimaryButtonText: String(record.hero_primary_button_text || DEFAULT_STORE_SETTINGS.heroPrimaryButtonText).trim(),
    heroPrimaryButtonLink: String(record.hero_primary_button_link || DEFAULT_STORE_SETTINGS.heroPrimaryButtonLink).trim(),
    heroSecondaryButtonText: String(record.hero_secondary_button_text || "").trim(),
    heroSecondaryButtonLink: String(record.hero_secondary_button_link || "").trim(),
    heroTextAlignment: ["left", "center", "right"].includes(record.hero_text_alignment) ? record.hero_text_alignment : DEFAULT_STORE_SETTINGS.heroTextAlignment,
    heroTextPosition: ["left", "center", "right"].includes(record.hero_text_position) ? record.hero_text_position : DEFAULT_STORE_SETTINGS.heroTextPosition,
    heroOverlayIntensity: Math.min(80, Math.max(0, Number(record.hero_overlay_intensity ?? DEFAULT_STORE_SETTINGS.heroOverlayIntensity))),
    announcementEnabled: record.announcement_enabled !== false,
    announcementText: announcements[0]?.text || DEFAULT_STORE_SETTINGS.announcementText,
    announcementLinkLabel: announcements[0]?.linkLabel || DEFAULT_STORE_SETTINGS.announcementLinkLabel,
    announcementLinkHref: announcements[0]?.linkHref || DEFAULT_STORE_SETTINGS.announcementLinkHref,
    announcements,
  };
  if (includeFinance) {
    settings.financeTransactions = normalizeFinanceTransactions(announcementData.financeTransactions);
    settings.financeAllocation = normalizeFinanceAllocation(announcementData.financeAllocation);
    settings.productionBatches = normalizeProductionBatches(announcementData.productionBatches);
  }
  return settings;
}

export function isStoreSettingsSetupError(error) {
  const message = `${error?.message || ""} ${JSON.stringify(error?.details || {})}`.toLowerCase();
  return error?.status === 404 || message.includes("store_settings") || message.includes("schema cache");
}

export async function getStoreSettings(options = {}) {
  try {
    const rows = await supabaseAdminRequest("store_settings?select=*&id=eq.1&limit=1");
    return normalizeStoreSettings(rows?.[0], options.includeFinance);
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
  const heroDesktopImages = normalizeHeroImages(settings.heroDesktopImages || settings.heroDesktopImage, DEFAULT_STORE_SETTINGS.heroDesktopImage);
  const heroMobileImages = normalizeHeroImages(settings.heroMobileImages || settings.heroMobileImage, DEFAULT_STORE_SETTINGS.heroMobileImage);
  const financeTransactions = normalizeFinanceTransactions(settings.financeTransactions);
  const financeAllocation = normalizeFinanceAllocation(settings.financeAllocation);
  const productionBatches = normalizeProductionBatches(settings.productionBatches);
  const record = {
    id: 1,
    hero_enabled: settings.heroEnabled !== false,
    // Store a JSON image list in the existing fields, preserving compatibility with the current schema.
    hero_desktop_image: JSON.stringify(heroDesktopImages),
    hero_mobile_image: JSON.stringify(heroMobileImages),
    hero_eyebrow: String(settings.heroEyebrow || "").trim(),
    hero_heading: String(settings.heroHeading || DEFAULT_STORE_SETTINGS.heroHeading).trim(),
    hero_supporting_text: String(settings.heroSupportingText || "").trim(),
    hero_primary_button_text: String(settings.heroPrimaryButtonText || "").trim(),
    hero_primary_button_link: String(settings.heroPrimaryButtonLink || "").trim(),
    hero_secondary_button_text: String(settings.heroSecondaryButtonText || "").trim(),
    hero_secondary_button_link: String(settings.heroSecondaryButtonLink || "").trim(),
    hero_text_alignment: ["left", "center", "right"].includes(settings.heroTextAlignment) ? settings.heroTextAlignment : "left",
    hero_text_position: ["left", "center", "right"].includes(settings.heroTextPosition) ? settings.heroTextPosition : "left",
    hero_overlay_intensity: Math.min(80, Math.max(0, Number(settings.heroOverlayIntensity ?? 34))),
    announcement_enabled: settings.announcementEnabled !== false,
    announcement_text: firstAnnouncement.text,
    announcement_link_label: firstAnnouncement.linkLabel,
    announcement_link_href: firstAnnouncement.linkHref,
    announcements: { items: announcements, financeTransactions, financeAllocation, productionBatches },
    updated_at: new Date().toISOString(),
  };

  const rows = await supabaseAdminRequest("store_settings?on_conflict=id&select=*", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: record,
  });

  return normalizeStoreSettings(rows?.[0] || record, true);
}
