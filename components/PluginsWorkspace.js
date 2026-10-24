"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  Layers,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Terminal,
  Trash2,
  Webhook,
  X,
  AlertCircle,
  Clock,
  Bell,
  Play,
  FileCode,
  Zap,
} from "lucide-react";

const ICON_MAP = {
  MessageSquare: MessageSquare,
  Webhook: Webhook,
  Clock: Clock,
  Sparkles: Sparkles,
  Bell: Bell,
  Package: Package,
  Settings: Settings,
  Zap: Zap,
};

export default function PluginsWorkspace({ currentAdminUser }) {
  const [plugins, setPlugins] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDrawerPlugin, setActiveDrawerPlugin] = useState(null);
  const [drawerSettings, setDrawerSettings] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [testingHook, setTestingHook] = useState(null);
  const [testSuccessMessage, setTestSuccessMessage] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPluginData, setNewPluginData] = useState({
    name: "",
    id: "",
    category: "Automation",
    description: "",
    type: "backend_hook",
    webhookUrl: "",
    storefrontHtml: "",
    hooks: ["onOrderCreated"],
  });

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plugins");
      if (res.ok) {
        const data = await res.json();
        setPlugins(data.plugins || []);
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  const handleToggle = async (pluginId, targetState) => {
    if (togglingId) return;
    setTogglingId(pluginId);

    const targetPlugin = plugins.find((p) => p.id === pluginId);
    const nextState =
      typeof targetState === "boolean"
        ? targetState
        : targetPlugin
        ? !targetPlugin.enabled
        : true;

    // Optimistic UI update across plugins array
    setPlugins((prev) =>
      prev.map((p) => (p.id === pluginId ? { ...p, enabled: nextState } : p))
    );

    // If configuration drawer is open for this plugin, update drawer state too
    if (activeDrawerPlugin && activeDrawerPlugin.id === pluginId) {
      setActiveDrawerPlugin((prev) => ({ ...prev, enabled: nextState }));
    }

    try {
      const res = await fetch("/api/admin/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", pluginId, enabled: nextState }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.plugins) {
          setPlugins(data.plugins);
          // Sync drawer state if open
          if (activeDrawerPlugin && activeDrawerPlugin.id === pluginId) {
            const updatedPlugin = data.plugins.find((p) => p.id === pluginId);
            if (updatedPlugin) {
              setActiveDrawerPlugin(updatedPlugin);
            }
          }
        }
        try {
          localStorage.setItem("bs:plugins:updated", String(Date.now()));
          window.dispatchEvent(new CustomEvent("bs:plugins:changed"));
        } catch {}
      } else {
        await loadPlugins();
      }
    } catch {
      await loadPlugins();
    } finally {
      setTogglingId(null);
    }
  };

  const openDrawer = (plugin) => {
    setActiveDrawerPlugin(plugin);
    setDrawerSettings({ ...(plugin.settings || {}) });
  };

  const closeDrawer = () => {
    setActiveDrawerPlugin(null);
    setDrawerSettings({});
  };

  const handleSaveSettings = async () => {
    if (!activeDrawerPlugin) return;
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateSettings",
          pluginId: activeDrawerPlugin.id,
          enabled: activeDrawerPlugin.enabled,
          settings: drawerSettings,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.plugins) setPlugins(data.plugins);
        closeDrawer();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestHook = async (plugin) => {
    setTestingHook(plugin.id);
    setTestSuccessMessage(null);
    try {
      const res = await fetch("/api/admin/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "testHook",
          hookName: plugin.hooks?.[0] || "onOrderCreated",
          payload: {
            orderId: "BST-TEST-1049",
            customer: "Ayesha Khan",
            city: "Lahore",
            total: 8950,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestSuccessMessage({
          pluginId: plugin.id,
          message: `✓ Test event dispatched successfully!`,
        });
        if (data.logs) setLogs(data.logs);
      }
    } catch (e) {
      setTestSuccessMessage({
        pluginId: plugin.id,
        isError: true,
        message: `Failed: ${e.message}`,
      });
    } finally {
      setTestingHook(null);
    }
  };

  const handleCreateCustomPlugin = async (e) => {
    e.preventDefault();
    if (!newPluginData.name) return;

    try {
      const res = await fetch("/api/admin/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          pluginData: {
            ...newPluginData,
            id: newPluginData.id || newPluginData.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.plugins) setPlugins(data.plugins);
        setIsCreateModalOpen(false);
        setNewPluginData({
          name: "",
          id: "",
          category: "Automation",
          description: "",
          type: "backend_hook",
          webhookUrl: "",
          storefrontHtml: "",
          hooks: ["onOrderCreated"],
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCustomPlugin = async (pluginId) => {
    if (!confirm("Are you sure you want to remove this custom plugin?")) return;
    try {
      const res = await fetch("/api/admin/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", pluginId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.plugins) setPlugins(data.plugins);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered plugins
  const filteredPlugins = useMemo(() => {
    return plugins.filter((p) => {
      const matchesCat =
        selectedCategory === "all" ||
        (selectedCategory === "custom" && p.isCustom) ||
        p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesQuery =
        !searchQuery ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [plugins, selectedCategory, searchQuery]);

  // Counts
  const activeCount = plugins.filter((p) => p.enabled).length;
  const categoriesList = ["all", "Marketing", "Automation", "Sales & Conversion", "Customer Support", "Orders & Shipping", "custom"];

  return (
    <div className="pluginsWorkspace">
      {/* 1. Workspace Header */}
      <header className="pluginsWorkspaceHeader">
        <div className="pluginsWorkspaceHeaderLeft">
          <div className="pluginsWorkspaceBadge">
            <Sparkles size={13} />
            <span>Shopify-Standard App &amp; Extension Engine</span>
          </div>
          <h1>Apps &amp; Plugins</h1>
          <p>
            Add, configure, and build automated plugins that extend your storefront, dispatch webhooks, and trigger background events.
          </p>
        </div>

        <div className="pluginsWorkspaceHeaderActions">
          <button
            type="button"
            className="pluginsWorkspaceSecondaryBtn"
            onClick={loadPlugins}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spinIcon" : ""} />
            <span>Sync Apps</span>
          </button>
          <button
            type="button"
            className="pluginsWorkspacePrimaryBtn"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={15} />
            <span>Build Custom Plugin</span>
          </button>
        </div>
      </header>

      {/* 2. Quick Metrics Strip */}
      <section className="pluginsWorkspaceMetrics">
        <div className="pluginsWorkspaceMetricCard">
          <span>Installed Apps</span>
          <strong>{plugins.length}</strong>
          <small>Modular extensions</small>
        </div>
        <div className="pluginsWorkspaceMetricCard">
          <span>Active &amp; Running</span>
          <strong style={{ color: "#166534" }}>{activeCount}</strong>
          <small>Executing on storefront &amp; orders</small>
        </div>
        <div className="pluginsWorkspaceMetricCard">
          <span>Inactive / Paused</span>
          <strong style={{ color: "#6b7280" }}>{plugins.length - activeCount}</strong>
          <small>Can be enabled in 1-click</small>
        </div>
        <div className="pluginsWorkspaceMetricCard">
          <span>Recent Executions</span>
          <strong>{logs.length}</strong>
          <small>Logged in audit history</small>
        </div>
      </section>

      {/* 3. Search & Category Filters */}
      <section className="pluginsWorkspaceToolbar">
        <div className="pluginsWorkspaceTabs" role="tablist">
          {categoriesList.map((cat) => {
            const label = cat === "all" ? "All Apps" : cat === "custom" ? "Custom Apps" : cat;
            return (
              <button
                key={cat}
                type="button"
                className={`pluginsWorkspaceTab ${selectedCategory === cat ? "isActive" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="pluginsWorkspaceSearchWrap">
          <Search size={14} color="#8a9c90" />
          <input
            type="text"
            placeholder="Search installed apps or webhooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* 4. Plugin Cards Grid */}
      <section className="pluginsWorkspaceGrid">
        {filteredPlugins.map((plugin) => {
          const IconComponent = ICON_MAP[plugin.icon] || Boxes;
          return (
            <article
              key={plugin.id}
              className={`pluginCard ${plugin.enabled ? "isEnabled" : "isPaused"}`}
            >
              <div className="pluginCardHead">
                <div className="pluginCardIconWrap">
                  <IconComponent size={22} />
                </div>
                <div className="pluginCardInfo">
                  <div className="pluginCardTitleRow">
                    <h3>{plugin.name}</h3>
                    {plugin.isCustom && <span className="pluginCustomTag">Custom</span>}
                  </div>
                  <div className="pluginCardMeta">
                    <span className="pluginVersion">v{plugin.version}</span>
                    <span className="pluginCategory">{plugin.category}</span>
                  </div>
                </div>

                {/* Shopify-Style Toggle Switch (Button role=switch prevents double-events & touch bounce) */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(plugin.enabled)}
                  disabled={togglingId === plugin.id}
                  className={`pluginSwitch ${plugin.enabled ? "isOn" : "isOff"}`}
                  title={plugin.enabled ? "Click to Pause App" : "Click to Enable App"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(plugin.id, !plugin.enabled);
                  }}
                >
                  <span className="pluginSlider" />
                </button>
              </div>

              <p className="pluginCardDesc">{plugin.description}</p>

              {/* Tags / Capabilities */}
              <div className="pluginCardTags">
                {plugin.type === "storefront_widget" && (
                  <span className="pluginCapabilityTag widget">Storefront Widget</span>
                )}
                {plugin.hooks?.map((h) => (
                  <span key={h} className="pluginCapabilityTag hook">
                    Hook: {h}
                  </span>
                ))}
                {plugin.webhookUrl && (
                  <span className="pluginCapabilityTag webhook">Outgoing Webhook</span>
                )}
              </div>

              {/* Test Message Feedback */}
              {testSuccessMessage && testSuccessMessage.pluginId === plugin.id && (
                <div
                  className={`pluginTestFeedback ${testSuccessMessage.isError ? "error" : "success"}`}
                >
                  {testSuccessMessage.message}
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="pluginCardFoot">
                <button
                  type="button"
                  disabled={togglingId === plugin.id}
                  className={`pluginCardStatusBtn ${plugin.enabled ? "active" : "paused"}`}
                  onClick={() => handleToggle(plugin.id, !plugin.enabled)}
                  title={plugin.enabled ? "Click to Pause App" : "Click to Activate App"}
                >
                  <span className={`pluginDot ${plugin.enabled ? "active" : "paused"}`} />
                  <span className="pluginStatusLabel">
                    {togglingId === plugin.id ? "Updating..." : (plugin.enabled ? "Active & Running" : "Paused")}
                  </span>
                  <span className="pluginStatusActionText">
                    {togglingId === plugin.id ? "" : `· ${plugin.enabled ? "Turn Off" : "Turn On"}`}
                  </span>
                </button>

                <div className="pluginCardButtons">
                  {/* Test Button for Hook/Webhook Plugins */}
                  {plugin.hooks && plugin.hooks.length > 0 && (
                    <button
                      type="button"
                      className="pluginTestBtn"
                      onClick={() => handleTestHook(plugin)}
                      disabled={testingHook === plugin.id}
                      title="Dispatch a test payload"
                    >
                      <Play size={11} />
                      <span>{testingHook === plugin.id ? "Sending..." : "Test"}</span>
                    </button>
                  )}

                  {/* Settings Button */}
                  {plugin.settingsSchema && plugin.settingsSchema.length > 0 && (
                    <button
                      type="button"
                      className="pluginConfigBtn"
                      onClick={() => openDrawer(plugin)}
                    >
                      <Settings size={13} />
                      <span>Configure</span>
                    </button>
                  )}

                  {/* Delete Button for Custom Plugins */}
                  {plugin.isCustom && (
                    <button
                      type="button"
                      className="pluginDeleteBtn"
                      onClick={() => handleDeleteCustomPlugin(plugin.id)}
                      title="Remove custom plugin"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {!filteredPlugins.length && (
          <div className="pluginsEmptyState">
            <Boxes size={36} color="#8aa08f" />
            <h3>No plugins found</h3>
            <p>Try searching for a different keyword or create your own custom plugin.</p>
            <button
              type="button"
              className="pluginsWorkspacePrimaryBtn"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Build Custom Plugin
            </button>
          </div>
        )}
      </section>

      {/* 5. Telemetry & Execution Log Console */}
      <section className="pluginsWorkspaceLogsCard">
        <div className="pluginsWorkspaceLogsHead">
          <div>
            <h3>Plugin Activity &amp; Dispatch Telemetry</h3>
            <p>Real-time log of automated webhooks, notifications, and lifecycle hooks.</p>
          </div>
          <span className="pluginsLogsCount">{logs.length} Events Logged</span>
        </div>

        <div className="pluginsWorkspaceLogsList">
          {logs.length ? (
            logs.map((log) => (
              <div key={log.id} className="pluginsLogItem">
                <span className={`pluginsLogBadge ${log.status}`}>
                  {log.status === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  <span>{log.status.toUpperCase()}</span>
                </span>
                <span className="pluginsLogHook">{log.hook}</span>
                <span className="pluginsLogMsg">{log.message}</span>
                <span className="pluginsLogTime">
                  {new Date(log.timestamp).toLocaleTimeString("en-PK", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            ))
          ) : (
            <p className="pluginsLogsEmpty">No plugin lifecycle events logged yet.</p>
          )}
        </div>
      </section>

      {/* 6. Settings Configuration Slide-Over Drawer */}
      {activeDrawerPlugin && (
        <div className="pluginDrawerOverlay" role="presentation" onClick={closeDrawer}>
          <aside
            className="pluginDrawer"
            role="dialog"
            aria-modal="true"
            aria-label="App Settings"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pluginDrawerHead">
              <div>
                <span className="pluginDrawerEyebrow">App Configuration</span>
                <h2>{activeDrawerPlugin.name}</h2>
                <p>by {activeDrawerPlugin.author} · v{activeDrawerPlugin.version}</p>
              </div>
              <button
                type="button"
                className="pluginDrawerCloseBtn"
                onClick={closeDrawer}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* App Status Banner inside Drawer */}
            <div className={`pluginDrawerStatusBar ${activeDrawerPlugin.enabled ? "statusActive" : "statusPaused"}`}>
              <div className="pluginDrawerStatusInfo">
                <span className={`pluginDot ${activeDrawerPlugin.enabled ? "active" : "paused"}`} />
                <div>
                  <strong>Status: {activeDrawerPlugin.enabled ? "Active & Running" : "Paused / Disabled"}</strong>
                  <p>{activeDrawerPlugin.enabled ? "Currently active and running on your store." : "Currently paused and disabled."}</p>
                </div>
              </div>
              <button
                type="button"
                className={`pluginDrawerToggleBtn ${activeDrawerPlugin.enabled ? "isDestructive" : "isSuccess"}`}
                disabled={togglingId === activeDrawerPlugin.id}
                onClick={() => handleToggle(activeDrawerPlugin.id, !activeDrawerPlugin.enabled)}
              >
                {togglingId === activeDrawerPlugin.id
                  ? "Updating..."
                  : activeDrawerPlugin.enabled
                  ? "Pause App"
                  : "Activate App"}
              </button>
            </div>

            <div className="pluginDrawerBody">
              <p className="pluginDrawerDescription">{activeDrawerPlugin.description}</p>

              <div className="pluginFormFields">
                {activeDrawerPlugin.settingsSchema?.map((field) => {
                  const currentValue =
                    drawerSettings[field.key] !== undefined
                      ? drawerSettings[field.key]
                      : field.default;

                  return (
                    <div key={field.key} className="pluginFormField">
                      <label htmlFor={field.key}>{field.label}</label>

                      {/* Text Input */}
                      {field.type === "text" && (
                        <input
                          id={field.key}
                          type="text"
                          value={currentValue || ""}
                          placeholder={field.placeholder || ""}
                          onChange={(e) =>
                            setDrawerSettings((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        />
                      )}

                      {/* Number Input */}
                      {field.type === "number" && (
                        <input
                          id={field.key}
                          type="number"
                          value={currentValue ?? 0}
                          onChange={(e) =>
                            setDrawerSettings((prev) => ({
                              ...prev,
                              [field.key]: Number(e.target.value),
                            }))
                          }
                        />
                      )}

                      {/* Textarea */}
                      {field.type === "textarea" && (
                        <textarea
                          id={field.key}
                          rows={3}
                          value={currentValue || ""}
                          placeholder={field.placeholder || ""}
                          onChange={(e) =>
                            setDrawerSettings((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        />
                      )}

                      {/* Select Dropdown */}
                      {field.type === "select" && (
                        <select
                          id={field.key}
                          value={currentValue}
                          onChange={(e) =>
                            setDrawerSettings((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        >
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Color Picker */}
                      {field.type === "color" && (
                        <div className="pluginColorPickerRow">
                          <input
                            type="color"
                            value={currentValue || "#173d29"}
                            onChange={(e) =>
                              setDrawerSettings((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                          />
                          <span>{currentValue}</span>
                        </div>
                      )}

                      {/* Boolean Switch */}
                      {field.type === "boolean" && (
                        <label className="pluginBooleanToggle">
                          <input
                            type="checkbox"
                            checked={Boolean(currentValue)}
                            onChange={(e) =>
                              setDrawerSettings((prev) => ({
                                ...prev,
                                [field.key]: e.target.checked,
                              }))
                            }
                          />
                          <span>Enabled</span>
                        </label>
                      )}

                      {field.help && <small className="pluginFieldHelp">{field.help}</small>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pluginDrawerFoot">
              <button
                type="button"
                className={`pluginDrawerPauseActionBtn ${activeDrawerPlugin.enabled ? "btnPause" : "btnActivate"}`}
                disabled={togglingId === activeDrawerPlugin.id}
                onClick={() => handleToggle(activeDrawerPlugin.id, !activeDrawerPlugin.enabled)}
              >
                {togglingId === activeDrawerPlugin.id
                  ? "Updating..."
                  : activeDrawerPlugin.enabled
                  ? "Pause / Disable App"
                  : "Activate App"}
              </button>
              <button
                type="button"
                className="pluginDrawerCancelBtn"
                onClick={closeDrawer}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pluginDrawerSaveBtn"
                onClick={handleSaveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* 7. Create Custom Plugin Modal */}
      {isCreateModalOpen && (
        <div className="pluginModalOverlay" role="presentation" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="pluginModal"
            role="dialog"
            aria-modal="true"
            aria-label="Build Custom Plugin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pluginModalHead">
              <div>
                <h2>Build Custom Plugin</h2>
                <p>Create a custom automated webhook or storefront script extension.</p>
              </div>
              <button
                type="button"
                className="pluginDrawerCloseBtn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomPlugin} className="pluginModalBody">
              <div className="pluginFormField">
                <label>Plugin / App Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discord Order Notifier"
                  value={newPluginData.name}
                  onChange={(e) =>
                    setNewPluginData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="pluginFormRow2">
                <div className="pluginFormField">
                  <label>Plugin Category</label>
                  <select
                    value={newPluginData.category}
                    onChange={(e) =>
                      setNewPluginData((prev) => ({ ...prev, category: e.target.value }))
                    }
                  >
                    <option value="Automation">Automation</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Orders & Shipping">Orders &amp; Shipping</option>
                    <option value="Sales & Conversion">Sales &amp; Conversion</option>
                  </select>
                </div>

                <div className="pluginFormField">
                  <label>Plugin Type</label>
                  <select
                    value={newPluginData.type}
                    onChange={(e) =>
                      setNewPluginData((prev) => ({ ...prev, type: e.target.value }))
                    }
                  >
                    <option value="backend_hook">Backend Webhook / Automation</option>
                    <option value="storefront_widget">Storefront Widget / Snippet</option>
                  </select>
                </div>
              </div>

              <div className="pluginFormField">
                <label>Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe what this plugin does..."
                  value={newPluginData.description}
                  onChange={(e) =>
                    setNewPluginData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              {newPluginData.type === "backend_hook" ? (
                <>
                  <div className="pluginFormField">
                    <label>Webhook URL (HTTP POST Endpoint) *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                      value={newPluginData.webhookUrl}
                      onChange={(e) =>
                        setNewPluginData((prev) => ({ ...prev, webhookUrl: e.target.value }))
                      }
                    />
                    <small className="pluginFieldHelp">
                      Whenever an order event triggers, Bustaniya will automatically POST the full order payload here.
                    </small>
                  </div>

                  <div className="pluginFormField">
                    <label>Trigger Lifecycle Events</label>
                    <div className="pluginCheckboxGroup">
                      {["onOrderCreated", "onOrderDelivered", "onOrderCancelled"].map((h) => (
                        <label key={h} className="pluginCheckboxLabel">
                          <input
                            type="checkbox"
                            checked={newPluginData.hooks.includes(h)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setNewPluginData((prev) => ({
                                ...prev,
                                hooks: checked
                                  ? [...prev.hooks, h]
                                  : prev.hooks.filter((item) => item !== h),
                              }));
                            }}
                          />
                          <span>{h}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="pluginFormField">
                  <label>Custom Storefront HTML / Script</label>
                  <textarea
                    rows={4}
                    placeholder="<div>Custom storefront badge or widget...</div>"
                    value={newPluginData.storefrontHtml}
                    onChange={(e) =>
                      setNewPluginData((prev) => ({ ...prev, storefrontHtml: e.target.value }))
                    }
                  />
                </div>
              )}

              <div className="pluginModalFoot">
                <button
                  type="button"
                  className="pluginDrawerCancelBtn"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="pluginDrawerSaveBtn">
                  Install &amp; Activate Plugin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
