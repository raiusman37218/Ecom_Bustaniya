import fs from "fs";
import path from "path";
import { BUILTIN_PLUGINS } from "./builtin.js";
import { supabaseAdminRequest } from "../supabaseRest.js";

const REGISTRY_FILE = path.join(process.cwd(), "data", "plugins-registry.json");
const CUSTOM_PLUGINS_DIR = path.join(process.cwd(), "data", "plugins");

let memoryRegistry = null;

// Ensure data/plugins exists
function ensureDirectories() {
  try {
    if (!fs.existsSync(CUSTOM_PLUGINS_DIR)) {
      fs.mkdirSync(CUSTOM_PLUGINS_DIR, { recursive: true });
    }
  } catch {}
}

// Read the registry (Memory -> Supabase Cloud -> Local File)
async function readRegistry() {
  ensureDirectories();

  if (memoryRegistry && memoryRegistry.states && Object.keys(memoryRegistry.states).length > 0) {
    return memoryRegistry;
  }

  // 1. Try Supabase first (cloud persistence for production / serverless / all devices)
  try {
    const rows = await supabaseAdminRequest("store_settings?select=announcements&id=eq.1&limit=1").catch(() => null);
    const remote = rows?.[0]?.announcements?.pluginsRegistry;
    if (remote && typeof remote === "object" && remote.states && Object.keys(remote.states).length > 0) {
      memoryRegistry = {
        states: remote.states || {},
        settings: remote.settings || {},
        logs: remote.logs || [],
      };
      // Mirror to local disk if writable
      try {
        fs.writeFileSync(REGISTRY_FILE, JSON.stringify(memoryRegistry, null, 2), "utf8");
      } catch {}
      return memoryRegistry;
    }
  } catch (e) {
    // Supabase unavailable or offline
  }

  // 2. Fallback to local disk file
  try {
    if (fs.existsSync(REGISTRY_FILE)) {
      const content = fs.readFileSync(REGISTRY_FILE, "utf8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        memoryRegistry = {
          states: parsed.states || {},
          settings: parsed.settings || {},
          logs: parsed.logs || [],
        };
        return memoryRegistry;
      }
    }
  } catch (e) {
    console.error("Error reading plugins registry from disk:", e);
  }

  if (memoryRegistry) return memoryRegistry;

  memoryRegistry = {
    states: {}, // { [pluginId]: boolean }
    settings: {}, // { [pluginId]: object }
    logs: [], // [ { timestamp, pluginId, hook, status, message } ]
  };
  return memoryRegistry;
}

// Write the registry (Memory + Local File + Supabase Cloud)
async function writeRegistry(data) {
  ensureDirectories();
  memoryRegistry = {
    states: { ...(data.states || {}) },
    settings: { ...(data.settings || {}) },
    logs: Array.isArray(data.logs) ? [...data.logs] : [],
  };

  // 1. Write to local disk
  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(memoryRegistry, null, 2), "utf8");
  } catch (e) {
    // Read-only filesystem
  }

  // 2. Sync to Supabase PostgreSQL (Cloud Database)
  try {
    const rows = await supabaseAdminRequest("store_settings?select=announcements&id=eq.1&limit=1").catch(() => null);
    const currentAnnouncements = rows?.[0]?.announcements || {};
    await supabaseAdminRequest("store_settings?id=eq.1", {
      method: "PATCH",
      prefer: "return=representation",
      body: {
        announcements: {
          ...currentAnnouncements,
          pluginsRegistry: {
            states: memoryRegistry.states,
            settings: memoryRegistry.settings,
            logs: (memoryRegistry.logs || []).slice(0, 50),
          },
        },
      },
    });
  } catch (err) {
    console.error("Error saving plugins registry to Supabase:", err?.message || err);
  }
}

// Read any custom user-created plugins from data/plugins/*.json
function readCustomPlugins() {
  ensureDirectories();
  const custom = [];
  try {
    const files = fs.readdirSync(CUSTOM_PLUGINS_DIR);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const fullPath = path.join(CUSTOM_PLUGINS_DIR, file);
        const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
        if (parsed?.id) {
          custom.push({ ...parsed, isCustom: true });
        }
      }
    }
  } catch {}
  return custom;
}

/**
 * Get all installed plugins with merged enabled state & settings.
 */
export async function getAllPlugins() {
  const registry = await readRegistry();
  const customPlugins = readCustomPlugins();
  const all = [...BUILTIN_PLUGINS, ...customPlugins];

  return all.map((plugin) => {
    const isExplicitlyDisabled = registry.states[plugin.id] === false;
    const isExplicitlyEnabled = registry.states[plugin.id] === true;
    const isEnabled = isExplicitlyEnabled || (!isExplicitlyDisabled && plugin.enabled);

    const customSettings = registry.settings[plugin.id] || {};
    const effectiveSettings = {
      ...(plugin.defaultSettings || {}),
      ...customSettings,
    };

    return {
      ...plugin,
      enabled: isEnabled,
      settings: effectiveSettings,
    };
  });
}

/**
 * Update plugin settings or enabled toggle.
 */
export async function updatePluginConfig(pluginId, { enabled, settings }) {
  const registry = await readRegistry();
  if (!registry.states) registry.states = {};
  if (!registry.settings) registry.settings = {};

  if (typeof enabled !== "undefined" && enabled !== null) {
    const isBool = typeof enabled === "boolean" ? enabled : (String(enabled) === "true" || enabled === 1 || enabled === "1");
    registry.states[pluginId] = isBool;
  }

  if (settings && typeof settings === "object") {
    registry.settings[pluginId] = {
      ...(registry.settings[pluginId] || {}),
      ...settings,
    };
  }

  await writeRegistry(registry);

  // Also sync custom plugin file on disk if it exists
  try {
    const customFilePath = path.join(CUSTOM_PLUGINS_DIR, `${pluginId}.json`);
    if (fs.existsSync(customFilePath)) {
      const customContent = JSON.parse(fs.readFileSync(customFilePath, "utf8"));
      if (typeof enabled !== "undefined" && enabled !== null) {
        customContent.enabled = registry.states[pluginId];
      }
      if (settings && typeof settings === "object") {
        customContent.defaultSettings = {
          ...(customContent.defaultSettings || {}),
          ...settings,
        };
      }
      fs.writeFileSync(customFilePath, JSON.stringify(customContent, null, 2), "utf8");
    }
  } catch (err) {
    console.error("Error syncing custom plugin file:", err);
  }

  return { success: true, enabled: registry.states[pluginId] };
}

/**
 * Create a new custom user plugin.
 */
export async function createCustomPlugin(pluginData) {
  ensureDirectories();
  const id = String(pluginData.id || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/^-+|-+$/g, "") || `custom-app-${Date.now()}`;

  const plugin = {
    id,
    name: pluginData.name || "Custom App Plugin",
    version: pluginData.version || "1.0.0",
    author: pluginData.author || "Custom Developer",
    category: pluginData.category || "Custom",
    icon: pluginData.icon || "Sparkles",
    description: pluginData.description || "Custom user-defined storefront and automation plugin.",
    enabled: pluginData.enabled !== false,
    type: pluginData.type || "backend_hook",
    hooks: Array.isArray(pluginData.hooks) ? pluginData.hooks : ["onOrderCreated"],
    webhookUrl: pluginData.webhookUrl || "",
    storefrontHtml: pluginData.storefrontHtml || "",
    settingsSchema: Array.isArray(pluginData.settingsSchema) ? pluginData.settingsSchema : [],
    defaultSettings: pluginData.defaultSettings || {},
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  // Save plugin definition file
  const filePath = path.join(CUSTOM_PLUGINS_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(plugin, null, 2), "utf8");

  // Save in registry
  const registry = await readRegistry();
  registry.states[id] = plugin.enabled;
  registry.settings[id] = plugin.defaultSettings;
  await writeRegistry(registry);

  return plugin;
}

/**
 * Delete a custom user plugin.
 */
export async function deleteCustomPlugin(pluginId) {
  ensureDirectories();
  const filePath = path.join(CUSTOM_PLUGINS_DIR, `${pluginId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  const registry = await readRegistry();
  delete registry.states[pluginId];
  delete registry.settings[pluginId];
  await writeRegistry(registry);
  return { success: true };
}

/**
 * Log hook execution in the telemetry ledger.
 */
async function logExecution(pluginId, hook, status, message) {
  const registry = await readRegistry();
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    pluginId,
    hook,
    status, // "success" | "failed" | "skipped"
    message,
  };

  registry.logs = [entry, ...(registry.logs || [])].slice(0, 50);
  await writeRegistry(registry);
}

/**
 * Read recent execution logs.
 */
export async function getPluginLogs() {
  const registry = await readRegistry();
  return registry.logs || [];
}

/**
 * Trigger an event hook across all active plugins.
 * Modeled after Shopify Webhooks & Lifecycle Apps.
 */
export async function triggerPluginHook(hookName, payload = {}) {
  const plugins = await getAllPlugins();
  const activePlugins = plugins.filter((p) => p.enabled);
  const results = [];

  for (const plugin of activePlugins) {
    const declaredHooks = plugin.hooks || [];
    if (!declaredHooks.includes(hookName) && plugin.id !== "order-webhook-dispatcher") {
      continue;
    }

    try {
      // 1. Built-in: Automated Webhook Dispatcher
      if (plugin.id === "order-webhook-dispatcher") {
        const url = plugin.settings?.webhookUrl;
        const shouldSend =
          (hookName === "onOrderCreated" && plugin.settings?.notifyOnOrderCreated !== false) ||
          (hookName === "onOrderDelivered" && plugin.settings?.notifyOnOrderDelivered !== false) ||
          hookName === "testEvent";

        if (url && shouldSend) {
          const bodyPayload = {
            event: hookName,
            source: "Bustaniya App Engine",
            timestamp: new Date().toISOString(),
            data: plugin.settings?.includeCustomerDetails ? payload : { orderId: payload.orderId, total: payload.total },
          };

          const headers = { "Content-Type": "application/json" };
          if (plugin.settings?.secretHeader) {
            headers["Authorization"] = plugin.settings.secretHeader;
          }

          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(bodyPayload),
          });

          if (response.ok) {
            logExecution(plugin.id, hookName, "success", `Webhook delivered to ${url} (HTTP ${response.status})`);
            results.push({ pluginId: plugin.id, success: true, status: response.status });
          } else {
            logExecution(plugin.id, hookName, "failed", `Webhook error from ${url}: HTTP ${response.status}`);
            results.push({ pluginId: plugin.id, success: false, status: response.status });
          }
        }
      }

      // 2. Custom Webhook Plugin
      else if (plugin.webhookUrl && declaredHooks.includes(hookName)) {
        const response = await fetch(plugin.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: hookName, data: payload, pluginId: plugin.id, timestamp: new Date().toISOString() }),
        });
        const status = response.ok ? "success" : "failed";
        logExecution(plugin.id, hookName, status, `Dispatched to ${plugin.webhookUrl} (HTTP ${response.status})`);
        results.push({ pluginId: plugin.id, success: response.ok });
      }

      // 3. Built-in: Order SMS / WhatsApp Notifier
      else if (plugin.id === "order-sms-notifier" && hookName === "onOrderCreated") {
        logExecution(
          plugin.id,
          hookName,
          "success",
          `Generated dispatch notification template for Order #${payload.orderId || payload.id}`
        );
        results.push({ pluginId: plugin.id, success: true });
      }
    } catch (err) {
      logExecution(plugin.id, hookName, "failed", err.message || "Failed to execute hook");
      results.push({ pluginId: plugin.id, success: false, error: err.message });
    }
  }

  return { executed: results.length, results };
}

/**
 * Get active storefront widgets for front-end injection.
 */
export async function getActiveStorefrontWidgets() {
  const plugins = await getAllPlugins();
  return plugins
    .filter((p) => p.enabled && (p.type === "storefront_widget" || p.storefrontHtml))
    .map((p) => ({
      id: p.id,
      name: p.name,
      settings: p.settings,
      storefrontHtml: p.storefrontHtml || null,
    }));
}
