import { NextResponse } from "next/server";
import {
  getAllPlugins,
  updatePluginConfig,
  createCustomPlugin,
  deleteCustomPlugin,
  triggerPluginHook,
  getPluginLogs,
} from "../../../../lib/plugins/engine.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request) {
  try {
    const plugins = await getAllPlugins();
    const logs = await getPluginLogs();
    return NextResponse.json({ ok: true, plugins, logs }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to load plugins" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "toggle") {
      const { pluginId, enabled } = body;
      await updatePluginConfig(pluginId, { enabled });
      const plugins = await getAllPlugins();
      return NextResponse.json(
        { ok: true, message: `Plugin ${enabled ? "enabled" : "disabled"}`, plugins },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (action === "updateSettings") {
      const { pluginId, settings, enabled } = body;
      await updatePluginConfig(pluginId, { settings, enabled });
      const plugins = await getAllPlugins();
      return NextResponse.json(
        { ok: true, message: "Settings saved successfully", plugins },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (action === "create") {
      const { pluginData } = body;
      const created = await createCustomPlugin(pluginData);
      const plugins = await getAllPlugins();
      return NextResponse.json(
        { ok: true, message: "Custom plugin created successfully", plugin: created, plugins },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (action === "delete") {
      const { pluginId } = body;
      await deleteCustomPlugin(pluginId);
      const plugins = await getAllPlugins();
      return NextResponse.json(
        { ok: true, message: "Custom plugin deleted", plugins },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (action === "testHook") {
      const { hookName = "onOrderCreated", payload = {} } = body;
      const samplePayload = {
        orderId: payload.orderId || "TEST-1049",
        customer: payload.customer || "Ayesha Khan",
        phone: payload.phone || "03001234567",
        city: payload.city || "Lahore",
        total: payload.total || 8950,
        items: payload.items || [{ name: "Luxury Embroidered Lawn 3-Piece", quantity: 1, price: 8950 }],
        status: "Confirmed",
        timestamp: new Date().toISOString(),
      };

      const result = await triggerPluginHook(hookName, samplePayload);
      const logs = await getPluginLogs();
      return NextResponse.json(
        { ok: true, message: "Test hook dispatched", result, logs },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400, headers: NO_CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Operation failed" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
