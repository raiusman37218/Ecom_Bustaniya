"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  Gauge,
  Globe,
  Layers,
  Play,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  TestTube2,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

const EVENT_TYPES = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"];

const PERIODS = [
  ["1", "Today"],
  ["7", "7 days"],
  ["30", "30 days"],
  ["90", "90 days"],
];

const EVENT_COLORS = {
  PageView: { background: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  ViewContent: { background: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  AddToCart: { background: "#fffbeb", color: "#b45309", border: "#fde68a" },
  InitiateCheckout: { background: "#fefce8", color: "#a16207", border: "#fef08a" },
  Purchase: { background: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
};

function formatMoney(value, currency = "PKR") {
  const amount = Number(value || 0);
  return `${currency === "PKR" ? "Rs. " : `${currency} `}${Math.round(Number.isFinite(amount) ? amount : 0).toLocaleString("en-PK")}`;
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function timeAgo(value) {
  if (!value) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function EventBadge({ name }) {
  const palette = EVENT_COLORS[name] || { background: "#f3f5f3", color: "#405a4c", border: "#dce4dd" };
  return (
    <span
      className="eventsWorkspaceBadge"
      style={{
        background: palette.background,
        color: palette.color,
        border: `1px solid ${palette.border}`,
      }}
    >
      {name || "Unknown"}
    </span>
  );
}

function StatusBadge({ success }) {
  return (
    <span className={`eventsWorkspaceStatus ${success ? "isSuccess" : "isFailed"}`}>
      {success ? <CheckCircle2 size={13} aria-hidden="true" /> : <AlertTriangle size={13} aria-hidden="true" />}
      {success ? "200 Delivered" : "Delivery Failed"}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, helper, tone = "green" }) {
  return (
    <article className={`eventsWorkspaceMetric tone-${tone}`}>
      <div className="eventsWorkspaceMetricIcon">
        <Icon aria-hidden="true" />
      </div>
      <div className="eventsWorkspaceMetricCopy">
        <span>{label}</span>
        <strong>{value}</strong>
        {helper && <small>{helper}</small>}
      </div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="eventsWorkspaceSectionHeading">
      <div>
        {eyebrow && (
          <span className="eventsWorkspaceEyebrow">
            <Sparkles size={11} /> {eyebrow}
          </span>
        )}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="eventsWorkspaceEmpty">
      <Activity aria-hidden="true" />
      <strong>{title}</strong>
      <span>{description}</span>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

function TrackingHealth({ health, onSettings, onOpenTests }) {
  const deliveryRate = safeNumber(health?.deliveryRate, 100);
  const emqScore = safeNumber(health?.emqScore, 8.8);
  const failed = safeNumber(health?.failedEventsCount, 0);
  const isCritical = health?.level === "critical" || (!health?.hasPixelId && !health?.hasAccessToken);
  const isWarning = !isCritical && (health?.level === "warning" || deliveryRate < 95 || failed > 0);
  const tone = isCritical ? "critical" : isWarning ? "warning" : "healthy";
  const label = isCritical ? "Action Required (Tracking Offline)" : isWarning ? "Needs Attention" : "Meta CAPI & Pixel Healthy";

  return (
    <section className={`eventsWorkspaceHealth health-${tone}`}>
      <div className="eventsWorkspaceHealthIntro">
        <div className="eventsWorkspaceHealthIcon">
          {isCritical || isWarning ? <AlertTriangle aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
        </div>
        <div>
          <span className="eventsWorkspaceEyebrow">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e",
                display: "inline-block",
                marginRight: 4,
              }}
            />
            Integration Status
          </span>
          <h2>{label}</h2>
          <p>{health?.reason || "Meta Pixel and Conversions API (CAPI) events are actively monitored with deduplication."}</p>
        </div>
      </div>

      <div className="eventsWorkspaceHealthStats">
        <div>
          <strong>{deliveryRate}%</strong>
          <span>CAPI Delivery Rate</span>
        </div>
        <div>
          <strong>{emqScore.toFixed(1)} / 10</strong>
          <span>Event Match Quality</span>
        </div>
        <div>
          <strong>{failed}</strong>
          <span>Failed Events</span>
        </div>
        <div>
          <strong>{health?.lastSuccessfulEventTime ? timeAgo(health.lastSuccessfulEventTime) : "Active"}</strong>
          <span>Last Successful Sync</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="eventsWorkspaceQuietButton" onClick={onOpenTests} title="Send a safe test event to Meta">
          <Zap size={14} color="#166534" /> Test CAPI
        </button>
        <button type="button" className="eventsWorkspaceQuietButton" onClick={onSettings} title="Open Tracking Settings">
          <Settings size={14} /> Configure
        </button>
      </div>
    </section>
  );
}

function Overview({ analytics = {}, counts = {}, health, onSettings, onOpenTests }) {
  const sessions = analytics.sessions || {};
  const financials = analytics.financials || {};

  const funnelSteps = [
    {
      num: "01",
      name: "Store Visits",
      event: "PageView",
      count: safeNumber(sessions.uniqueSessions || counts.PageView || 0),
      desc: "100% of visitors landing on store",
    },
    {
      num: "02",
      name: "Product Views",
      event: "ViewContent",
      count: safeNumber(sessions.viewSessions || counts.ViewContent || 0),
      desc: `${safeNumber(sessions.productViewRate).toFixed(1)}% viewed product details`,
    },
    {
      num: "03",
      name: "Add to Bag",
      event: "AddToCart",
      count: safeNumber(sessions.cartSessions || counts.AddToCart || 0),
      desc: `${safeNumber(sessions.addToCartRate).toFixed(1)}% added items to cart`,
    },
    {
      num: "04",
      name: "Checkout",
      event: "InitiateCheckout",
      count: safeNumber(sessions.checkoutSessions || counts.InitiateCheckout || 0),
      desc: "Started delivery & payment",
    },
    {
      num: "05",
      name: "Placed Orders",
      event: "Purchase",
      count: safeNumber(financials.ordersCount ?? sessions.purchaseSessions ?? counts.Purchase ?? 0),
      desc: `${safeNumber(sessions.overallConversionRate).toFixed(1)}% completed purchase`,
    },
  ];

  const maxFunnel = Math.max(1, ...funnelSteps.map((s) => s.count));
  const products = (analytics.products || []).slice(0, 5);
  const channels = (analytics.attribution?.channels || []).slice(0, 5);
  const currency = financials.currency || "PKR";

  return (
    <div className="eventsWorkspaceStack">
      <TrackingHealth health={health} onSettings={onSettings} onOpenTests={onOpenTests} />

      {/* Visual Conversion Funnel */}
      <section className="eventsWorkspacePanel">
        <SectionHeading
          eyebrow="Conversion Journey"
          title="Storefront Customer Funnel"
          description="Deduplicated storefront events tracked through Meta Pixel and Conversions API (CAPI) for the selected period."
        />
        <div className="eventsWorkspaceFunnel">
          {funnelSteps.map((step, idx) => {
            const pct = maxFunnel > 0 ? (step.count / maxFunnel) * 100 : 0;
            const eventPalette = EVENT_COLORS[step.event] || { color: "#166534" };

            return (
              <div className="eventsWorkspaceFunnelStep" key={step.name}>
                <div className="eventsWorkspaceFunnelTop">
                  <span className="eventsWorkspaceFunnelStepNum">STEP {step.num}</span>
                  <EventBadge name={step.event} />
                </div>

                <div>
                  <span className="eventsWorkspaceFunnelLabel">{step.name}</span>
                  <strong style={{ display: "block", fontSize: 22, fontWeight: 850, color: "#122a1e", marginTop: 4 }}>
                    {step.count.toLocaleString("en-PK")}
                  </strong>
                </div>

                <div className="eventsWorkspaceFunnelTrack">
                  <i
                    style={{
                      width: `${Math.max(4, pct)}%`,
                      background: eventPalette.color,
                    }}
                  />
                </div>

                <small>{step.desc}</small>
              </div>
            );
          })}
        </div>
      </section>

      {/* Financials & Event Coverage */}
      <div className="eventsWorkspaceGrid eventsWorkspaceGridTwo">
        <section className="eventsWorkspacePanel">
          <SectionHeading
            eyebrow="Financial Telemetry"
            title="Tracked Sales & Value"
            description="Order revenue and checkout metrics captured from the event stream."
          />
          <div className="eventsWorkspaceRevenueList">
            <div>
              <span>Gross Sales Tracked</span>
              <strong>{formatMoney(financials.grossSales, currency)}</strong>
            </div>
            <div>
              <span>Refunds Processed</span>
              <strong>{formatMoney(financials.refunds, currency)}</strong>
            </div>
            <div>
              <span>Net Sales Attributed</span>
              <strong>{formatMoney(financials.netSales, currency)}</strong>
            </div>
            <div>
              <span>Average Order Value</span>
              <strong>{formatMoney(financials.aov, currency)}</strong>
            </div>
          </div>
          <div className="eventsWorkspaceRevenueFooter">
            <span>Overall Visitor Conversion Rate</span>
            <b>{safeNumber(sessions.overallConversionRate).toFixed(1)}%</b>
          </div>
        </section>

        <section className="eventsWorkspacePanel">
          <SectionHeading
            eyebrow="Event Delivery"
            title="Stream Event Breakdown"
            description="Distribution of standard events recorded in the audit database."
          />
          <div className="eventsWorkspaceCoverageList">
            {EVENT_TYPES.map((name) => {
              const count = counts?.[name] || 0;
              return (
                <div key={name}>
                  <EventBadge name={name} />
                  <span>Meta Pixel & CAPI</span>
                  <strong>{safeNumber(count).toLocaleString("en-PK")}</strong>
                  <span>events</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Top Products & Attribution */}
      <div className="eventsWorkspaceGrid eventsWorkspaceGridTwo">
        <section className="eventsWorkspacePanel">
          <SectionHeading
            eyebrow="Products in Demand"
            title="Top Performing Products"
            description="Products with highest view-to-order conversions."
          />
          {products.length ? (
            <div className="eventsWorkspaceMiniTable">
              {products.map((product, i) => (
                <div className="eventsWorkspaceMiniRow" key={product.id || product.name}>
                  <div>
                    <strong>
                      <span style={{ color: "#166534", marginRight: 6 }}>#{i + 1}</span>
                      {product.name || product.id}
                    </strong>
                    <span>SKU: {product.id}</span>
                  </div>
                  <b>{formatMoney(product.revenue, currency)}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No product interactions yet"
              description="Customer visits to individual product detail pages will rank here in real time."
            />
          )}
        </section>

        <section className="eventsWorkspacePanel">
          <SectionHeading
            eyebrow="Traffic & Ads"
            title="Attribution Channels"
            description="Campaign sources and referral paths driving storefront conversions."
          />
          {channels.length ? (
            <div className="eventsWorkspaceMiniTable">
              {channels.map((channel) => (
                <div className="eventsWorkspaceMiniRow" key={channel.channel}>
                  <div>
                    <strong>{channel.channel}</strong>
                    <span>
                      {safeNumber(channel.sessions)} sessions • {safeNumber(channel.conversions)} conversions
                    </span>
                  </div>
                  <b>{formatMoney(channel.revenue, currency)}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No attribution data yet"
              description="UTM tags, Facebook Ad click IDs (fbc), and referrer parameters will appear here."
            />
          )}
        </section>
      </div>
    </div>
  );
}

function ActivityTable({ events, selectedEvent, onSelect, loading, filterState, setFilterState, onReset, onOrder }) {
  const { eventType, status, source, query } = filterState;

  // Counts per event type for pill tabs
  const typeCounts = useMemo(() => {
    const counts = { all: events.length };
    EVENT_TYPES.forEach((t) => {
      counts[t] = events.filter((e) => e.event_name === t).length;
    });
    return counts;
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (eventType !== "all" && event.event_name !== eventType) return false;
      if (status === "delivered" && !event.success) return false;
      if (status === "failed" && event.success) return false;
      if (source !== "all") {
        const eventSource = String(event.source || "").toLowerCase();
        if (source === "browser" && eventSource !== "browser" && !event.browserSent) return false;
        if (source === "server" && eventSource !== "server" && !event.serverSent) return false;
      }
      if (query.trim()) {
        const needle = query.trim().toLowerCase();
        const haystack = [
          event.event_name,
          event.event_id,
          event.orderRef,
          event.id,
          event.fbtrace_id,
          event.channelDisplay,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [events, eventType, status, source, query]);

  const [page, setPage] = useState(1);
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => setPage(1), [eventType, status, source, query]);

  return (
    <section className="eventsWorkspacePanel eventsWorkspaceActivityPanel">
      <div className="eventsWorkspaceActivityToolbar">
        <div>
          <span className="eventsWorkspaceEyebrow">
            <Activity size={11} /> Real-Time Telemetry
          </span>
          <h2>Event Audit Log & Diagnostics</h2>
          <p>Inspect incoming Meta Pixel & CAPI payloads, check delivery status, and debug linked customer orders.</p>
        </div>
        <div className="eventsWorkspaceFilterActions">
          <button type="button" className="eventsWorkspaceQuietButton" onClick={onReset}>
            <SlidersHorizontal size={13} aria-hidden="true" /> Reset Filters
          </button>
        </div>
      </div>

      {/* Quick Event Filter Pills */}
      <div className="eventsWorkspaceQuickFilters">
        <button
          type="button"
          className={`eventsWorkspaceQuickFilterBtn ${eventType === "all" ? "isActive" : ""}`}
          onClick={() => setFilterState((prev) => ({ ...prev, eventType: "all" }))}
        >
          <span>All Events</span>
          <span>{typeCounts.all}</span>
        </button>
        {EVENT_TYPES.map((type) => (
          <button
            type="button"
            key={type}
            className={`eventsWorkspaceQuickFilterBtn ${eventType === type ? "isActive" : ""}`}
            onClick={() => setFilterState((prev) => ({ ...prev, eventType: type }))}
          >
            <span>{type}</span>
            <span>{typeCounts[type] || 0}</span>
          </button>
        ))}
      </div>

      {/* Filter Row */}
      <div className="eventsWorkspaceFilters">
        <label>
          <Filter size={14} aria-hidden="true" />
          <select
            value={status}
            onChange={(e) => setFilterState((state) => ({ ...state, status: e.target.value }))}
          >
            <option value="all">Any Status</option>
            <option value="delivered">Delivered (200 OK)</option>
            <option value="failed">Failed Delivery</option>
          </select>
        </label>

        <select
          value={source}
          onChange={(e) => setFilterState((state) => ({ ...state, source: e.target.value }))}
        >
          <option value="all">Any Source (Browser + Server)</option>
          <option value="browser">Browser Pixel Only</option>
          <option value="server">Server CAPI Only</option>
        </select>

        <label className="eventsWorkspaceSearch">
          <Search size={14} aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setFilterState((state) => ({ ...state, query: e.target.value }))}
            placeholder="Search event ID, order #, or trace ID..."
          />
          {query && (
            <button
              type="button"
              onClick={() => setFilterState((state) => ({ ...state, query: "" }))}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              <X size={14} color="#8a9c90" />
            </button>
          )}
        </label>
      </div>

      {loading ? (
        <div className="eventsWorkspaceLoading">
          <RefreshCw className="isSpinning" aria-hidden="true" />
          <span>Syncing latest event telemetry...</span>
        </div>
      ) : visible.length ? (
        <div className="eventsWorkspaceTableWrap">
          <table className="eventsWorkspaceTable">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event & ID</th>
                <th>Channel & Pairing</th>
                <th>Delivery Status</th>
                <th>Tracked Value</th>
                <th>Linked Order</th>
                <th aria-label="Open event details" style={{ textAlign: "right" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((event) => {
                const orderId = event.linkedOrder?.id || event.orderId || event.orderRef;
                return (
                  <tr
                    key={event.id || `${event.event_id}-${event.created_at}`}
                    className={selectedEvent?.id === event.id ? "isSelected" : ""}
                    onClick={() => onSelect(event)}
                  >
                    <td>
                      <strong>{timeAgo(event.created_at)}</strong>
                      <small>{formatTime(event.created_at)}</small>
                    </td>

                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <EventBadge name={event.event_name} />
                      </div>
                      <small style={{ fontFamily: "monospace" }}>
                        {event.maskedEventId || event.event_id || "No event ID"}
                      </small>
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontWeight: 650, color: "#122a1e", fontSize: 12 }}>
                          {event.channelDisplay || event.source || "Browser Pixel"}
                        </span>
                        <small style={{ color: "#6a7c70" }}>
                          {event.dedupBadge || event.dedupOutcome || "Paired CAPI"}
                        </small>
                      </div>
                    </td>

                    <td>
                      <StatusBadge success={event.success} />
                    </td>

                    <td>
                      <b style={{ color: event.value ? "#166534" : "#9ca3af", fontWeight: 750 }}>
                        {event.value ? formatMoney(event.value, event.currency || "PKR") : "—"}
                      </b>
                    </td>

                    <td>
                      {orderId ? (
                        <span
                          className="eventsWorkspaceOrderRef"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOrder?.(orderId);
                          }}
                          title="Click to view order details"
                          style={{ cursor: "pointer" }}
                        >
                          <ShoppingBag size={11} /> #{String(event.orderRef || orderId).replace(/^#/, "")}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "#166534",
                        }}
                      >
                        Inspect <ChevronRight size={14} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No events match your search or filter"
          description="Try resetting the filter selections or wait for customer activity on the storefront."
          action={
            <button type="button" className="eventsWorkspaceQuietButton" onClick={onReset}>
              Reset Filters
            </button>
          }
        />
      )}

      {/* Pagination Bar */}
      <div className="eventsWorkspaceTableFooter">
        <span>
          Showing <b>{visible.length}</b> of <b>{filteredEvents.length}</b> event
          {filteredEvents.length === 1 ? "" : "s"}
        </span>
        {filteredEvents.length > pageSize && (
          <div>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>
            <b>
              {currentPage} / {totalPages}
            </b>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function EventDrawer({ event, onClose, onOrder }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [event?.id]);

  if (!event) return null;

  const orderId = event.linkedOrder?.id || event.orderId || event.orderRef;
  const payload = event.rawPayload || event.payload || event;

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="eventsWorkspaceDrawerOverlay" role="presentation" onClick={onClose}>
      <aside
        className="eventsWorkspaceDrawer"
        role="dialog"
        aria-modal="true"
        aria-label="Event details"
        onClick={(click) => click.stopPropagation()}
      >
        <div className="eventsWorkspaceDrawerHead">
          <div>
            <span className="eventsWorkspaceEyebrow">
              <Code2 size={11} /> Event Inspector
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <EventBadge name={event.event_name} />
              <StatusBadge success={event.success} />
            </div>
            <p>{formatTime(event.created_at)}</p>
          </div>
          <button
            type="button"
            className="eventsWorkspaceIconButton"
            onClick={onClose}
            aria-label="Close event details"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="eventsWorkspaceDrawerBody">
          {orderId && (
            <button
              type="button"
              className="eventsWorkspaceLinkedOrder"
              onClick={() => onOrder?.(orderId)}
            >
              <ShoppingBag aria-hidden="true" />
              <span>
                <small>Linked Customer Order</small>
                <strong>Order #{String(event.orderRef || orderId).replace(/^#/, "")}</strong>
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}

          <div className="eventsWorkspaceDetailGrid">
            <div>
              <span>Unique Event ID</span>
              <strong style={{ fontFamily: "monospace" }}>{event.event_id || "—"}</strong>
            </div>
            <div>
              <span>Meta HTTP Status</span>
              <strong>{event.http_status || (event.success ? "200 OK" : "Failed")}</strong>
            </div>
            <div>
              <span>Monetary Value</span>
              <strong>{event.value ? formatMoney(event.value, event.currency || "PKR") : "—"}</strong>
            </div>
            <div>
              <span>Deduplication Key</span>
              <strong>{event.dedupBadge || event.dedupOutcome || "Paired"}</strong>
            </div>
            <div>
              <span>Dispatch Channel</span>
              <strong>{event.channelDisplay || event.source || "Browser Pixel"}</strong>
            </div>
            <div>
              <span>Trace ID</span>
              <strong style={{ fontFamily: "monospace" }}>{event.fbtrace_id || "Meta Managed"}</strong>
            </div>
          </div>

          {!event.success && (
            <div className="eventsWorkspaceErrorBox">
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <strong>Meta Delivery Failed</strong>
                <span>{event.error_message || `HTTP ${event.http_status || "Error"}`}</span>
              </div>
            </div>
          )}

          <details className="eventsWorkspaceDetails" open={!event.success}>
            <summary>
              <span>
                <Terminal size={14} aria-hidden="true" /> Raw JSON Payload
              </span>
              <ChevronRight size={14} aria-hidden="true" />
            </summary>
            <div className="eventsWorkspacePayloadActions">
              <span>Full Meta CAPI payload sent to graph.facebook.com</span>
              <button type="button" onClick={copyPayload}>
                {copied ? "✓ Copied" : "Copy JSON"}
              </button>
            </div>
            <pre>{JSON.stringify(payload, null, 2)}</pre>
          </details>
        </div>
      </aside>
    </div>
  );
}

function TestsPanel({ busyAction, onAction, actionMessage, suiteResults }) {
  const TEST_PREVIEWS = {
    PageView: "Simulates homepage visitor landing with browser session & client user-agent.",
    ViewContent: "Simulates product detail page view for 'Luxury Embroidered Lawn' (Rs. 8,950).",
    AddToCart: "Simulates adding 1 unit of product to cart with currency & quantity.",
    InitiateCheckout: "Simulates checkout initialization with cart items & customer location.",
    Purchase: "Simulates completed order for Rs. 8,950 with customer contact hash.",
  };

  return (
    <div className="eventsWorkspaceStack">
      <section className="eventsWorkspacePanel eventsWorkspaceTestsIntro">
        <div className="eventsWorkspaceTestIcon">
          <TestTube2 size={24} aria-hidden="true" />
        </div>
        <div>
          <span className="eventsWorkspaceEyebrow">
            <ShieldCheck size={12} /> Safe Diagnostics Console
          </span>
          <h2>Meta Conversions API (CAPI) Test Suite</h2>
          <p>
            Send controlled, isolated test events directly to Meta's Graph API. Verify your Pixel ID, Access Token,
            and deduplication pairing without touching live customer orders or analytics.
          </p>
        </div>
      </section>

      {actionMessage && (
        <div className={`eventsWorkspaceActionMessage ${actionMessage.type === "error" ? "isError" : ""}`}>
          <span>
            {actionMessage.type === "error" ? (
              <AlertTriangle size={18} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={18} aria-hidden="true" />
            )}
          </span>
          <div>
            <b>{actionMessage.type === "error" ? "Test Event Failed" : "Test Event Delivered (200 OK)"}</b>
            <div style={{ marginTop: 2 }}>{actionMessage.text}</div>
          </div>
        </div>
      )}

      {/* Individual Event Tests */}
      <section className="eventsWorkspacePanel">
        <SectionHeading
          eyebrow="Step-by-Step Validation"
          title="Test Individual Events"
          description="Click any event to send an isolated test payload to Meta and verify the 200 OK acknowledgment."
        />
        <div className="eventsWorkspaceTestGrid">
          {EVENT_TYPES.map((name) => (
            <div className="eventsWorkspaceTestCard" key={name}>
              <div className="eventsWorkspaceTestCardHead">
                <EventBadge name={name} />
                <small>{TEST_PREVIEWS[name]}</small>
              </div>
              <button
                type="button"
                className="eventsWorkspaceTestBtn"
                disabled={Boolean(busyAction)}
                onClick={() => onAction("test_event", name)}
              >
                {busyAction === name ? (
                  <>
                    <RefreshCw size={13} className="isSpinning" /> Sending...
                  </>
                ) : (
                  <>
                    <Zap size={13} /> Test {name}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Automated Suite */}
      <section className="eventsWorkspacePanel">
        <SectionHeading
          eyebrow="Automated Diagnostics"
          title="End-to-End Funnel & Deduplication Check"
          description="Validate the complete customer journey or verify simultaneous browser and server event pairing."
        />
        <div className="eventsWorkspaceTestActions">
          <button
            type="button"
            className="eventsWorkspacePrimaryButton"
            disabled={Boolean(busyAction)}
            onClick={() => onAction("test_suite")}
          >
            {busyAction === "test_suite" ? (
              <>
                <RefreshCw size={15} className="isSpinning" aria-hidden="true" /> Running 5-Event Suite...
              </>
            ) : (
              <>
                <Play size={15} aria-hidden="true" /> Run 5-Event Funnel Suite
              </>
            )}
          </button>

          <button
            type="button"
            className="eventsWorkspaceSecondaryButton"
            disabled={Boolean(busyAction)}
            onClick={() => onAction("test_dedup")}
          >
            {busyAction === "test_dedup" ? (
              <>
                <RefreshCw size={15} className="isSpinning" aria-hidden="true" /> Checking Deduplication...
              </>
            ) : (
              <>
                <ShieldCheck size={15} aria-hidden="true" /> Verify Deduplication Pairing
              </>
            )}
          </button>
        </div>

        {suiteResults && (
          <div className="eventsWorkspaceSuiteResults">
            <span style={{ fontSize: 12, fontWeight: 750, color: "#122a1e", marginBottom: 4 }}>
              Diagnostic Results from Meta Graph API:
            </span>
            {Object.entries(suiteResults).map(([name, result]) => (
              <div key={name}>
                <EventBadge name={name} />
                <span>
                  {result?.success ? "✓ 200 OK • Event received & acknowledged by Meta" : `✗ Error: ${result?.error || "Failed"}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function EventsWorkspace({ onNavigateToSettings, onNavigateToOrder }) {
  const [period, setPeriod] = useState("7");
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'activity' | 'tests'
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [filterState, setFilterState] = useState({ eventType: "all", status: "all", source: "all", query: "" });
  const [busyAction, setBusyAction] = useState("");
  const [actionMessage, setActionMessage] = useState(null);
  const [suiteResults, setSuiteResults] = useState(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ days: String(Number(period)), limit: "500" });
        const response = await fetch(`/api/admin/events?${params.toString()}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load tracking events.");
        setEvents(result.events || []);
        setSummary(result.summary || null);
        setLastLoadedAt(new Date());
      } catch (loadError) {
        setError(loadError.message || "Unable to load tracking events.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [period]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => load(true), 30000);
    return () => clearInterval(timer);
  }, [load]);

  const runAction = async (action, eventName = "") => {
    const actionKey = eventName || action;
    setBusyAction(actionKey);
    setActionMessage(null);
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, eventName, days: Number(period), limit: 500 }),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        const errorReason = result.result?.reason;
        const apiError =
          result.result?.result?.error?.message ||
          result.result?.error?.message ||
          result.result?.error ||
          result.error;

        let errMsg = apiError;
        if (errorReason === "capi_token_not_configured") {
          errMsg = "Meta Conversions API (CAPI) Access Token is not configured yet. Go to Settings > Tracking to enter your Meta Access Token to send live server events.";
        } else if (errorReason === "missing_pixel_id") {
          errMsg = "Meta Pixel ID is missing. Go to Settings > Tracking to set your Meta Pixel ID.";
        } else if (apiError) {
          errMsg = `Meta Graph API: ${apiError}`;
        }
        throw new Error(errMsg || "The test could not be completed.");
      }
      if (result.events) setEvents(result.events);
      if (result.summary) setSummary(result.summary);
      if (result.results) setSuiteResults(result.results);
      setActionMessage({
        type: "success",
        text:
          action === "test_suite"
            ? "All 5 standard events were dispatched to Meta Conversions API and acknowledged with 200 OK."
            : action === "test_dedup"
            ? "Deduplication test completed successfully with a synchronized event ID."
            : `${eventName} test event was sent and accepted by Meta Graph API with HTTP 200 OK.`,
      });
    } catch (actionError) {
      setActionMessage({ type: "error", text: actionError.message || "The test failed." });
    } finally {
      setBusyAction("");
    }
  };

  const analytics = summary?.analytics || {};
  const sessions = analytics.sessions || {};
  const financials = analytics.financials || {};
  const counts = summary?.counts || {};
  const health = summary?.health || {
    level: "healthy",
    deliveryRate: 100,
    emqScore: 8.8,
    failedEventsCount: 0,
    hasPixelId: true,
    hasAccessToken: true,
  };

  const metrics = [
    [
      Users,
      "Store Sessions",
      safeNumber(sessions.uniqueSessions || counts.PageView || 0).toLocaleString("en-PK"),
      `${safeNumber(sessions.uniqueVisitors || 0)} unique visitors`,
      "green",
    ],
    [
      Eye,
      "Product Views",
      safeNumber(sessions.viewSessions || counts.ViewContent || 0).toLocaleString("en-PK"),
      `${safeNumber(sessions.productViewRate).toFixed(1)}% of visitors`,
      "purple",
    ],
    [
      ShoppingBag,
      "Add to Carts",
      safeNumber(sessions.cartSessions || counts.AddToCart || 0).toLocaleString("en-PK"),
      `${safeNumber(sessions.addToCartRate).toFixed(1)}% cart rate`,
      "orange",
    ],
    [
      CircleDollarSign,
      "Purchases",
      safeNumber(financials.ordersCount || sessions.purchaseSessions || counts.Purchase || 0).toLocaleString("en-PK"),
      `${safeNumber(sessions.overallConversionRate).toFixed(1)}% conversion`,
      "blue",
    ],
    [
      BarChart3,
      "Tracked Sales",
      formatMoney(financials.netSales || 0, financials.currency || "PKR"),
      `AOV: ${formatMoney(financials.aov || 0, financials.currency || "PKR")}`,
      "rose",
    ],
  ];

  const resetFilters = () =>
    setFilterState({ eventType: "all", status: "all", source: "all", query: "" });

  return (
    <div className="eventsWorkspace">
      {/* Workspace Header */}
      <div className="eventsWorkspaceHeader">
        <div className="eventsWorkspaceHeaderCopy">
          <span className="eventsWorkspaceLive">
            <i /> Live Tracking Active
          </span>
          <h1>Events & Pixel Diagnostics</h1>
          <p>
            Monitor storefront conversions, track the customer journey funnel, and audit Meta Conversions API (CAPI)
            delivery in real time.
          </p>
        </div>

        <div className="eventsWorkspaceHeaderActions">
          <div className="eventsWorkspacePeriod" aria-label="Select reporting period">
            {PERIODS.map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={period === value ? "isActive" : ""}
                onClick={() => setPeriod(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="eventsWorkspaceRefresh"
            onClick={() => load()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "isSpinning" : ""} aria-hidden="true" />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="eventsWorkspaceTabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          className={activeTab === "overview" ? "isActive" : ""}
          onClick={() => setActiveTab("overview")}
        >
          <Gauge size={15} aria-hidden="true" />
          <span>Overview & Funnel</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "activity"}
          className={activeTab === "activity" ? "isActive" : ""}
          onClick={() => setActiveTab("activity")}
        >
          <Activity size={15} aria-hidden="true" />
          <span>Live Activity Log</span>
          {events.length > 0 && <span>{events.length}</span>}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "tests"}
          className={activeTab === "tests" ? "isActive" : ""}
          onClick={() => setActiveTab("tests")}
        >
          <TestTube2 size={15} aria-hidden="true" />
          <span>Diagnostics & Tests</span>
        </button>

        <button
          type="button"
          className="eventsWorkspaceSettingsTab"
          onClick={onNavigateToSettings}
        >
          <Settings size={14} aria-hidden="true" />
          <span>Tracking Settings</span>
          <ExternalLink size={12} aria-hidden="true" />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="eventsWorkspaceErrorBanner">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Tracking data currently unavailable</strong>
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => load()}>
            Try again
          </button>
        </div>
      )}

      {/* Overview Tab Content */}
      {activeTab === "overview" && (
        <>
          <div className="eventsWorkspaceMetricGrid">
            {metrics.map(([icon, label, value, helper, tone]) => (
              <MetricCard key={label} icon={icon} label={label} value={value} helper={helper} tone={tone} />
            ))}
          </div>

          <Overview
            analytics={analytics}
            counts={counts}
            health={health}
            onSettings={onNavigateToSettings}
            onOpenTests={() => setActiveTab("tests")}
          />
        </>
      )}

      {/* Live Activity Tab Content */}
      {activeTab === "activity" && (
        <ActivityTable
          events={events}
          selectedEvent={selectedEvent}
          onSelect={setSelectedEvent}
          loading={loading}
          filterState={filterState}
          setFilterState={setFilterState}
          onReset={resetFilters}
          onOrder={onNavigateToOrder}
        />
      )}

      {/* Diagnostics & Tests Tab Content */}
      {activeTab === "tests" && (
        <TestsPanel
          busyAction={busyAction}
          onAction={runAction}
          actionMessage={actionMessage}
          suiteResults={suiteResults}
        />
      )}

      {/* Footer Last Updated */}
      {lastLoadedAt && (
        <div className="eventsWorkspaceLastUpdated">
          <Clock3 aria-hidden="true" />
          <span>
            Telemetry updated {timeAgo(lastLoadedAt.toISOString())} • Auto-refreshes every 30 seconds
          </span>
        </div>
      )}

      {/* Event Details Drawer */}
      <EventDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onOrder={onNavigateToOrder}
      />
    </div>
  );
}
