import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getStoreSettings, updateStoreSettings } from "../../../../lib/storeSettings";

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "inventory");
    const settings = await getStoreSettings({ includeFinance: true });
    return NextResponse.json({ sources: settings.inventorySources || [], materials: settings.inventoryMaterials || [] });
  } catch (error) {
    const auth = adminAuthErrorResponse(error);
    return NextResponse.json({ error: "Unable to load inventory sources and materials." }, { status: error?.status === 401 || error?.status === 403 ? auth.status : 500 });
  }
}

export async function PUT(request) {
  try {
    await authorizeAdminSession(request, "inventory");
    const body = await request.json();
    if (!Array.isArray(body.sources) || !Array.isArray(body.materials)) return NextResponse.json({ error: "Sources and materials are required." }, { status: 400 });
    const settings = await getStoreSettings({ includeFinance: true });
    const saved = await updateStoreSettings({ ...settings, inventorySources: body.sources, inventoryMaterials: body.materials });
    return NextResponse.json({ sources: saved.inventorySources || [], materials: saved.inventoryMaterials || [] });
  } catch (error) {
    const auth = adminAuthErrorResponse(error);
    return NextResponse.json({ error: error.message || "Unable to save inventory sources and materials." }, { status: error?.status === 401 || error?.status === 403 ? auth.status : 500 });
  }
}
