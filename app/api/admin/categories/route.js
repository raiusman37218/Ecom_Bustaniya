import { NextResponse } from "next/server";
import { fallbackCategories, getCatalogCategories, normalizeCategoryRecord } from "../../../../lib/categories";
import { authorizeAdminRequest } from "../../../../lib/adminAuth";
import { supabaseAdminRequest } from "../../../../lib/supabaseRest";
import { slugifyCategory } from "../../../../data/store";

function errorResponse(error) {
  const unauthorized = error.status === 401 || error.status === 403;
  return NextResponse.json(
    { error: unauthorized ? error.message : error.message || "Unable to update categories." },
    { status: unauthorized ? error.status : 500 }
  );
}

function tableMissing(error) {
  const message = `${error?.message || ""} ${JSON.stringify(error?.details || {})}`.toLowerCase();
  return error?.status === 404 || message.includes("catalog_categories") || message.includes("schema cache");
}

function payloadToRecord(category = {}) {
  const name = String(category.name || "").trim();
  const slug = String(category.slug || slugifyCategory(name)).trim();
  if (!name) throw new Error("Category name is required.");
  if (!slug) throw new Error("Category slug is required.");
  return {
    name,
    slug,
    description: String(category.description || "").trim(),
    image: String(category.image || "").trim(),
    parent_slug: String(category.parentSlug || category.parent_slug || "").trim() || null,
    status: category.status || "Active",
    sort_order: Number(category.sortOrder ?? category.sort_order ?? 100),
  };
}

async function sendTableSetupFallback() {
  const categories = await getCatalogCategories({ admin: true, includeInactive: true });
  return NextResponse.json({
    categories,
    needsSetup: true,
    setupSql: "scripts/supabase-catalog-categories.sql",
  });
}

export async function POST(request) {
  try {
    await authorizeAdminRequest(request, "products");
    return NextResponse.json({
      categories: await getCatalogCategories({ admin: true, includeInactive: true }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request) {
  try {
    await authorizeAdminRequest(request, "products");
    const body = await request.json();
    const record = payloadToRecord(body.category || {});
    try {
      const created = await supabaseAdminRequest("catalog_categories?select=*", {
        method: "POST",
        prefer: "return=representation",
        body: record,
      });
      return NextResponse.json({ success: true, category: normalizeCategoryRecord(created?.[0]) });
    } catch (error) {
      if (!tableMissing(error)) throw error;
      return sendTableSetupFallback();
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    await authorizeAdminRequest(request, "products");
    const body = await request.json();
    const categoryId = body.categoryId;
    if (!categoryId) throw new Error("Category is required.");
    const record = payloadToRecord(body.category || {});
    try {
      const updated = await supabaseAdminRequest(`catalog_categories?id=eq.${encodeURIComponent(categoryId)}&select=*`, {
        method: "PATCH",
        prefer: "return=representation",
        body: record,
      });
      return NextResponse.json({ success: true, category: normalizeCategoryRecord(updated?.[0]) });
    } catch (error) {
      if (!tableMissing(error)) throw error;
      return sendTableSetupFallback();
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request) {
  try {
    await authorizeAdminRequest(request, "products");
    const { categoryId } = await request.json();
    if (!categoryId) throw new Error("Category is required.");
    if (fallbackCategories().some((category) => category.id === categoryId)) {
      throw new Error("Built-in fallback categories can be replaced after Supabase category setup is installed.");
    }
    try {
      await supabaseAdminRequest(`catalog_categories?id=eq.${encodeURIComponent(categoryId)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: { status: "Archived" },
      });
      return NextResponse.json({ success: true, archived: true });
    } catch (error) {
      if (!tableMissing(error)) throw error;
      return sendTableSetupFallback();
    }
  } catch (error) {
    return errorResponse(error);
  }
}
