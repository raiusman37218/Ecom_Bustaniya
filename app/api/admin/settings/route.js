import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import {
  getStoreSettings,
  invalidateStoreSettingsCache,
  isStoreSettingsSetupError,
  updateStoreSettings,
} from "../../../../lib/storeSettings";
import { invalidatePluginsCache } from "../../../../lib/plugins/engine";

const MAX_HERO_SLIDES = 12;

function heroImageList(value) {
  return (Array.isArray(value) ? value : [value]).map((item) => String(item || "").trim()).filter(Boolean);
}

async function validateHeroImageUrl(value) {
  if (!value) return;
  const str = String(value).trim();
  if (str.startsWith("/")) return;
  let url;
  try {
    url = new URL(str);
  } catch {
    throw new Error("Each hero image must be a valid local path (e.g. /hero.jpg) or full image URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Hero image URLs must begin with http:// or https://");
  }
}

async function validateInstagramPosts(settings) {
  const posts = Array.isArray(settings.instagramPosts) ? settings.instagramPosts : [];
  if (posts.length > 12) throw new Error("Add no more than 12 Instagram reels/posts.");
  for (const post of posts) {
    const link = String(post?.url || "").trim();
    const image = String(post?.image || "").trim();
    if (!link && !image) {
      throw new Error("Each Instagram entry needs an Instagram Reel or post URL.");
    }
    if (link) {
      try {
        const url = new URL(link);
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
      } catch {
        throw new Error("Instagram Reel links must be valid http:// or https:// URLs (e.g. https://www.instagram.com/reel/...)");
      }
    }
    if (image) {
      await validateHeroImageUrl(image);
    }
  }
}

async function validateHeroImages(settings) {
  const lists = [settings.heroDesktopImages || settings.heroDesktopImage, settings.heroMobileImages || settings.heroMobileImage];
  for (const list of lists) {
    if (!list) continue;
    const images = heroImageList(list);
    if (images.length > MAX_HERO_SLIDES) {
      throw new Error(`Add no more than ${MAX_HERO_SLIDES} images for each hero layout.`);
    }
    for (const image of images) await validateHeroImageUrl(image);
  }
}

function setupResponse(settings) {
  return NextResponse.json({
    settings,
    needsSetup: true,
    setupSql: "scripts/supabase-store-settings.sql",
  });
}

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "settings");
    return NextResponse.json({ settings: await getStoreSettings({ admin: true, fresh: true }) });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    if (isStoreSettingsSetupError(error)) return setupResponse(await getStoreSettings({ admin: true, fresh: true }));
    return NextResponse.json({ error: "Unable to load store settings." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await authorizeAdminSession(request, "settings");
    const body = await request.json();
    const existing = await getStoreSettings({ includeFinance: true, fresh: true });
    const nextSettings = {
      ...existing,
      ...(body.settings || {}),
      financeTransactions: body?.settings?.financeTransactions ?? existing.financeTransactions,
      pluginsRegistry: body?.settings?.pluginsRegistry ?? existing.pluginsRegistry,
    };
    await validateHeroImages(nextSettings);
    await validateInstagramPosts(nextSettings);
    const settings = await updateStoreSettings(nextSettings);
    invalidateStoreSettingsCache();
    invalidatePluginsCache();
    try {
      revalidateTag("store-settings");
      revalidatePath("/", "page");
      revalidatePath("/", "layout");
      revalidatePath("/uk", "page");
      revalidatePath("/uk", "layout");
      revalidatePath("/admin", "page");
      revalidatePath("/cart", "page");
      revalidatePath("/checkout", "page");
      revalidatePath("/search", "page");
      revalidatePath("/wishlist", "page");
      revalidatePath("/track-order", "page");
      revalidatePath("/product/[id]", "page");
      revalidatePath("/category/[slug]", "page");
      revalidatePath("/category/[slug]/[subcategory]", "page");
      revalidatePath("/uk/product/[id]", "page");
      revalidatePath("/uk/category/[slug]", "page");
      revalidatePath("/uk/category/[slug]/[subcategory]", "page");
      revalidatePath("/about", "page");
      revalidatePath("/contact", "page");
      revalidatePath("/faqs", "page");
      revalidatePath("/shipping-policy", "page");
      revalidatePath("/exchange-return-policy", "page");
      revalidatePath("/terms-and-conditions", "page");
      revalidatePath("/privacy-policy", "page");
    } catch {}
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    if (isStoreSettingsSetupError(error)) return setupResponse(await getStoreSettings({ admin: true, fresh: true }));
    return NextResponse.json({ error: error.message || "Unable to save store settings." }, { status: 500 });
  }
}
