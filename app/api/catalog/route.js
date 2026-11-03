import { NextResponse } from "next/server";
import { getCatalogCategories } from "../../../lib/categories";
import { getCatalogProducts } from "../../../lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [products, categories] = await Promise.all([
    getCatalogProducts(),
    getCatalogCategories(),
  ]);
  return NextResponse.json(
    { products, categories },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
