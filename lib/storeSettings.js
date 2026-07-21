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
    type: ["business_expense", "owner_withdrawal", "owner_investment", "supplier_payment"].includes(item?.type) ? item.type : "business_expense",
    title: String(item?.title || "Finance entry").trim(),
    category: String(item?.category || "Other").trim(),
    amount: Math.max(0, Number(item?.amount || 0)),
    date: String(item?.date || "").slice(0, 10),
    note: String(item?.note || "").trim().slice(0, 500),
    productionBatchId: String(item?.productionBatchId || "").trim(),
  })).filter((item) => item.amount > 0);
}

function normalizeFinanceAllocation(value) {
  const marketingPercent = Math.min(100, Math.max(0, Number(value?.marketingPercent ?? 25)));
  const ownerPercent = Math.min(100 - marketingPercent, Math.max(0, Number(value?.ownerPercent ?? 30)));
  return { marketingPercent, ownerPercent, stockPercent: Math.max(0, 100 - marketingPercent - ownerPercent) };
}

function normalizeFinanceFixedCosts(value) {
  return Math.max(0, Number(value || 0));
}

function normalizeMarketingCampaigns(value) {
  return (Array.isArray(value) ? value : []).map((item, index) => ({ id: String(item?.id || `campaign-${index + 1}`), name: String(item?.name || "").trim(), platform: String(item?.platform || "Other").trim(), spend: Math.max(0, Number(item?.spend || 0)), sales: Math.max(0, Number(item?.sales || 0)), customers: Math.max(0, Number(item?.customers || 0)), date: String(item?.date || "").slice(0, 10) })).filter((item) => item.name);
}

function normalizeSupplierBills(value) {
  return (Array.isArray(value) ? value : []).map((item, index) => {
    const total = Math.max(0, Number(item?.total || 0));
    const paid = Math.min(total, Math.max(0, Number(item?.paid || 0)));
    return { id: String(item?.id || `supplier-bill-${index + 1}`), supplier: String(item?.supplier || "").trim(), reference: String(item?.reference || "").trim(), total, paid, dueDate: String(item?.dueDate || "").slice(0, 10), date: String(item?.date || "").slice(0, 10), note: String(item?.note || "").trim().slice(0, 500), status: item?.status === "paid" || paid >= total ? "paid" : "open" };
  }).filter((item) => item.supplier && item.total > 0);
}

function normalizeProductionBatches(value) {
  return (Array.isArray(value) ? value : []).map((batch) => ({
    id: String(batch?.id || ""), productId: String(batch?.productId || ""), productName: String(batch?.productName || ""), quantity: Math.max(1, Number(batch?.quantity || 1)), totalCost: Math.max(0, Number(batch?.totalCost || 0)), unitCost: Math.max(0, Number(batch?.unitCost || 0)), costBreakdown: batch?.costBreakdown || {}, sharedCostBreakdown: batch?.sharedCostBreakdown || {}, items: (Array.isArray(batch?.items) ? batch.items : []).map((item) => ({ productId: String(item?.productId || ""), productName: String(item?.productName || ""), quantity: Math.max(1, Number(item?.quantity || 1)), directCostBreakdown: item?.directCostBreakdown || {}, sharedCostAllocation: Math.max(0, Number(item?.sharedCostAllocation || 0)), totalCost: Math.max(0, Number(item?.totalCost || 0)), unitCost: Math.max(0, Number(item?.unitCost || 0)), unitCostBreakdown: item?.unitCostBreakdown || {} })).filter((item) => item.productId), unitCostBreakdown: batch?.unitCostBreakdown || {}, date: String(batch?.date || "").slice(0, 10), note: String(batch?.note || "").slice(0, 500), status: batch?.status === "voided" ? "voided" : "active", voidedAt: String(batch?.voidedAt || "").slice(0, 30),
  })).filter((batch) => batch.id && batch.productId);
}

function normalizeInventorySources(value) {
  return (Array.isArray(value) ? value : []).map((item, index) => ({
    id: String(item?.id || `source-${index + 1}`), name: String(item?.name || "").trim(), type: String(item?.type || "Material supplier").trim(), contact: String(item?.contact || "").trim(), location: String(item?.location || "").trim(), notes: String(item?.notes || "").trim().slice(0, 500), status: String(item?.status || "Active").trim(),
  })).filter((item) => item.name);
}

function normalizeInventoryMaterials(value) {
  return (Array.isArray(value) ? value : []).map((item, index) => ({
    id: String(item?.id || `material-${index + 1}`), item: String(item?.item || "").trim(), category: String(item?.category || "Other material").trim(), sourceId: String(item?.sourceId || "").trim(), quantity: Math.max(0, Number(item?.quantity || 0)), unit: String(item?.unit || "pcs").trim(), unitCost: Math.max(0, Number(item?.unitCost || 0)), reorderAt: Math.max(0, Number(item?.reorderAt || 0)), notes: String(item?.notes || "").trim().slice(0, 500), status: String(item?.status || "Tracked").trim(),
  })).filter((item) => item.item);
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
    settings.financeFixedCosts = normalizeFinanceFixedCosts(announcementData.financeFixedCosts);
    settings.marketingCampaigns = normalizeMarketingCampaigns(announcementData.marketingCampaigns);
    settings.productionBatches = normalizeProductionBatches(announcementData.productionBatches);
    settings.inventorySources = normalizeInventorySources(announcementData.inventorySources);
    settings.inventoryMaterials = normalizeInventoryMaterials(announcementData.inventoryMaterials);
    settings.supplierBills = normalizeSupplierBills(announcementData.supplierBills);
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
  const financeFixedCosts = normalizeFinanceFixedCosts(settings.financeFixedCosts);
  const marketingCampaigns = normalizeMarketingCampaigns(settings.marketingCampaigns);
  const productionBatches = normalizeProductionBatches(settings.productionBatches);
  const inventorySources = normalizeInventorySources(settings.inventorySources);
  const inventoryMaterials = normalizeInventoryMaterials(settings.inventoryMaterials);
  const supplierBills = normalizeSupplierBills(settings.supplierBills);
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
    announcements: { items: announcements, financeTransactions, financeAllocation, financeFixedCosts, marketingCampaigns, productionBatches, inventorySources, inventoryMaterials, supplierBills },
    updated_at: new Date().toISOString(),
  };

  const rows = await supabaseAdminRequest("store_settings?on_conflict=id&select=*", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: record,
  });

  return normalizeStoreSettings(rows?.[0] || record, true);
}
