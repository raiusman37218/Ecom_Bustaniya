import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import {
  getStoreSettings,
  isStoreSettingsSetupError,
  updateStoreSettings,
} from "../../../../lib/storeSettings";

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
    const settings = await updateStoreSettings({
      ...existing,
      ...(body.settings || {}),
      financeTransactions: body?.settings?.financeTransactions ?? existing.financeTransactions,
    });
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
