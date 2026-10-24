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

export async function GET(request) {
  try {
    const plugins = await getAllPlugins();
    const logs = await getPluginLogs();
    return NextResponse.json({ ok: true, plugins, logs });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to load plugins" },
      { status: 500 }
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
      return NextResponse.json({ ok: true, message: `Plugin ${enabled ? "enabled" : "disabled"}`, plugins });
    }

    if (action === "updateSettings") {
      const { pluginId, settings } = body;
      await updatePluginConfig(pluginId, { settings });
      const plugins = await getAllPlugins();
      return NextResponse.json({ ok: true, message: "Settings saved successfully", plugins });
    }

    if (action === "create") {
      const { pluginData } = body;
      const created = await createCustomPlugin(pluginData);
      const plugins = await getAllPlugins();
      return NextResponse.json({ ok: true, message: "Custom plugin created successfully", plugin: created, plugins });
    }

    if (action === "delete") {
      const { pluginId } = body;
      await deleteCustomPlugin(pluginId);
      const plugins = await getAllPlugins();
      return NextResponse.json({ ok: true, message: "Custom plugin deleted", plugins });
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
      return NextResponse.json({ ok: true, message: "Test hook dispatched", result, logs });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Operation failed" },
      { status: 500 }
    );
  }
}
