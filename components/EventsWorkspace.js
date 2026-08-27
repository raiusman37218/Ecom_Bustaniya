"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Code2,
  ExternalLink,
  Filter,
  Gauge,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  TestTube2,
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
  PageView: { background: "#edf5ff", color: "#1c5d9b" },
  ViewContent: { background: "#f5f0ff", color: "#6546a8" },
  AddToCart: { background: "#fff4e6", color: "#a65d13" },
  InitiateCheckout: { background: "#fff8dc", color: "#86620b" },
  Purchase: { background: "#e8f6ed", color: "#17663d" },
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
  const palette = EVENT_COLORS[name] || { background: "#f2f5f3", color: "#405a4c" };
  return (
    <span className="eventsWorkspaceBadge" style={palette}>
      {name || "Unknown"}
    </span>
  );
}

function StatusBadge({ success }) {
  return (
    <span className={`eventsWorkspaceStatus ${success ? "isSuccess" : "isFailed"}`}>
      {success ? <CheckCircle2 aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
      {success ? "Delivered" : "Failed"}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, helper, tone = "green" }) {
  return (
    <article className={`eventsWorkspaceMetric tone-${tone}`}>
      <div className="eventsWorkspaceMetricIcon"><Icon aria-hidden="true" /></div>
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
        {eyebrow && <span className="eventsWorkspaceEyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="eventsWorkspaceEmpty">
      <Activity aria-hidden="true" />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function TrackingHealth({ health, onSettings }) {
  const deliveryRate = safeNumber(health?.deliveryRate, 100);
  const emqScore = safeNumber(health?.emqScore, 8.8);
  const failed = safeNumber(health?.failedEventsCount, 0);
  const isCritical = health?.level === "critical" || (!health?.hasPixelId && !health?.hasAccessToken);
  const isWarning = !isCritical && (health?.level === "warning" || deliveryRate < 95 || failed > 0);
  const tone = isCritical ? "critical" : isWarning ? "warning" : "healthy";
  const label = isCritical ? "Action required" : isWarning ? "Needs attention" : "Tracking healthy";

  return (
    <section className={`eventsWorkspaceHealth health-${tone}`}>
      <div className="eventsWorkspaceHealthIntro">
        <div className="eventsWorkspaceHealthIcon">{isCritical || isWarning ? <AlertTriangle aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}</div>
        <div>
          <span className="eventsWorkspaceEyebrow">Tracking health</span>
          <h2>{label}</h2>
          <p>{health?.reason || "Meta Pixel and Conversions API delivery are being monitored from the event log."}</p>
        </div>
        {isCritical && <button type="button" className="eventsWorkspaceQuietButton" onClick={onSettings}><Settings aria-hidden="true" /> Open settings</button>}
      </div>
      <div className="eventsWorkspaceHealthStats">
        <div><strong>{deliveryRate}%</strong><span>Delivery rate</span></div>
        <div><strong>{emqScore.toFixed(1)}/10</strong><span>Event match quality</span></div>
        <div><strong>{failed}</strong><span>Failed events</span></div>
        <div><strong>{health?.lastSuccessfulEventTime ? timeAgo(health.lastSuccessfulEventTime) : "No data"}</strong><span>Last successful</span></div>
      </div>
    </section>
  );
}

function Overview({ analytics, counts, health, onSettings }) {
  const sessions = analytics.sessions || {};
  const financials = analytics.financials || {};
  const funnel = [
    ["Visitors", sessions.uniqueSessions, "PageView"],
    ["Product views", sessions.viewSessions, "ViewContent"],
    ["Add to cart", sessions.cartSessions, "AddToCart"],
    ["Checkout", sessions.checkoutSessions, "InitiateCheckout"],
    ["Orders", financials.ordersCount ?? sessions.purchaseSessions, "Purchase"],
  ];
  const maxFunnel = Math.max(1, ...funnel.map(([, value]) => safeNumber(value)));
  const products = (analytics.products || []).slice(0, 5);
  const channels = (analytics.attribution?.channels || []).slice(0, 5);
  const currency = financials.currency || "PKR";

  return (
    <div className="eventsWorkspaceStack">
      <TrackingHealth health={health} onSettings={onSettings} />

      <section className="eventsWorkspacePanel">
        <SectionHeading eyebrow="Conversion funnel" title="From first visit to order" description="Deduplicated Meta events for the selected period." />
        <div className="eventsWorkspaceFunnel">
          {funnel.map(([label, value, eventName], index) => (
            <div className="eventsWorkspaceFunnelStep" key={label}>
              <div className="eventsWorkspaceFunnelTop"><span>{label}</span><strong>{safeNumber(value).toLocaleString("en-PK")}</strong></div>
              <div className="eventsWorkspaceFunnelTrack"><i style={{ width: `${Math.max(5, (safeNumber(value) / maxFunnel) * 100)}%`, background: EVENT_COLORS[eventName]?.color || "#17663d" }} /></div>
              <small>{index === 0 ? "100% of visitors" : `${safeNumber(value) && safeNumber(funnel[index - 1][1]) ? Math.round((safeNumber(value) / safeNumber(funnel[index - 1][1])) * 100) : 0}% from previous step`}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="eventsWorkspaceGrid eventsWorkspaceGridTwo">
        <section className="eventsWorkspacePanel">
          <SectionHeading eyebrow="Revenue" title="Sales at a glance" description="Order totals from the same period." />
          <div className="eventsWorkspaceRevenueList">
            <div><span>Gross sales</span><strong>{formatMoney(financials.grossSales, currency)}</strong></div>
            <div><span>Refunds</span><strong>{formatMoney(financials.refunds, currency)}</strong></div>
            <div><span>Net sales</span><strong>{formatMoney(financials.netSales, currency)}</strong></div>
            <div><span>Average order value</span><strong>{formatMoney(financials.aov, currency)}</strong></div>
          </div>
          <div className="eventsWorkspaceRevenueFooter"><span>Conversion rate</span><b>{safeNumber(sessions.overallConversionRate).toFixed(1)}%</b></div>
        </section>
        <section className="eventsWorkspacePanel">
          <SectionHeading eyebrow="Event coverage" title="What is being received" description="Successful events recorded in Supabase." />
          <div className="eventsWorkspaceCoverageList">
            {EVENT_TYPES.map((name) => {
              const event = counts?.[name] || 0;
              return <div key={name}><EventBadge name={name} /><strong>{safeNumber(event).toLocaleString("en-PK")}</strong><span>events</span></div>;
            })}
          </div>
        </section>
      </div>

      <div className="eventsWorkspaceGrid eventsWorkspaceGridTwo">
        <section className="eventsWorkspacePanel">
          <SectionHeading eyebrow="Product performance" title="Top products" description="Units and revenue attributed to orders." />
          {products.length ? (
            <div className="eventsWorkspaceMiniTable">
              {products.map((product) => <div className="eventsWorkspaceMiniRow" key={product.id || product.name}><div><strong>{product.name || product.id}</strong><span>{product.id}</span></div><b>{formatMoney(product.revenue, currency)}</b></div>)}
            </div>
          ) : <EmptyState title="No product activity yet" description="Product views and purchases will appear here as events arrive." />}
        </section>
        <section className="eventsWorkspacePanel">
          <SectionHeading eyebrow="Attribution" title="Top channels" description="Where sessions and conversions are coming from." />
          {channels.length ? (
            <div className="eventsWorkspaceMiniTable">
              {channels.map((channel) => <div className="eventsWorkspaceMiniRow" key={channel.channel}><div><strong>{channel.channel}</strong><span>{safeNumber(channel.sessions)} sessions · {safeNumber(channel.conversions)} orders</span></div><b>{formatMoney(channel.revenue, currency)}</b></div>)}
            </div>
          ) : <EmptyState title="No attribution data yet" description="UTM and referrer information will be summarized here." />}
        </section>
      </div>
    </div>
  );
}

function ActivityTable({ events, selectedEvent, onSelect, loading, filterState, setFilterState, onReset }) {
  const { eventType, status, source, query } = filterState;
  const filteredEvents = useMemo(() => events.filter((event) => {
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
      const haystack = [event.event_name, event.event_id, event.orderRef, event.id, event.fbtrace_id, event.channelDisplay].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }), [events, eventType, status, source, query]);
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
          <span className="eventsWorkspaceEyebrow">Live activity</span>
          <h2>Event audit log</h2>
          <p>Review delivery status, source and linked orders.</p>
        </div>
        <div className="eventsWorkspaceFilterActions"><button type="button" className="eventsWorkspaceQuietButton" onClick={onReset}><SlidersHorizontal aria-hidden="true" /> Reset</button></div>
      </div>
      <div className="eventsWorkspaceFilters">
        <label><Filter aria-hidden="true" /><select value={eventType} onChange={(event) => setFilterState((state) => ({ ...state, eventType: event.target.value }))}><option value="all">All events</option>{EVENT_TYPES.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <select value={status} onChange={(event) => setFilterState((state) => ({ ...state, status: event.target.value }))}><option value="all">Any status</option><option value="delivered">Delivered</option><option value="failed">Failed</option></select>
        <select value={source} onChange={(event) => setFilterState((state) => ({ ...state, source: event.target.value }))}><option value="all">Any source</option><option value="browser">Browser Pixel</option><option value="server">Server CAPI</option></select>
        <label className="eventsWorkspaceSearch"><Search aria-hidden="true" /><input value={query} onChange={(event) => setFilterState((state) => ({ ...state, query: event.target.value }))} placeholder="Search event or order" /></label>
      </div>
      {loading ? <div className="eventsWorkspaceLoading"><RefreshCw aria-hidden="true" /> Loading event activity…</div> : visible.length ? (
        <div className="eventsWorkspaceTableWrap">
          <table className="eventsWorkspaceTable"><thead><tr><th>Time</th><th>Event</th><th>Source</th><th>Status</th><th>Value</th><th>Order</th><th aria-label="Open event" /></tr></thead>
            <tbody>{visible.map((event) => <tr key={event.id || `${event.event_id}-${event.created_at}`} className={selectedEvent?.id === event.id ? "isSelected" : ""} onClick={() => onSelect(event)}>
              <td><strong>{timeAgo(event.created_at)}</strong><small>{formatTime(event.created_at)}</small></td>
              <td><EventBadge name={event.event_name} /><small>{event.maskedEventId || event.event_id || "No event ID"}</small></td>
              <td>{event.channelDisplay || event.source || "—"}</td>
              <td><StatusBadge success={event.success} /></td>
              <td>{event.value ? formatMoney(event.value, event.currency || "PKR") : "—"}</td>
              <td>{event.orderRef ? <span className="eventsWorkspaceOrderRef">#{String(event.orderRef).replace(/^#/, "")}</span> : "—"}</td>
              <td><ChevronRight aria-hidden="true" /></td>
            </tr>)}</tbody>
          </table>
        </div>
      ) : <EmptyState title="No events match these filters" description="Try resetting the filters or wait for the next storefront activity." />}
      <div className="eventsWorkspaceTableFooter"><span>{filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}</span>{filteredEvents.length > pageSize && <div><button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><b>{currentPage} / {totalPages}</b><button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button></div>}</div>
    </section>
  );
}

function EventDrawer({ event, onClose, onOrder }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { setCopied(false); }, [event?.id]);
  if (!event) return null;
  const orderId = event.linkedOrder?.id || event.orderId || event.orderRef;
  const payload = event.rawPayload || event.payload || event;
  const copyPayload = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(payload, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  return <div className="eventsWorkspaceDrawerOverlay" role="presentation" onClick={onClose}><aside className="eventsWorkspaceDrawer" role="dialog" aria-modal="true" aria-label="Event details" onClick={(click) => click.stopPropagation()}>
    <div className="eventsWorkspaceDrawerHead"><div><span className="eventsWorkspaceEyebrow">Event details</span><h2><EventBadge name={event.event_name} /></h2><p>{formatTime(event.created_at)}</p></div><button type="button" className="eventsWorkspaceIconButton" onClick={onClose} aria-label="Close event details"><X aria-hidden="true" /></button></div>
    <div className="eventsWorkspaceDrawerBody">
      <div className="eventsWorkspaceDetailStatus"><StatusBadge success={event.success} /><span>{event.channelDisplay || event.source || "Unknown source"}</span></div>
      {orderId && <button type="button" className="eventsWorkspaceLinkedOrder" onClick={() => onOrder?.(orderId)}><ShoppingBag aria-hidden="true" /><span><small>Linked order</small><strong>#{String(event.orderRef || orderId).replace(/^#/, "")}</strong></span><ChevronRight aria-hidden="true" /></button>}
      <div className="eventsWorkspaceDetailGrid"><div><span>Event ID</span><strong>{event.event_id || "—"}</strong></div><div><span>HTTP status</span><strong>{event.http_status || "—"}</strong></div><div><span>Value</span><strong>{event.value ? formatMoney(event.value, event.currency || "PKR") : "—"}</strong></div><div><span>Deduplication</span><strong>{event.dedupBadge || event.dedupOutcome || "Not paired"}</strong></div></div>
      {!event.success && <div className="eventsWorkspaceErrorBox"><AlertTriangle aria-hidden="true" /><div><strong>Delivery failed</strong><span>{event.error_message || `HTTP ${event.http_status || "error"}`}</span></div></div>}
      <details className="eventsWorkspaceDetails" open={!event.success}><summary><span><Code2 aria-hidden="true" /> Advanced payload</span><ChevronRight aria-hidden="true" /></summary><div className="eventsWorkspacePayloadActions"><span>Raw event data</span><button type="button" onClick={copyPayload}>{copied ? "Copied" : "Copy JSON"}</button></div><pre>{JSON.stringify(payload, null, 2)}</pre></details>
    </div>
  </aside></div>;
}

function TestsPanel({ busyAction, onAction, actionMessage, suiteResults }) {
  return <div className="eventsWorkspaceStack">
    <section className="eventsWorkspacePanel eventsWorkspaceTestsIntro"><div className="eventsWorkspaceTestIcon"><TestTube2 aria-hidden="true" /></div><div><span className="eventsWorkspaceEyebrow">Safe diagnostics</span><h2>Test your tracking setup</h2><p>Send a controlled test event to Meta and confirm the delivery response without touching a customer order.</p></div></section>
    {actionMessage && <div className={`eventsWorkspaceActionMessage ${actionMessage.type === "error" ? "isError" : "isSuccess"}`}><span>{actionMessage.type === "error" ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}</span>{actionMessage.text}</div>}
    <section className="eventsWorkspacePanel"><SectionHeading eyebrow="Individual events" title="Run one test" description="Use a single event when checking a specific integration step." /><div className="eventsWorkspaceTestGrid">{EVENT_TYPES.map((name) => <button type="button" key={name} disabled={Boolean(busyAction)} onClick={() => onAction("test_event", name)}><EventBadge name={name} /><span>{busyAction === name ? "Sending…" : `Test ${name}`}</span><Zap aria-hidden="true" /></button>)}</div></section>
    <section className="eventsWorkspacePanel"><SectionHeading eyebrow="Full checks" title="Validate the complete journey" description="Run the standard funnel or verify browser/server deduplication." /><div className="eventsWorkspaceTestActions"><button type="button" className="eventsWorkspacePrimaryButton" disabled={Boolean(busyAction)} onClick={() => onAction("test_suite")}>{busyAction === "test_suite" ? <><RefreshCw className="isSpinning" aria-hidden="true" /> Running suite…</> : <><Activity aria-hidden="true" /> Run 5-event suite</>}</button><button type="button" className="eventsWorkspaceSecondaryButton" disabled={Boolean(busyAction)} onClick={() => onAction("test_dedup")}>{busyAction === "test_dedup" ? <><RefreshCw className="isSpinning" aria-hidden="true" /> Checking…</> : <><ShieldCheck aria-hidden="true" /> Test deduplication</>}</button></div>{suiteResults && <div className="eventsWorkspaceSuiteResults">{Object.entries(suiteResults).map(([name, result]) => <div key={name}><EventBadge name={name} /><span>{result?.success ? "200 OK · delivered" : result?.error || "Failed"}</span></div>)}</div>}</section>
  </div>;
}

export default function EventsWorkspace({ onNavigateToSettings, onNavigateToOrder }) {
  const [period, setPeriod] = useState("7");
  const [activeTab, setActiveTab] = useState("overview");
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

  const load = useCallback(async (silent = false) => {
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
  }, [period]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const timer = setInterval(() => load(true), 30000); return () => clearInterval(timer); }, [load]);

  const runAction = async (action, eventName = "") => {
    const actionKey = eventName || action;
    setBusyAction(actionKey);
    setActionMessage(null);
    try {
      const response = await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, eventName, days: Number(period), limit: 500 }) });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.error || result.result?.error || "The test could not be completed.");
      if (result.events) setEvents(result.events);
      if (result.summary) setSummary(result.summary);
      if (result.results) setSuiteResults(result.results);
      setActionMessage({ type: "success", text: action === "test_suite" ? "All five standard events were sent. Review the result beside each event." : action === "test_dedup" ? "Deduplication test completed with a shared event ID." : `${eventName} test event was sent successfully.` });
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
  const health = summary?.health || { level: "healthy", deliveryRate: 100, emqScore: 8.8, failedEventsCount: 0, hasPixelId: true, hasAccessToken: true };
  const metrics = [
    [Users, "Sessions", safeNumber(sessions.uniqueSessions || counts.PageView).toLocaleString("en-PK"), `${safeNumber(sessions.uniqueVisitors)} visitors`, "green"],
    [ShoppingBag, "Product views", safeNumber(sessions.viewSessions || counts.ViewContent).toLocaleString("en-PK"), `${safeNumber(sessions.productViewRate).toFixed(1)}% of sessions`, "purple"],
    [Activity, "Add to carts", safeNumber(sessions.cartSessions || counts.AddToCart).toLocaleString("en-PK"), `${safeNumber(sessions.addToCartRate).toFixed(1)}% of sessions`, "orange"],
    [CircleDollarSign, "Orders", safeNumber(financials.ordersCount || sessions.purchaseSessions || counts.Purchase).toLocaleString("en-PK"), `${safeNumber(sessions.overallConversionRate).toFixed(1)}% conversion`, "blue"],
    [BarChart3, "Net sales", formatMoney(financials.netSales, financials.currency || "PKR"), `AOV ${formatMoney(financials.aov, financials.currency || "PKR")}`, "green"],
  ];

  const resetFilters = () => setFilterState({ eventType: "all", status: "all", source: "all", query: "" });

  return <div className="eventsWorkspace">
    <div className="eventsWorkspaceHeader">
      <div className="eventsWorkspaceHeaderCopy"><span className="eventsWorkspaceLive"><i /> Live tracking</span><h1>Events</h1><p>Understand storefront conversions and keep Meta delivery reliable.</p></div>
      <div className="eventsWorkspaceHeaderActions"><div className="eventsWorkspacePeriod" aria-label="Select reporting period">{PERIODS.map(([value, label]) => <button type="button" key={value} className={period === value ? "isActive" : ""} onClick={() => setPeriod(value)}>{label}</button>)}</div><button type="button" className="eventsWorkspaceRefresh" onClick={() => load()} disabled={loading}><RefreshCw className={loading ? "isSpinning" : ""} aria-hidden="true" /> {loading ? "Refreshing" : "Refresh"}</button></div>
    </div>
    <div className="eventsWorkspaceTabs" role="tablist"><button type="button" role="tab" aria-selected={activeTab === "overview"} className={activeTab === "overview" ? "isActive" : ""} onClick={() => setActiveTab("overview")}><Gauge aria-hidden="true" /> Overview</button><button type="button" role="tab" aria-selected={activeTab === "activity"} className={activeTab === "activity" ? "isActive" : ""} onClick={() => setActiveTab("activity")}><Activity aria-hidden="true" /> Live activity{events.length > 0 && <span>{events.length}</span>}</button><button type="button" role="tab" aria-selected={activeTab === "tests"} className={activeTab === "tests" ? "isActive" : ""} onClick={() => setActiveTab("tests")}><TestTube2 aria-hidden="true" /> Tests</button><button type="button" className="eventsWorkspaceSettingsTab" onClick={onNavigateToSettings}><Settings aria-hidden="true" /> Tracking settings<ExternalLink aria-hidden="true" /></button></div>
    {error && <div className="eventsWorkspaceErrorBanner"><AlertTriangle aria-hidden="true" /><div><strong>Tracking data unavailable</strong><span>{error}</span></div><button type="button" onClick={() => load()}>Try again</button></div>}
    {activeTab === "overview" && <div className="eventsWorkspaceMetricGrid">{metrics.map(([icon, label, value, helper, tone]) => <MetricCard key={label} icon={icon} label={label} value={value} helper={helper} tone={tone} />)}</div>}
    {activeTab === "overview" && <Overview analytics={analytics} counts={counts} health={health} onSettings={onNavigateToSettings} />}
    {activeTab === "activity" && <ActivityTable events={events} selectedEvent={selectedEvent} onSelect={setSelectedEvent} loading={loading} filterState={filterState} setFilterState={setFilterState} onReset={resetFilters} />}
    {activeTab === "tests" && <TestsPanel busyAction={busyAction} onAction={runAction} actionMessage={actionMessage} suiteResults={suiteResults} />}
    {lastLoadedAt && <div className="eventsWorkspaceLastUpdated"><Clock3 aria-hidden="true" /> Updated {timeAgo(lastLoadedAt.toISOString())} · auto-refreshes every 30 seconds</div>}
    <EventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} onOrder={onNavigateToOrder} />
  </div>;
}
