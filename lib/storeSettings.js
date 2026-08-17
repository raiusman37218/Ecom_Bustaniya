import { DEFAULT_ANNOUNCEMENTS, DEFAULT_HOMEPAGE_SECTIONS, DEFAULT_STORE_SETTINGS } from "../data/storeSettings";
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

export function normalizeHeroImages(value, fallback) {
  let source = value;
  if (typeof value === "string") {
    try { source = JSON.parse(value); } catch { source = value; }
  }
  const images = (Array.isArray(source) ? source : [source])
    .map((image) => String(image || "").trim())
    .filter(Boolean);
  return images.length ? images : [fallback];
}

function normalizeSectionColors(value) {
  const defaults = DEFAULT_STORE_SETTINGS.sectionColors;
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(defaults).map(([section, fallback]) => {
    const color = String(source[section] || fallback).trim();
    return [section, /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback];
  }));
}

function normalizeSectionTextColors(value) {
  const defaults = DEFAULT_STORE_SETTINGS.sectionTextColors;
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(defaults).map(([section, fallback]) => {
    const color = String(source[section] || fallback).trim();
    return [section, /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback];
  }));
}

function resolveWhatsAppNumber(source = {}, defaults = {}) {
  const configured = String(source.whatsappNumber || "").replace(/[^0-9]/g, "");
  if (configured) return configured.slice(0, 20);

  // Backwards compatibility: early payment settings stored the verification
  // number inside the instructions instead of in the dedicated field.
  const instructionText = `${source.codInstructions || ""}\n${source.instructions || ""}\n${defaults.codInstructions || ""}\n${defaults.instructions || ""}`;
  const candidates = instructionText.match(/(?:\+?92|0092)[\s-]?\d[\d\s-]{8,14}/g) || [];
  const normalized = candidates
    .map((candidate) => candidate.replace(/\D/g, "").replace(/^0092/, "92"))
    .find((candidate) => /^92\d{10}$/.test(candidate));

  return normalized || "";
}

function cleanInstructionCopy(text, fallback) {
  const str = String(text || "").trim();
  if (!str) return fallback;
  if (
    str.includes("payment krna hogi") ||
    str.includes("Separately as Delivery charges") ||
    str.includes("Kindly,") ||
    str.includes("+92053530008") ||
    str.includes("bhajna na bholiyay")
  ) {
    return fallback;
  }
  return str.slice(0, 500);
}

function normalizePaymentSettings(value) {
  const defaults = DEFAULT_STORE_SETTINGS.paymentSettings;
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    codEnabled: source.codEnabled !== false,
    manualTransferEnabled: source.manualTransferEnabled !== false,
    codPhoneVerification: source.codPhoneVerification !== false,
    codMinOrderPkr: Math.max(0, Number(source.codMinOrderPkr ?? defaults.codMinOrderPkr)),
    codMaxOrderPkr: Math.max(0, Number(source.codMaxOrderPkr ?? defaults.codMaxOrderPkr)),
    codDeliveryChargePkr: Math.max(0, Number(source.codDeliveryChargePkr ?? defaults.codDeliveryChargePkr ?? 250)),
    codHeading: String(source.codHeading || defaults.codHeading || "Cash on Delivery Instructions").trim().slice(0, 120),
    codInstructions: cleanInstructionCopy(source.codInstructions, defaults.codInstructions),
    bankName: String(source.bankName || "").trim().slice(0, 120),
    bankTitle: String(source.bankTitle || "").trim().slice(0, 120),
    bankAccountNumber: String(source.bankAccountNumber || "").trim().slice(0, 80),
    bankIban: String(source.bankIban || "").trim().slice(0, 80),
    whatsappNumber: resolveWhatsAppNumber(source, defaults),
    advanceHeading: String(source.advanceHeading || defaults.advanceHeading || "Full Advance Payment Instructions").trim().slice(0, 120),
    instructions: cleanInstructionCopy(source.instructions, defaults.instructions),
  };
}

function normalizeHeroContent(value, fallback, mobile = false) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const alignment = ["left", "center", "right"].includes(source.alignment) ? source.alignment : fallback.alignment;
  const validPositions = mobile ? ["top", "center", "bottom"] : ["left", "center", "right"];
  return {
    eyebrow: String(source.eyebrow ?? fallback.eyebrow ?? "").trim().slice(0, 80),
    heading: String(source.heading ?? fallback.heading ?? "").trim().slice(0, 160),
    supportingText: String(source.supportingText ?? fallback.supportingText ?? "").trim().slice(0, 500),
    primaryButtonText: String(source.primaryButtonText ?? fallback.primaryButtonText ?? "").trim().slice(0, 80),
    primaryButtonLink: String(source.primaryButtonLink ?? fallback.primaryButtonLink ?? "").trim().slice(0, 300),
    secondaryButtonText: String(source.secondaryButtonText ?? fallback.secondaryButtonText ?? "").trim().slice(0, 80),
    secondaryButtonLink: String(source.secondaryButtonLink ?? fallback.secondaryButtonLink ?? "").trim().slice(0, 300),
    alignment,
    position: validPositions.includes(source.position) ? source.position : fallback.position,
  };
}

function normalizeShippingZones(value) {
  const source = Array.isArray(value) ? value : DEFAULT_STORE_SETTINGS.shippingZones;
  const zones = source.map((item, index) => ({
    id: String(item?.id || `shipping-zone-${index + 1}`).trim(),
    zone: String(item?.zone || "").trim().slice(0, 100),
    cities: String(item?.cities || "").trim().slice(0, 500),
    rate: Math.max(0, Number(item?.rate ?? 0)),
    freeAbove: Math.max(0, Number(item?.freeAbove ?? 0)),
  })).filter((item) => item.zone && item.cities);
  return zones.length ? zones : DEFAULT_STORE_SETTINGS.shippingZones;
}

function normalizeNotificationSettings(value) {
  const defaults = DEFAULT_STORE_SETTINGS.notificationSettings;
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    orderConfirmationEnabled: source.orderConfirmationEnabled !== false,
    orderConfirmationSubject: String(source.orderConfirmationSubject || defaults.orderConfirmationSubject).trim().slice(0, 160),
    orderConfirmationTemplate: String(source.orderConfirmationTemplate || defaults.orderConfirmationTemplate).trim().slice(0, 5000),
    fulfillmentUpdateEnabled: source.fulfillmentUpdateEnabled !== false,
    codVerificationReminderEnabled: source.codVerificationReminderEnabled !== false,
  };
}

function normalizeDomainSettings(value) {
  const defaults = DEFAULT_STORE_SETTINGS.domainSettings;
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    primaryDomain: String(source.primaryDomain || defaults.primaryDomain).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 200),
    wwwRedirect: source.wwwRedirect !== false,
    seoTitle: String(source.seoTitle || defaults.seoTitle).trim().slice(0, 160),
    analyticsMeasurementId: String(source.analyticsMeasurementId || "").trim().slice(0, 120),
    metaPixelId: String(source.metaPixelId ?? defaults.metaPixelId ?? "").trim().replace(/[\r\n\t"']/g, "").slice(0, 120),
    metaCapiAccessToken: String(source.metaCapiAccessToken ?? defaults.metaCapiAccessToken ?? "").trim().replace(/[\r\n\t"']/g, "").slice(0, 2000),
  };
}

function normalizeCheckoutSettings(value) {
  const defaults = DEFAULT_STORE_SETTINGS.checkoutSettings;
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    guestCheckoutEnabled: source.guestCheckoutEnabled !== false,
    phoneRequired: source.phoneRequired !== false,
    defaultPayment: ["full_advance", "bank_deposit"].includes(source.defaultPayment) ? "full_advance" : defaults.defaultPayment,
    addressMode: source.addressMode === "simple" ? "simple" : defaults.addressMode,
    checkoutNote: String(source.checkoutNote || defaults.checkoutNote).trim().slice(0, 500),
  };
}

function normalizeSizeChartSettings(value) {
  const defaults = DEFAULT_STORE_SETTINGS.sizeChartSettings;
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    title: String(source.title || defaults.title).trim().slice(0, 120),
    subtitle: String(source.subtitle || defaults.subtitle).trim().slice(0, 200),
    advice: String(source.advice || defaults.advice).trim().slice(0, 500),
    columns: Array.isArray(source.columns) && source.columns.length > 0 ? source.columns.map((c) => String(c).trim()).filter(Boolean) : defaults.columns,
    rows: Array.isArray(source.rows) && source.rows.length > 0 ? source.rows : defaults.rows,
  };
}

function normalizeFinanceTransactions(value) {
  return (Array.isArray(value) ? value : []).map((item, index) => ({
    id: String(item?.id || `finance-${index + 1}`),
    type: ["business_expense", "owner_withdrawal", "owner_investment", "supplier_payment", "postex_bank_receipt"].includes(item?.type) ? item.type : "business_expense",
    title: String(item?.title || "Finance entry").trim(),
    category: String(item?.category || "Other").trim(),
    amount: Math.max(0, Number(item?.amount || 0)),
    date: String(item?.date || "").slice(0, 10),
    reference: String(item?.reference || String(item?.title || "").replace(/^PostEx bank receipt:\s*/i, "")).trim().slice(0, 160),
    note: String(item?.note || "").trim().slice(0, 500),
    productionBatchId: String(item?.productionBatchId || "").trim(),
    supplierBillId: String(item?.supplierBillId || "").trim(),
    voided: item?.voided === true,
    voidedAt: String(item?.voidedAt || "").slice(0, 40),
    voidedBy: String(item?.voidedBy || "").trim().slice(0, 120),
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

function normalizeManualExpenses(value) {
  return (Array.isArray(value) ? value : []).map((item, index) => ({
    id: String(item?.id || `manual-expense-${index + 1}`),
    title: String(item?.title || "Expense").trim(),
    category: String(item?.category || "Other").trim(),
    amount: Math.max(0, Number(item?.amount || 0)),
    date: String(item?.date || "").slice(0, 10),
  })).filter((item) => item.amount > 0);
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

const VALID_SECTION_TYPES = ["hero", "new_arrivals", "shop_by_category", "best_sellers", "our_story", "newsletter", "instagram_feed"];
const MAX_INSTAGRAM_POSTS = 12;

function normalizeInstagramHandle(value) {
  const raw = String(value || DEFAULT_STORE_SETTINGS.instagramHandle || "@bustaniya_").trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");
  const handle = raw.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30);
  return handle ? `@${handle}` : DEFAULT_STORE_SETTINGS.instagramHandle;
}

function normalizeInstagramPosts(value) {
  const source = Array.isArray(value) && value.length ? value : DEFAULT_STORE_SETTINGS.instagramPosts;
  return source.slice(0, MAX_INSTAGRAM_POSTS).map((post, index) => ({
    id: String(post?.id || `instagram-${index + 1}`),
    image: String(post?.image || "").trim(),
    mediaType: post?.mediaType === "video" ? "video" : "image",
    url: String(post?.url || "").trim(),
    caption: String(post?.caption || "").trim().slice(0, 180),
  })).filter((post) => post.image);
}

function normalizeHomepageSections(value) {
  if (!Array.isArray(value) || !value.length) return DEFAULT_HOMEPAGE_SECTIONS;
  const normalized = value
    .filter((item) => item && VALID_SECTION_TYPES.includes(item.type))
    .map((item) => {
      const type = item.type === "our_story" ? "best_sellers" : item.type;
      const defaults = DEFAULT_HOMEPAGE_SECTIONS.find((d) => d.type === type) || {};
      return {
        id: type === "best_sellers" ? "best-sellers" : String(item.id || defaults.id || `section-${type}`),
        type,
        enabled: item.enabled !== false,
        label: type === "best_sellers" ? defaults.label : String(item.label || defaults.label || type).trim(),
        heading: String(item.heading ?? defaults.heading ?? "").trim(),
        eyebrow: String(item.eyebrow ?? defaults.eyebrow ?? "").trim(),
        subtitle: String(item.subtitle ?? defaults.subtitle ?? "").trim(),
        style: ["atelier", "minimal"].includes(item?.style) ? item.style : undefined,
      };
    });

  // Older saved homepage configurations predate the Instagram section. Keep
  // their chosen layout intact, but add the feed at the end (above the footer)
  // so the Instagram enabled switch always has a place to render.
  if (!normalized.some((section) => section.type === "instagram_feed")) {
    const instagramDefaults = DEFAULT_HOMEPAGE_SECTIONS.find((section) => section.type === "instagram_feed");
    if (instagramDefaults) normalized.push({ ...instagramDefaults });
  }

  return normalized;
}

function normalizeProductCardStyle(value) {
  return value === "connected" ? "connected" : "classic";
}

function normalizeCategorySectionStyle(value) {
  return value === "minimal" ? "minimal" : "atelier";
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
  const legacyDesktopHero = {
    eyebrow: record.hero_eyebrow !== undefined && record.hero_eyebrow !== null ? String(record.hero_eyebrow).trim() : DEFAULT_STORE_SETTINGS.heroEyebrow,
    heading: record.hero_heading !== undefined && record.hero_heading !== null ? String(record.hero_heading).trim() : DEFAULT_STORE_SETTINGS.heroHeading,
    supportingText: String(record.hero_supporting_text || "").trim(),
    primaryButtonText: record.hero_primary_button_text !== undefined && record.hero_primary_button_text !== null ? String(record.hero_primary_button_text).trim() : DEFAULT_STORE_SETTINGS.heroPrimaryButtonText,
    primaryButtonLink: record.hero_primary_button_link !== undefined && record.hero_primary_button_link !== null ? String(record.hero_primary_button_link).trim() : DEFAULT_STORE_SETTINGS.heroPrimaryButtonLink,
    secondaryButtonText: String(record.hero_secondary_button_text || "").trim(),
    secondaryButtonLink: String(record.hero_secondary_button_link || "").trim(),
    alignment: ["left", "center", "right"].includes(record.hero_text_alignment) ? record.hero_text_alignment : "left",
    position: ["left", "center", "right"].includes(record.hero_text_position) ? record.hero_text_position : "left",
  };
  const heroDesktopContent = normalizeHeroContent(announcementData.heroDesktopContent, legacyDesktopHero);
  const heroMobileContent = normalizeHeroContent(announcementData.heroMobileContent, { ...heroDesktopContent, position: "bottom" }, true);

  const settings = {
    sectionColors: normalizeSectionColors(announcementData.sectionColors),
    sectionTextColors: normalizeSectionTextColors(announcementData.sectionTextColors),
    heroEnabled: record.hero_enabled !== false,
    heroDesktopImage: heroDesktopImages[0],
    heroMobileImage: heroMobileImages[0],
    heroDesktopImages,
    heroMobileImages,
    heroEyebrow: heroDesktopContent.eyebrow,
    heroHeading: heroDesktopContent.heading,
    heroSupportingText: heroDesktopContent.supportingText,
    heroPrimaryButtonText: heroDesktopContent.primaryButtonText,
    heroPrimaryButtonLink: heroDesktopContent.primaryButtonLink,
    heroSecondaryButtonText: heroDesktopContent.secondaryButtonText,
    heroSecondaryButtonLink: heroDesktopContent.secondaryButtonLink,
    heroTextAlignment: heroDesktopContent.alignment,
    heroTextPosition: heroDesktopContent.position,
    heroDesktopContent,
    heroMobileContent,
    heroOverlayIntensity: Math.min(80, Math.max(0, Number(record.hero_overlay_intensity ?? DEFAULT_STORE_SETTINGS.heroOverlayIntensity))),
    productCardStyle: normalizeProductCardStyle(announcementData.productCardStyle),
    categorySectionStyle: normalizeCategorySectionStyle(announcementData.categorySectionStyle || record.category_section_style),
    announcementEnabled: record.announcement_enabled !== false,
    announcementText: announcements[0]?.text || DEFAULT_STORE_SETTINGS.announcementText,
    announcementLinkLabel: announcements[0]?.linkLabel || DEFAULT_STORE_SETTINGS.announcementLinkLabel,
    announcementLinkHref: announcements[0]?.linkHref || DEFAULT_STORE_SETTINGS.announcementLinkHref,
    announcements,
    paymentSettings: normalizePaymentSettings(announcementData.paymentSettings),
    shippingZones: normalizeShippingZones(announcementData.shippingZones),
    notificationSettings: normalizeNotificationSettings(announcementData.notificationSettings),
    domainSettings: normalizeDomainSettings(announcementData.domainSettings),
    checkoutSettings: normalizeCheckoutSettings(announcementData.checkoutSettings),
    sizeChartSettings: normalizeSizeChartSettings(announcementData.sizeChartSettings),
    homepageSections: normalizeHomepageSections(announcementData.homepageSections),
    instagramEnabled: announcementData.instagramEnabled !== false,
    instagramHandle: normalizeInstagramHandle(announcementData.instagramHandle),
    instagramPosts: normalizeInstagramPosts(announcementData.instagramPosts),
  };
  if (includeFinance) {
    settings.financeTransactions = normalizeFinanceTransactions(announcementData.financeTransactions);
    settings.financeAllocation = normalizeFinanceAllocation(announcementData.financeAllocation);
    settings.financeFixedCosts = normalizeFinanceFixedCosts(announcementData.financeFixedCosts);
    settings.financeManualExpenses = normalizeManualExpenses(announcementData.financeManualExpenses);
    settings.financePackagingExpense = Math.max(0, Number(announcementData.financePackagingExpense || 0));
    settings.financeDeliveryExpense = Math.max(0, Number(announcementData.financeDeliveryExpense || 0));
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
  const heroDesktopContent = normalizeHeroContent(settings.heroDesktopContent, {
    eyebrow: settings.heroEyebrow !== undefined ? String(settings.heroEyebrow).trim() : DEFAULT_STORE_SETTINGS.heroEyebrow,
    heading: settings.heroHeading !== undefined ? String(settings.heroHeading).trim() : DEFAULT_STORE_SETTINGS.heroHeading,
    supportingText: String(settings.heroSupportingText || "").trim(),
    primaryButtonText: settings.heroPrimaryButtonText !== undefined ? String(settings.heroPrimaryButtonText).trim() : DEFAULT_STORE_SETTINGS.heroPrimaryButtonText,
    primaryButtonLink: settings.heroPrimaryButtonLink !== undefined ? String(settings.heroPrimaryButtonLink).trim() : DEFAULT_STORE_SETTINGS.heroPrimaryButtonLink,
    secondaryButtonText: String(settings.heroSecondaryButtonText || "").trim(),
    secondaryButtonLink: String(settings.heroSecondaryButtonLink || "").trim(),
    alignment: settings.heroTextAlignment || "left",
    position: settings.heroTextPosition || "left",
  });
  const heroMobileContent = normalizeHeroContent(settings.heroMobileContent, { ...heroDesktopContent, position: "bottom" }, true);
  const financeTransactions = normalizeFinanceTransactions(settings.financeTransactions);
  const financeAllocation = normalizeFinanceAllocation(settings.financeAllocation);
  const financeFixedCosts = normalizeFinanceFixedCosts(settings.financeFixedCosts);
  const financeManualExpenses = normalizeManualExpenses(settings.financeManualExpenses);
  const financePackagingExpense = Math.max(0, Number(settings.financePackagingExpense || 0));
  const financeDeliveryExpense = Math.max(0, Number(settings.financeDeliveryExpense || 0));
  const marketingCampaigns = normalizeMarketingCampaigns(settings.marketingCampaigns);
  const productionBatches = normalizeProductionBatches(settings.productionBatches);
  const inventorySources = normalizeInventorySources(settings.inventorySources);
  const inventoryMaterials = normalizeInventoryMaterials(settings.inventoryMaterials);
  const supplierBills = normalizeSupplierBills(settings.supplierBills);
  const sectionColors = normalizeSectionColors(settings.sectionColors);
  const sectionTextColors = normalizeSectionTextColors(settings.sectionTextColors);
  const paymentSettings = normalizePaymentSettings(settings.paymentSettings);
  const shippingZones = normalizeShippingZones(settings.shippingZones);
  const notificationSettings = normalizeNotificationSettings(settings.notificationSettings);
  const domainSettings = normalizeDomainSettings(settings.domainSettings);
  const checkoutSettings = normalizeCheckoutSettings(settings.checkoutSettings);
  const productCardStyle = normalizeProductCardStyle(settings.productCardStyle);
  const categorySectionStyle = normalizeCategorySectionStyle(settings.categorySectionStyle);
  const instagramHandle = normalizeInstagramHandle(settings.instagramHandle);
  const instagramPosts = normalizeInstagramPosts(settings.instagramPosts);

  const record = {
    id: 1,
    hero_enabled: settings.heroEnabled !== false,
    hero_desktop_image: JSON.stringify(heroDesktopImages),
    hero_mobile_image: JSON.stringify(heroMobileImages),
    hero_eyebrow: heroDesktopContent.eyebrow,
    hero_heading: heroDesktopContent.heading,
    hero_supporting_text: heroDesktopContent.supportingText,
    hero_primary_button_text: heroDesktopContent.primaryButtonText,
    hero_primary_button_link: heroDesktopContent.primaryButtonLink,
    hero_secondary_button_text: heroDesktopContent.secondaryButtonText,
    hero_secondary_button_link: heroDesktopContent.secondaryButtonLink,
    hero_text_alignment: heroDesktopContent.alignment,
    hero_text_position: heroDesktopContent.position,
    hero_overlay_intensity: Math.min(80, Math.max(0, Number(settings.heroOverlayIntensity ?? 34))),
    announcement_enabled: settings.announcementEnabled !== false,
    announcement_text: firstAnnouncement.text,
    announcement_link_label: firstAnnouncement.linkLabel,
    announcement_link_href: firstAnnouncement.linkHref,
    announcements: { items: announcements, sectionColors, sectionTextColors, heroDesktopContent, heroMobileContent, paymentSettings, shippingZones, notificationSettings, domainSettings, checkoutSettings, sizeChartSettings: normalizeSizeChartSettings(settings.sizeChartSettings), productCardStyle, categorySectionStyle, homepageSections: normalizeHomepageSections(settings.homepageSections), instagramEnabled: settings.instagramEnabled !== false, instagramHandle, instagramPosts, financeTransactions, financeAllocation, financeFixedCosts, financeManualExpenses, financePackagingExpense, financeDeliveryExpense, marketingCampaigns, productionBatches, inventorySources, inventoryMaterials, supplierBills },
    updated_at: new Date().toISOString(),
  };

  const rows = await supabaseAdminRequest("store_settings?on_conflict=id&select=*", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: record,
  });

  try {
    const { invalidateCredentialsCache } = await import("./metaCapi");
    invalidateCredentialsCache();
  } catch {}

  return normalizeStoreSettings(rows?.[0] || record, true);
}
