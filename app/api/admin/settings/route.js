import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import {
  getStoreSettings,
  isStoreSettingsSetupError,
  updateStoreSettings,
} from "../../../../lib/storeSettings";

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
  if (posts.length > 12) throw new Error("Add no more than 12 Instagram posts.");
  for (const post of posts) {
    const image = String(post?.image || "").trim();
    if (!image) throw new Error("Each Instagram post needs an image URL or local image path.");
    await validateHeroImageUrl(image);
    const link = String(post?.url || "").trim();
    if (link) {
      try {
        const url = new URL(link);
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
      } catch {
        throw new Error("Instagram post links must be valid http:// or https:// URLs.");
      }
    }
  }
}

async function validateHeroImages(settings) {
  const lists = [settings.heroDesktopImages || settings.heroDesktopImage, settings.heroMobileImages || settings.heroMobileImage];
  for (const list of lists) {
    const images = heroImageList(list);
    if (!images.length || images.length > MAX_HERO_SLIDES) {
      throw new Error(`Add between 1 and ${MAX_HERO_SLIDES} images for each hero layout.`);
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
    return NextResponse.json({ settings: await getStoreSettings() });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    if (isStoreSettingsSetupError(error)) return setupResponse(await getStoreSettings());
    return NextResponse.json({ error: "Unable to load store settings." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await authorizeAdminSession(request, "settings");
    const body = await request.json();
    const existing = await getStoreSettings({ includeFinance: true });
    const nextSettings = {
      ...existing,
      ...(body.settings || {}),
      financeTransactions: body?.settings?.financeTransactions ?? existing.financeTransactions,
    };
    await validateHeroImages(nextSettings);
    await validateInstagramPosts(nextSettings);
    const settings = await updateStoreSettings(nextSettings);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      const authError = adminAuthErrorResponse(error);
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    if (isStoreSettingsSetupError(error)) return setupResponse(await getStoreSettings());
    return NextResponse.json({ error: error.message || "Unable to save store settings." }, { status: 500 });
  }
}
