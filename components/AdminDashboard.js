"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertCircle, Bell, Boxes, Check, CheckCircle2, ChevronDown, ChevronUp, CircleDollarSign,
  Copy, ExternalLink, Eye, FileText, Info, Landmark, LayoutDashboard, Loader2, LogOut, Menu, MessageSquare,
  Minus, MoreHorizontal, Package, Phone, Plus, ReceiptText, RefreshCw, Search, Settings,
  ShoppingBag, Store, Tags, TrendingUp, Truck, Users, WalletCards, X
} from "lucide-react";
import { categories as fallbackCategoryNames, categoryDetails, categoryToSlug, products as initialProducts, slugifyCategory } from "../data/store";
import { DEFAULT_HOMEPAGE_SECTIONS, DEFAULT_STORE_SETTINGS } from "../data/storeSettings";
import FinanceWorkspace from "./FinanceWorkspace";
import EventsWorkspace from "./EventsWorkspace";
import { apparelSizes, fashionColors } from "../data/variantOptions";
import AdminLogin from "./AdminLogin";

const HOMEPAGE_COLOR_OPTIONS = [
  { name: "Ivory", value: "#fffefb" }, { name: "Cream", value: "#f7f2e8" }, { name: "White", value: "#ffffff" },
  { name: "Blush", value: "#f8e8e8" }, { name: "Rose", value: "#e9b9bd" }, { name: "Sand", value: "#e8dcc8" },
  { name: "Sage", value: "#dce8d8" }, { name: "Sky", value: "#dcebf2" }, { name: "Lavender", value: "#e6def2" },
  { name: "Forest", value: "#173d29" }, { name: "Dark Green", value: "#132f22" }, { name: "Olive", value: "#536b43" },
  { name: "Berry", value: "#8d2449" }, { name: "Dark Red", value: "#bd194b" }, { name: "Gold", value: "#d4af37" },
  { name: "Charcoal", value: "#252b28" }, { name: "Black", value: "#000000" },
];

const HOMEPAGE_COLOR_SECTIONS = [
  { key: "heroOverlay", label: "Hero Overlay" },
  { key: "products", label: "Top Picks (New Arrivals)" },
  { key: "categories", label: "Curated Collections (Shop by Category)" },
  { key: "story", label: "Best Sellers" },
  { key: "newsletter", label: "Newsletter" },
  { key: "instagram", label: "Instagram Gallery" },
];

function HelpHint({ text }) {
  return <span className="helpHint" tabIndex="0" role="note" aria-label={text} data-tooltip={text}><Info /></span>;
}

const FINANCE_INVENTORY_CATEGORIES = new Set([
  "fabric / stock",
  "tailoring / stitching",
  "lace / embellishment",
  "inventory production",
  "inventory",
  "stock purchase",
]);

function normalizedFinanceCategory(value) {
  return String(value || "Other").trim().toLowerCase();
}

function isInventoryCashExpense(entry) {
  if (entry?.type !== "business_expense") return false;
  return Boolean(entry?.productionBatchId)
    || String(entry?.title || "").startsWith("Production batch ")
    || FINANCE_INVENTORY_CATEGORIES.has(normalizedFinanceCategory(entry?.category));
}

function isActiveFinanceEntry(entry) {
  return entry?.voided !== true;
}

function isLinkedFinanceEntry(entry) {
  return Boolean(entry?.productionBatchId)
    || String(entry?.title || "").startsWith("Production batch ");
}

function financeEntryCashEffect(entry) {
  const amount = Number(entry?.amount || 0);
  if (!Number.isFinite(amount)) return 0;
  if (entry?.type === "cash_reset") return entry?.cashDirection === "in" ? amount : -amount;
  return ["owner_investment", "postex_bank_receipt", "other_income"].includes(entry?.type) ? amount : -amount;
}

function financeEntryLabel(type) {
  return ({
    owner_investment: "Owner funds added",
    owner_withdrawal: "Owner withdrawal",
    postex_bank_receipt: "PostEx bank receipt",
    cash_reset: "Opening balance reset",
    supplier_payment: "Supplier payment",
    other_income: "Other business income",
    business_expense: "Business expense",
  })[type] || "Finance entry";
}

function normalizeHeroImages(value, fallback) {
  let source = value;
  if (typeof value === "string") {
    try { source = JSON.parse(value); } catch { source = value; }
  }
  const images = (Array.isArray(source) ? source : [source])
    .map((image) => String(image || "").trim())
    .filter(Boolean);
  return images.length ? images : [fallback];
}

function clampPercent(value) {
  const number = Number(value || 0);
  return Math.max(0, Math.min(100, Number.isFinite(number) ? number : 0));
}

function getUnifiedProductDetails(product) {
  const description = String(product?.description || "").trim();
  const fabricDetails = String(product?.fabricDetails || product?.cost_breakdown?.metadata?.fabricDetails || "").trim();
  const careInstructions = String(product?.careInstructions || product?.cost_breakdown?.metadata?.careInstructions || "").trim();
  const sections = [description];

  if (fabricDetails && !description.includes(fabricDetails)) sections.push(`## Fabric & material\n${fabricDetails}`);
  if (careInstructions && !description.includes(careInstructions)) sections.push(`## Care instructions\n${careInstructions}`);

  return sections.filter(Boolean).join("\n\n");
}

function VisualBars({ title, subtitle, items = [], format = (value) => value, compact = false }) {
  const max = Math.max(1, ...items.map((item) => Math.abs(Number(item.value || 0))));
  const total = items.reduce((sum, item) => sum + Math.abs(Number(item.value || 0)), 0);

  return (
    <section className={`adminVisualCard ${compact ? "compact" : ""}`}>
      <div className="adminVisualHead">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="visualBarList">
        {items.map((item, index) => {
          const val = Math.abs(Number(item.value || 0));
          const width = clampPercent((val / max) * 100);
          const percent = total > 0 ? Math.round((val / total) * 100) : 0;
          return (
            <div className="visualBarRow" key={`${item.label}-${index}`}>
              <div className="barInfo">
                <div className="barLabelGroup">
                  <i className="barDot" style={{ background: item.color || "#1d6840" }} />
                  <span className="barLabel">{item.label}</span>
                </div>
                <div className="barValues">
                  <span className="barPercent">{percent}%</span>
                  <b className="barVal">{format(item.value)}</b>
                </div>
              </div>
              <div className="barTrack">
                <i style={{ "--bar-width": `${width}%`, "--bar-color": item.color || "#1d6840" }} />
              </div>
            </div>
          );
        })}
        {!items.length && <p className="visualEmpty">No data yet.</p>}
      </div>
    </section>
  );
}

function VisualDonut({ title, subtitle, items = [], centerLabel = "", centerValue = "" }) {
  const validItems = items.filter((item) => Number(item.value || 0) > 0);
  const total = validItems.reduce((sum, item) => sum + Number(item.value || 0), 0);

  const size = 180;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gapDeg = validItems.length > 1 ? 3 : 0;
  const gapFraction = gapDeg / 360;
  const totalGap = gapFraction * validItems.length;
  const usable = Math.max(0, 1 - totalGap);
  let cursor = 0;

  return (
    <section className="adminVisualCard">
      <div className="adminVisualHead">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="visualDonutWrap">
        <div className="svgDonutContainer">
          <div className="donutGlow" />
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="svgDonut">
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke="#edf2ed" strokeWidth={strokeWidth}
            />
            {total > 0 && validItems.map((item, index) => {
              const val = Number(item.value || 0);
              const fraction = (val / total) * usable;
              const dashLen = fraction * circumference;
              const gapLen = circumference - dashLen;
              const offset = -(cursor * circumference) - (gapFraction * circumference * index);
              cursor += fraction;

              return (
                <circle
                  key={index}
                  cx={size / 2} cy={size / 2} r={radius}
                  fill="none"
                  stroke={item.color || "#1d6840"}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLen} ${gapLen}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  className="donutSegment"
                />
              );
            })}
          </svg>
          <div className="donutCenterContent">
            <span className="donutCenterValue">{centerValue}</span>
            <small className="donutCenterLabel">{centerLabel}</small>
          </div>
        </div>
        <div className="visualLegend">
          {validItems.map((item, index) => {
            const val = Number(item.value || 0);
            const percent = total > 0 ? Math.round((val / total) * 100) : 0;
            return (
              <div key={`${item.label}-${index}`} className="legendItem">
                <div className="legendLabelGroup">
                  <i style={{ background: item.color || "#1d6840" }} />
                  <span>{item.label}</span>
                </div>
                <div className="legendValueGroup">
                  <span className="legendPercent">{percent}%</span>
                  <b>{item.value}</b>
                </div>
                <div className="legendMiniTrack">
                  <div className="legendMiniFill" style={{ width: `${percent}%`, background: item.color || "#1d6840" }} />
                </div>
              </div>
            );
          })}
          {!validItems.length && <p className="visualEmpty">No data yet.</p>}
        </div>
      </div>
    </section>
  );
}

function VisualProgress({ label, value, helper, color = "#1d6840" }) {
  return <div className="visualProgress">
    <div><span>{label}</span><b>{clampPercent(value)}%</b></div>
    <i><em style={{ width: `${clampPercent(value)}%`, background: color }} /></i>
    {helper && <small>{helper}</small>}
  </div>;
}

function EmptyState({ icon: Icon = Package, title = "No items found", description = "There are no records matching your current filter criteria.", actionText, onAction }) {
  return (
    <div className="unifiedEmptyState">
      <div className="emptyStateIcon"><Icon /></div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actionText && onAction && (
        <button type="button" className="emptyStateAction" onClick={onAction}>{actionText}</button>
      )}
    </div>
  );
}

function TableDensityToggle({ density, onChange }) {
  return (
    <div className="tableDensityToggle" title="Table Row Density">
      <button type="button" className={density === "comfortable" ? "active" : ""} onClick={() => onChange("comfortable")}>Comfortable</button>
      <button type="button" className={density === "compact" ? "active" : ""} onClick={() => onChange("compact")}>Compact</button>
    </div>
  );
}

function ConfirmModal({ isOpen, title = "Confirm Action", message, confirmText = "Confirm", cancelText = "Cancel", isDanger = false, onConfirm, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="confirmModalOverlay" onClick={onClose}>
      <div className="confirmModalCard" onClick={(e) => e.stopPropagation()}>
        <div className="confirmModalHead">
          <h3>{title}</h3>
          <button type="button" onClick={onClose}><X /></button>
        </div>
        <p className="confirmModalMessage">{message}</p>
        <div className="confirmModalActions">
          <button type="button" className="confirmCancelBtn" onClick={onClose}>{cancelText}</button>
          <button
            type="button"
            className={isDanger ? "confirmDangerBtn" : "confirmPrimaryBtn"}
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function parseCSVRows(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const cells = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        cells.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim().replace(/^"|"$/g, ""));

    const getVal = (possibleHeaders) => {
      const index = headers.findIndex((h) => possibleHeaders.includes(h));
      return index !== -1 ? cells[index] : "";
    };

    const name = getVal(["title", "name", "product name", "product"]);
    const priceStr = getVal(["price", "retail price", "unit price"]);
    const price = Math.max(0, Number(priceStr) || 0);
    const stockStr = getVal(["stock", "inventory", "qty", "quantity"]);
    const stock = Math.max(0, Number(stockStr) || 0);
    const sku = getVal(["sku", "article number", "code"]);
    const category = getVal(["category", "collection"]) || "Kurtis";

    let isValid = true;
    let error = "";

    if (!name) {
      isValid = false;
      error = "Missing product title";
    } else if (!priceStr || price <= 0) {
      isValid = false;
      error = "Invalid/Zero price";
    } else if (Number(stockStr) < 0) {
      isValid = false;
      error = "Negative stock value";
    }

    return { name, price, stock, sku, category, isValid, error };
  });
}

function CSVImportModal({ isOpen, file, rows = [], onConfirmImport, onClose }) {
  if (!isOpen || !file) return null;

  const validRows = rows.filter((r) => r.isValid);
  const invalidRows = rows.filter((r) => !r.isValid);

  return (
    <div className="adminModalOverlay" onClick={onClose}>
      <div className="csvModalCard" onClick={(e) => e.stopPropagation()}>
        <div className="confirmModalHead">
          <div>
            <h3>CSV Batch Import Report</h3>
            <small className="trackingNumber">{file.name} · {rows.length} rows parsed</small>
          </div>
          <button type="button" onClick={onClose}><X /></button>
        </div>

        <div className="csvSummaryStrip">
          <div className="statusBadge active"><b>{validRows.length}</b> Ready to import</div>
          {invalidRows.length > 0 && <div className="statusBadge cancelled"><b>{invalidRows.length}</b> Validation errors</div>}
        </div>

        <div className="adminTableWrap csvPreviewTable">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Row</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Validation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className={row.isValid ? "" : "invalidCsvRow"}>
                  <td><b>#{index + 1}</b></td>
                  <td><b>{row.name || "—"}</b></td>
                  <td>{row.sku || "—"}</td>
                  <td>{row.price ? `Rs. ${Number(row.price).toLocaleString()}` : <span className="expenseAmount">Invalid price</span>}</td>
                  <td>{row.stock ?? 0} units</td>
                  <td>
                    {row.isValid ? (
                      <span className="statusBadge active">Valid</span>
                    ) : (
                      <span className="statusBadge cancelled">{row.error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="confirmModalActions">
          <button type="button" className="confirmCancelBtn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="confirmPrimaryBtn"
            disabled={validRows.length === 0}
            onClick={() => onConfirmImport(validRows)}
          >
            Import {validRows.length} Valid Product{validRows.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNav({ active, setActive }) {
  const mobileNavItems = [
    { name: "Dashboard", label: "Overview", icon: LayoutDashboard },
    { name: "Orders", label: "Orders", icon: ShoppingBag },
    { name: "Products", label: "Products", icon: Package },
    { name: "Finances", label: "Finance", icon: Landmark },
    { name: "Settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="mobileBottomNav" aria-label="Mobile Navigation">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.name;
        return (
          <button
            type="button"
            key={item.name}
            className={`mobileNavItem ${isActive ? "active" : ""}`}
            onClick={() => setActive(item.name)}
            aria-pressed={isActive}
          >
            <Icon />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function ExecutiveAnalyticsSuite({
  salesByDay = [],
  salesPeriodTotal = 0,
  salesPeriodChange = null,
  periodLabel = "selected period",
  periodAverageOrderValue = 0,
  periodDeliveredOrders = [],
  dashboardSales = 0,
  dashboardCogs = 0,
  dashboardCourierCost = 0,
  dashboardTaxes = 0,
  dashboardReturnPostexLoss = 0,
  dashboardNetProfit = 0,
  liveOrders = [],
  products = [],
  pixelFunnel = null,
  setActive = () => {},
}) {
  const maxDailySales = Math.max(...salesByDay.map((day) => day.sales), 1);
  const peakDay = salesByDay.reduce((best, current) => (current.sales > best.sales ? current : best), { label: "—", sales: 0 });

  // Keep the chart, AOV and best-seller list on exactly the same selected
  // date range. Finance values below deliberately remain all-time because
  // cash, CPR receipts and recorded expenses are balances, not period sales.
  const deliveredOrders = periodDeliveredOrders;
  const aov = periodAverageOrderValue;

  // Unit Economics Margins
  const netMarginPercent = dashboardSales > 0 ? Math.max(0, Math.round((dashboardNetProfit / dashboardSales) * 100)) : 0;
  const cogsPercent = dashboardSales > 0 ? Math.min(100, Math.round((dashboardCogs / dashboardSales) * 100)) : 0;
  const logisticsPercent = dashboardSales > 0 ? Math.min(100, Math.round(((dashboardCourierCost + dashboardTaxes + dashboardReturnPostexLoss) / dashboardSales) * 100)) : 0;

  // Top Products by Delivered Revenue
  const productRevenueMap = new Map();
  deliveredOrders.flatMap((order) => normalizeOrderItems(order.raw || order)).forEach((item) => {
    const key = item.name || "Unknown item";
    const current = productRevenueMap.get(key) || { name: key, qty: 0, revenue: 0 };
    current.qty += Number(item.quantity || 1);
    current.revenue += Number(item.quantity || 1) * Number(item.price || 0);
    productRevenueMap.set(key, current);
  });
  const topProducts = Array.from(productRevenueMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);
  const maxProductRev = Math.max(1, ...topProducts.map((p) => p.revenue));

  // Top Destination Cities
  const cityMap = new Map();
  deliveredOrders.forEach((order) => {
    const city = (order.city || order.shippingAddress?.city || "Other").trim();
    if (!city) return;
    const current = cityMap.get(city) || { city, count: 0, total: 0 };
    current.count += 1;
    if (isDeliveredOrder(order)) current.total += Number(order.total || 0);
    cityMap.set(city, current);
  });
  const topCities = Array.from(cityMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);
  const maxCityTotal = Math.max(1, ...topCities.map((c) => c.total));

  return (
    <section className="analyticsSection">
      <div className="analyticsSectionHeader">
        <div>
          <h2>Executive Analytics &amp; Insights</h2>
          <p>Real-time revenue performance, unit economics, top products and regional demand.</p>
        </div>
        <span className="analyticsMetricBadge">Live Analytics</span>
      </div>

      <div className="analyticsGrid2">
        {/* Sales Trend & Velocity Card */}
        <article className="analyticsCard">
          <div className="analyticsCardHead">
            <div>
              <h3>Revenue &amp; Sales Trend</h3>
              <p>Daily delivered revenue breakdown across current period.</p>
            </div>
            {salesPeriodChange !== null && (
              <span className={`analyticsMetricBadge ${salesPeriodChange >= 0 ? "" : "alertMetric"}`}>
                {salesPeriodChange >= 0 ? `+${salesPeriodChange}%` : `${salesPeriodChange}%`} vs prev period
              </span>
            )}
          </div>

          <div className="analyticsTrendHeader">
            <div className="analyticsTrendStat">
              <span>{periodLabel} sales</span>
              <b>Rs. {salesPeriodTotal.toLocaleString()}</b>
            </div>
            <div className="analyticsTrendStat">
              <span>{periodLabel} AOV</span>
              <b>Rs. {aov.toLocaleString()}</b>
            </div>
            <div className="analyticsTrendStat">
              <span>Peak Day Sales</span>
              <b>Rs. {peakDay.sales.toLocaleString()}</b>
            </div>
          </div>

          <div className="analyticsBarChartContainer">
            {salesByDay.map((day, idx) => {
              const heightPct = Math.max(8, Math.round((day.sales / maxDailySales) * 100));
              return (
                <div className="analyticsBarColumn" key={idx}>
                  <div className="analyticsBarTooltip">
                    {day.label}: Rs. {day.sales.toLocaleString()}
                  </div>
                  <div className="analyticsBarFill" style={{ height: `${heightPct}%` }} />
                  <span className="analyticsBarDate">{day.label}</span>
                </div>
              );
            })}
          </div>
        </article>

        {/* Unit Economics & Margins Card */}
        <article className="analyticsCard">
          <div className="analyticsCardHead">
            <div>
              <h3>Unit Economics &amp; Margin Breakdown</h3>
              <p>All-time Finance P&amp;L split. This is intentionally separate from the selected-period sales chart.</p>
            </div>
            <span className="analyticsMetricBadge">P&amp;L Health</span>
          </div>

          <div className="visualBarList" style={{ marginTop: "10px" }}>
            <VisualProgress
              label="Net Profit Margin"
              value={netMarginPercent}
              helper={`Rs. ${Math.max(0, dashboardNetProfit).toLocaleString()} net profit retained`}
              color="#245d9a"
            />
            <VisualProgress
              label="COGS Ratio (Cost of Goods)"
              value={cogsPercent}
              helper={`Rs. ${dashboardCogs.toLocaleString()} product sourcing cost`}
              color="#c78b2b"
            />
            <VisualProgress
              label="Logistics, Tax &amp; Courier Loss Ratio"
              value={logisticsPercent}
              helper={`Rs. ${(dashboardCourierCost + dashboardTaxes + dashboardReturnPostexLoss).toLocaleString()} PostEx & tax fees`}
              color="#b73543"
            />
          </div>
        </article>
      </div>

      <div className="analyticsGrid2" style={{ marginTop: "18px" }}>
        {/* Top Performing Products Card */}
        <article className="analyticsCard">
          <div className="analyticsCardHead">
            <div>
              <h3>Top Performing Products</h3>
              <p>Highest delivered revenue generators in the selected period.</p>
            </div>
            <span className="analyticsMetricBadge">Best Sellers</span>
          </div>

          <div className="analyticsRankedList">
            {topProducts.map((prod, idx) => {
              const pct = Math.round((prod.revenue / maxProductRev) * 100);
              return (
                <div className="analyticsRankedRow" key={idx}>
                  <div className="analyticsRankedInfo">
                    <div className="analyticsRankedLabel">
                      <span className="analyticsRankIndex">{idx + 1}</span>
                      <span>{prod.name}</span>
                    </div>
                    <div className="analyticsRankedValues">
                      <small className="barPercent">{prod.qty} sold</small>
                      <b>Rs. {prod.revenue.toLocaleString()}</b>
                    </div>
                  </div>
                  <div className="analyticsRankedTrack">
                    <div className="analyticsRankedFill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {!topProducts.length && <p className="visualEmpty">No delivered sales data recorded yet.</p>}
          </div>
        </article>

        {/* Regional Sales Heatmap Card */}
        <article className="analyticsCard">
          <div className="analyticsCardHead">
            <div>
              <h3>Regional Demand &amp; Destination Cities</h3>
              <p>Top delivered destinations by sales value in the selected period.</p>
            </div>
            <span className="analyticsMetricBadge">Geography</span>
          </div>

          <div className="analyticsRankedList">
            {topCities.map((city, idx) => {
              const pct = Math.round((city.total / maxCityTotal) * 100);
              return (
                <div className="analyticsRankedRow" key={idx}>
                  <div className="analyticsRankedInfo">
                    <div className="analyticsRankedLabel">
                      <span className="analyticsRankIndex">{idx + 1}</span>
                      <span>{city.city}</span>
                    </div>
                    <div className="analyticsRankedValues">
                      <small className="barPercent">{city.count} orders</small>
                      <b>Rs. {city.total.toLocaleString()}</b>
                    </div>
                  </div>
                  <div className="analyticsRankedTrack">
                    <div className="analyticsRankedFill" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #4777a8, #2a5280)" }} />
                  </div>
                </div>
              );
            })}
            {!topCities.length && <p className="visualEmpty">No city data available yet.</p>}
          </div>
        </article>
      </div>

      {/* Shopify-Style Funnel & Meta CAPI Realtime Audit — driven by real
          events logged in pixel_events (see lib/pixelEvents.js), not
          estimates, so this matches Admin > Events exactly. */}
      <div className="analyticsGrid2" style={{ marginTop: "18px" }}>
        <article className="analyticsCard">
          <div className="analyticsCardHead">
            <div>
              <h3>Shopify-Style Conversion Funnel</h3>
              <p>Customer journey funnel from page views to completed orders.</p>
            </div>
            <span className="analyticsMetricBadge" style={{ background: "#edf5ee", color: "#173d29" }}>Conversion Funnel</span>
          </div>

          {pixelFunnel ? (() => {
            const c = pixelFunnel.counts || {};
            const base = Math.max(c.PageView || 0, 1);
            return (
              <div className="visualBarList" style={{ marginTop: "12px" }}>
                <VisualProgress
                  label="1. Store Visitors & Sessions (PageViews)"
                  value={100}
                  helper={`${c.PageView || 0} page views logged`}
                  color="#16452c"
                />
                <VisualProgress
                  label="2. Added to Cart (AddToCart)"
                  value={Math.min(100, Math.round(((c.AddToCart || 0) / base) * 100))}
                  helper={`${c.AddToCart || 0} product add-to-cart actions`}
                  color="#2e7d32"
                />
                <VisualProgress
                  label="3. Reached Checkout (InitiateCheckout)"
                  value={Math.min(100, Math.round(((c.InitiateCheckout || 0) / base) * 100))}
                  helper={`${c.InitiateCheckout || 0} checkout sessions initiated`}
                  color="#c78b2b"
                />
                <VisualProgress
                  label="4. Completed Orders (Purchase Conversion)"
                  value={Math.min(100, Math.round(((c.Purchase || 0) / base) * 100))}
                  helper={`${c.Purchase || 0} confirmed orders (${((c.Purchase || 0) / base * 100).toFixed(1)}% conversion rate)`}
                  color="#1565c0"
                />
              </div>
            );
          })() : (
            <p className="visualEmpty" style={{ marginTop: "12px" }}>Loading real funnel data from pixel_events…</p>
          )}
        </article>

        <article className="analyticsCard">
          <div className="analyticsCardHead">
            <div>
              <h3>Meta Pixel &amp; Conversions API (CAPI) Status</h3>
              <p>Real-time server event tracking &amp; EMQ match status (last 7 days).</p>
            </div>
            <span className="analyticsMetricBadge" style={{ background: "#e8f5e9", color: "#2e7d32" }}>Browser + Server</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
            <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#f8faf9", border: "1px solid #e0e8e3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <b style={{ color: "#173d29", fontSize: "13px" }}>Events sent</b>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>{pixelFunnel ? pixelFunnel.total : "…"} total pixel/CAPI events logged</div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#2e7d32", padding: "3px 8px", background: "#e8f5e9", borderRadius: "12px" }}>Live</span>
            </div>

            <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#f8faf9", border: "1px solid #e0e8e3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <b style={{ color: "#173d29", fontSize: "13px" }}>Meta delivery success rate</b>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>Share of events Meta's Graph API accepted (HTTP 200)</div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: pixelFunnel?.successRate >= 90 || pixelFunnel?.successRate == null ? "#2e7d32" : "#c0392b", padding: "3px 8px", background: pixelFunnel?.successRate >= 90 || pixelFunnel?.successRate == null ? "#e8f5e9" : "#fdecea", borderRadius: "12px" }}>
                {pixelFunnel?.successRate == null ? "—" : `${pixelFunnel.successRate}%`}
              </span>
            </div>

            <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#f8faf9", border: "1px solid #e0e8e3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <b style={{ color: "#173d29", fontSize: "13px" }}>SHA-256 EMQ match rate</b>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>Events sent with hashed email/phone for Meta match quality</div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#1565c0", padding: "3px 8px", background: "#e3f2fd", borderRadius: "12px" }}>
                {pixelFunnel?.matchRate == null ? "—" : `${pixelFunnel.matchRate}%`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActive("Events")}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", borderRadius: "8px", background: "#16452c", color: "#fff", fontWeight: 700, fontSize: "13px", border: "none", cursor: "pointer", marginTop: "4px" }}
            >
              View Live Events in Admin →
            </button>
            <a
              href="https://eventsmanager.facebook.com"
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px", fontSize: "12px", color: "#6b7280", textDecoration: "none" }}
            >
              Open Meta Events Manager instead ↗
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}

function AdminLoadingShell() {
  return (
    <main className="adminShell adminLoadingShell" aria-busy="true" aria-label="Loading Bustaniya admin">
      <aside className="adminSidebar adminLoadingSidebar" aria-hidden="true">
        <div className="adminLoadingBrand">
          <span className="adminSkeleton adminLoadingMark" />
          <span className="adminSkeleton adminLoadingBrandName" />
        </div>
        <div className="adminLoadingNavigation">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <span className="adminSkeleton adminLoadingNavItem" key={item} />)}
        </div>
        <span className="adminSkeleton adminLoadingAccount" />
      </aside>
      <section className="adminMain">
        <header className="adminTopbar adminLoadingTopbar" aria-hidden="true">
          <span className="adminSkeleton adminLoadingSearch" />
          <div className="adminLoadingTopActions">
            <span className="adminSkeleton adminLoadingAction" />
            <span className="adminSkeleton adminLoadingAvatar" />
          </div>
        </header>
        <div className="adminContent adminLoadingContent">
          <div className="adminLoadingHeading">
            <span className="adminSkeleton adminLoadingEyebrow" />
            <span className="adminSkeleton adminLoadingTitle" />
            <span className="adminSkeleton adminLoadingSubtitle" />
          </div>
          <div className="adminLoadingMetricGrid" aria-hidden="true">
            {[1, 2, 3, 4].map((item) => <div className="adminLoadingMetric" key={item}><span className="adminSkeleton" /><span className="adminSkeleton" /><span className="adminSkeleton" /></div>)}
          </div>
          <section className="adminLoadingPanel" aria-hidden="true">
            <div><span className="adminSkeleton adminLoadingPanelTitle" /><span className="adminSkeleton adminLoadingPanelAction" /></div>
            {[1, 2, 3, 4, 5].map((item) => <span className="adminSkeleton adminLoadingRow" key={item} />)}
          </section>
          <p className="adminLoadingStatus">Preparing your workspace…</p>
        </div>
      </section>
    </main>
  );
}

const fallbackCategoryRecords = fallbackCategoryNames
  .filter((category) => category !== "All")
  .map((name, index) => {
    const slug = categoryToSlug(name);
    return {
      id: slug,
      name,
      slug,
      description: categoryDetails[slug]?.description || "",
      image: categoryDetails[slug]?.image || "/bustaniya-campaign-hero-v4.png",
      parentSlug: "",
      status: "Active",
      sortOrder: (index + 1) * 10,
    };
  });

const demoOrders = [
  { id: "#BST-1048", customer: "Ayesha Khan", city: "Lahore", total: 8490, status: "Processing", date: "Today, 11:42 AM", createdAt: "2026-07-08T11:42:00+05:00" },
  { id: "#BST-1047", customer: "Hira Ali", city: "Karachi", total: 12990, status: "Confirmed", date: "Today, 10:18 AM", createdAt: "2026-07-08T10:18:00+05:00" },
  { id: "#BST-1046", customer: "Mahnoor Shah", city: "Islamabad", total: 4490, status: "Delivered", date: "Yesterday", createdAt: "2026-07-07T15:20:00+05:00" },
  { id: "#BST-1045", customer: "Zoya Ahmed", city: "Faisalabad", total: 10980, status: "Processing", date: "Yesterday", createdAt: "2026-07-07T12:05:00+05:00" },
  { id: "#BST-1044", customer: "Sana Raza", city: "Rawalpindi", total: 6990, status: "Cancelled", date: "4 Jul 2026", createdAt: "2026-07-04T17:10:00+05:00" }
];

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, section: "OVERVIEW" },
  { name: "Events", icon: Activity, section: "OVERVIEW" },
  { name: "Orders", icon: ShoppingBag, section: "COMMERCE" },
  { name: "Products", icon: Package, section: "COMMERCE" },
  { name: "Categories", icon: Tags, section: "COMMERCE" },
  { name: "Inventory", icon: Boxes, section: "COMMERCE" },
  { name: "Customers", icon: Users, section: "COMMERCE" },
  { name: "Finances", icon: Landmark, section: "COMMERCE" },
  { name: "Courier Ops", icon: Truck, section: "OPERATIONS" },
  { name: "Couriers", icon: Truck, section: "OPERATIONS" },
  { name: "Settings", icon: Settings, section: "OPERATIONS" }
];

const navPermissionMap = {
  Dashboard: "dashboard",
  Events: "dashboard",
  Orders: "orders",
  Products: "products",
  Categories: "products",
  Inventory: "inventory",
  Customers: "customers",
  Finances: "dashboard",
  "Courier Ops": "orders",
  Couriers: "settings",
  Settings: "settings",
};

function getSectionFromLocation() {
  if (typeof window === "undefined") return "";
  const section = new URLSearchParams(window.location.search).get("section");
  return navItems.some((item) => item.name === section) ? section : "";
}

const PRODUCT_COST_KEYS = ["fabric", "stitching", "embellishment", "packaging", "delivery", "other"];

function canUseAdminArea(user, area) {
  if (!area) return true;
  if (!user) return true;
  if (user.role === "Owner") return true;
  return Array.isArray(user.permissions) && user.permissions.includes(area);
}

export default function AdminDashboard() {
  const [active, setActive] = useState(() => getSectionFromLocation() || "Dashboard");
  const [activeSectionReady, setActiveSectionReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedSizes, setSelectedSizes] = useState(["S", "M", "L"]);
  const [selectedColors, setSelectedColors] = useState(["Pink"]);
  const [productCategory, setProductCategory] = useState("Kurtis");
  const [sizeSearch, setSizeSearch] = useState("");
  const [colorSearch, setColorSearch] = useState("");
  const [productMedia, setProductMedia] = useState([]);
  const [productImageUrl, setProductImageUrl] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [productPrice, setProductPrice] = useState(0);
  const [costBreakdown, setCostBreakdown] = useState({ fabric: 0, stitching: 0, embellishment: 0, packaging: 0, delivery: 0, other: 0 });
  const [productSaving, setProductSaving] = useState(false);
  const productDetailsEditorRef = useRef(null);
  const [workspace, setWorkspace] = useState(null);
  const [tableDensity, setTableDensity] = useState(() => (typeof window !== "undefined" && localStorage.getItem("bustaniya-admin-table-density")) || "comfortable");
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    isDanger: true,
    onConfirm: null,
  });

  function requestConfirm({ title, message, confirmText = "Confirm", isDanger = true, onConfirm }) {
    setConfirmModalState({ isOpen: true, title, message, confirmText, isDanger, onConfirm });
  }

  function insertProductDetailsFormat(format) {
    const editor = productDetailsEditorRef.current;
    if (!editor) return;

    const start = editor.selectionStart ?? editor.value.length;
    const end = editor.selectionEnd ?? start;
    const selectedText = editor.value.slice(start, end);
    const needsNewLine = start > 0 && editor.value[start - 1] !== "\n";
    const prefix = format === "heading" ? "## " : "- ";
    const placeholder = format === "heading" ? "Section heading" : "Bullet point";
    const formatted = selectedText
      ? (format === "bullet" ? selectedText.split("\n").map((line) => line ? `${prefix}${line.replace(/^[-*]\s+/, "")}` : line).join("\n") : `${prefix}${selectedText.replace(/\n/g, " ")}`)
      : `${prefix}${placeholder}`;
    const nextValue = `${editor.value.slice(0, start)}${needsNewLine ? "\n" : ""}${formatted}${editor.value.slice(end)}`;
    const nextCursor = start + (needsNewLine ? 1 : 0) + formatted.length;

    editor.value = nextValue;
    editor.focus();
    editor.setSelectionRange(nextCursor, nextCursor);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (event.key === "/" && !isInput) {
        event.preventDefault();
        const searchInput = document.querySelector(".inlineSearch input, .adminSearch input");
        if (searchInput) searchInput.focus();
      }
      if (event.key === "Escape") {
        if (confirmModalState.isOpen) {
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmModalState.isOpen]);

  async function deleteProduct(product) {
    const targetProduct = typeof product === "object" ? product : products.find((p) => String(p.id) === String(product));
    const productName = targetProduct?.name || "this product";
    const productId = targetProduct?.id || product;

    requestConfirm({
      title: "Remove Product",
      message: `Are you sure you want to remove "${productName}"? If it has order history, it will be archived and hidden from the store.`,
      confirmText: "Delete Product",
      isDanger: true,
      onConfirm: async () => {
        setCatalogLoading(true);
        setOrdersError("");
        setProducts((current) => current.filter((item) => String(item.id) !== String(productId)));
        try {
          const response = await fetch("/api/admin/catalog", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Unable to remove product.");
          await loadAdminData();
          if (result.archived) {
            setOrdersError(`${productName} was archived because it may be linked to existing order history.`);
          }
        } catch (error) {
          setOrdersError(error.message || "Product deletion failed.");
          await loadAdminData();
        } finally {
          setCatalogLoading(false);
        }
      },
    });
  }

  function handleTableDensityChange(newDensity) {
    setTableDensity(newDensity);
    if (typeof window !== "undefined") {
      localStorage.setItem("bustaniya-admin-table-density", newDensity);
    }
  }

  const [products, setProducts] = useState(() => initialProducts.map((p, index) => ({
    ...p,
    stock: [12, 7, 3, 18, 5, 9, 4, 11, 2, 14, 8, 6][index] ?? 10,
  })));
  const [adminReady, setAdminReady] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersConnected, setOrdersConnected] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [ordersLoadError, setOrdersLoadError] = useState("");
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [inventoryMovements, setInventoryMovements] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState(fallbackCategoryRecords);
  const [categorySetupNeeded, setCategorySetupNeeded] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState(null);
  const [adminAuthChecked, setAdminAuthChecked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [requestedOrderId, setRequestedOrderId] = useState("");
  const [requestedAdminFocus, setRequestedAdminFocus] = useState(null);
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    orders: 0,
    customers: 0,
    products: 0,
    lowStock: 0,
  });

  // Keep every async admin action visibly busy without duplicating spinner logic
  // in each panel. Existing loading labels/icons remain the source of truth;
  // this observer adds the shared visual treatment to disabled processing buttons.
  useEffect(() => {
    if (!adminReady || !adminAuthChecked || !currentAdminUser) return undefined;

    const root = document.querySelector(".adminShell");
    if (!root) return undefined;

    const processingText = /\b(?:saving|loading|syncing|processing|voiding|adding|booking|checking|resetting|removing|creating|updating|uploading|publishing|exporting|logging out|testing|verifying|retrying|dispatching|refreshing)\b/i;

    const syncActionStates = () => {
      root.querySelectorAll("button").forEach((button) => {
        const text = button.textContent || "";
        const hasInlineSpinner = Boolean(button.querySelector(".spinIcon, .buttonSpinner"));
        const pending = button.disabled && (
          button.getAttribute("aria-busy") === "true" ||
          processingText.test(text) ||
          hasInlineSpinner
        );

        // Inline spinners already provide the same feedback; avoid rendering a
        // second pseudo-element spinner on those buttons.
        button.toggleAttribute("data-admin-loading", pending && !hasInlineSpinner);
      });
    };

    syncActionStates();
    const observer = new MutationObserver(syncActionStates);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled", "class"],
    });

    return () => observer.disconnect();
  }, [adminReady, adminAuthChecked, currentAdminUser]);

  useEffect(() => {
    const requestedSection = getSectionFromLocation();
    const savedActiveSection = localStorage.getItem("bustaniya-admin-active-section");
    if (requestedSection) {
      setActive(requestedSection);
    } else if (navItems.some((item) => item.name === savedActiveSection)) {
      setActive(savedActiveSection);
    }
    setActiveSectionReady(true);
    const saved = localStorage.getItem("bustaniya-admin-products");
    if (saved) {
      try { setProducts(JSON.parse(saved)); } catch {}
    }
    setAdminReady(true);
    fetch("/api/admin/me")
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!result?.user) return;
        setCurrentAdminUser(result.user);
        refreshWorkspace();
      })
      .catch(() => {})
      .finally(() => setAdminAuthChecked(true));
  }, []);

  useEffect(() => {
    if (adminReady) localStorage.setItem("bustaniya-admin-products", JSON.stringify(products));
  }, [products, adminReady]);

  useEffect(() => {
    if (activeSectionReady) localStorage.setItem("bustaniya-admin-active-section", active);
  }, [active, activeSectionReady]);

  useEffect(() => {
    const handlePopState = () => {
      const section = getSectionFromLocation();
      if (section) {
        setRequestedAdminFocus(null);
        setActive(section);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigateAdminSection(section, options = {}) {
    if (!navItems.some((item) => item.name === section)) return;
    setRequestedAdminFocus(options.focus ? { section, focus: options.focus } : null);
    setActive(section);
    setSidebarOpen(false);
    localStorage.setItem("bustaniya-admin-active-section", section);
    const url = `/admin?section=${encodeURIComponent(section)}`;
    window.history[options.replace ? "replaceState" : "pushState"]({}, "", url);
  }

  const filteredProducts = useMemo(() => products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  ), [products, search]);
  const totalProductCost = PRODUCT_COST_KEYS.reduce((sum, key) => sum + Number(costBreakdown[key] || 0), 0);
  const productGst = 0;
  const productTax = Math.round(Number(productPrice || 0) * 0.04);
  const productFinalProfit = Number(productPrice || 0) - totalProductCost - productGst - productTax;

  useEffect(() => {
    if (!showProductForm || !editingProduct?.seoTitle) return;
    const pageTitleField = document.querySelector('.productFormDrawer input[maxlength="70"]');
    if (pageTitleField) pageTitleField.value = editingProduct.seoTitle;
  }, [showProductForm, editingProduct]);

  function openNewProductForm() {
    setEditingProduct(null);
    setProductCategory("Kurtis");
    setSelectedSizes(["S", "M", "L"]);
    setSelectedColors(["Pink"]);
    setProductMedia([]);
    setProductImageUrl("");
    setMediaError("");
    setProductPrice(0);
    setCostBreakdown({ fabric: 0, stitching: 0, embellishment: 0, packaging: 0, delivery: 0, other: 0 });
    setShowProductForm(true);
  }

  function openEditProductForm(product) {
    setEditingProduct(product);
    setProductCategory(product.category || "Kurtis");
    setSelectedSizes(Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["S", "M", "L"]);
    setSelectedColors(Array.isArray(product.colors) && product.colors.length ? product.colors : ["Pink"]);
    setProductMedia((product.images || [product.image]).filter(Boolean).map((src, index) => ({
      id: `existing-${product.id}-${index}`,
      name: `Product image ${index + 1}`,
      src,
    })));
    setProductImageUrl("");
    setMediaError("");
    setProductPrice(Number(product.price || 0));
    setCostBreakdown({ fabric: 0, stitching: 0, embellishment: 0, packaging: 0, delivery: 0, other: 0, ...(product.costBreakdown || {}) });
    setShowProductForm(true);
  }

  async function loadOrders({ page = 1 } = {}) {
    setOrdersLoading(true);
    setOrdersError("");
    setOrdersLoadError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, pageSize: ordersPagination.pageSize }),
      });
      const result = await response.json();
      if (!response.ok) {
        const error = new Error(result?.error?.message || "Orders could not be loaded.");
        error.status = response.status;
        throw error;
      }
      const formatted = (result.data || []).map((order) => {
        const total = Number(order.total_order_value_pkr ?? order.total_pkr ?? order.total ?? 0);
        const subtotal = Number(order.product_subtotal_pkr ?? order.subtotal_pkr ?? order.total_pkr ?? order.total ?? 0);
        const delivery = Number(order.delivery_charges_pkr ?? order.delivery_pkr ?? 0);
        const advance = Number(order.amount_payable_in_advance_pkr ?? 0);
        const onDelivery = Number(order.amount_payable_on_delivery_pkr ?? Math.max(0, total - advance));
        const tagsList = Array.isArray(order.tags) ? order.tags : [];
        const detectedSource = tagsList.find((t) => ["Instagram DM", "WhatsApp", "Phone call", "Walk-in", "Facebook", "Manual"].includes(t)) || (tagsList.includes("Custom order") ? "Admin Custom" : "Storefront");
        const detectedDeliveryMethod = tagsList.find((t) => ["PostEx", "Rider / same city", "Customer pickup", "Staff delivery", "Manual courier", "PostEx later"].includes(t)) || (order.courier_tracking_number ? "PostEx" : "Manual / Rider");
        const orderItems = Array.isArray(order.items) && order.items.length
          ? order.items
          : (Array.isArray(order.order_items) && order.order_items.length ? order.order_items : []);
        const orderNotes = order.internal_notes || order.notes || "";

        return {
          rawId: order.id,
          raw: order,
          id: `#${order.order_number}`,
          customer: order.shipping_full_name || order.guest_name || "Guest",
          city: order.shipping_city || "—",
          total,
          productSubtotal: subtotal,
          deliveryCharges: delivery,
          amountPayableInAdvance: advance,
          amountPayableOnDelivery: onDelivery,
          paymentMethod: (() => {
            const method = String(order.payment_method || "").toLowerCase();
            return method === "full_advance" || method === "bank_deposit" || (total > 0 && advance >= total && delivery === 0)
              ? "Full advance payment"
              : advance > 0
                ? "COD — delivery advance"
                : "Cash on Delivery";
          })(),
          paymentReference: order.payment_reference || "",
          confirmationStatus: "Confirmed",
          paymentDetails: order.payment_details_snapshot || {},
          status: formatOrderStatus(order.courier_normalized_status || order.courier_status || order.status || "pending"),
          postexStatus: formatOrderStatus(order.courier_status || order.status || "pending"),
          courierRawStatus: order.courier_raw_status || order.courier_status || "",
          courierNormalizedStatus: order.courier_normalized_status || "unassigned",
          courierServiceType: order.courier_service_type || "",
          paymentStatus: order.payment_proof_status || order.payment_status || "Awaiting Payment",
          fulfillmentStatus: order.fulfillment_status || (order.courier_tracking_number || order.tracking_number ? "Booked with PostEx" : "Unfulfilled"),
          tracking: order.courier_tracking_number || order.tracking_number || "",
          phone: order.shipping_phone || order.guest_phone || "",
          address: [order.shipping_address || order.shipping_line1, order.shipping_city, order.shipping_postal_code].filter(Boolean).join(", "),
          email: order.customer_email || order.guest_email || "",
          items: orderItems,
          order_items: orderItems,
          notes: orderNotes,
          internalNotes: order.internal_notes || orderNotes,
          source: detectedSource,
          deliveryMethod: detectedDeliveryMethod,
          tags: tagsList,
          risk: order.risk || "Standard COD",
          operation: order.operation || null,
          operationStorageAvailable: order.operation_storage_available !== false,
          operationEvents: Array.isArray(order.operation_events) ? order.operation_events : [],
          createdAt: order.created_at,
          date: new Date(order.created_at).toLocaleString("en-PK", {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          }),
        };
      });
      setOrders(formatted);
      setOrdersPagination(result.pagination || { page, pageSize: ordersPagination.pageSize, total: formatted.length, totalPages: formatted.length ? 1 : 0 });
      setOrdersConnected(true);
      // Orders are the shared source for Finance and Inventory. Render them as
      // soon as their request completes; catalog/dashboard enrichment must not
      // keep the entire admin workspace behind the Orders loading screen.
      setOrdersLoading(false);
    } catch (loadError) {
      setOrdersConnected(false);
      setOrdersError(loadError.message);
      setOrdersLoadError(loadError.message);
    } finally {
      setOrdersLoading(false);
    }
  }

  // Orders and the catalogue/dashboard load side by side. Chaining them meant
  // a failing orders request left Products, Inventory and Finance permanently
  // empty, and every page change refetched the whole catalogue.
  function refreshWorkspace() {
    void loadAdminData().catch((adminDataError) => {
      console.error("Admin workspace data load failed", adminDataError);
    });
    return loadOrders();
  }

  async function loadAdminData() {
    setCatalogLoading(true);
    try {
      const [catalogResponse, dashboardResponse, categoriesResponse] = await Promise.all([
        fetch("/api/admin/catalog", { method: "POST" }),
        fetch("/api/admin/dashboard", { method: "POST" }),
        fetch("/api/admin/categories", { method: "POST" }),
      ]);
      const catalog = await catalogResponse.json();
      const dashboard = await dashboardResponse.json();
      const categories = await categoriesResponse.json();
      if (!catalogResponse.ok) throw new Error(catalog.error || "Unable to load catalogue.");
      if (!dashboardResponse.ok) throw new Error(dashboard.error || "Unable to load dashboard.");
      if (!categoriesResponse.ok) throw new Error(categories.error || "Unable to load categories.");
      setProducts(catalog.products || []);
      setInventoryMovements(catalog.movements || []);
      setCatalogCategories(categories.categories || fallbackCategoryRecords);
      setCategorySetupNeeded(Boolean(categories.needsSetup));
      setMetrics(dashboard.metrics || metrics);
    } finally {
      setCatalogLoading(false);
    }
  }

  async function addProduct(event) {
    event.preventDefault();
    if (productSaving) return;
    const productForm = event.currentTarget;
    const form = new FormData(productForm);
    setProductSaving(true);
    setCatalogLoading(true);
    try {
      const mediaImages = await uploadProductMedia();
      const seoTitle = String(form.get("seoTitle") || "").trim();
      const productPayload = {
        name: form.get("name"),
        description: form.get("description") || "",
        category: form.get("category"),
        subcategory: form.get("subcategory") || "",
        collection: form.get("collection") || "",
        productType: form.get("productType") || "",
        price: Number(form.get("price")),
        compare_at_price: Number(form.get("comparePrice") || 0) || null,
        sku: form.get("sku"),
        sizes: selectedSizes,
        colors: selectedColors,
        variants: selectedSizes.flatMap((size) => selectedColors.map((color) => ({
          size,
          color,
          sku: `${form.get("sku") || "BST"}-${size}-${color}`.replace(/\s+/g, "-").toUpperCase(),
          stock: Math.max(0, Math.floor(Number(form.get("stock") || 0) / Math.max(1, selectedSizes.length * selectedColors.length))),
        }))),
        tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
        status: form.get("status") || "Active",
        publishDate: form.get("publishDate") || "",
        images: mediaImages.length
          ? mediaImages
          : ["/bustaniya-campaign-hero-v4.png"],
        delivery_fee_mode: form.get("deliveryFeeMode") || "inherit",
        delivery_fee_pkr: form.get("deliveryFeeMode") === "paid"
          ? Number(form.get("deliveryFee") || 200)
          : null,
        deliveryInfo: String(form.get("deliveryInfo") || "").trim(),
        instagramVideoUrl: String(form.get("instagramVideoUrl") || "").trim(),
        cost_total_pkr: totalProductCost,
        cost_breakdown: {
          ...costBreakdown,
          metadata: {
            fabricDetails: "",
            careInstructions: "",
            deliveryInfo: String(form.get("deliveryInfo") || "").trim(),
            instagramVideoUrl: String(form.get("instagramVideoUrl") || "").trim(),
            vendor: String(form.get("vendor") || "").trim(),
            barcode: String(form.get("barcode") || "").trim(),
            weight: String(form.get("weight") || "").trim(),
            weightUnit: String(form.get("weightUnit") || "kg"),
            countryOfOrigin: String(form.get("countryOfOrigin") || "Pakistan"),
            hsTariffCode: String(form.get("hsTariffCode") || "").trim(),
            seoTitle,
            seoDescription: String(form.get("seoDescription") || "").trim(),
            urlHandle: String(form.get("urlHandle") || "").trim(),

            compareAtPrice: Number(form.get("comparePrice") || 0) || null,
            status: form.get("status") || "Active",
            productType: form.get("productType") || "",
            tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
            publishDate: form.get("publishDate") || "",
          },
        },
      };

      if (!editingProduct) {
        productPayload.is_new = true;
        productPayload.is_bestseller = false;
      }

      const response = await fetch("/api/admin/catalog", {
        method: editingProduct ? "PATCH" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(editingProduct ? { productId: editingProduct.id } : {}),
          product: productPayload,
          stock: Number(form.get("stock")),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save product.");
      await loadAdminData();
      setProductMedia([]);
      setMediaError("");
      setEditingProduct(null);
      setShowProductForm(false);
    } catch (saveError) {
      setOrdersError(saveError.message);
    } finally {
      setProductSaving(false);
      setCatalogLoading(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin";
    }
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.readAsDataURL(file);
    });
  }

  async function addProductFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setMediaError("");

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const oversized = imageFiles.find((file) => file.size > 10 * 1024 * 1024);
    if (imageFiles.length !== files.length) {
      setMediaError("Please upload image files only: PNG, JPG or WEBP.");
      return;
    }
    if (oversized) {
      setMediaError(`${oversized.name} is larger than 10MB.`);
      return;
    }
    if (productMedia.length + imageFiles.length > 8) {
      setMediaError("You can add up to 8 product photos.");
      return;
    }

    try {
      const items = await Promise.all(imageFiles.map(async (file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        file,
        src: await readImageFile(file),
      })));
      setProductMedia((current) => [...current, ...items]);
    } catch (error) {
      setMediaError(error.message || "Unable to load these photos.");
    }
  }

  function addProductImageUrl() {
    const trimmedUrl = productImageUrl.trim();
    if (!trimmedUrl) {
      setMediaError("Paste a Cloudinary image link first.");
      return;
    }
    if (!/^https?:\/\//i.test(trimmedUrl) && !trimmedUrl.startsWith("/")) {
      setMediaError("Image URL must start with http://, https:// or /.");
      return;
    }
    if (!/\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(trimmedUrl) && !trimmedUrl.includes("res.cloudinary.com")) {
      setMediaError("Please use a direct image link, for example a Cloudinary image URL.");
      return;
    }
    if (productMedia.length >= 8) {
      setMediaError("You can add up to 8 product photos.");
      return;
    }
    setMediaError("");
    setProductImageUrl("");
    setProductMedia((current) => [
      ...current,
      { id: `url-${Date.now()}`, name: "Cloudinary image", src: trimmedUrl },
    ]);
  }

  function removeProductMedia(id) {
    setProductMedia((current) => current.filter((item) => item.id !== id));
  }

  async function uploadProductMedia() {
    if (!productMedia.length) return [];
    const form = new FormData();
    const uploadItems = productMedia.filter((item) => item.file);
    uploadItems.forEach((item) => form.append("files", item.file, item.name));
    if (!uploadItems.length) return productMedia.map((item) => item.src);

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: form,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to upload product photos.");

    const uploadedUrls = [...(result.urls || [])];
    return productMedia.map((item) => item.file ? uploadedUrls.shift() : item.src).filter(Boolean);
  }

  function closeProductForm() {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductCategory("Kurtis");
    setProductMedia([]);
    setProductImageUrl("");
    setMediaError("");
  }

  async function updateProductDelivery(product, mode) {
    let fee = null;
    if (mode === "paid") {
      const entered = window.prompt(
        "Enter this product's COD delivery fee (PKR):",
        String(product.deliveryFee || 200)
      );
      if (entered === null) return;
      fee = Number(entered);
      if (!Number.isFinite(fee) || fee < 0) {
        setOrdersError("Please enter a valid delivery fee.");
        return;
      }
    }
    setCatalogLoading(true);
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          product: {
            delivery_fee_mode: mode,
            delivery_fee_pkr: fee,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update delivery rule.");
      await loadAdminData();
    } catch (saveError) {
      setOrdersError(saveError.message);
    } finally {
      setCatalogLoading(false);
    }
  }

  async function adjustInventory(productId, change, reason) {
    const response = await fetch("/api/admin/catalog", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "adjust", productId, change, reason }),
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || "Unable to adjust inventory.");
      setOrdersError(error.message);
      throw error;
    }
    await loadAdminData();
  }

  async function createCustomInventory(item) {
    setCatalogLoading(true);
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product: {
            name: item.name,
            description: "Custom inventory item",
            category: "Custom Inventory",
            price: 0,
            sku: item.sku,
            sizes: [],
            colors: [],
            images: ["/bustaniya-campaign-hero-v4.png"],
            is_new: false,
            is_bestseller: false,
            delivery_fee_mode: "inherit",
            delivery_fee_pkr: null,
          },
          stock: item.stock,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to add custom inventory.");
      await loadAdminData();
      return true;
    } catch (saveError) {
      setOrdersError(saveError.message);
      throw saveError;
    } finally {
      setCatalogLoading(false);
    }
  }

  async function createProductionBatch(batch) {
    setCatalogLoading(true);
    try {
      const response = await fetch("/api/admin/production-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(batch) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save production batch.");
      await loadAdminData();
      return result.batch;
    } catch (error) {
      setOrdersError(error.message);
      throw error;
    } finally { setCatalogLoading(false); }
  }

  async function saveCategory(payload) {
    setCategorySaving(true);
    setOrdersError("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: payload.id ? "PATCH" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(payload.id ? { categoryId: payload.id } : {}),
          category: payload,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save category.");
      if (result.needsSetup) {
        setCategorySetupNeeded(true);
        setCatalogCategories(result.categories || fallbackCategoryRecords);
        setOrdersError(`Run ${result.setupSql || "scripts/supabase-catalog-categories.sql"} in Supabase before saving live categories.`);
        return false;
      }
      await loadAdminData();
      return true;
    } catch (error) {
      setOrdersError(error.message);
      return false;
    } finally {
      setCategorySaving(false);
    }
  }

  async function archiveCategory(category) {
    setCategorySaving(true);
    setOrdersError("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categoryId: category.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to archive category.");
      if (result.needsSetup) {
        setCategorySetupNeeded(true);
        setOrdersError(`Run ${result.setupSql || "scripts/supabase-catalog-categories.sql"} in Supabase before archiving categories.`);
        return;
      }
      await loadAdminData();
    } catch (error) {
      setOrdersError(error.message);
    } finally {
      setCategorySaving(false);
    }
  }

  const visibleNavItems = navItems.filter((item) =>
    canUseAdminArea(currentAdminUser, navPermissionMap[item.name])
  );
  const canAccessActive = canUseAdminArea(currentAdminUser, navPermissionMap[active]);
  const mainCategoryOptions = catalogCategories.filter((category) => !category.parentSlug && category.status !== "Archived");
  const activeCategoryRecord = mainCategoryOptions.find((category) => category.name === productCategory) || mainCategoryOptions[0];
  const productSubcategoryOptions = activeCategoryRecord
    ? catalogCategories.filter((category) => category.parentSlug === activeCategoryRecord.slug && category.status !== "Archived")
    : [];

  // The admin dashboard depends on browser-only session, timezone and cached
  // catalogue state. Render a deterministic shell first to avoid React
  // hydration failures that disable sidebar interactions in production.
  if (!adminReady || !adminAuthChecked) {
    return <AdminLoadingShell />;
  }

  if (!currentAdminUser) return <AdminLogin />;

  return (
    <main className="adminShell">
      <aside className={sidebarOpen ? "adminSidebar sidebarVisible" : "adminSidebar"}>
        <div className="adminLogo"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /><span>ADMIN</span></div>
        <button className="closeSidebar" onClick={() => setSidebarOpen(false)} aria-label="Close admin navigation"><X /></button>
        <nav>
          {visibleNavItems.map(({ name, icon: Icon, count, section }, index) => (
            <div className="adminNavItem" key={name}>
              {(index === 0 || visibleNavItems[index - 1].section !== section) && <p>{section}</p>}
              <a href={`/admin?section=${encodeURIComponent(name)}`} className={active === name ? "active" : ""} onClick={(event) => { event.preventDefault(); navigateAdminSection(name); }}>
                <Icon /> <span>{name}</span>{count && <b>{count}</b>}
              </a>
            </div>
          ))}
        </nav>
        <div className="adminStoreCard">
          <div>B</div><span><b>Bustaniya</b><small>Online store</small></span><ChevronDown />
        </div>
        <button className="adminSidebarLogout" onClick={handleLogout} disabled={loggingOut}>
          <LogOut />
          <span>{loggingOut ? "Logging out" : "Logout"}</span>
        </button>
      </aside>

      <section className="adminMain">
        <header className="adminTopbar">
          <button className="adminMenu" onClick={() => setSidebarOpen(true)} aria-label="Open admin navigation"><Menu /></button>
          {active === "Products" ? <div className="adminSearch"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." aria-label="Search products" /></div> : <div className="adminTopbarContext"><b>{active}</b><span>Bustaniya admin</span></div>}
          <div className="adminTopActions">
            <a href="/" target="_blank">View store</a>
            <div className="adminAvatar">{(currentAdminUser?.name || "BA").slice(0, 2).toUpperCase()}</div>
            <button
              className="adminLogoutButton"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Logout"
              aria-label="Logout from admin"
            >
              <LogOut />
              <span>{loggingOut ? "Logging out" : "Logout"}</span>
            </button>
          </div>
        </header>

        <div className="adminContent">
          {ordersError && active !== "Orders" && <div className="adminErrorBanner">{ordersError}</div>}
          {!canAccessActive && <div className="adminErrorBanner">You do not have access to this admin area.</div>}
          {canAccessActive && active === "Dashboard" && <DashboardHome setActive={navigateAdminSection} orders={orders} products={products} metrics={metrics} connected={ordersConnected} loading={ordersLoading || catalogLoading} ordersError={ordersLoadError} currentAdminUser={currentAdminUser} onRefresh={() => refreshWorkspace()} onAddProduct={() => { navigateAdminSection("Products"); openNewProductForm(); }} onOpenOrder={(order) => { setRequestedOrderId(order.order_number || order.id); navigateAdminSection("Orders"); }} />}
          {canAccessActive && active === "Events" && <EventsWorkspace onNavigateToSettings={() => navigateAdminSection("Settings", { focus: "Tracking" })} onNavigateToOrder={(orderId) => { setRequestedOrderId(orderId); navigateAdminSection("Orders"); }} />}
          {canAccessActive && active === "Products" && <ProductsPanel products={filteredProducts} search={search} setSearch={setSearch} onAdd={openNewProductForm} onEdit={openEditProductForm} onDelete={deleteProduct} onDeliveryChange={updateProductDelivery} loading={catalogLoading} initialView={requestedAdminFocus?.section === "Products" ? requestedAdminFocus.focus : ""} tableDensity={tableDensity} setTableDensity={handleTableDensityChange} />}
          {canAccessActive && active === "Categories" && <CategoriesPanel categories={catalogCategories} products={products} onSave={saveCategory} onArchive={archiveCategory} saving={categorySaving} needsSetup={categorySetupNeeded} />}
          {canAccessActive && active === "Orders" && <OrdersPanel rows={orders} products={products} pagination={ordersPagination} canExport={currentAdminUser?.role === "Owner" || currentAdminUser?.permissions?.includes("orders.export")} currentAdminUser={currentAdminUser} connected={ordersConnected} loading={ordersLoading} error={ordersError} onRetry={() => loadOrders()} onPageChange={(page) => loadOrders({ page })} initialSelectedId={requestedOrderId} onInitialSelectionHandled={() => setRequestedOrderId("")} tableDensity={tableDensity} setTableDensity={handleTableDensityChange} onNavigateToEvents={() => navigateAdminSection("Events")} />}
          {canAccessActive && active === "Inventory" && <InventoryPanel products={products} movements={inventoryMovements} orders={orders} connected={ordersConnected} currentAdminUser={currentAdminUser} onAdjust={adjustInventory} onCreateCustomInventory={createCustomInventory} onCreateProductionBatch={createProductionBatch} onOpenOrder={(order) => { setRequestedOrderId(order.id); navigateAdminSection("Orders"); }} initialView={requestedAdminFocus?.section === "Inventory" ? requestedAdminFocus.focus : ""} />}
          {canAccessActive && active === "Customers" && <CustomersPanel orders={orders} onOpen={setWorkspace} />}
          {canAccessActive && active === "Finances" && <FinancePanel orders={orders} products={products} connected={ordersConnected} currentAdminUser={currentAdminUser} initialTab={requestedAdminFocus?.section === "Finances" ? requestedAdminFocus.focus : ""} />}
          {canAccessActive && active === "Courier Ops" && <CourierOperationsPanel />}
          {canAccessActive && active === "Couriers" && <CouriersPanel />}
          {canAccessActive && active === "Settings" && <SettingsPanel onOpen={setWorkspace} signedInUser={currentAdminUser} initialTab={requestedAdminFocus?.section === "Settings" ? requestedAdminFocus.focus : ""} />}
        </div>
      </section>

      <MobileBottomNav active={active} setActive={navigateAdminSection} />
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        isDanger={confirmModalState.isDanger}
        onConfirm={confirmModalState.onConfirm}
        onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {showProductForm && <>
        <div className="adminOverlay" onClick={closeProductForm} />
        <aside className="productFormDrawer">
          <div className="productDrawerHeader"><div><p>PRODUCT CATALOGUE</p><h2>{editingProduct ? "Edit product" : "Add product"}</h2></div><button onClick={closeProductForm}><X /></button></div>
          <form onSubmit={addProduct} key={editingProduct?.id || "new-product"}>
            <section className="productEditorCard">
              <h3>Basic information</h3>
              <label>Product title<input name="name" required defaultValue={editingProduct?.name || ""} placeholder="e.g. Gulnaar Corset Kurti" /></label>
              <div className="productDetailsEditor">
                <div className="productDetailsEditorHead">
                  <div>
                    <label htmlFor="product-details-editor">Product details</label>
                    <p>Add description, fabric, styling and care instructions together.</p>
                  </div>
                  <div className="productDetailsToolbar" aria-label="Product details formatting">
                    <button type="button" onClick={() => insertProductDetailsFormat("heading")} aria-label="Insert heading">Heading</button>
                    <button type="button" onClick={() => insertProductDetailsFormat("bullet")} aria-label="Insert bullet point">• Bullet</button>
                  </div>
                </div>
                <textarea
                  id="product-details-editor"
                  ref={productDetailsEditorRef}
                  name="description"
                  rows="11"
                  defaultValue={getUnifiedProductDetails(editingProduct)}
                  placeholder={"## Fabric & material\n- Premium lawn fabric\n- Embroidered neckline\n\n## Care instructions\n- Gentle hand wash in cold water"}
                />
                <p className="productDetailsEditorHint">Use <b>Heading</b> for section titles and <b>Bullet</b> for features. Your formatting will appear on the product page.</p>
              </div>
            </section>

            <section className="productEditorCard">
              <div className="editorHeading"><div><h3>Media</h3><p>Paste Cloudinary product image links</p></div><span>{productMedia.length}/8 images</span></div>
              <div className="mediaLinkRow">
                <input value={productImageUrl} onChange={(event) => setProductImageUrl(event.target.value)} placeholder="https://res.cloudinary.com/.../product-photo.jpg" />
                <button type="button" onClick={addProductImageUrl}><Plus /> Add link</button>
              </div>
              {mediaError && <p className="mediaError">{mediaError}</p>}
              {productMedia.length > 0 && <div className="mediaPreviewGrid">
                {productMedia.map((item) => <div className="mediaPreview" key={item.id}>
                  <img src={item.src} alt={item.name} />
                  <button type="button" onClick={() => removeProductMedia(item.id)} aria-label={`Remove ${item.name}`}><X /></button>
                </div>)}
              </div>}
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8e3" }}>
                <label>
                  Instagram Reel / Video URL (optional)
                  <input
                    name="instagramVideoUrl"
                    type="url"
                    defaultValue={editingProduct?.instagramVideoUrl || editingProduct?.cost_breakdown?.metadata?.instagramVideoUrl || ""}
                    placeholder="https://www.instagram.com/reel/C8XYZ123/ or https://www.instagram.com/p/C8XYZ123/"
                  />
                  <small className="settingsHint" style={{ display: "block", marginTop: "4px", color: "#64748b", fontSize: "11px" }}>
                    Paste an Instagram Reel or Post link to embed an interactive showcase reel on this product page.
                  </small>
                </label>
              </div>
            </section>


            <section className="productEditorCard">
              <h3>Product organization</h3>
              <div className="formRow">
                <label>Category<select name="category" value={productCategory} onChange={(event) => setProductCategory(event.target.value)}>{mainCategoryOptions.map((category) => <option value={category.name} key={category.slug}>{category.name}</option>)}</select></label>
                <label>Product type<select name="productType" defaultValue={editingProduct?.productType || "Women's clothing"}><option>Women&apos;s clothing</option><option>Kurti</option><option>Trouser</option><option>Co-ord</option></select></label>
              </div>
              {!!productSubcategoryOptions.length && <label>Subcategory<select name="subcategory" defaultValue={editingProduct?.subcategory || productSubcategoryOptions[0]?.slug}>{productSubcategoryOptions.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></label>}
              <div className="formRow"><label>Vendor<input name="vendor" defaultValue={editingProduct?.vendor || "Bustaniya"} /></label><label>Collection<input name="collection" defaultValue={editingProduct?.collection || ""} placeholder="Summer Collection, New Arrivals..." /></label></div>
              <label>Tags<input name="tags" defaultValue={Array.isArray(editingProduct?.tags) ? editingProduct.tags.join(", ") : ""} placeholder="summer, printed, cotton, new-arrival" /></label>
            </section>

            <section className="productEditorCard">
              <h3>Cost, pricing & profit</h3>
              <p>Every figure in this section is for one item / one suit. Product estimate uses saved unit cost and 4% PostEx deduction; actual GST is taken from synced PostEx CPR/order data after sale.</p>
              {costBreakdown.costSource === "production_batch" && <div className="inventoryAlert materialAlert"><Package /><div><b>Production batch cost is linked <HelpHint text="This per-item cost is calculated from the batch's direct costs plus its share of common costs, divided by finished quantity." /></b><span>Batch {costBreakdown.productionBatchId} produced {Number(costBreakdown.productionBatchQuantity || 0).toLocaleString()} items. Its total cost of Rs. {Number(costBreakdown.productionBatchTotalCost || 0).toLocaleString()} has been divided into the per-item costs below.</span></div></div>}
              <div className="formRow"><label>Selling price (PKR)<input name="price" required type="number" min="0" value={productPrice || ""} onChange={(e) => setProductPrice(e.target.value)} placeholder="4,990" /></label><label>Compare-at price<input name="comparePrice" type="number" min="0" defaultValue={editingProduct?.compareAtPrice || editingProduct?.compare_at_price || ""} placeholder="5,990" /></label></div>
              <p className="fieldTitle">Per-item cost breakdown (PKR)</p>
              <div className="formRow"><label>Fabric<input type="number" min="0" value={costBreakdown.fabric || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, fabric: e.target.value }))} /></label><label>Stitching<input type="number" min="0" value={costBreakdown.stitching || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, stitching: e.target.value }))} /></label></div>
              <div className="formRow"><label>Embellishment<input type="number" min="0" value={costBreakdown.embellishment || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, embellishment: e.target.value }))} /></label><label>Packaging<input type="number" min="0" value={costBreakdown.packaging || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, packaging: e.target.value }))} /></label></div>
              <div className="formRow"><label>Travel / transport cost<input type="number" min="0" value={costBreakdown.delivery || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, delivery: e.target.value }))} /></label><label>Other cost<input type="number" min="0" value={costBreakdown.other || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, other: e.target.value }))} /></label></div>
              <div className="financeStatement">
                <div><span>Cost per item</span><b>{`Rs. ${totalProductCost.toLocaleString()}`}</b></div>
                <div><span>PostEx GST per item</span><b>Actual after sync</b></div>
                <div><span>PostEx deduction estimate (4%)</span><b>- {`Rs. ${productTax.toLocaleString()}`}</b></div>
                <div className="statementTotal"><span>Final profit per item</span><b>{`Rs. ${productFinalProfit.toLocaleString()}`}</b></div>
              </div>
            </section>

            <section className="productEditorCard">
              <h3>Inventory</h3>
              <div className="formRow"><label>SKU<input name="sku" defaultValue={editingProduct?.sku || editingProduct?.articleNumber || ""} placeholder="BST-KRT-001" /></label><label>Barcode<input name="barcode" defaultValue={editingProduct?.barcode || ""} placeholder="ISBN, UPC or GTIN" /></label></div>
              <label className="checkLabel"><input type="checkbox" defaultChecked /> Track quantity</label>
              <div className="stockLocation"><div><Store /><span><b>Bustaniya warehouse</b><small>Pakistan</small></span></div><label>Available<input name="stock" required type="number" defaultValue={editingProduct?.stock ?? 10} /></label></div>
              <label className="checkLabel"><input type="checkbox" /> Continue selling when out of stock</label>
            </section>

            <section className="productEditorCard">
              <div className="editorHeading"><div><h3>Variants</h3><p>Add sizes and colours</p></div><span>{selectedSizes.length * selectedColors.length} combinations</span></div>
              <div className="variantGroup">
                <div className="variantLabel"><b>Size</b><span>{selectedSizes.length} selected</span><button type="button" onClick={() => setSelectedSizes(selectedSizes.length === apparelSizes.length ? [] : apparelSizes)}>Select all</button></div>
                <div className="variantSearch"><Search /><input value={sizeSearch} onChange={(e) => setSizeSearch(e.target.value)} placeholder="Search XXS, UK 12, EU 40, Waist 30..." /></div>
                <div className="variantChips scrollableVariants">{apparelSizes.filter(size => size.toLowerCase().includes(sizeSearch.toLowerCase())).map(size => <button type="button" className={selectedSizes.includes(size) ? "selected" : ""} key={size} onClick={() => setSelectedSizes(current => current.includes(size) ? current.filter(x => x !== size) : [...current,size])}>{size}</button>)}</div>
              </div>
              <div className="variantGroup">
                <div className="variantLabel"><b>Colour</b><span>{selectedColors.length} selected</span><button type="button" onClick={() => setSelectedColors(selectedColors.length === fashionColors.length ? [] : fashionColors.map(color => color.name))}>Select all</button></div>
                <div className="variantSearch"><Search /><input value={colorSearch} onChange={(e) => setColorSearch(e.target.value)} placeholder="Search colour name..." /></div>
                <div className="variantChips colorChips scrollableVariants">{fashionColors.filter(color => color.name.toLowerCase().includes(colorSearch.toLowerCase())).map(color => <button type="button" className={selectedColors.includes(color.name) ? "selected" : ""} key={color.name} onClick={() => setSelectedColors(current => current.includes(color.name) ? current.filter(x => x !== color.name) : [...current,color.name])}><i className="swatch" style={{background:color.hex}} />{color.name}</button>)}</div>
              </div>
              <div className="variantPreview"><span>Variant combinations will be created automatically</span><b>{selectedSizes.length * selectedColors.length} variants</b></div>
            </section>

            <section className="productEditorCard">
              <h3>Shipping &amp; Delivery</h3>
              <label className="checkLabel"><input type="checkbox" defaultChecked /> This is a physical product</label>
              <input type="hidden" name="deliveryFeeMode" value="inherit" />
              <div className="formRow"><label>Delivery fee per order<input readOnly value="Rs. 200" /></label><label>Rule<input readOnly value="Applied once, even for multiple products" /></label></div>
              <p className="shippingRuleHint">Store rule: product prices exclude delivery. Every order has one flat Rs. 200 delivery fee, regardless of item quantity.</p>
              <label>
                Custom delivery information (optional override)
                <textarea
                  name="deliveryInfo"
                  rows="3"
                  defaultValue={editingProduct?.deliveryInfo || editingProduct?.cost_breakdown?.metadata?.deliveryInfo || ""}
                  placeholder="e.g. Dispatched within 24-48 hours. Delivery in 3-5 business days across Pakistan."
                />
                <small className="settingsHint" style={{ display: "block", marginTop: "4px", color: "#64748b", fontSize: "11px" }}>
                  Leave empty to use the store&apos;s global delivery information and policies.
                </small>
              </label>
              <div className="formRow"><label>Weight<input name="weight" type="number" step="0.1" defaultValue={editingProduct?.weight || ""} placeholder="0.5" /></label><label>Unit<select name="weightUnit" defaultValue={editingProduct?.weightUnit || "kg"}><option>kg</option><option>g</option></select></label></div>
              <div className="formRow"><label>Country of origin<select name="countryOfOrigin" defaultValue={editingProduct?.countryOfOrigin || "Pakistan"}><option>Pakistan</option></select></label><label>HS tariff code<input name="hsTariffCode" defaultValue={editingProduct?.hsTariffCode || ""} placeholder="Optional" /></label></div>
            </section>


            <section className="productEditorCard">
              <h3>Search engine listing</h3>
              <div className="seoPreview"><b>Bustaniya · Product title</b><span>https://bustaniya.pk/products/product-title</span><p>Your product description will appear here in search results.</p></div>
              <label>Page title<input name="seoTitle" maxLength="70" defaultValue={editingProduct?.seoTitle || ""} placeholder="Product title — Bustaniya" /></label>
              <label>Meta description<textarea name="seoDescription" rows="3" maxLength="160" defaultValue={editingProduct?.seoDescription || ""} placeholder="Describe this product for Google search..." /></label>
              <label>URL handle<input name="urlHandle" defaultValue={editingProduct?.urlHandle || ""} placeholder="gulnaar-corset-kurti" /></label>
            </section>

            <section className="productEditorCard">
              <h3>Publishing</h3>
              <div className="formRow"><label>Status<select name="status" defaultValue={editingProduct?.status || "Active"}><option>Active</option><option>Draft</option><option>Archived</option></select></label><label>Publishing date<input name="publishDate" type="date" defaultValue={editingProduct?.publishDate || ""} /></label></div>
              <p className="fieldTitle">Sales channels</p>
              <label className="checkLabel"><input type="checkbox" defaultChecked /> Online Store</label>
              <label className="checkLabel"><input type="checkbox" /> Instagram / Facebook</label>
              <label className="checkLabel"><input type="checkbox" /> Point of Sale</label>
            </section>

            <div className="drawerActions">
              <button type="button" onClick={closeProductForm} disabled={productSaving}>Discard</button>
              <button
                type="submit"
                className={productSaving ? "saveProduct saving" : "saveProduct"}
                disabled={productSaving}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: productSaving ? "not-allowed" : "pointer"
                }}
              >
                {productSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Product...</span>
                  </>
                ) : (
                  editingProduct ? "Update Product" : "Save Product"
                )}
              </button>
            </div>
          </form>
        </aside>
      </>}
      {workspace && <WorkspaceDrawer workspace={workspace} onClose={() => setWorkspace(null)} activity={activity} onSave={(entry) => { setActivity(current => [entry, ...current]); setWorkspace(null); }} />}
    </main>
  );
}

function postexRawTracking(payment) {
  return payment?.raw_response?.tracking?.dist || payment?.rawResponse?.tracking?.dist || {};
}

function postexRawPayment(payment) {
  return payment?.raw_response?.payment?.dist || payment?.rawResponse?.payment?.dist || {};
}

function firstPostexValue(source, keys, fallback = "") {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function postexNumber(source, keys, fallback = 0) {
  const value = Number(firstPostexValue(source, keys, fallback));
  return Number.isFinite(value) ? value : Number(fallback || 0);
}

function postexSettlementAmounts(payment) {
  const tracking = postexRawTracking(payment);
  const invoice = Number(payment.invoice_payment_pkr || postexNumber(tracking, ["invoicePayment", "codAmount", "cod_amount", "amount"], 0));
  const shipping = postexNumber(tracking, ["shippingCharges", "shipping_charges", "deliveryCharges", "transactionFee"], Number(payment.transaction_fee_pkr || 0));
  const upfrontCharges = postexNumber(tracking, ["upfrontCharges", "upfront_charges", "upfrontCharge"], 0);
  const gst = postexNumber(tracking, ["gst", "gstAmount", "transactionTax"], Number(payment.transaction_tax_pkr || 0));
  const deduction4 = postexNumber(tracking, ["deduction", "deductionAmount", "deduction4", "transactionDeduction"], Math.round(invoice * 4) / 100);
  const returnFee = Number(payment.reversal_fee_pkr || 0) + Number(payment.reversal_tax_pkr || 0);
  const calculatedNet = Math.round((invoice - shipping - upfrontCharges - gst - deduction4 - returnFee) * 100) / 100;
  const rawNet = firstPostexValue(tracking, ["netAmount", "net_amount", "payableAmount"], "");
  const net = rawNet !== "" ? Number(rawNet) : calculatedNet;
  return { invoice, shipping, upfrontCharges, gst, deduction4, returnFee, net: Number.isFinite(net) ? net : calculatedNet };
}

function postexAllocationMap(items = []) {
  return items.reduce((map, item) => {
    const key = String(item.order_payment_id);
    map.set(key, Number(map.get(key) || 0) + Number(item.allocated_received_pkr || 0));
    return map;
  }, new Map());
}

function isVoidedPostexBatch(batch = {}) {
  return batch.status === "voided" || String(batch.notes || "").startsWith("[VOIDED]");
}

function postexCalculatedSummary(snapshot = {}) {
  const payments = Array.isArray(snapshot?.payments) ? snapshot.payments : [];
  const allocations = postexAllocationMap(Array.isArray(snapshot?.items) ? snapshot.items : []);
  const deliveredPayments = payments.filter((payment) => String(payment.courier_status || "").toLowerCase().includes("deliver"));
  const returnedPayments = payments.filter((payment) => String(payment.courier_status || "").toLowerCase().includes("return"));
  const deliveredAmounts = deliveredPayments.map(postexSettlementAmounts);
  const returnedAmounts = returnedPayments.map(postexSettlementAmounts);
  const sumAmounts = (items, key) => Math.round(items.reduce((sum, item) => sum + Number(item[key] || 0), 0) * 100) / 100;
  const deliveredPostexDeductionsPkr = Math.round(deliveredAmounts.reduce((sum, item) =>
    sum + Number(item.shipping || 0) + Number(item.upfrontCharges || 0) + Number(item.gst || 0) + Number(item.deduction4 || 0) + Number(item.returnFee || 0), 0) * 100) / 100;
  const returnedPostexLossPkr = Math.round(returnedAmounts.reduce((sum, item) =>
    sum + Number(item.shipping || 0) + Number(item.upfrontCharges || 0) + Number(item.gst || 0) + Number(item.deduction4 || 0) + Number(item.returnFee || 0) + Math.max(0, -Number(item.net || 0)), 0) * 100) / 100;
  const totalExpectedNetPkr = Math.round(deliveredAmounts.reduce((sum, item) => sum + Number(item.net || 0), 0) * 100) / 100;
  const outstandingPkr = Math.round(deliveredPayments.reduce((sum, payment) => {
    const net = Number(postexSettlementAmounts(payment).net || 0);
    return sum + Math.max(0, net - Number(allocations.get(String(payment.id)) || 0));
  }, 0) * 100) / 100;
  return {
    totalExpectedNetPkr,
    outstandingPkr,
    allocations,
    deliveredPostexDeductionsPkr,
    returnedPostexLossPkr,
    postexShippingPkr: sumAmounts(deliveredAmounts, "shipping") + sumAmounts(returnedAmounts, "shipping"),
    postexGstPkr: sumAmounts(deliveredAmounts, "gst") + sumAmounts(returnedAmounts, "gst"),
    postexDeduction4Pkr: sumAmounts(deliveredAmounts, "deduction4") + sumAmounts(returnedAmounts, "deduction4"),
    deliveredPostexGstPkr: sumAmounts(deliveredAmounts, "gst"),
    deliveredPostexDeduction4Pkr: sumAmounts(deliveredAmounts, "deduction4"),
  };
}

function DashboardHome({ setActive, orders, products, metrics, connected, loading, ordersError, currentAdminUser, onRefresh, onAddProduct, onOpenOrder }) {
  // Dates are initialized only in the browser so the server and client render
  // the same initial markup regardless of their timezone.
  const [dashboardNow, setDashboardNow] = useState(null);
  const [overduePayables, setOverduePayables] = useState(0);
  const [financeSnapshot, setFinanceSnapshot] = useState({ transactions: [], supplierBills: [], packagingExpense: 0, deliveryExpense: 0, expenses: [], postex: { summary: {} } });
  const [dashboardPeriod, setDashboardPeriod] = useState("7");
  const [dashboardUpdatedAt, setDashboardUpdatedAt] = useState(null);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(false);
  const [financeSnapshotStatus, setFinanceSnapshotStatus] = useState("loading");
  const [pixelFunnel, setPixelFunnel] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: Number(dashboardPeriod) || 7, limit: 1 }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => { if (!cancelled && result?.summary) setPixelFunnel(result.summary); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [dashboardPeriod]);
  const isOwnerDashboard = !currentAdminUser || currentAdminUser.role === "Owner";
  useEffect(() => { setDashboardNow(new Date()); }, []);
  async function refreshDashboardFinance() {
    if (!isOwnerDashboard) {
      setFinanceSnapshotStatus("ready");
      setDashboardUpdatedAt(new Date());
      return;
    }
    try {
      const response = await fetch("/api/admin/finance-transactions", { cache: "no-store" });
      const result = response.ok ? await response.json() : null;
      const snapshot = { transactions: result?.transactions || [], supplierBills: result?.supplierBills || [], packagingExpense: Number(result?.packagingExpense || 0), deliveryExpense: Number(result?.deliveryExpense || 0), expenses: Array.isArray(result?.manualExpenses) ? result.manualExpenses : [], postex: result?.postex || { summary: {} } };
      setFinanceSnapshot(snapshot);
      setFinanceSnapshotStatus("ready");
      const today = new Date().toISOString().slice(0, 10);
      setOverduePayables(snapshot.supplierBills.filter((bill) => bill.status !== "paid" && bill.dueDate && bill.dueDate < today && Number(bill.total || 0) > Number(bill.paid || 0)).length);
    } catch { setFinanceSnapshotStatus("error"); }
    setDashboardUpdatedAt(new Date());
  }
  useEffect(() => { refreshDashboardFinance(); }, []);
  async function refreshDashboard() {
    setDashboardRefreshing(true);
    try {
      await Promise.all([refreshDashboardFinance(), onRefresh?.()]);
    } finally {
      setDashboardRefreshing(false);
    }
  }
  const liveOrders = connected ? orders : [];
  const dashboardSales = connected
    ? liveOrders.filter(isDeliveredOrder).reduce((sum, order) => sum + Number(order.total || 0), 0)
    : Number(metrics.totalSales || 0);
  const dashboardOrderCount = connected ? liveOrders.length : Number(metrics.orders || 0);
  const dashboardCustomerCount = connected
    ? new Set(liveOrders.map(orderCustomerIdentity).filter(Boolean)).size
    : Number(metrics.customers || 0);
  const deliveredItems = liveOrders.filter(isDeliveredOrder).flatMap((order) => normalizeOrderItems(order.raw || order));
  const productCosts = new Map((products || []).map((product) => [String(product.id), Number(product.costTotalPkr || 0)]));
  const dashboardCogs = deliveredItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(productCosts.get(String(item.productId)) || 0), 0);
  const dashboardReturns = liveOrders.filter(isReturnedOrder).length;
  const dashboardCod = liveOrders.filter(isPendingCodOrder).reduce((sum, order) => sum + orderMoney(order).cod, 0);
  const dashboardProductRevenue = deliveredItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const dashboardDeliveryCollected = Math.max(0, dashboardSales - dashboardProductRevenue);
  const dashboardCalculatedPostex = postexCalculatedSummary(financeSnapshot.postex || {});
  const dashboardGst = Math.round(Number(dashboardCalculatedPostex.deliveredPostexGstPkr || 0));
  const dashboardTax = Math.round(Number(dashboardCalculatedPostex.deliveredPostexDeduction4Pkr || 0));
  const dashboardActualPostexDeductions = Math.round(Number(dashboardCalculatedPostex.deliveredPostexDeductionsPkr || 0));
  const dashboardReturnPostexLoss = Math.round(Number(dashboardCalculatedPostex.returnedPostexLossPkr || 0));
  const dashboardTaxes = dashboardGst + dashboardTax;
  const dashboardCourierCost = Math.max(0, dashboardActualPostexDeductions - dashboardTaxes);
  const dashboardActiveTransactions = financeSnapshot.transactions.filter(isActiveFinanceEntry);
  const dashboardLegacyInventory = financeSnapshot.expenses.filter((item) => FINANCE_INVENTORY_CATEGORIES.has(normalizedFinanceCategory(item.category))).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardLegacyOperating = financeSnapshot.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0) - dashboardLegacyInventory;
  const dashboardManualExpenses = dashboardLegacyOperating + Number(financeSnapshot.packagingExpense || 0) + Number(financeSnapshot.deliveryExpense || 0);
  const dashboardCashbookExpenses = dashboardActiveTransactions.filter((item) => item.type === "business_expense" && !isInventoryCashExpense(item)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardProductionCashOutflow = dashboardActiveTransactions.filter(isInventoryCashExpense).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardSupplierPayments = dashboardActiveTransactions.filter((item) => item.type === "supplier_payment").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardOwnerInvestments = dashboardActiveTransactions.filter((item) => item.type === "owner_investment").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardOwnerWithdrawals = dashboardActiveTransactions.filter((item) => item.type === "owner_withdrawal").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardOtherIncome = dashboardActiveTransactions.filter((item) => item.type === "other_income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  // A PostEx "settled" status/CPR is reconciliation data, not proof that the
  // money is available in our bank. Available cash only uses receipts that
  // the owner manually verified and entered in the cashbook.
  const dashboardManualPostexReceipts = dashboardActiveTransactions
    .filter((item) => item.type === "postex_bank_receipt")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardPostexBankReceived = dashboardManualPostexReceipts;
  const dashboardCashResetAdjustment = dashboardActiveTransactions
    .filter((item) => item.type === "cash_reset")
    .reduce((sum, item) => sum + financeEntryCashEffect(item), 0);
  const dashboardExpectedPostexNet = Number(dashboardCalculatedPostex.totalExpectedNetPkr || financeSnapshot.postex?.summary?.totalExpectedNetPkr || dashboardSales);
  const dashboardPostexReceivable = Math.max(0, dashboardExpectedPostexNet - dashboardManualPostexReceipts);
  const dashboardReceivedRatio = dashboardExpectedPostexNet > 0 ? Math.min(1, dashboardPostexBankReceived / dashboardExpectedPostexNet) : 0;
  const dashboardCashGstReserve = 0;
  const dashboardCashTaxReserve = 0;
  const dashboardNetProfit = dashboardSales - dashboardCogs - dashboardCourierCost - dashboardReturnPostexLoss - dashboardTaxes - dashboardManualExpenses - dashboardCashbookExpenses;
  const dashboardAvailableCash = dashboardPostexBankReceived + dashboardOwnerInvestments + dashboardOtherIncome + dashboardCashResetAdjustment - dashboardManualExpenses - dashboardLegacyInventory - dashboardCashbookExpenses - dashboardProductionCashOutflow - dashboardSupplierPayments - dashboardOwnerWithdrawals;
  const zeroCostActive = (products || []).filter((product) => productStatus(product) === "Active" && !Number(product.costTotalPkr || 0));
  const lowStockProducts = (products || []).filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5));
  const chartRange = Number(dashboardPeriod);
  const chartDays = dashboardNow
    ? Array.from({ length: chartRange }, (_, index) => {
      const date = startOfDay(dashboardNow);
      date.setDate(date.getDate() - (chartRange - 1 - index));
      return { date, label: chartRange <= 7 ? date.toLocaleDateString("en-PK", { weekday: "short" }) : date.toLocaleDateString("en-PK", { day: "numeric", month: "short" }) };
    })
    : Array.from({ length: 7 }, () => ({ date: null, label: "—" }));
  const salesByDay = chartDays.map(({ date, label }) => ({
    label,
    sales: liveOrders.filter((order) => {
      const orderDate = toOrderDate(order);
      return date && orderDate && isDeliveredOrder(order) && startOfDay(orderDate).getTime() === date.getTime();
    }).reduce((sum, order) => sum + Number(order.total || 0), 0),
  }));
  const salesPeriodTotal = salesByDay.reduce((sum, day) => sum + day.sales, 0);
  const currentPeriodStart = chartDays[0]?.date;
  const previousPeriodStart = currentPeriodStart ? new Date(currentPeriodStart) : null;
  if (previousPeriodStart) previousPeriodStart.setDate(previousPeriodStart.getDate() - chartRange);
  const previousPeriodSales = liveOrders.filter((order) => {
    const orderDate = toOrderDate(order);
    return previousPeriodStart && currentPeriodStart && orderDate && isDeliveredOrder(order) && orderDate >= previousPeriodStart && orderDate < currentPeriodStart;
  }).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const salesPeriodChange = previousPeriodSales > 0 ? Math.round(((salesPeriodTotal - previousPeriodSales) / previousPeriodSales) * 100) : null;
  const maxDailySales = Math.max(...salesByDay.map((day) => day.sales), 1);
  const statusBuckets = {
    Booked: 0,
    Unbooked: 0,
    Attempted: 0,
    Delivered: 0,
    Returned: 0,
    Cancelled: 0,
  };
  liveOrders.forEach((order) => {
    const status = normalizePostexCategory(order.postexStatus || order.status);
    if (orderStatus(order).includes("cancel") || orderStatus(order).includes("fail")) statusBuckets.Cancelled += 1;
    else if (status === "Delivered" || status === "Returned" || status === "Unbooked" || status === "Attempted") statusBuckets[status] += 1;
    else if (status === "Total Orders") statusBuckets.Unbooked += 1;
    else statusBuckets.Booked += 1;
  });
  const statusPalette = { Booked: "#2563eb", Unbooked: "#f59e0b", Attempted: "#8b5cf6", Delivered: "#10b981", Returned: "#ef4444", Cancelled: "#6b7280" };
  const statusEntries = Object.entries(statusBuckets).filter(([, count]) => count > 0);
  let completedPercent = 0;
  const donutStops = statusEntries.map(([label, count]) => {
    const start = completedPercent;
    completedPercent += (count / Math.max(dashboardOrderCount, 1)) * 100;
    return `${statusPalette[label]} ${start}% ${completedPercent}%`;
  });
  const donutStyle = { background: donutStops.length ? `conic-gradient(${donutStops.join(",")})` : "#dedfdc" };
  // Calculate top selling products matching scoped period
  const items = liveOrders
    .filter((order) => {
      const orderDate = toOrderDate(order);
      if (!orderDate) return false;
      const daysAgo = (new Date() - orderDate) / (1000 * 60 * 60 * 24);
      return daysAgo <= chartRange;
    })
    .filter(isDeliveredOrder)
    .flatMap((order) => normalizeOrderItems(order.raw || order));

  const productsById = new Map((products || []).map((product) => [String(product.id), product]));
  const productsBySku = new Map((products || []).map((product) => [String(product.sku || product.articleNumber || "").trim().toLowerCase(), product]).filter(([key]) => key));
  const productsByName = new Map((products || []).map((product) => [String(product.name || "").trim().toLowerCase(), product]));

  const productSales = items.reduce((map, item) => {
    const product = productsById.get(String(item.productId)) || productsBySku.get(String(item.sku || "").trim().toLowerCase()) || productsByName.get(String(item.name || "").trim().toLowerCase());
    const key = product ? `id:${product.id}` : `item:${String(item.sku || item.name || "unknown").trim().toLowerCase()}`;
    const current = map.get(key) || { key, product, name: product?.name || item.name || "Unknown product", sku: product?.sku || product?.articleNumber || item.sku || "—", quantity: 0, image: product?.image };
    current.quantity += Number(item.quantity || 0);
    map.set(key, current);
    return map;
  }, new Map());
  const topProducts = [...productSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 4);

  const deliveredScoped = liveOrders
    .filter((order) => {
      const orderDate = toOrderDate(order);
      if (!orderDate) return false;
      const daysAgo = (new Date() - orderDate) / (1000 * 60 * 60 * 24);
      return daysAgo <= chartRange;
    })
    .filter(isDeliveredOrder);
  const deliveredCount = deliveredScoped.length;
  const averageOrderValue = deliveredCount ? Math.round(salesPeriodTotal / deliveredCount) : 0;
  
  const customerKeys = deliveredScoped.map(orderCustomerIdentity).filter(Boolean);
  const customerOrderCounts = customerKeys.reduce((map, key) => map.set(key, (map.get(key) || 0) + 1), new Map());
  const repeatCustomers = [...customerOrderCounts.values()].filter((count) => count > 1).length;
  const repeatCustomerRate = customerOrderCounts.size ? Math.round((repeatCustomers / customerOrderCounts.size) * 100) : 0;

  if (loading || (isOwnerDashboard && financeSnapshotStatus === "loading")) return <DashboardLoadingState />;
  if (ordersError) return <section className="adminCard ordersConnect"><div><b>Dashboard order data could not be loaded.</b><span>{ordersError}</span></div><button onClick={onRefresh}>Retry</button></section>;

  return <>
    <div className="adminTitle dashboardTitle">
      <div>
        <p>{dashboardNow ? dashboardNow.toLocaleDateString("en-PK", { weekday:"long", day:"numeric", month:"long" }) : "Loading date…"}</p>
        <h1>{dashboardNow && dashboardNow.getHours() < 12 ? "Good morning" : dashboardNow && dashboardNow.getHours() < 17 ? "Good afternoon" : "Good evening"}, Bustaniya</h1>
        <span>{connected ? ("Live store insights" + (dashboardUpdatedAt ? ` · Updated ${dashboardUpdatedAt.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}` : "")) : "Connect Supabase orders to load live store data."}</span>
      </div>
      <div className="dashboardTitleActions">
        <div className="orderTabs" style={{ marginRight: '8px' }}>
          {[["7", "7 Days"], ["30", "30 Days"], ["90", "90 Days"]].map(([val, label]) => (
            <button key={val} className={dashboardPeriod === val ? "active" : ""} onClick={() => setDashboardPeriod(val)}>{label}</button>
          ))}
        </div>
        <button className="dashboardRefresh" onClick={refreshDashboard} disabled={dashboardRefreshing}>
          <RefreshCw className={dashboardRefreshing ? "spinIcon" : ""} /> {dashboardRefreshing ? "Refreshing" : "Refresh"}
        </button>
        <button className="dashboardPrimaryAction" onClick={onAddProduct}><Plus /> Add product</button>
      </div>
    </div>

    {isOwnerDashboard && financeSnapshotStatus === "error" && <div className="adminErrorBanner">Finance data could not be loaded. Sales and COD remain live, but cash, profit and Finance alerts are hidden until Refresh succeeds.</div>}

    {/* Premium KPIs Grid */}
    <div className="premiumMetricGrid">
      <div className="premiumMetricCard salesCard">
        <div className="premiumMetricHeader">
          <span>Delivered Sales</span>
          <CircleDollarSign />
        </div>
        <div className="premiumMetricValue">Rs. {salesPeriodTotal.toLocaleString()}</div>
        <div className="premiumMetricNote">
          <span className={salesPeriodChange !== null && salesPeriodChange < 0 ? "metricTrendDown" : "metricTrendUp"}>
            {salesPeriodChange === null ? `Last ${chartRange} days` : `${salesPeriodChange >= 0 ? "+" : ""}${salesPeriodChange}% vs prior ${chartRange} days`}
          </span>
        </div>
      </div>

      {isOwnerDashboard && (
        <div className="premiumMetricCard cashCard">
          <div className="premiumMetricHeader">
            <span>Available Cash</span>
            <WalletCards />
          </div>
          <div className="premiumMetricValue">
            {financeSnapshotStatus === "ready" ? `Rs. ${dashboardAvailableCash.toLocaleString()}` : "Unavailable"}
          </div>
          <div className="premiumMetricNote">All-time cash balance after recorded cash costs</div>
        </div>
      )}

      <div className="premiumMetricCard receivableCard">
        <div className="premiumMetricHeader">
          <span>PostEx Receivable</span>
          <Landmark />
        </div>
        <div className="premiumMetricValue">Rs. {dashboardPostexReceivable.toLocaleString()}</div>
        <div className="premiumMetricNote">All-time outstanding / in transit settlement</div>
      </div>

      {isOwnerDashboard && (
        <div className="premiumMetricCard profitCard">
          <div className="premiumMetricHeader">
            <span>Final Net Profit</span>
            <TrendingUp />
          </div>
          <div className="premiumMetricValue">
            {financeSnapshotStatus === "ready" ? `Rs. ${dashboardNetProfit.toLocaleString()}` : "Unavailable"}
          </div>
          <div className="premiumMetricNote">All-time Finance P&amp;L after deductions</div>
        </div>
      )}
    </div>

    {/* Secondary KPI Badges Row */}
    <div className="premiumMetricGrid" style={{ marginTop: '-8px', marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
      <div className="statusBadge confirmed" style={{ padding: '10px 16px', justifyContent: 'center', background: '#f0f7f3', color: '#1a5f38', borderColor: '#d3ebd9', borderRadius: '12px', fontSize: '12px' }}>
        Last {chartRange} days AOV: <b style={{ marginLeft: '4px' }}>Rs. {averageOrderValue.toLocaleString()}</b>
      </div>
      <div className="statusBadge activeStatus" style={{ padding: '10px 16px', justifyContent: 'center', background: '#f0f4f8', color: '#1b4d7c', borderColor: '#d2e3f0', borderRadius: '12px', fontSize: '12px' }}>
        Last {chartRange} days repeat rate: <b style={{ marginLeft: '4px' }}>{repeatCustomerRate}%</b>
      </div>
      <div className="statusBadge processing" style={{ padding: '10px 16px', justifyContent: 'center', background: '#fdf7ee', color: '#88580b', borderColor: '#f7e3c9', borderRadius: '12px', fontSize: '12px' }}>
        Last {chartRange} days items: <b style={{ marginLeft: '4px' }}>{items.reduce((sum, i) => sum + Number(i.quantity || 0), 0)} pcs</b>
      </div>
      <div className="statusBadge unbooked" style={{ padding: '10px 16px', justifyContent: 'center', background: '#fbfbfb', color: '#555', borderColor: '#eaeaea', borderRadius: '12px', fontSize: '12px' }}>
        Last {chartRange} days fulfilled: <b style={{ marginLeft: '4px' }}>{deliveredCount} orders</b>
      </div>
    </div>

    {/* Visual Overview Grid (50/50 Side by Side) */}
    <div className="dashboardLayoutGrid dashboardEqualGrid">
      {/* Sleek Order Pipeline Pie/Donut Chart */}
      <div className="dashboardCol6">
        <VisualDonut
          title="Order pipeline"
          subtitle="All tracked orders by live courier fulfilment status."
          centerValue={dashboardOrderCount}
          centerLabel="total"
          items={Object.entries(statusBuckets).map(([label, value]) => ({ label, value, color: statusPalette[label] || "#8aa08f" })).filter((item) => item.value > 0)}
        />
      </div>

      {/* Revenue Waterfall */}
      <div className="dashboardCol6">
        <VisualBars
          title="All-time revenue waterfall"
          subtitle="Finance P&L: how delivered sales flow into product costs, courier deductions and net profit."
          format={(value) => `Rs. ${Math.round(Number(value || 0)).toLocaleString()}`}
          items={[
            { label: "Gross sales", value: dashboardSales, color: "#10b981" },
            { label: "Product cost (COGS)", value: dashboardCogs, color: "#f59e0b" },
            { label: "PostEx & logistics", value: dashboardCourierCost + dashboardTaxes + dashboardReturnPostexLoss, color: "#ef4444" },
            { label: "Net profit", value: Math.max(0, dashboardNetProfit), color: "#3b82f6" },
          ]}
        />
      </div>
    </div>

    {/* Executive Analytics & Performance Insights Suite */}
    <ExecutiveAnalyticsSuite
      salesByDay={salesByDay}
      salesPeriodTotal={salesPeriodTotal}
      salesPeriodChange={salesPeriodChange}
      periodLabel={`Last ${chartRange} days`}
      periodAverageOrderValue={averageOrderValue}
      periodDeliveredOrders={deliveredScoped}
      dashboardSales={dashboardSales}
      dashboardCogs={dashboardCogs}
      dashboardCourierCost={dashboardCourierCost}
      dashboardTaxes={dashboardTaxes}
      dashboardReturnPostexLoss={dashboardReturnPostexLoss}
      dashboardNetProfit={dashboardNetProfit}
      liveOrders={liveOrders}
      products={products}
      pixelFunnel={pixelFunnel}
      setActive={setActive}
    />

    {/* Collapsible Cash explainer (Closed by default) */}
    {isOwnerDashboard && financeSnapshotStatus === "ready" && (
      <details className="adminCard dashboardCashBreakdown" style={{ marginBottom: '24px' }}>
        <summary style={{ cursor: 'pointer' }}>
          <div>
            <p>CASH EXPLAINER</p>
            <h2>How available cash is calculated</h2>
            <span>Click to expand full cash flow ledger calculations.</span>
          </div>
          <b>Rs. {dashboardAvailableCash.toLocaleString()}</b>
        </summary>
        <div className="cashBreakdownGrid" style={{ marginTop: '16px' }}>
          <section>
            <div className="cashBreakdownHeading"><div><h3>Sale and profit breakdown</h3><span>Shows what the delivered sales earned.</span></div><span className="cashBreakdownTag">P&amp;L</span></div>
            <div className="financeStatement">
              <div><span>Total delivered order value</span><b>Rs. {dashboardSales.toLocaleString()}</b></div>
              <div><span>Products sold (without delivery)</span><b>Rs. {dashboardProductRevenue.toLocaleString()}</b></div>
              <div><span>Delivery collected from customers</span><b className="cashPlus">+ Rs. {dashboardDeliveryCollected.toLocaleString()}</b></div>
              <div><span>Product cost of sold items (COGS)</span><b className="cashMinus">- Rs. {dashboardCogs.toLocaleString()}</b></div>
              <div><span>Actual PostEx GST from synced CPR data</span><b className="cashMinus">- Rs. {dashboardGst.toLocaleString()}</b></div>
              <div><span>Actual PostEx 4% deduction from synced CPR data</span><b className="cashMinus">- Rs. {dashboardTax.toLocaleString()}</b></div>
              <div><span>Actual PostEx shipping/service charges</span><b className="cashMinus">- Rs. {dashboardCourierCost.toLocaleString()}</b></div>
              <div><span>Returned parcel PostEx loss</span><b className="cashMinus">- Rs. {dashboardReturnPostexLoss.toLocaleString()}</b></div>
              <div><span>Other operating expenses</span><b className="cashMinus">- Rs. {(dashboardManualExpenses + dashboardCashbookExpenses).toLocaleString()}</b></div>
              <div className="statementTotal"><span>Final net profit</span><b>Rs. {dashboardNetProfit.toLocaleString()}</b></div>
            </div>
          </section>
          <section>
            <div className="cashBreakdownHeading"><div><h3>Cash movement breakdown</h3><span>Shows the money currently available to use.</span></div><span className="cashBreakdownTag">CASH</span></div>
            <div className="financeStatement">
              <div><span>Manually verified PostEx bank receipts</span><b className="cashPlus">+ Rs. {dashboardPostexBankReceived.toLocaleString()}</b></div>
              <div><span>PostEx receivable (not available cash)</span><b>Rs. {dashboardPostexReceivable.toLocaleString()}</b></div>
              <div><span>Owner funds added</span><b className="cashPlus">+ Rs. {dashboardOwnerInvestments.toLocaleString()}</b></div>
              {dashboardCashResetAdjustment !== 0 && <div><span>Opening cash reset adjustment</span><b className={dashboardCashResetAdjustment < 0 ? "cashMinus" : "cashPlus"}>{dashboardCashResetAdjustment < 0 ? "-" : "+"} Rs. {Math.abs(dashboardCashResetAdjustment).toLocaleString()}</b></div>}
              <div><span>PostEx GST already deducted before bank receipt</span><b>Rs. {dashboardGst.toLocaleString()}</b></div>
              <div><span>PostEx 4% deduction already deducted before bank receipt</span><b>Rs. {dashboardTax.toLocaleString()}</b></div>
              <div><span>Operating expenses paid</span><b className="cashMinus">- Rs. {(dashboardManualExpenses + dashboardCashbookExpenses).toLocaleString()}</b></div>
              <div><span>Production / stock purchase cash paid</span><b className="cashMinus">- Rs. {dashboardProductionCashOutflow.toLocaleString()}</b></div>
              <div><span>Supplier payments</span><b className="cashMinus">- Rs. {dashboardSupplierPayments.toLocaleString()}</b></div>
              <div><span>Owner withdrawals</span><b className="cashMinus">- Rs. {dashboardOwnerWithdrawals.toLocaleString()}</b></div>
              <div className="statementTotal"><span>Available business cash</span><b>Rs. {dashboardAvailableCash.toLocaleString()}</b></div>
            </div>
          </section>
        </div>
        <p className="cashBreakdownNote"><b>How PostEx cash works:</b> delivered sales increase revenue and profit, but they do not become available cash until a CPR/bank receipt is reconciled. PostEx bank receipts are already net of PostEx deductions, so courier is shown in P&amp;L but is not subtracted from the same bank receipt again. Product purchases reduce cash when their payment is recorded.</p>
      </details>
    )}

    {/* Store Alerts */}
    {((isOwnerDashboard && ((financeSnapshotStatus === "ready" && (dashboardNetProfit < 0 || overduePayables)) || zeroCostActive.length)) || lowStockProducts.length || dashboardReturns) && (
      <section className="adminCard managementCard dashboardAlerts" style={{ marginBottom: '24px' }}>
        <div className="inventoryListHead"><div><h2>Action alerts</h2><span>Items needing attention, ordered by urgency.</span></div></div>
        <div className="financeStatement">
          {isOwnerDashboard && financeSnapshotStatus === "ready" && dashboardNetProfit < 0 && <div className="expenseAmount"><span><b className="alertSeverity critical">Critical</b> Negative final net profit</span><button onClick={() => setActive("Finances", { focus: "pnl" })}>Review P&amp;L</button></div>}
          {isOwnerDashboard && zeroCostActive.length > 0 && <div className="expenseAmount"><span><b className="alertSeverity critical">Critical</b> {zeroCostActive.length} active product{zeroCostActive.length === 1 ? "" : "s"} with zero cost</span><button onClick={() => setActive("Products", { focus: "missing-cost" })}>Add cost</button></div>}
          {isOwnerDashboard && financeSnapshotStatus === "ready" && overduePayables > 0 && <div className="expenseAmount"><span><b className="alertSeverity critical">Critical</b> {overduePayables} overdue supplier payable{overduePayables === 1 ? "" : "s"}</span><button onClick={() => setActive("Finances", { focus: "suppliers" })}>Review payables</button></div>}
          {lowStockProducts.length > 0 && <div><span><b className="alertSeverity warning">Stock</b> {lowStockProducts.length} low-stock / out-of-stock products</span><button onClick={() => setActive("Inventory", { focus: "low-stock" })}>Review stock</button></div>}
          {dashboardReturns > 0 && <div><span><b className="alertSeverity warning">Returns</b> {dashboardReturns} returned order{dashboardReturns === 1 ? "" : "s"} pending inspection</span><button onClick={() => setActive("Inventory", { focus: "returns-inspection" })}>Inspect returns</button></div>}
        </div>
      </section>
    )}

    {/* Recent Orders */}
    <section className="adminCard recentOrders">
      <div className="cardHeading"><div><h2>Recent orders</h2><p>Latest customer purchases</p></div><button onClick={() => setActive("Orders")}>View all orders</button></div>
      <OrderTable rows={orders.slice(0, 4)} onSelect={onOpenOrder} />
    </section>
  </>;
}

function Metric({ icon: Icon, label, value, change, note }) {
  return <article className="metricCard"><div><Icon /></div><p>{label}</p><h2>{value}</h2><span><b>{change}</b> {note}</span></article>;
}

function DashboardLoadingState() {
  return <section className="dashboardDataLoading" aria-busy="true" aria-label="Loading live dashboard data">
    <div className="adminLoadingHeading"><span className="adminSkeleton adminLoadingEyebrow" /><span className="adminSkeleton adminLoadingTitle" /><span className="adminSkeleton adminLoadingSubtitle" /></div>
    <div className="adminLoadingMetricGrid">{[1,2,3,4].map((item) => <div className="adminLoadingMetric" key={item}><span className="adminSkeleton" /><span className="adminSkeleton" /><span className="adminSkeleton" /></div>)}</div>
    <p className="adminLoadingStatus">Loading live orders, products and Finance data…</p>
  </section>;
}

function productCollection(product) {
  return product.collection || product.rawCollection || product.subcategory || "Online Store";
}

function productStatus(product) {
  if (String(product.status || "").toLowerCase().includes("archived")) return "Archived";
  if (String(product.status || "").toLowerCase().includes("draft")) return "Draft";
  if (Number(product.stock || 0) <= 0) return "Out of stock";
  return product.unlisted ? "Unlisted" : "Active";
}

function CategoriesPanel({ categories, products, onSave, onArchive, saving, needsSetup }) {
  const [editing, setEditing] = useState(null);
  const [categoryImageUrl, setCategoryImageUrl] = useState("");
  const [imagePreviewAdded, setImagePreviewAdded] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState("");
  const visibleCategories = categories.filter((category) => category.status !== "Archived");
  const archivedCategories = categories.filter((category) => category.status === "Archived");
  const mainCategories = visibleCategories.filter((category) => !category.parentSlug);
  const [selectedSlug, setSelectedSlug] = useState(mainCategories[0]?.slug || "");
  const selectedCategory = mainCategories.find((category) => category.slug === selectedSlug) || mainCategories[0];
  const childCategories = selectedCategory
    ? visibleCategories.filter((category) => category.parentSlug === selectedCategory.slug)
    : [];

  useEffect(() => {
    if (!mainCategories.length) {
      setSelectedSlug("");
      return;
    }
    if (!mainCategories.some((category) => category.slug === selectedSlug)) {
      setSelectedSlug(mainCategories[0].slug);
    }
  }, [mainCategories, selectedSlug]);

  useEffect(() => {
    setCategoryImageUrl(editing?.image || "");
    setImagePreviewAdded(Boolean(editing?.image));
    setImagePreviewError("");
  }, [editing]);

  function productCount(category) {
    if (category.parentSlug) {
      return products.filter((product) => product.subcategory === category.slug).length;
    }
    return products.filter((product) => product.category === category.name).length;
  }

  function openNewMainCategory() {
    setEditing({ parentSlug: "" });
  }

  function openNewSubcategory(parent) {
    setSelectedSlug(parent.slug);
    setEditing({ parentSlug: parent.slug, status: "Active", sortOrder: (childCategories.length + 1) * 10 });
  }

  function moveCategory(category, direction) {
    const siblings = visibleCategories.filter((item) => item.parentSlug === category.parentSlug).sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((item) => item.id === category.id);
    const target = siblings[index + direction];
    if (!target) return;
    onSave({ ...category, sortOrder: target.sortOrder });
    onSave({ ...target, sortOrder: category.sortOrder });
  }

  function confirmArchive(category) {
    const count = productCount(category);
    const label = category.parentSlug ? "subcategory" : "main category";
    const childCount = category.parentSlug ? 0 : visibleCategories.filter((item) => item.parentSlug === category.slug).length;
    if (window.confirm(`${category.name} ${label} remove/archive karni hai?${count ? ` ${count} product${count === 1 ? "" : "s"} is category mein mapped hain.` : ""}${childCount ? ` ${childCount} nested subcategories bhi hide ho sakti hain.` : ""} Products delete nahi honge, category storefront aur active list se hide ho jayegi.`)) onArchive(category);
  }

  async function saveCategory(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const saved = await onSave({
      id: editing?.id,
      name,
      slug: String(form.get("slug") || slugifyCategory(name)).trim(),
      parentSlug: form.get("parentSlug") || "",
      description: form.get("description") || "",
      image: categoryImageUrl.trim(),
      status: form.get("status") || "Active",
      sortOrder: Number(form.get("sortOrder") || 100),
      showInHeader: form.get("showInHeader") === "on",
      showOnHomepage: form.get("showOnHomepage") === "on",
      showInFooter: form.get("showInFooter") === "on",
      showInSearch: form.get("showInSearch") === "on",
      seoTitle: form.get("seoTitle") || "",
      seoDescription: form.get("seoDescription") || "",
      imageAlt: form.get("imageAlt") || name,
    });
    if (saved) {
      setEditing(null);
    }
  }

  function addImagePreview() {
    const url = categoryImageUrl.trim();
    if (!url) {
      setImagePreviewError("Pehle image URL paste karein.");
      return;
    }
    if (!url.startsWith("/") && !/^https:\/\//i.test(url)) {
      setImagePreviewError("Image URL https:// se start hona chahiye, ya local image / se.");
      return;
    }
    setImagePreviewError("");
    setImagePreviewAdded(true);
  }

  return <><div className="adminTitle"><div><p>CATALOGUE</p><h1>Categories</h1><span>Main categories pehle dikhti hain. Kisi category ko select karke uske andar subcategories manage karein.</span></div><button onClick={openNewMainCategory}><Plus /> Add main category</button></div>
    {needsSetup && <div className="adminErrorBanner">Supabase category table setup is pending. Run <b>scripts/supabase-catalog-categories.sql</b>, then reconnect admin data.</div>}
    <div className="miniMetricGrid productMetrics">
      <article><Tags /><span><b>{mainCategories.length}</b>Main categories</span></article>
      <article><Package /><span><b>{visibleCategories.filter((category) => category.parentSlug).length}</b>Subcategories</span></article>
      <article><Store /><span><b>{visibleCategories.length}</b>Visible on store</span></article>
      <article><X /><span><b>{archivedCategories.length}</b>Archived/removed</span></article>
      <article><Boxes /><span><b>{products.length}</b>Products mapped</span></article>
    </div>

    <section className="categoryManagerGrid">
      <div className="adminCard managementCard">
        <div className="inventoryListHead"><div><h2>Main categories</h2><span>{mainCategories.length} storefront sections</span></div><button onClick={openNewMainCategory} disabled={saving}><Plus /> New main</button></div>
        <div className="categoryTreeList">
          {mainCategories.map((category) => {
            const children = visibleCategories.filter((item) => item.parentSlug === category.slug);
            return <button type="button" className={selectedCategory?.slug === category.slug ? "active" : ""} key={category.id} onClick={() => setSelectedSlug(category.slug)}>
              <span style={{ backgroundImage: `url(${category.image || "/bustaniya-campaign-hero-v4.png"})` }} />
              <b>{category.name}</b>
              <small>{children.length} subcategories · {productCount(category)} products</small>
            </button>;
          })}
          {!mainCategories.length && <div className="inventoryEmpty">No main categories yet.</div>}
        </div>
      </div>

      <div className="adminCard managementCard">
        <div className="inventoryListHead"><div><h2>{selectedCategory?.name || "Select category"}</h2><span>{childCategories.length} subcategories inside</span></div>{selectedCategory && <button onClick={() => openNewSubcategory(selectedCategory)} disabled={saving}><Plus /> Add inside</button>}</div>
        {selectedCategory && <div className="categoryParentSummary">
          <div className="tableProduct"><span style={{ backgroundImage: `url(${selectedCategory.image || "/bustaniya-campaign-hero-v4.png"})` }} /><div><b>{selectedCategory.name}</b><small><a href={`/category/${selectedCategory.slug}`} target="_blank">/category/{selectedCategory.slug}</a></small></div></div>
          <div className="productRowActions"><button className="editProductButton" onClick={() => moveCategory(selectedCategory, -1)} disabled={saving} aria-busy={saving}>↑</button><button className="editProductButton" onClick={() => moveCategory(selectedCategory, 1)} disabled={saving} aria-busy={saving}>↓</button><button className="editProductButton" onClick={() => setEditing(selectedCategory)} disabled={saving} aria-busy={saving}>Edit main</button><button className="removeProductButton" onClick={() => confirmArchive(selectedCategory)} disabled={saving} aria-busy={saving}><X /><span>Archive</span></button></div>
        </div>}
        <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Subcategory</th><th>URL</th><th>Products</th><th>Status</th><th /></tr></thead><tbody>
          {childCategories.map((category) => (
            <tr key={category.id}><td><div className="tableProduct"><span style={{ backgroundImage: `url(${category.image || "/bustaniya-campaign-hero-v4.png"})` }} /><div><b>{category.name}</b><small>{category.description || "No description"}</small></div></div></td><td><a href={`/category/${category.parentSlug}/${category.slug}`} target="_blank">/category/{category.parentSlug}/{category.slug}</a></td><td>{productCount(category)}</td><td><span className={`statusBadge ${category.status === "Active" ? "activeStatus" : "processing"}`}>{category.status}</span></td><td><div className="productRowActions"><button className="editProductButton" onClick={() => setEditing(category)} disabled={saving} aria-busy={saving}>Edit</button><button className="removeProductButton" onClick={() => confirmArchive(category)} disabled={saving} aria-busy={saving}><X /><span>Remove</span></button></div></td></tr>
          ))}
          {!childCategories.length && <tr><td colSpan="5"><div className="inventoryEmpty">No subcategories inside {selectedCategory?.name || "this category"} yet.</div></td></tr>}
        </tbody></table></div>
      </div>
    </section>

    {editing && <><div className="adminOverlay" onClick={() => !saving && setEditing(null)} /><form className="inventoryDialog categoryDialog" onSubmit={saveCategory}>
      <DialogHead title={editing.id ? "Edit category" : "Add category"} onClose={() => !saving && setEditing(null)} />
      <label>Name<input name="name" required defaultValue={editing.name || ""} placeholder="Summer Collection" /></label>
      <div className="formRow"><label>Slug<input name="slug" defaultValue={editing.slug || ""} placeholder="summer-collection" /></label><label>Sort order<input name="sortOrder" type="number" defaultValue={editing.sortOrder || 100} /></label></div>
      <label>Parent<select name="parentSlug" defaultValue={editing.parentSlug || ""}><option value="">Main category</option>{mainCategories.filter((category) => category.id !== editing.id).map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></label>
      <label>Description<textarea name="description" rows="3" defaultValue={editing.description || ""} placeholder="Short SEO-friendly category description" /></label>
      <label>Cover image URL<div className="categoryImageUrlRow"><input name="image" value={categoryImageUrl} onChange={(event) => { setCategoryImageUrl(event.target.value); setImagePreviewAdded(false); setImagePreviewError(""); }} placeholder="https://... or /bustaniya-campaign-hero-v4.png" /><button type="button" onClick={addImagePreview}>Add image</button></div></label>
      {imagePreviewError && <p className="categoryImageError">{imagePreviewError}</p>}
      {imagePreviewAdded && categoryImageUrl && <div className="categoryImagePreview"><img src={categoryImageUrl} alt="Category preview" onError={() => setImagePreviewError("Is URL par image load nahi hui. URL check karein.")} /><div><b>Image ready</b><span>Save category par ye cover image category card aur category page par show hogi.</span></div></div>}
      <label>Cover image alt text<input name="imageAlt" defaultValue={editing.imageAlt || editing.name || ""} placeholder="Describe this category image" /></label>
      <div className="categoryVisibility"><b>Storefront visibility</b><label><input type="checkbox" name="showInHeader" defaultChecked={editing.showInHeader ?? true} /> Header menu</label><label><input type="checkbox" name="showOnHomepage" defaultChecked={editing.showOnHomepage ?? true} /> Homepage</label><label><input type="checkbox" name="showInFooter" defaultChecked={editing.showInFooter ?? false} /> Footer</label><label><input type="checkbox" name="showInSearch" defaultChecked={editing.showInSearch ?? true} /> Search & filters</label></div>
      <details className="categorySeo"><summary>SEO settings</summary><label>SEO title<input name="seoTitle" maxLength="60" defaultValue={editing.seoTitle || ""} placeholder="Category title for Google" /></label><label>Meta description<textarea name="seoDescription" rows="3" maxLength="160" defaultValue={editing.seoDescription || ""} placeholder="Short search-result description" /></label></details>
      <label>Status<select name="status" defaultValue={editing.status || "Active"}><option>Active</option><option>Draft</option><option>Archived</option></select></label>
      <button
        type="submit"
        disabled={saving}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          minWidth: "150px",
          cursor: saving ? "not-allowed" : "pointer"
        }}
      >
        {saving ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Saving Category...</span>
          </>
        ) : (
          editing.id ? "Update Category" : "Save Category"
        )}
      </button>
    </form></>}
  </>;
}

function productVariants(product) {
  const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["S", "M", "L"];
  const colors = Array.isArray(product.colors) && product.colors.length ? product.colors : ["Default"];
  const totalStock = Number(product.stock || 0);
  const count = Math.max(1, sizes.length * colors.length);
  return sizes.flatMap((size, sizeIndex) => colors.map((color, colorIndex) => ({
    id: `${product.id}-${size}-${color}`,
    size,
    color,
    sku: `${product.sku || product.articleNumber || `BST-${product.id}`}-${size}-${color}`.replace(/\s+/g, "-").toUpperCase(),
    stock: Math.max(0, Math.floor(totalStock / count) + (sizeIndex === 0 && colorIndex === 0 ? totalStock % count : 0)),
    low: Number(product.lowStockThreshold || 5),
  })));
}

function ProductsPanel({ products, search, setSearch, onAdd, onEdit, onDelete, onDeliveryChange, loading, initialView, tableDensity = "comfortable", setTableDensity }) {
  const [tab, setTab] = useState(initialView === "missing-cost" ? "Missing cost" : "All");
  const [variantProduct, setVariantProduct] = useState(null);
  const visibleProducts = products.filter((product) => {
    const status = productStatus(product);
    if (tab === "Archived") return status === "Archived";
    if (status === "Archived") return false;
    return tab === "All" || status === tab || (tab === "Low stock" && Number(product.stock || 0) <= Number(product.lowStockThreshold || 5)) || (tab === "Missing cost" && !Number(product.costTotalPkr || 0));
  });
  const nonArchivedProducts = products.filter((product) => productStatus(product) !== "Archived");
  const collections = [...new Set(nonArchivedProducts.map(productCollection))].filter(Boolean);
  const lowStockCount = nonArchivedProducts.filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5)).length;
  const missingCostCount = nonArchivedProducts.filter((product) => !Number(product.costTotalPkr || 0)).length;
  const activeCount = nonArchivedProducts.filter((p) => productStatus(p) === "Active").length;
  const archivedCount = products.filter((p) => productStatus(p) === "Archived").length;
  const productStatusVisual = [
    { label: "Active", value: activeCount, color: "#1d6840" },
    { label: "Low stock", value: lowStockCount, color: "#d08a18" },
    { label: "Missing cost", value: missingCostCount, color: "#b73543" },
    { label: "Archived", value: archivedCount, color: "#8aa08f" },
  ].filter((item) => item.value > 0);
  const collectionVisual = collections.slice(0, 6).map((collection, index) => ({
    label: collection,
    value: products.filter((product) => productCollection(product) === collection).length,
    color: ["#1d6840", "#4777a8", "#c78b2b", "#8d2449", "#6c7b43", "#7d5ba6"][index] || "#1d6840",
  }));

  function exportProducts() {
    const csv = [
      ["Title","Description","Images","Price","Compare at price","Category","Collection","Status","Sizes","Colors","Stock","Low stock threshold"],
      ...products.map((product) => [
        product.name,
        product.description || "",
        (product.images || [product.image]).filter(Boolean).join(" | "),
        product.price,
        product.compareAtPrice || product.compare_at_price || "",
        product.category,
        productCollection(product),
        productStatus(product),
        (product.sizes || []).join(" | "),
        (product.colors || []).join(" | "),
        product.stock || 0,
        product.lowStockThreshold || 5,
      ]),
    ].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `bustaniya-products-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const [csvImportState, setCsvImportState] = useState({ isOpen: false, file: null, rows: [] });

  function handleImportFileSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result || "";
      const parsedRows = parseCSVRows(text);
      setCsvImportState({ isOpen: true, file, rows: parsedRows });
    };
    reader.readAsText(file);
  }

  function handleCommitCSVImport(validRows) {
    window.alert(`Successfully validated ${validRows.length} product(s) from CSV! Connect to Supabase bulk endpoint for live persistence.`);
    setCsvImportState({ isOpen: false, file: null, rows: [] });
  }

  return <><div className="adminTitle"><div><p>CATALOGUE</p><h1>Products</h1><span>Add/edit products, variants, collections, inventory and private-drop status.</span></div><button onClick={onAdd} disabled={loading} aria-busy={loading}><Plus /> Add product</button></div>
    <div className="miniMetricGrid productMetrics">
      <article><Package /><span><b>{products.length}</b>Total products</span></article>
      <article><Tags /><span><b>{collections.length}</b>Collections</span></article>
      <article className={lowStockCount ? "alertMetric" : ""}><Boxes /><span><b>{lowStockCount}</b>Low stock</span></article>
      <article><Store /><span><b>{activeCount}</b>Active</span></article>
    </div>
    <div className="adminVisualGrid">
      <VisualDonut title="Product readiness" subtitle="Active vs draft, low stock risk and missing cost items." centerValue={activeCount} centerLabel="active" items={productStatusVisual} />
      <VisualBars title="Collection breakdown" subtitle="Product distribution across top collections." items={collectionVisual} />
    </div>
    <section className="adminCard managementCard">
      <div className="catalogToolbar">
        <div className="orderTabs">{["All","Active","Draft","Archived","Unlisted","Low stock","Missing cost"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
        <div className="catalogActions">
          <TableDensityToggle density={tableDensity} onChange={setTableDensity} />
          <div className="inlineSearch"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." /></div>
          <label className="editProductButton" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            Import CSV
            <input type="file" accept=".csv" onChange={handleImportFileSelect} style={{ display: "none" }} />
          </label>
          <button type="button" onClick={exportProducts}>Export CSV</button>
        </div>
      </div>
      <div className="collectionStrip">{collections.map((collection) => <span key={collection}>{collection}</span>)}</div>
      <div className={`adminTableWrap ${tableDensity === "compact" ? "compactTable" : ""}`}><table className="adminTable productAdminTable"><thead><tr><th>Product</th><th>Collection</th><th>Price</th><th>Unit cost</th><th>Variants</th><th>Inventory</th><th>Delivery</th><th>Status</th><th /></tr></thead><tbody>
        {visibleProducts.map((product) => {
          const variants = productVariants(product);
          const status = productStatus(product);
          return <tr key={product.id}>
            <td><div className="tableProduct"><span style={{ backgroundImage: `url(${product.image})` }} /><div><b>{product.name}</b><small className="trackingNumber">{product.sku || product.articleNumber || `BST-${String(product.id).padStart(4,"0")}`}</small></div></div></td>
            <td>{productCollection(product)}</td>
            <td><b>Rs. {Number(product.price || 0).toLocaleString()}</b></td>
            <td>{Number(product.costTotalPkr || 0) ? `Rs. ${Number(product.costTotalPkr).toLocaleString()}` : <span className="expenseAmount">Missing cost</span>}</td>
            <td><button type="button" className="editProductButton" onClick={() => setVariantProduct(product)} disabled={loading} aria-busy={loading}>{variants.length} variant{variants.length === 1 ? "" : "s"}</button></td>
            <td><b className={Number(product.stock || 0) <= Number(product.lowStockThreshold || 5) ? "stockLow" : ""}>{Number(product.stock || 0)} units</b></td>
            <td>Rs. {Number(product.deliveryCostPkr || 0).toLocaleString()}</td>
            <td><span className={`statusBadge ${status.toLowerCase()}`}>{status}</span></td>
            <td><div className="productRowActions"><button type="button" className="editProductButton" onClick={() => onEdit(product)} disabled={loading} aria-busy={loading}>Edit</button><button type="button" className="removeProductButton" onClick={() => onDelete(product)} disabled={loading} aria-busy={loading}><X /> Delete</button></div></td>
          </tr>;
        })}
      </tbody></table>
      {!visibleProducts.length && <EmptyState icon={Package} title="No products found" description="No products match your current search or filter criteria." actionText="Add Product" onAction={onAdd} />}
      </div>
    </section>
    {variantProduct && <VariantInventoryDrawer product={variantProduct} onClose={() => setVariantProduct(null)} />}
    <CSVImportModal
      isOpen={csvImportState.isOpen}
      file={csvImportState.file}
      rows={csvImportState.rows}
      onConfirmImport={handleCommitCSVImport}
      onClose={() => setCsvImportState({ isOpen: false, file: null, rows: [] })}
    />
  </>;
}

function orderStatus(order) {
  return String(order.postexStatus || order.status || "").toLowerCase();
}

function orderCustomerIdentity(order) {
  const phone = String(order.phone || order.raw?.shipping_phone || order.raw?.guest_phone || "").replace(/\D/g, "");
  const email = String(order.raw?.shipping_email || order.raw?.guest_email || "").trim().toLowerCase();
  const id = String(order.raw?.customer_id || order.raw?.customerId || "").trim();
  const fallback = [order.customer || order.shipping_full_name, order.city || order.shipping_city]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join("|");
  return phone || email || id || fallback;
}

function formatOrderStatus(value = "") {
  return String(value || "pending")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isRevenueOrder(order) {
  const status = orderStatus(order);
  return !status.includes("cancel") && !status.includes("fail") && !status.includes("void");
}

function isDeliveredOrder(order) {
  return ["delivered", "completed"].includes(orderStatus(order));
}

function isReturnedOrder(order) {
  return normalizePostexCategory(order.postexStatus || order.status) === "Returned";
}

const orderCategoryLabels = [
  "Total Orders",
  "Unbooked",
  "Cancelled",
  "Booked",
  "PostEx Warehouse",
  "Out For Delivery",
  "Delivered",
  "Attempted",
  "Out For Return",
  "Returned",
  "Delivery Under Review",
  "Transferred",
  "Un-Assigned By Me",
];

const customOrderStatusOptions = [
  "Un-Assigned By Me",
  "Unbooked",
  "Booked",
  "PostEx Warehouse",
  "Out For Delivery",
  "Delivered",
  "Attempted",
  "Out For Return",
  "Returned",
  "Delivery Under Review",
  "Transferred",
  "Rider Assigned",
  "Ready For Pickup",
  "Customer Pickup",
  "Manual Delivery",
  "On Hold",
  "Cancelled",
];

const returnWorkflowTransitions = {
  "No return": ["No return", "Return requested", "Exchange requested", "Refund requested"],
  "Return requested": ["Return requested", "Return approved"],
  "Return approved": ["Return approved", "Return received"],
  "Return received": ["Return received", "Exchange requested", "Refund requested", "Closed"],
  "Exchange requested": ["Exchange requested", "Exchange approved"],
  "Exchange approved": ["Exchange approved", "Closed"],
  "Refund requested": ["Refund requested", "Refund approved"],
  "Refund approved": ["Refund approved", "Refund processed"],
  "Refund processed": ["Refund processed", "Closed"],
  Closed: ["Closed"],
};

function normalizePostexCategory(value = "") {
  const normalized = String(value || "Unbooked")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "Unbooked";
  if (["all", "total", "total orders"].includes(normalized)) return "Total Orders";
  if (normalized.includes("cancel") || normalized.includes("expire") || normalized.includes("void")) return "Cancelled";
  if (normalized.includes("unbook") || normalized.includes("pending") || normalized.includes("draft")) return "Unbooked";
  if (normalized.includes("warehouse")) return "PostEx Warehouse";
  if (normalized.includes("out for delivery")) return "Out For Delivery";
  if (normalized.includes("out for return")) return "Out For Return";
  if (normalized.includes("under review") || normalized.includes("review")) return "Delivery Under Review";
  if (normalized.includes("un assigned") || normalized.includes("unassigned")) return "Un-Assigned By Me";
  if (normalized.includes("attempt")) return "Attempted";
  if (normalized.includes("return")) return "Returned";
  if (normalized.includes("deliver") || normalized.includes("complete")) return "Delivered";
  if (normalized.includes("transfer")) return "Transferred";
  if (normalized.includes("book")) return "Booked";
  return "Unbooked";
}

function isPendingCodOrder(order) {
  return [
    "Booked",
    "PostEx Warehouse",
    "Transferred",
    "Out For Delivery",
    "Attempted",
    "Delivery Under Review",
  ].includes(normalizePostexCategory(order.postexStatus || order.status));
}

function toOrderDate(order) {
  const date = new Date(order.createdAt || order.rawCreatedAt || order.date);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const day = date.getDay() || 7;
  const start = startOfDay(date);
  start.setDate(start.getDate() - day + 1);
  return start;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameRange(date, start, end) {
  return date >= start && date < end;
}

function buildOrderPeriodSummary(rows) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekStart = startOfWeek(now);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const monthStart = startOfMonth(now);
  const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  function summarize(start, end) {
    const periodOrders = rows.filter((order) => {
      const date = toOrderDate(order);
      return date && sameRange(date, start, end);
    });
    const revenueOrders = periodOrders.filter(isDeliveredOrder);
    const sales = revenueOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return {
      orders: periodOrders.length,
      sales,
      average: revenueOrders.length ? Math.round(sales / revenueOrders.length) : 0,
    };
  }

  return [
    { label: "Day wise", range: "Today", ...summarize(todayStart, tomorrowStart) },
    { label: "Week wise", range: "This week", ...summarize(weekStart, nextWeekStart) },
    { label: "Month wise", range: "This month", ...summarize(monthStart, nextMonthStart) },
  ];
}

function formatFinanceDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  return date.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function normalizeOrderItems(order) {
  const rawItems = Array.isArray(order?.items) && order.items.length
    ? order.items
    : (Array.isArray(order?.order_items) && order.order_items.length
      ? order.order_items
      : (Array.isArray(order?.raw?.items) && order.raw.items.length
        ? order.raw.items
        : (Array.isArray(order?.raw?.order_items) && order.raw.order_items.length
          ? order.raw.order_items
          : [])));
  if (rawItems.length) {
    return rawItems.map((item, index) => {
      const itemTitle = item.title || item.name || item.product_name || `Item ${index + 1}`;
      return {
        id: item.id || item.product_id || `item-${index + 1}`,
        productId: item.product_id || item.productId || "",
        product_id: item.product_id || item.productId || "",
        name: itemTitle,
        title: itemTitle,
        sku: item.article_number || item.sku || item.articleNumber || "",
        quantity: Math.max(1, Number(item.quantity || item.qty || 1)),
        price: Number(item.unit_price_pkr || item.price || item.price_pkr || (item.line_total_pkr && item.quantity ? item.line_total_pkr / item.quantity : item.total_pkr) || 0),
        size: String(item.size || "").trim(),
        color: String(item.color || "").trim(),
        imageUrl: item.image_url || item.image || item.imageUrl || "",
      };
    });
  }
  return [{ id: "fallback", name: "Order items", title: "Order items", sku: order?.id || "", quantity: 1, price: Number(order?.total || 0), size: "", color: "" }];
}

// Every surface that shows money for an order — the table, the drawer, the
// invoice/manifest PDFs and the PostEx booking payload — goes through here, so
// they can never disagree with each other or with what the courier collects.
//
// Stored values win by default: `total_order_value_pkr` is what the customer
// agreed to, what Finance recorded and what PostEx was booked against. Only the
// drawer, which previews unsaved line-item edits, passes `overrides.items`.
function orderMoney(order = {}, overrides = {}) {
  const amount = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };
  const raw = order.raw || {};
  const storedTotal = amount(order.total) ?? amount(raw.total_order_value_pkr) ?? amount(raw.total_pkr) ?? 0;
  const delivery = amount(overrides.delivery)
    ?? amount(order.deliveryCharges)
    ?? amount(raw.delivery_charges_pkr)
    ?? amount(raw.delivery_pkr)
    ?? 0;

  const editedItems = Array.isArray(overrides.items) ? overrides.items : null;
  const editedSubtotal = editedItems
    ? editedItems.reduce((sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)), 0)
    : 0;
  // Legacy rows store line items without a unit price. Recomputing from those
  // would report a zero-value order, so the stored total stays the fallback.
  const useEdited = Boolean(editedItems) && editedSubtotal > 0;

  const total = useEdited ? editedSubtotal + delivery : storedTotal;
  const subtotal = useEdited ? editedSubtotal : Math.max(0, storedTotal - delivery);
  const advance = Math.min(total, amount(overrides.advance) ?? amount(order.amountPayableInAdvance) ?? 0);
  const cod = Math.max(0, total - advance);

  // What the order row currently says PostEx will hand back. A drift between
  // this and total − advance means the row was edited outside the booking.
  const bookedCod = amount(order.amountPayableOnDelivery) ?? amount(raw.amount_payable_on_delivery_pkr);

  return {
    subtotal,
    delivery,
    total,
    advance,
    cod,
    bookedCod: bookedCod === null ? cod : bookedCod,
    codMismatch: bookedCod !== null && Math.abs(bookedCod - cod) >= 1,
    isPrepaid: total > 0 && cod === 0,
    isFullyAdvanced: total > 0 && advance >= total,
    hasAdvance: advance > 0,
  };
}

function legacyArticleNumber(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return "";
  return `BST-${String(numericId).padStart(4, "0")}`;
}

function createDraftOrderFromForm(form, products = []) {
  const customer = String(form.get("customer") || "").trim() || "Instagram customer";
  let submittedItems = [];
  try {
    submittedItems = JSON.parse(String(form.get("itemsJson") || "[]"));
  } catch {
    submittedItems = [];
  }
  const items = (Array.isArray(submittedItems) ? submittedItems : []).map((item, index) => {
    const selectedProduct = products.find((product) => String(product.id) === String(item.productId || item.product_id || item.id));
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const price = Number(selectedProduct?.price ?? item.price ?? 0);
    return {
      id: selectedProduct?.id || item.id || `manual-${index + 1}`,
      product_id: selectedProduct?.id || item.product_id || "",
      name: selectedProduct?.name || String(item.name || "").trim() || "Manual DM order",
      sku: selectedProduct?.articleNumber || selectedProduct?.article_number || selectedProduct?.sku || item.sku || "CUSTOM-ORDER",
      articleNumber: selectedProduct?.articleNumber || selectedProduct?.article_number || item.articleNumber || "",
      productId: selectedProduct?.id || item.productId || "",
      quantity,
      price,
      size: String(item.size || "").trim(),
      color: String(item.color || "").trim(),
    };
  }).filter((item) => item.name);
  const productTotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const paymentOption = String(form.get("paymentOption") || "cod").trim().toLowerCase();
  const isFullAdvance = paymentOption === "full_advance";
  const isDeliveryAdvance = paymentOption === "cod_delivery_advance";
  const deliveryFee = isFullAdvance ? 0 : Math.max(0, Number(form.get("deliveryCharges") || 250));
  const total = productTotal + deliveryFee;
  const requestedAdvance = Number(form.get("advancePaid"));
  const advancePaid = Math.min(
    total,
    Math.max(0, Number.isFinite(requestedAdvance)
      ? requestedAdvance
      : (isFullAdvance ? total : isDeliveryAdvance ? deliveryFee : 0))
  );
  const amountPayableOnDelivery = Math.max(0, total - advancePaid);
  const deliveryMethod = String(form.get("deliveryMethod") || "Rider / same city").trim();
  const status = String(form.get("status") || "Un-Assigned By Me").trim();
  const source = String(form.get("source") || "Manual").trim();
  const now = new Date();
  const notes = String(form.get("notes") || "").trim();
  return {
    rawId: `draft-${Date.now()}`,
    id: `#BST-${String(Date.now()).slice(-6)}`,
    order_number: `BST-${String(Date.now()).slice(-6)}`,
    customer,
    city: String(form.get("city") || "").trim() || "DM",
    total,
    productSubtotal: productTotal,
    deliveryCharges: deliveryFee,
    amountPayableInAdvance: advancePaid,
    amountPayableOnDelivery,
    paymentOption,
    paymentMethod: isFullAdvance ? "Full advance payment" : isDeliveryAdvance ? "COD — delivery advance" : "Cash on Delivery",
    status,
    postexStatus: status,
    paymentStatus: form.get("paymentStatus") || (advancePaid > 0 ? "Payment Verified" : "Awaiting Payment"),
    fulfillmentStatus: form.get("fulfillmentStatus") || "Manual delivery",
    deliveryMethod,
    source,
    postexBooked: false,
    tracking: "",
    phone: String(form.get("phone") || "").trim(),
    address: String(form.get("address") || "").trim(),
    items,
    order_items: items,
    notes,
    internalNotes: notes,
    tags: ["Custom order", source, deliveryMethod].filter(Boolean),
    risk: "Standard COD",
    createdAt: now.toISOString(),
    date: now.toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
  };
}

function formatSavedCustomOrder(order, fallback = {}) {
  if (!order?.order_number && !fallback?.order_number && !fallback?.id) return fallback;
  const totalOrderValue = Number(order?.total_order_value_pkr ?? order?.total_pkr ?? order?.total ?? fallback.total ?? 0);
  const productSubtotal = Number(order?.product_subtotal_pkr ?? order?.subtotal_pkr ?? fallback.productSubtotal ?? totalOrderValue ?? 0);
  const deliveryCharges = Number(order?.delivery_charges_pkr ?? order?.delivery_pkr ?? fallback.deliveryCharges ?? 0);
  const amountPayableInAdvance = Number(order?.amount_payable_in_advance_pkr ?? fallback.amountPayableInAdvance ?? 0);
  const amountPayableOnDelivery = Number(order?.amount_payable_on_delivery_pkr ?? fallback.amountPayableOnDelivery ?? Math.max(0, totalOrderValue - amountPayableInAdvance));
  const normalizedPaymentMethod = String(order?.payment_method || fallback.paymentOption || "cod").trim().toLowerCase();
  const paymentMethod = normalizedPaymentMethod === "full_advance" || normalizedPaymentMethod === "bank_deposit" || (totalOrderValue > 0 && amountPayableInAdvance >= totalOrderValue && deliveryCharges === 0)
    ? "Full advance payment"
    : amountPayableInAdvance > 0
      ? "COD — delivery advance"
      : "Cash on Delivery";
  const orderItems = (Array.isArray(order?.items) && order.items.length)
    ? order.items
    : (Array.isArray(order?.order_items) && order.order_items.length)
      ? order.order_items
      : (fallback.items || []);
  const notesText = order?.internal_notes || order?.notes || fallback.notes || fallback.internalNotes || "";
  const tagsList = Array.isArray(order?.tags) && order.tags.length ? order.tags : (fallback.tags || ["Custom order"]);
  const source = fallback.source || tagsList.find((t) => ["Instagram DM", "WhatsApp", "Phone call", "Walk-in", "Facebook", "Manual"].includes(t)) || "Manual";
  const deliveryMethod = fallback.deliveryMethod || order?.delivery_method || tagsList.find((t) => ["PostEx", "Rider / same city", "Customer pickup", "Staff delivery", "Manual courier"].includes(t)) || "Rider / same city";

  return {
    ...fallback,
    rawId: order?.id || fallback.rawId,
    raw: order,
    id: order?.order_number ? `#${order.order_number}` : (fallback.id || `#${Date.now()}`),
    order_number: order?.order_number || fallback.order_number || String(fallback.id || "").replace(/^#/, ""),
    customer: order?.shipping_full_name || order?.guest_name || fallback.customer,
    city: order?.shipping_city || fallback.city,
    total: totalOrderValue,
    productSubtotal,
    deliveryCharges,
    amountPayableInAdvance,
    amountPayableOnDelivery,
    paymentMethod,
    paymentOption: normalizedPaymentMethod,
    status: formatOrderStatus(order?.courier_status || order?.status || fallback.status || "Un-Assigned By Me"),
    postexStatus: formatOrderStatus(order?.courier_status || order?.status || fallback.postexStatus || "Un-Assigned By Me"),
    paymentStatus: order?.payment_proof_status || order?.payment_status || fallback.paymentStatus || "Awaiting Payment",
    confirmationStatus: "Confirmed",
    paymentReference: order?.payment_reference || fallback.paymentReference || "",
    fulfillmentStatus: order?.fulfillment_status || fallback.fulfillmentStatus || "Manual delivery",
    tracking: order?.courier_tracking_number || order?.tracking_number || fallback.tracking || "",
    phone: order?.shipping_phone || order?.guest_phone || fallback.phone || "",
    address: [order?.shipping_address, order?.shipping_city, order?.shipping_postal_code].filter(Boolean).join(", ") || fallback.address || "",
    items: orderItems,
    order_items: orderItems,
    notes: notesText,
    internalNotes: order?.internal_notes || notesText,
    source,
    deliveryMethod,
    tags: tagsList,
    risk: fallback.risk || "Standard COD",
    createdAt: order?.created_at || fallback.createdAt || new Date().toISOString(),
    date: order?.created_at ? new Date(order.created_at).toLocaleString("en-PK", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }) : fallback.date,
  };
}

function generateBulkOrdersPdf({ orders = [], type = "stitching" }) {
  if (!orders.length) return;
  const printWindow = window.open("", "_blank", "width=850,height=950");
  if (!printWindow) {
    alert("Please allow popups to generate and print PDF.");
    return;
  }

  const escapeHtml = (str = "") =>
    String(str || "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    }[char]));

  let htmlContent = "";

  if (type === "stitching") {
    // Specialized Stitching Unit Production Job Cards (1 A4 Card per Order)
    htmlContent = orders.map((order, orderIndex) => {
      const items = normalizeOrderItems(order);
      const totalSuits = items.reduce((sum, it) => sum + Number(it.quantity || 1), 0);
      const notesText = (order.notes || order.internalNotes || "").trim();

      const itemsHtml = items.map((item, itIdx) => {
        const qty = Number(item.quantity || 1);
        const rawSize = String(item.size || "Custom").trim();
        const rawColor = String(item.color || "Standard / As Picture").trim();
        const sku = String(item.sku || "").trim();
        const isCustom = !["XS", "S", "M", "L", "XL", "XXL", "Free Size"].includes(rawSize) || rawSize.toLowerCase().includes("custom");

        return `
          <div class="stitchingItemCard">
            <div class="itemTitleBar">
              <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <span class="itemBadge">SUIT #${itIdx + 1}</span>
                  ${sku ? `<span class="skuPill">SKU: ${escapeHtml(sku)}</span>` : ""}
                </div>
                <h2 class="suitName">${escapeHtml(item.name || item.title)}</h2>
              </div>
              <div class="sizeHighlightBadge ${isCustom ? 'customSizeBadge' : ''}">
                <span class="sizeLabel">${isCustom ? 'CUSTOM SIZE' : 'STITCHING SIZE'}</span>
                <b class="sizeValue">${escapeHtml(rawSize)}</b>
              </div>
            </div>

            <div class="suitSpecsGrid">
              <div class="specBox">
                <span class="specLabel">Color / Fabric:</span>
                <b class="specValue">${escapeHtml(rawColor)}</b>
              </div>
              <div class="specBox">
                <span class="specLabel">Quantity to Stitch:</span>
                <b class="specValue" style="color:#166534;font-size:15px;">${qty} Suit${qty > 1 ? 's' : ''}</b>
              </div>
              <div class="specBox">
                <span class="specLabel">Sizing Spec:</span>
                <b class="specValue" style="color:${isCustom ? '#b45309' : '#1e40af'};">${isCustom ? '✂️ Custom Measurements' : '📏 Standard Pattern'}</b>
              </div>
            </div>

            <div class="measurementsTableWrap">
              <div class="measurementsHead">Standard Pattern Reference [Size: ${escapeHtml(rawSize)}]:</div>
              <div class="measurementsGrid">
                ${rawSize === "XS" ? `
                  <div class="measItem"><span>Chest</span><b>18"</b></div>
                  <div class="measItem"><span>Shirt Length</span><b>37"</b></div>
                  <div class="measItem"><span>Shoulder</span><b>14"</b></div>
                  <div class="measItem"><span>Sleeves</span><b>21"</b></div>
                  <div class="measItem"><span>Waist</span><b>16"</b></div>
                  <div class="measItem"><span>Trouser Length</span><b>37"</b></div>
                ` : rawSize === "S" ? `
                  <div class="measItem"><span>Chest</span><b>19"</b></div>
                  <div class="measItem"><span>Shirt Length</span><b>38"</b></div>
                  <div class="measItem"><span>Shoulder</span><b>14.5"</b></div>
                  <div class="measItem"><span>Sleeves</span><b>21.5"</b></div>
                  <div class="measItem"><span>Waist</span><b>17"</b></div>
                  <div class="measItem"><span>Trouser Length</span><b>38"</b></div>
                ` : rawSize === "M" ? `
                  <div class="measItem"><span>Chest</span><b>20"</b></div>
                  <div class="measItem"><span>Shirt Length</span><b>39"</b></div>
                  <div class="measItem"><span>Shoulder</span><b>15"</b></div>
                  <div class="measItem"><span>Sleeves</span><b>22"</b></div>
                  <div class="measItem"><span>Waist</span><b>18.5"</b></div>
                  <div class="measItem"><span>Trouser Length</span><b>38.5"</b></div>
                ` : rawSize === "L" ? `
                  <div class="measItem"><span>Chest</span><b>21.5"</b></div>
                  <div class="measItem"><span>Shirt Length</span><b>40"</b></div>
                  <div class="measItem"><span>Shoulder</span><b>15.5"</b></div>
                  <div class="measItem"><span>Sleeves</span><b>22.5"</b></div>
                  <div class="measItem"><span>Waist</span><b>20"</b></div>
                  <div class="measItem"><span>Trouser Length</span><b>39"</b></div>
                ` : rawSize === "XL" ? `
                  <div class="measItem"><span>Chest</span><b>23"</b></div>
                  <div class="measItem"><span>Shirt Length</span><b>40"</b></div>
                  <div class="measItem"><span>Shoulder</span><b>16"</b></div>
                  <div class="measItem"><span>Sleeves</span><b>22.5"</b></div>
                  <div class="measItem"><span>Waist</span><b>21.5"</b></div>
                  <div class="measItem"><span>Trouser Length</span><b>40"</b></div>
                ` : rawSize === "XXL" ? `
                  <div class="measItem"><span>Chest</span><b>24.5"</b></div>
                  <div class="measItem"><span>Shirt Length</span><b>41"</b></div>
                  <div class="measItem"><span>Shoulder</span><b>16.5"</b></div>
                  <div class="measItem"><span>Sleeves</span><b>23"</b></div>
                  <div class="measItem"><span>Waist</span><b>23"</b></div>
                  <div class="measItem"><span>Trouser Length</span><b>40"</b></div>
                ` : isCustom ? `
                  <div style="grid-column: span 6; color:#92400e; font-weight:700; font-size:12px;">
                    ✂️ Custom Measurements / Sizing Details Given in Master Instructions Box Below
                  </div>
                ` : `
                  <div style="grid-column: span 6; color:#475569; font-size:12px;">
                    Free Size / Standard Unstitched Pattern
                  </div>
                `}
              </div>
            </div>
          </div>
        `;
      }).join("");

      return `
        <div class="stitchingPage ${orderIndex < orders.length - 1 ? 'pageBreak' : ''}">
          <!-- Slip Header -->
          <header class="stitchingHeader">
            <div class="brandCol">
              <h1 class="brandLogo">BUSTANIYA</h1>
              <span class="unitTitle">🧵 WORKSHOP STITCHING PRODUCTION SLIP</span>
            </div>
            <div class="orderMetaCol">
              <div class="orderNumberBadge">${escapeHtml(order.id)}</div>
              <div class="orderDateText"><b>Order Date:</b> ${escapeHtml(order.date || "")}</div>
              <div class="orderSourceText"><b>Source:</b> ${escapeHtml(order.source || "Customer Order")}</div>
            </div>
          </header>

          <!-- Customer & Destination Banner -->
          <div class="customerStitchingBar">
            <div class="custCol">
              <span class="labelM">Customer Name:</span>
              <b class="valM" style="font-size:15px;color:#0f172a;">${escapeHtml(order.customer || "—")}</b>
              ${order.phone ? `<span class="subValM">📞 ${escapeHtml(order.phone)}</span>` : ""}
            </div>
            <div class="custCol">
              <span class="labelM">Destination City:</span>
              <b class="valM" style="font-size:14px;">📍 ${escapeHtml(order.city || "—")}</b>
            </div>
            <div class="custCol">
              <span class="labelM">Total Quantity:</span>
              <b class="valM" style="color:#166534;font-size:16px;">${totalSuits} Suit${totalSuits > 1 ? 's' : ''}</b>
            </div>
            <div class="custCol">
              <span class="labelM">Production Order:</span>
              <b class="valM" style="color:#1e40af;">Made-to-Order Workshop</b>
            </div>
          </div>

          <!-- Line Items Section -->
          <div class="suitsSectionTitle">
            <span>✂️ SUITS / ARTICLES SPECIFICATIONS</span>
          </div>
          ${itemsHtml}

          <!-- Master Customization & Tailor Notes Callout Box -->
          <div class="tailorNotesBox">
            <div class="tailorNotesHead">
              <b>⚠️ MASTER CUTTER &amp; TAILOR SPECIAL INSTRUCTIONS / CUSTOMIZATION:</b>
            </div>
            <div class="tailorNotesBody">
              ${notesText ? `
                <p class="customNotesContent">${escapeHtml(notesText)}</p>
              ` : `
                <p class="customNotesContent" style="color:#64748b;font-style:italic;font-weight:500;">
                  No extra customization requested. Stitch as per standard brand pattern, neckline, and sizing specs.
                </p>
              `}
            </div>
          </div>

          <!-- Footer -->
          <footer class="stitchingFooter">
            <span>Bustaniya Production Management · Order <b>${escapeHtml(order.id)}</b> · Generated on ${new Date().toLocaleString("en-PK")}</span>
          </footer>
        </div>
      `;
    }).join("");
  } else if (type === "batch_sheet") {
    // Consolidated Master Cutting & Production Batch Sheet
    const totalSuits = orders.reduce((sum, o) => {
      const items = normalizeOrderItems(o);
      return sum + items.reduce((s, it) => s + Number(it.quantity || 1), 0);
    }, 0);

    const rowsHtml = orders.flatMap((o, orderIdx) => {
      const items = normalizeOrderItems(o);
      const notes = (o.notes || o.internalNotes || "").trim();

      return items.map((it, itIdx) => {
        const rawSize = String(it.size || "Custom").trim();
        const isCustom = !["XS", "S", "M", "L", "XL", "XXL", "Free Size"].includes(rawSize) || rawSize.toLowerCase().includes("custom");

        return `<tr>
          <td style="text-align:center;font-weight:bold;">${orderIdx + 1}.${itIdx + 1}</td>
          <td><b>${escapeHtml(o.id)}</b><br/><small style="color:#64748b;">${escapeHtml(o.date || "")}</small></td>
          <td><b>${escapeHtml(o.customer)}</b><br/><small style="color:#475569;">📍 ${escapeHtml(o.city || "—")}</small></td>
          <td>
            <b style="font-size:14px;color:#0f172a;">${escapeHtml(it.name)}</b>
            ${it.sku ? `<br/><code style="font-size:10px;color:#64748b;">${escapeHtml(it.sku)}</code>` : ""}
          </td>
          <td style="text-align:center;">
            <span class="batchSizeBadge ${isCustom ? 'customBadge' : ''}">${escapeHtml(rawSize)}</span>
          </td>
          <td>${escapeHtml(it.color || "Standard")}</td>
          <td style="text-align:center;font-weight:bold;font-size:14px;">${Number(it.quantity || 1)}</td>
          <td style="font-size:12px;color:#713f12;background:#fefce8;max-width:240px;line-height:1.35;">
            ${notes ? `<b>⚠️</b> ${escapeHtml(notes)}` : `<span style="color:#94a3b8;">Standard stitch</span>`}
          </td>
          <td style="text-align:center;font-size:11px;">[ &nbsp; ] Cut<br/>[ &nbsp; ] Stitch</td>
        </tr>`;
      });
    }).join("");

    htmlContent = `
      <div class="manifestContainer">
        <header class="manifestHeader">
          <div>
            <h1>BUSTANIYA</h1>
            <p>🧵 DAILY PRODUCTION CUTTING &amp; STITCHING BATCH SHEET</p>
          </div>
          <div style="text-align:right;">
            <p><b>Batch Date:</b> ${new Date().toLocaleString("en-PK")}</p>
            <p><b>Total Orders:</b> ${orders.length} &nbsp;|&nbsp; <b>Total Suits to Stitch:</b> ${totalSuits}</p>
          </div>
        </header>

        <div class="manifestSummary" style="grid-template-columns: repeat(3, 1fr);">
          <div class="statBox"><span>Total Selected Orders</span><b>${orders.length} Orders</b></div>
          <div class="statBox" style="background:#ecfdf5;border-color:#a7f3d0;">
            <span style="color:#065f46;">Total Production Suits</span>
            <b style="color:#065f46;font-size:20px;">${totalSuits} Suits</b>
          </div>
          <div class="statBox">
            <span>Production Master</span>
            <b>Workshop Master Cut</b>
          </div>
        </div>

        <table class="manifestTable">
          <thead>
            <tr>
              <th style="width:35px;text-align:center;">#</th>
              <th style="width:90px;">Order Ref</th>
              <th style="width:120px;">Customer</th>
              <th>Suit / Article Title</th>
              <th style="width:75px;text-align:center;">Size</th>
              <th style="width:90px;">Color</th>
              <th style="width:45px;text-align:center;">Qty</th>
              <th>Master Tailor Customization Instructions</th>
              <th style="width:85px;text-align:center;">Workshop Sign</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:13px;color:#475569;border-top:1px dashed #cbd5e1;padding-top:20px;">
          <div>Master Cutter Signature: ___________________</div>
          <div>Stitching Incharge Signature: ___________________</div>
          <div>Final QA Approval: ___________________</div>
        </div>
      </div>
    `;
  } else if (type === "manifest") {
    // Courier Dispatch Manifest
    const totalCod = orders.reduce((sum, o) => sum + orderMoney(o).cod, 0);
    const totalAdvance = orders.reduce((sum, o) => sum + orderMoney(o).advance, 0);
    const totalValue = orders.reduce((sum, o) => sum + orderMoney(o).total, 0);

    const rowsHtml = orders.map((o, idx) => {
      const items = normalizeOrderItems(o);
      const itemsText = items.map((it) => `${escapeHtml(it.name)} ${[it.size, it.color].filter(Boolean).length ? `(${escapeHtml([it.size, it.color].filter(Boolean).join("/"))})` : ""} × ${it.quantity}`).join("<br/>");
      const { advance: adv, cod } = orderMoney(o);

      return `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><b>${escapeHtml(o.id)}</b><br/><small style="color:#64748b;">${escapeHtml(o.date || "")}</small></td>
        <td><b>${escapeHtml(o.customer)}</b><br/><small style="color:#2563eb;">📞 ${escapeHtml(o.phone || "")}</small></td>
        <td><b>${escapeHtml(o.city || "—")}</b><br/><small style="color:#475569;font-size:11px;">${escapeHtml(o.address || "")}</small></td>
        <td style="font-size:12px;">${itemsText}</td>
        <td><b>${escapeHtml(o.deliveryMethod || "PostEx")}</b>${o.tracking ? `<br/><code style="background:#f1f5f9;padding:2px 4px;border-radius:3px;font-size:11px;">${escapeHtml(o.tracking)}</code>` : ""}</td>
        <td style="text-align:right;">Rs. ${adv.toLocaleString()}</td>
        <td style="text-align:right;font-weight:bold;color:#166534;">Rs. ${cod.toLocaleString()}</td>
      </tr>`;
    }).join("");

    htmlContent = `
      <div class="manifestContainer">
        <header class="manifestHeader">
          <div>
            <h1>Bustaniya</h1>
            <p>Dispatch Manifest &amp; Courier Handover Sheet</p>
          </div>
          <div style="text-align:right;">
            <p><b>Date:</b> ${new Date().toLocaleString("en-PK")}</p>
            <p><b>Total Orders:</b> ${orders.length}</p>
          </div>
        </header>

        <div class="manifestSummary">
          <div class="statBox"><span>Selected Orders</span><b>${orders.length}</b></div>
          <div class="statBox"><span>Total Order Value</span><b>Rs. ${totalValue.toLocaleString()}</b></div>
          <div class="statBox"><span>Advance Paid</span><b>Rs. ${totalAdvance.toLocaleString()}</b></div>
          <div class="statBox" style="background:#ecfdf5;border-color:#a7f3d0;">
            <span style="color:#065f46;">Total COD To Collect</span>
            <b style="color:#065f46;font-size:18px;">Rs. ${totalCod.toLocaleString()}</b>
          </div>
        </div>

        <table class="manifestTable">
          <thead>
            <tr>
              <th style="width:30px;">#</th>
              <th>Order Ref</th>
              <th>Customer</th>
              <th>Destination</th>
              <th>Ordered Items</th>
              <th>Courier &amp; Tracking</th>
              <th style="text-align:right;">Advance</th>
              <th style="text-align:right;">COD Collectible</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc;font-weight:bold;">
              <td colspan="6" style="text-align:right;">GRAND TOTAL:</td>
              <td style="text-align:right;">Rs. ${totalAdvance.toLocaleString()}</td>
              <td style="text-align:right;color:#166534;font-size:15px;">Rs. ${totalCod.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:13px;color:#475569;border-top:1px dashed #cbd5e1;padding-top:20px;">
          <div>Handed Over By: ___________________</div>
          <div>Courier Rider Signature: ___________________</div>
          <div>Rider Name &amp; Phone: ___________________</div>
        </div>
      </div>
    `;
  } else {
    // Multi-page Invoices or Packing Slips
    const isCompact = type === "packing_slip";

    htmlContent = orders.map((order, orderIndex) => {
      const items = normalizeOrderItems(order);
      // Falling back to the total when `productSubtotal` was 0 printed invoices
      // whose subtotal plus delivery did not add up to their own total.
      const { total, subtotal, delivery, advance, cod } = orderMoney(order);

      const itemsRows = items.map((item) => {
        const qty = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        const lineTotal = qty * price;
        const variantDetails = [item.sku, item.size ? `Size: ${item.size}` : "", item.color ? `Color: ${item.color}` : ""].filter(Boolean).join(" | ");

        return `<tr>
          <td>
            <b style="font-size:14px;">${escapeHtml(item.name)}</b>
            ${variantDetails ? `<small style="display:block;color:#64748b;font-size:12px;margin-top:3px;">${escapeHtml(variantDetails)}</small>` : ""}
          </td>
          <td style="text-align:center;font-weight:bold;font-size:14px;">${qty}</td>
          ${!isCompact ? `<td style="text-align:right;">Rs. ${price.toLocaleString()}</td><td style="text-align:right;font-weight:bold;font-size:14px;">Rs. ${lineTotal.toLocaleString()}</td>` : ""}
        </tr>`;
      }).join("");

      return `
        <div class="orderPage ${orderIndex < orders.length - 1 ? 'pageBreak' : ''}">
          <header class="orderHeader">
            <div>
              <h1>Bustaniya</h1>
              <p style="margin:2px 0 0 0;font-size:12px;color:#64748b;">Luxury Ready to Wear · Official Store</p>
              <p style="margin:4px 0 0 0;font-size:12px;color:#166534;font-weight:bold;letter-spacing:0.05em;">${isCompact ? "📦 WAREHOUSE PACKING SLIP" : "📄 CUSTOMER INVOICE / ORDER RECEIPT"}</p>
            </div>
            <div style="text-align:right;">
              <h2 style="margin:0;color:#173d29;font-size:22px;">${escapeHtml(order.id)}</h2>
              <p style="margin:2px 0;font-size:12px;color:#64748b;">Date: ${escapeHtml(order.date || "")}</p>
              <p style="margin:2px 0;font-size:12px;color:#334155;"><b>Status:</b> ${escapeHtml(order.postexStatus || order.status || "Confirmed")}</p>
              <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:#f1f5f9;color:#334155;">
                ${escapeHtml(order.source || "Storefront")}
              </span>
            </div>
          </header>

          <div class="gridTwo">
            <div class="infoBox">
              <b>Customer Information</b>
              <p style="margin:6px 0 2px 0;font-size:14px;font-weight:bold;color:#0f172a;">${escapeHtml(order.customer)}</p>
              <p style="margin:2px 0;font-size:13px;color:#2563eb;">📞 ${escapeHtml(order.phone || "No phone")}</p>
              ${order.email ? `<p style="margin:2px 0;font-size:12px;color:#64748b;">✉️ ${escapeHtml(order.email)}</p>` : ""}
            </div>
            <div class="infoBox">
              <b>Shipping &amp; Delivery Details</b>
              <p style="margin:6px 0 2px 0;font-size:13px;color:#0f172a;"><b>📍 City:</b> ${escapeHtml(order.city || "—")}</p>
              <p style="margin:2px 0;font-size:12px;color:#475569;line-height:1.4;">${escapeHtml(order.address || "No address provided")}</p>
              <p style="margin:4px 0 0 0;font-size:12px;"><b>Delivery via:</b> ${escapeHtml(order.deliveryMethod || "PostEx")}</p>
              ${order.tracking ? `<p style="margin:2px 0 0 0;font-size:12px;color:#166534;font-weight:bold;">🚚 Tracking #: ${escapeHtml(order.tracking)}</p>` : ""}
            </div>
          </div>

          <table class="itemsTable">
            <thead>
              <tr>
                <th>Ordered Item &amp; Variants</th>
                <th style="width:60px;text-align:center;">Qty</th>
                ${!isCompact ? `<th style="width:120px;text-align:right;">Unit Price</th><th style="width:130px;text-align:right;">Total</th>` : ""}
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          ${!isCompact ? `
            <div class="financialSummary">
              <div class="totalsTable">
                <div><span>Products Subtotal:</span><span>Rs. ${subtotal.toLocaleString()}</span></div>
                <div><span>Delivery Charges:</span><span>${delivery > 0 ? `Rs. ${delivery.toLocaleString()}` : "Free Delivery"}</span></div>
                <div style="border-top:2px solid #cbd5e1;padding-top:6px;font-size:15px;font-weight:bold;color:#0f172a;">
                  <span>Total Order Value:</span><span>Rs. ${total.toLocaleString()}</span>
                </div>
                ${advance > 0 ? `
                  <div style="color:#166534;font-weight:600;">
                    <span>Advance Payment Received:</span><span>- Rs. ${advance.toLocaleString()}</span>
                  </div>
                ` : ""}
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 10px;margin-top:8px;font-size:15px;font-weight:bold;color:#166534;">
                  <span>COD Amount to Pay:</span>
                  <span>${cod === 0 ? "PAID IN ADVANCE (Rs. 0)" : `Rs. ${cod.toLocaleString()}`}</span>
                </div>
              </div>
            </div>
          ` : `
            <div style="margin-top:16px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
              <b style="font-size:12px;color:#334155;">Packaging Checklist:</b>
              <p style="margin:4px 0 0 0;font-size:12px;color:#475569;line-height:1.4;">
                ✓ Ensure suit matching size and color is packed correctly.<br/>
                ✓ Include brand tags &amp; care instructions card.<br/>
                ✓ Seal parcel securely before handing over to courier rider.
              </p>
            </div>
          `}

          ${(order.notes || order.internalNotes) ? `
            <div class="notesBox">
              <b>📝 Special Remarks / Customer Request:</b>
              <p style="margin:4px 0 0 0;font-size:12px;line-height:1.4;white-space:pre-wrap;">${escapeHtml(order.notes || order.internalNotes)}</p>
            </div>
          ` : ""}

          <footer class="orderFooter">
            <p>Thank you for choosing Bustaniya! For any support or inquiries, visit <b>bustaniya.com</b></p>
            <p style="font-size:10px;color:#94a3b8;margin-top:4px;">Invoice generated on ${new Date().toLocaleString("en-PK")}</p>
          </footer>
        </div>
      `;
    }).join("");
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${type === "stitching" ? "Stitching Production Slips" : type === "batch_sheet" ? "Cutting Batch Sheet" : type === "manifest" ? "Dispatch Manifest" : "Invoices"} (${orders.length} Orders) - Bustaniya</title>
        <style>
          @page {
            size: A4;
            margin: 10mm 12mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pageBreak {
            page-break-after: always;
            break-after: page;
          }
          
          /* Stitching Card Styles */
          .stitchingPage {
            padding: 20px 24px;
            max-width: 820px;
            margin: 0 auto;
          }
          .stitchingHeader {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #166534;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .brandLogo {
            margin: 0;
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 0.08em;
            color: #173d29;
          }
          .unitTitle {
            display: inline-block;
            font-size: 11px;
            font-weight: 800;
            color: #166534;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            background: #dcfce7;
            padding: 3px 8px;
            border-radius: 4px;
            margin-top: 4px;
          }
          .orderNumberBadge {
            font-size: 22px;
            font-weight: 900;
            color: #1e293b;
            background: #f1f5f9;
            border: 2px solid #cbd5e1;
            padding: 4px 12px;
            border-radius: 6px;
            text-align: right;
            display: inline-block;
          }
          .orderDateText {
            font-size: 12px;
            color: #475569;
            margin-top: 4px;
            text-align: right;
          }
          .orderSourceText {
            font-size: 11px;
            color: #64748b;
            text-align: right;
          }

          .customerStitchingBar {
            display: grid;
            grid-template-columns: 1.4fr 1fr 1fr 1.2fr;
            gap: 10px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 16px;
          }
          .custCol .labelM {
            display: block;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #64748b;
            font-weight: 700;
            margin-bottom: 2px;
          }
          .custCol .valM {
            font-size: 14px;
            color: #0f172a;
            font-weight: 700;
          }
          .custCol .subValM {
            display: block;
            font-size: 11px;
            color: #15803d;
            font-weight: 600;
            margin-top: 2px;
          }

          .suitsSectionTitle {
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.06em;
            color: #1e293b;
            margin-bottom: 10px;
            border-left: 4px solid #166534;
            padding-left: 8px;
          }
          .stitchingItemCard {
            border: 2px solid #cbd5e1;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 14px;
            background: #fff;
          }
          .itemTitleBar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 12px;
            margin-bottom: 12px;
            gap: 12px;
          }
          .itemBadge {
            font-size: 10px;
            font-weight: 800;
            background: #1e293b;
            color: #fff;
            padding: 3px 7px;
            border-radius: 4px;
            display: inline-block;
          }
          .skuPill {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
          }
          .suitName {
            margin: 0;
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.2;
          }
          .sizeHighlightBadge {
            background: #1e40af;
            color: #fff;
            padding: 8px 16px;
            border-radius: 8px;
            text-align: center;
            min-width: 110px;
            box-shadow: 0 2px 4px rgba(30, 64, 175, 0.15);
          }
          .customSizeBadge {
            background: #b45309 !important;
            box-shadow: 0 2px 4px rgba(180, 83, 9, 0.15);
          }
          .sizeLabel {
            display: block;
            font-size: 9px;
            letter-spacing: 0.08em;
            opacity: 0.95;
            font-weight: 700;
          }
          .sizeValue {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 0.05em;
          }

          .suitSpecsGrid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            background: #f1f5f9;
            padding: 10px 14px;
            border-radius: 6px;
            margin-bottom: 12px;
          }
          .specBox .specLabel {
            display: block;
            font-size: 10px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .specBox .specValue {
            font-size: 14px;
            color: #0f172a;
            font-weight: 700;
          }

          .measurementsTableWrap {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 12px;
          }
          .measurementsHead {
            font-weight: 800;
            color: #334155;
            margin-bottom: 8px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .measurementsGrid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            color: #334155;
          }
          .measItem {
            background: #fff;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 6px 8px;
            text-align: center;
          }
          .measItem span {
            display: block;
            font-size: 10px;
            color: #64748b;
            margin-bottom: 2px;
          }
          .measItem b {
            font-size: 13px;
            color: #0f172a;
          }

          .tailorNotesBox {
            background: #fefce8;
            border: 2px solid #eab308;
            border-radius: 8px;
            padding: 14px 18px;
            margin: 16px 0;
          }
          .tailorNotesHead b {
            font-size: 12px;
            color: #854d0e;
            letter-spacing: 0.05em;
          }
          .customNotesContent {
            margin: 8px 0 0 0;
            font-size: 14px;
            font-weight: 700;
            color: #713f12;
            line-height: 1.5;
            white-space: pre-wrap;
          }

          .stitchingFooter {
            margin-top: 20px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
            text-align: center;
            font-size: 11px;
            color: #64748b;
          }

          /* Batch Cut Sheet Styles */
          .batchSizeBadge {
            background: #dbeafe;
            color: #1e40af;
            font-weight: 900;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 12px;
            display: inline-block;
          }
          .batchSizeBadge.customBadge {
            background: #fef3c7 !important;
            color: #92400e !important;
          }

          /* Invoice & Manifest Styles */
          .orderPage {
            padding: 24px 28px;
            max-width: 800px;
            margin: 0 auto;
          }
          .orderHeader {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #173d29;
            padding-bottom: 14px;
            margin-bottom: 16px;
          }
          .orderHeader h1 {
            margin: 0;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: 0.04em;
            color: #173d29;
          }
          .gridTwo {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 16px;
          }
          .infoBox {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 14px;
          }
          .infoBox b {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #64748b;
          }
          .itemsTable {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          .itemsTable th {
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #475569;
            border-bottom: 2px solid #cbd5e1;
            padding: 8px 10px;
            background: #f1f5f9;
          }
          .itemsTable td {
            border-bottom: 1px solid #e2e8f0;
            padding: 10px;
            font-size: 13px;
            vertical-align: top;
          }
          .financialSummary {
            display: flex;
            justify-content: flex-end;
            margin-top: 10px;
          }
          .totalsTable {
            width: 330px;
          }
          .totalsTable div {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 13px;
            color: #334155;
          }
          .notesBox {
            margin-top: 14px;
            padding: 10px 14px;
            background: #fefce8;
            border: 1px solid #fef08a;
            border-radius: 8px;
            font-size: 12px;
            color: #713f12;
          }
          .orderFooter {
            margin-top: 24px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            text-align: center;
            font-size: 11px;
            color: #64748b;
          }
          
          /* Manifest Styles */
          .manifestContainer {
            padding: 24px;
            max-width: 950px;
            margin: 0 auto;
          }
          .manifestHeader {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #173d29;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .manifestHeader h1 {
            margin: 0;
            font-size: 24px;
            color: #173d29;
          }
          .manifestHeader p {
            margin: 2px 0 0 0;
            color: #64748b;
            font-size: 13px;
          }
          .manifestSummary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 16px;
          }
          .statBox {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 12px;
          }
          .statBox span {
            display: block;
            font-size: 11px;
            color: #64748b;
          }
          .statBox b {
            font-size: 16px;
            color: #0f172a;
          }
          .manifestTable {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .manifestTable th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 8px;
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
          }
          .manifestTable td {
            border: 1px solid #e2e8f0;
            padding: 8px;
            vertical-align: top;
          }

          .printControls {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            background: #fff;
            padding: 10px 16px;
            border-radius: 30px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1);
            border: 1px solid #cbd5e1;
            z-index: 9999;
          }
          .printBtn {
            background: #166534;
            color: #fff;
            border: none;
            padding: 9px 20px;
            font-size: 13px;
            font-weight: bold;
            border-radius: 20px;
            cursor: pointer;
          }
          @media print {
            .printControls {
              display: none !important;
            }
            .stitchingPage {
              padding: 0;
            }
            .orderPage {
              padding: 0;
            }
            .manifestContainer {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="printControls">
          <button class="printBtn" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function OrdersPanel({ rows, products, pagination, canExport, currentAdminUser, connected, loading, error, onRetry, onPageChange, initialSelectedId, onInitialSelectionHandled, tableDensity = "comfortable", setTableDensity, onNavigateToEvents }) {
  const [localOrders, setLocalOrders] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [activeTab, setActiveTab] = useState("Total Orders");
  const [orderSearch, setOrderSearch] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [exportingOrders, setExportingOrders] = useState(false);
  const [orderEdits, setOrderEdits] = useState({});
  const allRows = useMemo(() => {
    const localIds = new Set(localOrders.map((order) => order.id));
    return [
      ...localOrders,
      ...rows
        .filter((order) => !localIds.has(order.id))
        .map((order) => ({ ...order, ...(orderEdits[order.id] || {}) })),
    ];
  }, [localOrders, orderEdits, rows]);
  const periodSummary = buildOrderPeriodSummary(allRows);

  useEffect(() => {
    localStorage.removeItem("bustaniya-custom-orders");
    if (connected) setLocalOrders([]);
  }, [connected, rows]);

  useEffect(() => {
    if (!initialSelectedId) return;
    const cleanTarget = String(initialSelectedId).trim().toLowerCase().replace(/^#/, "");
    const match = allRows.find((order) => {
      const id1 = String(order.id || "").trim().toLowerCase().replace(/^#/, "");
      const id2 = String(order.order_number || "").trim().toLowerCase().replace(/^#/, "");
      const id3 = String(order.rawId || "").trim().toLowerCase();
      return id1 === cleanTarget || id2 === cleanTarget || id3 === cleanTarget;
    });
    if (match) {
      setSelectedId(match.id);
      onInitialSelectionHandled?.();
    }
  }, [allRows, initialSelectedId, onInitialSelectionHandled]);

  const orderStatusCounts = useMemo(() => [
    ...orderCategoryLabels.map((label) => ({
      label,
      count: label === "Total Orders"
        ? allRows.length
        : allRows.filter((order) => normalizePostexCategory(order.postexStatus || order.status) === label).length,
    })),
    {
      label: "Advance Paid",
      count: allRows.filter((order) => Number(order.amountPayableInAdvance || 0) > 0).length,
    },
  ], [allRows]);
  useEffect(() => {
    const validTabs = [...orderCategoryLabels, "Advance Paid"];
    if (!validTabs.includes(activeTab)) setActiveTab("Total Orders");
  }, [activeTab]);
  const selectedOrder = allRows.find((order) => order.id === selectedId);
  const visibleRows = allRows.filter((order) => {
    const statusLabel = normalizePostexCategory(order.postexStatus || order.status);
    const query = orderSearch.toLowerCase();
    const matchesTab = activeTab === "Total Orders"
      ? true
      : activeTab === "Advance Paid"
      ? Number(order.amountPayableInAdvance || 0) > 0
      : statusLabel === activeTab;
    const matchesSearch = [order.id, order.customer, order.city, order.tracking, order.phone, order.postexStatus, order.deliveryMethod, order.source]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
    return matchesTab && matchesSearch;
  });

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => selectedOrderIds.includes(r.id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      const visibleSet = new Set(visibleRows.map((r) => r.id));
      setSelectedOrderIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      setSelectedOrderIds((prev) => [...new Set([...prev, ...visibleRows.map((r) => r.id)])]);
    }
  }

  function toggleSelectOrder(orderId) {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  }
  const orderStatusVisual = orderStatusCounts.filter((item) => item.label !== "Total Orders" && item.count > 0).map((item) => ({
    label: item.label,
    value: item.count,
    color: item.label === "Delivered" ? "#10b981" : item.label === "Booked" ? "#2563eb" : item.label === "Unbooked" ? "#f59e0b" : item.label === "Attempted" ? "#8b5cf6" : item.label === "Returned" ? "#ef4444" : item.label === "Cancelled" ? "#6b7280" : "#3b82f6",
  }));
  // Delivered only: the chart is labelled "delivered order value", and counting
  // cancelled and returned parcels here inflated every city's revenue.
  const cityVisual = Object.entries(allRows.filter(isDeliveredOrder).reduce((map, order) => {
    const city = order.city || "Unknown";
    map[city] = (map[city] || 0) + orderMoney(order).total;
    return map;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value], index) => ({
    label,
    value,
    color: ["#1d6840", "#4777a8", "#c78b2b", "#8d2449", "#6c7b43", "#7d5ba6"][index] || "#1d6840",
  }));

  function updateLocalOrder(orderId, changes) {
    setLocalOrders((current) => current.map((order) => order.id === orderId ? { ...order, ...changes } : order));
    setOrderEdits((current) => ({ ...current, [orderId]: { ...(current[orderId] || {}), ...changes } }));
  }

  async function persistOrderUpdate(order, changes) {
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.rawId || order.raw?.id || order.id || order.order_number,
        orderStage: changes.postexStatus || changes.status,
        paymentStatus: changes.paymentStatus,
        paymentReference: changes.paymentReference,
        amountPayableInAdvance: changes.amountPayableInAdvance,
        confirmationStatus: changes.confirmationStatus,
        fulfillmentStatus: changes.fulfillmentStatus,
        tracking: changes.tracking,
        notes: changes.notes,
        tags: changes.tags,
        items: changes.items,
        operation: changes.operation,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.error?.message || "Order changes could not be saved.");
    const nextChanges = {
      ...changes,
      ...(result.operation ? { operation: result.operation } : {}),
      ...(result.operation ? { operationEvents: [{ event_type: "order_operation_updated", new_value: { operation: result.operation }, created_at: new Date().toISOString() }, ...(order.operationEvents || [])] } : {}),
      ...(result.operationPersistence !== "saved" && result.operationPersistence !== "not_requested" ? { operationStorageAvailable: false } : {}),
    };
    updateLocalOrder(order.id, nextChanges);
    return nextChanges;
  }

  async function saveCustomOrderToSupabase(order) {
    try {
      const shouldBookPostex = String(order.deliveryMethod || "").trim().toLowerCase() === "postex";
      const response = await fetch("/api/admin/postex-custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderRef: order.id,
          total: order.total,
          paymentOption: order.paymentOption,
          advancePaid: order.amountPayableInAdvance,
          deliveryCharges: order.deliveryCharges,
          paymentStatus: order.paymentStatus,
          status: order.status,
          deliveryMethod: order.deliveryMethod,
          bookPostex: shouldBookPostex,
          source: order.source,
          notes: order.notes,
          customer: {
            name: order.customer,
            phone: order.phone,
            address: order.address,
            city: order.city,
          },
          items: order.items,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save custom order.");
      const savedOrder = formatSavedCustomOrder(result.supabaseOrder, order);
      return {
        ...savedOrder,
        ...order,
        ...savedOrder,
        rawId: result.supabaseOrder?.id || order.rawId,
        id: result.orderRef ? `#${result.orderRef}` : order.id,
        tracking: result.trackingNumber,
        status: result.courierStatus || order.status,
        postexStatus: result.courierStatus || order.status,
        fulfillmentStatus: result.courierBooked ? "Booked with PostEx" : order.fulfillmentStatus,
        deliveryMethod: result.courierBooked ? "PostEx" : order.deliveryMethod,
        postexBooked: Boolean(result.courierBooked),
        notes: [order.notes, `${result.courierBooked ? "PostEx" : "Supabase"} tracking: ${result.trackingNumber}`].filter(Boolean).join("\n"),
      };
    } catch (error) {
      window.alert(error.message || "Unable to save custom order to Supabase.");
      return null;
    }
  }

  async function createDraft(event) {
    event.preventDefault();
    setCreatingDraft(true);
    try {
      const draftOrder = createDraftOrderFromForm(new FormData(event.currentTarget), products);
      const finalOrder = await saveCustomOrderToSupabase(draftOrder);
      if (!finalOrder) return;
      setShowDraft(false);
      await onRetry();
      setSelectedId(finalOrder.id);
    } finally {
      setCreatingDraft(false);
    }
  }

  async function exportOrders() {
    setExportingOrders(true);
    try {
      const response = await fetch("/api/admin/orders/export", { method: "POST" });
      if (!response.ok) throw new Error("Orders could not be exported.");
      const csv = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(csv);
      link.download = `bustaniya-orders-${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (exportError) {
      window.alert(exportError.message || "Orders could not be exported.");
    } finally {
      setExportingOrders(false);
    }
  }
  // The workspace keeps its shape while a page is refetched. Blanking the whole
  // panel on every page change lost the toolbar, the filters and the scroll
  // position, which read as the screen "hanging" on each click.
  const showSkeleton = loading && !allRows.length;
  const isRefreshing = loading && allRows.length > 0;

  return <>
    <div className="adminTitle">
      <div>
        <p>FULFILMENT</p>
        <h1>Orders</h1>
        <span>PostEx status, custom admin orders, fulfillment, returns and team notes.</span>
      </div>
      <button onClick={exportOrders} disabled={loading || exportingOrders || !canExport || !connected || !allRows.length} aria-busy={exportingOrders}>
        {exportingOrders ? "Exporting..." : "Export orders"}
      </button>
    </div>

    {!loading && error && <div className="ordersConnect"><div><b>Orders could not be loaded.</b><span>{error}</span></div><button onClick={onRetry}>Retry</button></div>}
    {!loading && !connected && !error && <div className="ordersConnect"><div><b>Session expired</b><span>Please sign in again to view orders.</span></div></div>}

    {showSkeleton && <OrdersLoadingSkeleton />}

    {!showSkeleton && (connected || allRows.length > 0) && <>
      <div className="moduleQuickLinks">
        <button className="customOrderCta" onClick={() => setShowDraft(true)}><Plus /> Create custom order</button>
      </div>

      <section className="orderPeriodGrid">
        {periodSummary.map((period) => <article className="adminCard orderPeriodCard" key={period.label}>
          <p>{period.label}</p>
          <div><b>{period.orders}</b><span>Orders</span></div>
          <ul>
            <li><span>Delivered sales</span><b>Rs. {period.sales.toLocaleString()}</b></li>
            <li><span>Avg. delivered order</span><b>Rs. {period.average.toLocaleString()}</b></li>
            <li><span>Range</span><b>{period.range}</b></li>
          </ul>
        </article>)}
      </section>

      <div className="adminVisualGrid">
        <VisualDonut title="Order pipeline" subtitle="Live fulfilment health — booked, in-transit, delivered and returned." centerValue={allRows.length} centerLabel="total" items={orderStatusVisual} />
        <VisualBars title="Revenue by city" subtitle="Top shipping destinations ranked by delivered order value." format={(value) => `Rs. ${Math.round(Number(value || 0)).toLocaleString()}`} items={cityVisual} />
      </div>

      <section className={`adminCard managementCard ordersWorkspace ${isRefreshing ? "isRefreshing" : ""}`}>
        {isRefreshing && <div className="ordersRefreshBar" role="status" aria-label="Refreshing orders" />}

        {selectedOrderIds.length > 0 && (
          <div className="orderBulkBar">
            <div className="orderBulkSummary">
              <span className="orderBulkCount">{selectedOrderIds.length} selected</span>
              <span className="orderBulkHint">Print or export the selected orders</span>
            </div>
            <div className="orderBulkActions">
              <button type="button" className="tone-forest" title="Print stitching and production job cards for the workshop tailor" onClick={() => generateBulkOrdersPdf({ orders: allRows.filter((order) => selectedOrderIds.includes(order.id)), type: "stitching" })}>
                🧵 Stitching slips
              </button>
              <button type="button" className="tone-teal" title="Print the master cutting and stitching batch sheet" onClick={() => generateBulkOrdersPdf({ orders: allRows.filter((order) => selectedOrderIds.includes(order.id)), type: "batch_sheet" })}>
                📋 Cutting sheet
              </button>
              <button type="button" className="tone-blue" title="Print customer invoices" onClick={() => generateBulkOrdersPdf({ orders: allRows.filter((order) => selectedOrderIds.includes(order.id)), type: "invoice" })}>
                📄 Invoices
              </button>
              <button type="button" className="tone-slate" title="Print the courier dispatch handover sheet" onClick={() => generateBulkOrdersPdf({ orders: allRows.filter((order) => selectedOrderIds.includes(order.id)), type: "manifest" })}>
                🚚 Courier manifest
              </button>
              <button type="button" className="orderBulkClear" onClick={() => setSelectedOrderIds([])}>Clear</button>
            </div>
          </div>
        )}

        <div className="orderStatusPills" role="tablist" aria-label="Filter orders by PostEx status">
          {orderStatusCounts.map((category) => {
            const isActive = activeTab === category.label;
            return (
              <button
                key={category.label}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`orderStatusPill tone-${orderPillTone(category.label)} ${isActive ? "isActive" : ""}`}
                onClick={() => setActiveTab(category.label)}
              >
                <span className="orderStatusPillLabel">{category.label}</span>
                <span className="orderStatusPillCount">{category.count}</span>
              </button>
            );
          })}
        </div>

        <div className="ordersToolbar">
          <div className="ordersToolbarInfo">
            <span className="ordersToolbarCount">
              {isRefreshing ? "Refreshing…" : <>Showing <b>{visibleRows.length}</b> of {allRows.length} {allRows.length === 1 ? "order" : "orders"}{activeTab !== "Total Orders" ? ` · ${activeTab}` : ""}</>}
            </span>
            <TableDensityToggle density={tableDensity} onChange={setTableDensity} />
          </div>
          <div className="inlineSearch ordersSearch">
            <Search aria-hidden="true" />
            <input
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
              placeholder="Search order #, customer, phone, city, tracking…"
              aria-label="Search orders"
            />
            {orderSearch && (
              <button type="button" className="ordersSearchClear" onClick={() => setOrderSearch("")} title="Clear search" aria-label="Clear search">✕</button>
            )}
          </div>
        </div>

        {allRows.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No orders received" description="There are no orders in your store database yet." />
        ) : (
          <OrderTable
            rows={visibleRows}
            density={tableDensity}
            onSelect={(order) => setSelectedId(order.id)}
            selectedOrderIds={selectedOrderIds}
            onToggleSelectOrder={toggleSelectOrder}
            onToggleSelectAll={toggleSelectAll}
            onPrintStitchingOrder={(order) => generateBulkOrdersPdf({ orders: [order], type: "stitching" })}
            onPrintSingleOrder={(order) => generateBulkOrdersPdf({ orders: [order], type: "invoice" })}
          />
        )}

        {pagination?.totalPages > 1 && (
          <div className="ordersPagination">
            <button disabled={loading || pagination.page <= 1} aria-busy={loading} onClick={() => onPageChange(pagination.page - 1)}>Previous</button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button disabled={loading || pagination.page >= pagination.totalPages} aria-busy={loading} onClick={() => onPageChange(pagination.page + 1)}>Next</button>
          </div>
        )}
      </section>

      {showDraft && <DraftOrderDialog products={products} onClose={() => setShowDraft(false)} onCreate={createDraft} saving={creatingDraft} />}
      {selectedOrder && <OrderDetailDrawer order={selectedOrder} catalogProducts={products} onClose={() => setSelectedId("")} onUpdate={persistOrderUpdate} canRecordRefund={currentAdminUser?.role === "Owner"} onNavigateToEvents={onNavigateToEvents} />}
    </>}
  </>;
}

function orderPillTone(label) {
  if (label === "Total Orders") return "neutral";
  if (label === "Advance Paid") return "money";
  if (label === "Delivered") return "delivered";
  if (label === "Booked" || label === "Transferred") return "booked";
  if (label === "Unbooked" || label === "Un-Assigned By Me") return "unbooked";
  if (label === "Returned" || label === "Out For Return") return "returned";
  if (label === "Cancelled") return "cancelled";
  if (label === "Attempted" || label === "Delivery Under Review") return "attention";
  return "transit";
}

function OrdersLoadingSkeleton() {
  return (
    <div className="ordersSkeleton" aria-busy="true" aria-label="Loading orders">
      <div className="ordersSkeletonCards">
        {[1, 2, 3].map((card) => (
          <div className="ordersSkeletonCard" key={card}>
            <span className="adminSkeleton" style={{ width: "38%", height: "10px" }} />
            <span className="adminSkeleton" style={{ width: "52%", height: "26px" }} />
            <span className="adminSkeleton" style={{ width: "100%", height: "9px" }} />
            <span className="adminSkeleton" style={{ width: "80%", height: "9px" }} />
          </div>
        ))}
      </div>
      <div className="ordersSkeletonTable">
        <div className="ordersSkeletonToolbar">
          <span className="adminSkeleton" style={{ width: "200px", height: "14px" }} />
          <span className="adminSkeleton" style={{ width: "260px", height: "34px" }} />
        </div>
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <span className="adminSkeleton ordersSkeletonRow" key={row} />
        ))}
      </div>
      <p className="adminLoadingStatus">Loading orders from Supabase…</p>
    </div>
  );
}

const courierProviderOptions = [
  ["postex", "PostEx"], ["leopards", "Leopards Courier"], ["tcs", "TCS"], ["mnp", "M&P"],
  ["trax", "Trax"], ["callcourier", "Call Courier"], ["blueex", "BlueEx"], ["manual", "Manual / rider"], ["custom", "Custom API"],
];

function CourierOperationsPanel() {
  const [snapshot, setSnapshot] = useState({ couriers: [], shipments: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState("");
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ courier: "all", status: "all", queue: "all" });
  async function load() {
    setLoading(true); setError("");
    try { const response = await fetch("/api/admin/courier-operations"); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to load courier operations."); setSnapshot(result); }
    catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function syncShipment(orderId) {
    setSyncing(orderId); setError("");
    try { const response = await fetch("/api/admin/courier-operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync_shipment", orderId }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Sync failed."); setSnapshot({ couriers: result.couriers, shipments: result.shipments }); }
    catch (syncError) { setError(syncError.message); await load(); } finally { setSyncing(""); }
  }
  const rows = snapshot.shipments.filter((shipment) => (filters.courier === "all" || shipment.provider === filters.courier) && (filters.status === "all" || shipment.courier_normalized_status === filters.status) && (filters.queue === "all" || (filters.queue === "delayed" ? shipment.isDelayed : Boolean(shipment.courier_sync_error))));
  async function syncVisiblePostex() {
    const targets = rows.filter((shipment) => shipment.provider === "postex" && shipment.courier_tracking_number).slice(0, 25);
    if (!targets.length) return;
    setBulkSyncing(true); setError("");
    try {
      for (const shipment of targets) {
        setSyncing(shipment.id);
        const response = await fetch("/api/admin/courier-operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync_shipment", orderId: shipment.id }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Sync failed for ${shipment.order_number}.`);
        setSnapshot({ couriers: result.couriers, shipments: result.shipments });
      }
    } catch (syncError) {
      setError(syncError.message);
      await load();
    } finally {
      setSyncing("");
      setBulkSyncing(false);
    }
  }
  const delayed = snapshot.shipments.filter((shipment) => shipment.isDelayed).length;
  const failed = snapshot.shipments.filter((shipment) => shipment.courier_sync_error).length;
  const delivered = snapshot.shipments.filter((shipment) => shipment.courier_normalized_status === "delivered").length;
  const inTransit = snapshot.shipments.filter((shipment) => ["booked", "picked_up", "in_transit", "out_for_delivery", "attempted", "on_hold"].includes(shipment.courier_normalized_status)).length;
  const syncableRows = rows.filter((shipment) => shipment.provider === "postex" && shipment.courier_tracking_number).length;
  const courierStatusVisual = [
    { label: "In process", value: inTransit, color: "#4777a8" },
    { label: "Delivered", value: delivered, color: "#1d6840" },
    { label: "Delayed", value: delayed, color: "#d08a18" },
    { label: "Sync failed", value: failed, color: "#b73543" },
  ].filter((item) => item.value > 0);
  const courierProviderVisual = Object.entries(snapshot.shipments.reduce((map, shipment) => {
    const key = shipment.courierName || shipment.provider || "Manual";
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {})).map(([label, value], index) => ({ label, value, color: ["#1d6840", "#4777a8", "#c78b2b", "#8d2449"][index] || "#1d6840" }));
  const statusLabel = (status) => String(status || "unassigned").replaceAll("_", " ");
  const issueLabel = (shipment) => {
    if (shipment.courier_sync_error) return shipment.courier_sync_error;
    if (shipment.isDelayed) return "Delayed over 5 days";
    if (!shipment.courier_tracking_number) return "Tracking missing";
    return "Clear";
  };
  return <>
    <div className="adminTitle"><div><p>COURIER HUB</p><h1>Courier operations</h1><span>Track every courier shipment, resolve exceptions and refresh live delivery status from one queue.</span></div><div className="moduleQuickLinks"><button type="button" onClick={syncVisiblePostex} disabled={bulkSyncing || loading || !syncableRows}><RefreshCw className={bulkSyncing ? "spinIcon" : ""} /> {bulkSyncing ? "Syncing..." : `Sync visible (${Math.min(syncableRows, 25)})`}</button><button type="button" onClick={load} disabled={loading}><RefreshCw className={loading ? "spinIcon" : ""} /> Refresh list</button></div></div>
    {error && <div className="adminErrorBanner">{error}</div>}
    <section className="financeMetricGrid courierMetricGrid"><article><Truck /><span><b>{snapshot.shipments.length}</b>Total tracked</span></article><article><Package /><span><b>{inTransit}</b>In process</span></article><article><CircleDollarSign /><span><b>{delivered}</b>Delivered</span></article><article className={delayed ? "alertMetric" : ""}><ReceiptText /><span><b>{delayed}</b>Delayed</span></article><article className={failed ? "alertMetric" : ""}><RefreshCw /><span><b>{failed}</b>Sync failures</span></article></section>
    <div className="adminVisualGrid">
      <VisualDonut title="Shipment status" subtitle="Active courier pipeline — in-transit, delivered, delayed and errors." centerValue={snapshot.shipments.length} centerLabel="tracked" items={courierStatusVisual} />
      <VisualBars title="Provider workload" subtitle="Shipment distribution across connected courier services." items={courierProviderVisual} />
    </div>
    <section className="adminCard courierCommandCard"><div className="inventoryListHead"><div><h2>Courier workflow</h2><span>Daily staff routine from booking to Finance settlement.</span></div></div><div className="courierFlowSteps"><div><b>1</b><span>Book order</span></div><div><b>2</b><span>Tracking saved</span></div><div><b>3</b><span>Sync status</span></div><div><b>4</b><span>Delivered / returned</span></div><div><b>5</b><span>PostEx Wallet</span></div></div></section>
    <section className="adminCard settingsForm settingsWideForm courierFilters"><div className="formRow"><label>Courier<select value={filters.courier} onChange={(event) => setFilters((current) => ({ ...current, courier: event.target.value }))}><option value="all">All couriers</option>{snapshot.couriers.map((courier) => <option key={courier.id} value={courier.provider}>{courier.name}</option>)}</select></label><label>Status<select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="all">All statuses</option>{["booked","picked_up","in_transit","out_for_delivery","delivered","attempted","on_hold","returned","cancelled","manual_delivery"].map((status) => <option value={status} key={status}>{statusLabel(status)}</option>)}</select></label><label>Queue<select value={filters.queue} onChange={(event) => setFilters((current) => ({ ...current, queue: event.target.value }))}><option value="all">All shipments</option><option value="delayed">Delayed only</option><option value="failed">Failed sync only</option></select></label></div><div className="orderTabs courierQuickFilters"><button type="button" className={filters.queue === "all" && filters.status === "all" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, queue: "all", status: "all" }))}>All</button><button type="button" className={filters.status === "out_for_delivery" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, status: "out_for_delivery", queue: "all" }))}>Out for delivery</button><button type="button" className={filters.status === "delivered" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, status: "delivered", queue: "all" }))}>Delivered</button><button type="button" className={filters.queue === "delayed" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, queue: "delayed", status: "all" }))}>Delayed</button><button type="button" className={filters.queue === "failed" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, queue: "failed", status: "all" }))}>Needs retry</button></div></section>
    <section className="adminCard settingsForm settingsWideForm"><div className="inventoryListHead"><div><h2>Shipment queue</h2><span>{rows.length} shipment{rows.length === 1 ? "" : "s"} shown</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Order / tracking</th><th>Courier</th><th>Service</th><th>Live status</th><th>Last sync</th><th>Issue</th><th /></tr></thead><tbody>{rows.map((shipment) => <tr key={shipment.id}><td><b>#{shipment.order_number}</b><small className="trackingNumber"><br />{shipment.courier_tracking_number || "No tracking number"}</small></td><td>{shipment.courierName}</td><td>{shipment.courier_service_type || "—"}</td><td><span className={`statusBadge ${shipment.courier_normalized_status}`}>{String(shipment.courier_normalized_status || "unassigned").replaceAll("_", " ")}</span><small className="trackingNumber"><br />{shipment.courier_raw_status || "—"}</small></td><td>{shipment.courier_last_synced_at ? new Date(shipment.courier_last_synced_at).toLocaleString("en-PK") : "Never"}</td><td>{shipment.courier_sync_error ? <small className="expenseAmount">{shipment.courier_sync_error}</small> : shipment.isDelayed ? <small className="expenseAmount">Delayed</small> : "—"}</td><td>{shipment.provider === "postex" && shipment.courier_tracking_number && <button type="button" className="editProductButton" onClick={() => syncShipment(shipment.id)} disabled={syncing === shipment.id}>{syncing === shipment.id ? "Syncing..." : shipment.courier_sync_error ? "Retry" : "Sync"}</button>}</td></tr>)}{!loading && !rows.length && <tr><td colSpan="7" className="emptyFinanceCell">No shipment matches these filters.</td></tr>}{loading && <tr><td colSpan="7" className="emptyFinanceCell">Loading shipment queue...</td></tr>}</tbody></table></div></section>
  </>;
}

function CouriersPanel() {
  const [snapshot, setSnapshot] = useState({ setupAvailable: true, couriers: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState("postex");

  async function loadCouriers() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/couriers");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load couriers.");
      setSnapshot(result);
    } catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  }

  useEffect(() => { loadCouriers(); }, []);

  async function saveCourier(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const provider = String(data.get("provider") || "custom");
    const code = String(data.get("code") || name).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    const isPostex = provider === "postex";
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/couriers", {
        method: editing?.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id, name, code, provider, status: data.get("status"), isDefault: data.get("isDefault") === "on",
          apiBaseUrl: data.get("apiBaseUrl"), merchantId: data.get("merchantId"), pickupAddressCode: data.get("pickupAddressCode"),
          settings: { ...(editing?.settings || {}), coveredCities: String(data.get("coveredCities") || "").split(",").map((city) => city.trim()).filter(Boolean), estimatedCostPkr: Number(data.get("estimatedCostPkr") || 0), priority: Number(data.get("priority") || 0), codEnabled: data.get("codEnabled") === "on", prepaidEnabled: data.get("prepaidEnabled") === "on" },
          credentials: { apiToken: data.get("apiToken"), apiKey: data.get("apiKey"), apiSecret: data.get("apiSecret"), webhookSecret: data.get("webhookSecret") },
          capabilities: isPostex ? { booking: true, tracking: true, settlements: true, cities: true, webhooks: false } : { booking: data.get("booking") === "on", tracking: data.get("tracking") === "on", settlements: data.get("settlements") === "on", cities: data.get("cities") === "on", webhooks: data.get("webhooks") === "on" },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save courier.");
      setEditing(null); await loadCouriers();
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  }

  const courier = editing || { provider: "postex", status: "active", capabilities: { booking: true, tracking: true, settlements: true, cities: true, webhooks: false } };
  const isPostex = selectedProvider === "postex";
  const activeCapabilities = (account) => Object.entries(account.capabilities || {}).filter(([, active]) => active);
  function openCourierForm(account = null) {
    setEditing(account || { provider: "postex", status: "active", capabilities: { booking: true, tracking: true, settlements: true, cities: true, webhooks: false } });
    setSelectedProvider(account?.provider || "postex");
  }
  return <>
    <div className="adminTitle"><div><p>COURIER HUB</p><h1>Couriers</h1><span>Add delivery partners once and manage their API connection, capabilities and default routing from one place.</span></div></div>
    {error && <div className="adminErrorBanner">{error}</div>}
    {!snapshot.setupAvailable && <div className="inventoryAlert materialAlert"><Truck /><div><b>Courier database setup required</b><span>Run <code>scripts/supabase-couriers.sql</code> in Supabase before saving courier connections.</span></div></div>}
    <section className="financeMetricGrid">
      <article><Truck /><span><b>{snapshot.couriers.length}</b>Connected couriers</span></article>
      <article><RefreshCw /><span><b>{snapshot.couriers.filter((item) => item.status === "active").length}</b>Active for operations</span></article>
      <article><Landmark /><span><b>{snapshot.couriers.find((item) => item.isDefault)?.name || "Not set"}</b>Default courier</span></article>
    </section>
    <section className="adminCard courierCommandCard">
      <div className="inventoryListHead"><div><h2>Courier setup checklist</h2><span>Configure once, then staff can book/sync orders without touching credentials.</span></div></div>
      <div className="courierFlowSteps"><div><b>1</b><span>Add PostEx API token</span></div><div><b>2</b><span>Set as default courier</span></div><div><b>3</b><span>Create custom orders with PostEx</span></div><div><b>4</b><span>Sync delivery status</span></div><div><b>5</b><span>Receive COD in Finance</span></div></div>
    </section>
    <section className="adminCard settingsForm settingsWideForm">
      <div className="inventoryListHead"><div><h2>Courier accounts</h2><span>Credentials stay server-side and are never returned to the browser.</span></div><button type="button" onClick={() => openCourierForm()}> <Plus /> Add courier</button></div>
      <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Courier</th><th>Provider</th><th>Capabilities</th><th>Status</th><th>API credentials</th><th /></tr></thead><tbody>
        {snapshot.couriers.map((item) => <tr key={item.id}><td><b>{item.name}</b>{item.isDefault && <small className="trackingNumber"><br />Default routing</small>}</td><td>{courierProviderOptions.find(([id]) => id === item.provider)?.[1] || item.provider}</td><td><div className="tagList">{Object.entries(item.capabilities || {}).filter(([, active]) => active).map(([capability]) => <span key={capability}>{capability}</span>) || "—"}</div></td><td><span className={`statusBadge ${item.status}`}>{item.status}</span></td><td>{item.credentialState?.apiToken || item.credentialState?.apiKey ? "Saved" : "Not added"}</td><td><button type="button" className="editProductButton" onClick={() => setEditing(item)}>Edit</button></td></tr>)}
        {!loading && !snapshot.couriers.length && <tr><td colSpan="6" className="emptyFinanceCell">No courier has been configured yet.</td></tr>}
        {loading && <tr><td colSpan="6" className="emptyFinanceCell">Loading courier accounts...</td></tr>}
      </tbody></table></div>
    </section>
    {editing && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveCourier}>
      <div className="inventoryListHead"><div><h2>{editing.id ? "Edit courier" : "Add courier"}</h2><span>{isPostex ? "For PostEx, only your API token is needed. Its endpoints and features are already configured." : "Enable only features supported by this courier's API."}</span></div><button type="button" onClick={() => setEditing(null)}>Cancel</button></div>
      <div className="formRow"><label>Provider<select name="provider" value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value)}>{courierProviderOptions.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>{!isPostex && <label>Courier name<input name="name" required defaultValue={courier.name || ""} placeholder="e.g. Leopards COD" /></label>}</div>
      {isPostex && <><input type="hidden" name="name" value={courier.name || "PostEx"} /><input type="hidden" name="code" value={courier.code || "postex"} /><input type="hidden" name="status" value="active" /><div className="inventoryAlert"><Truck /><div><b>What to add for PostEx</b><span>Paste the API token from your PostEx merchant portal. Pickup address code is optional and only needed if PostEx gave you one for booking orders.</span></div></div><div className="formRow"><label>PostEx API token<input name="apiToken" type="password" autoComplete="new-password" required={!courier.credentialState?.apiToken} placeholder={courier.credentialPreview?.apiToken || "Paste PostEx API token"} /></label><label>Pickup address code <small>(optional)</small><input name="pickupAddressCode" defaultValue={courier.pickupAddressCode || ""} placeholder="Only if PostEx provided it" /></label></div><label className="switchLabel"><input name="isDefault" type="checkbox" defaultChecked={Boolean(courier.isDefault)} /> Use PostEx as default courier</label></>}
      {!isPostex && <>
      <div className="formRow"><label>Internal code<input name="code" required defaultValue={courier.code || ""} placeholder="postex-cod" pattern="[A-Za-z0-9_-]+" /></label><label>Status<select name="status" defaultValue={courier.status || "active"}><option value="active">Active</option><option value="paused">Paused</option><option value="disconnected">Disconnected</option></select></label></div>
      <div className="formRow"><label>API base URL<input name="apiBaseUrl" type="url" defaultValue={courier.apiBaseUrl || ""} placeholder="https://api.courier.pk/..." /></label><label>Merchant / account ID<input name="merchantId" defaultValue={courier.merchantId || ""} /></label></div>
      <div className="formRow"><label>Pickup address code<input name="pickupAddressCode" defaultValue={courier.pickupAddressCode || ""} /></label><label className="switchLabel"><input name="isDefault" type="checkbox" defaultChecked={Boolean(courier.isDefault)} /> Use as default courier</label></div>
      <h3>Routing rules</h3><p className="trackingNumber">Used to recommend the lowest-cost eligible courier when an order is booked.</p>
      <div className="formRow"><label>Covered cities<input name="coveredCities" defaultValue={Array.isArray(courier.settings?.coveredCities) ? courier.settings.coveredCities.join(", ") : ""} placeholder="Lahore, Karachi, Islamabad (blank = all)" /></label><label>Estimated cost (PKR)<input name="estimatedCostPkr" type="number" min="0" defaultValue={courier.settings?.estimatedCostPkr || 0} /></label></div>
      <div className="formRow"><label>Priority<input name="priority" type="number" min="0" defaultValue={courier.settings?.priority || 0} placeholder="Higher wins after cost" /></label><div className="settingsPermissionGrid"><label className="switchLabel"><input name="codEnabled" type="checkbox" defaultChecked={courier.settings?.codEnabled !== false} /> COD supported</label><label className="switchLabel"><input name="prepaidEnabled" type="checkbox" defaultChecked={courier.settings?.prepaidEnabled !== false} /> Prepaid supported</label></div></div>
      <h3>Secure API credentials</h3><p className="trackingNumber">Leave a credential blank to retain its saved value. These values are accepted by the server but never displayed again.</p>
      <div className="formRow"><label>API token<input name="apiToken" type="password" autoComplete="new-password" placeholder={courier.credentialPreview?.apiToken || "Paste API token"} /></label><label>API key<input name="apiKey" type="password" autoComplete="new-password" placeholder={courier.credentialPreview?.apiKey || "Paste API key"} /></label></div>
      <div className="formRow"><label>API secret<input name="apiSecret" type="password" autoComplete="new-password" placeholder={courier.credentialState?.apiSecret ? "Saved — enter a new value to replace" : "Optional API secret"} /></label><label>Webhook secret<input name="webhookSecret" type="password" autoComplete="new-password" placeholder={courier.credentialState?.webhookSecret ? "Saved — enter a new value to replace" : "Optional webhook secret"} /></label></div>
      <h3>Supported features</h3><div className="settingsPermissionGrid">{[["booking", "Create shipment"], ["tracking", "Tracking sync"], ["settlements", "COD settlements"], ["cities", "City lookup"], ["webhooks", "Webhook updates"]].map(([key, label]) => <label className="switchLabel" key={key}><input name={key} type="checkbox" defaultChecked={Boolean(courier.capabilities?.[key])} /> {label}</label>)}</div>
      </>}
      <button disabled={saving || !snapshot.setupAvailable}>{saving ? "Saving..." : isPostex ? "Save PostEx API" : "Save courier connection"}</button>
    </form>}
  </>;
}

function FinancePanel({ orders, products, connected, currentAdminUser }) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const isOwnerFinance = !currentAdminUser || currentAdminUser.role === "Owner";
  const [packagingExpense, setPackagingExpense] = useState(0);
  const [deliveryExpense, setDeliveryExpense] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [cashbookCategory, setCashbookCategory] = useState("Fabric / stock");
  const [cashbookTransactions, setCashbookTransactions] = useState([]);
  const [supplierBills, setSupplierBills] = useState([]);
  const [fixedCosts, setFixedCosts] = useState(0);
  const [marketingCampaigns, setMarketingCampaigns] = useState([]);
  const [profitAllocation, setProfitAllocation] = useState({ marketingPercent: 25, ownerPercent: 30, stockPercent: 45 });
  const [cashbookLoading, setCashbookLoading] = useState(true);
  const [cashbookError, setCashbookError] = useState("");
  const [financePeriod, setFinancePeriod] = useState("all");
  const [postexSnapshot, setPostexSnapshot] = useState({ setupAvailable: false, payments: [], batches: [], items: [], summary: {} });
  const [postexSyncing, setPostexSyncing] = useState(false);
  const [voidPostexBatch, setVoidPostexBatch] = useState(null);
  const [voidPostexConfirmation, setVoidPostexConfirmation] = useState("");
  const [voidingPostexBatchId, setVoidingPostexBatchId] = useState("");
  const [voidManualPostexReceipt, setVoidManualPostexReceipt] = useState(null);
  const [voidManualPostexConfirmation, setVoidManualPostexConfirmation] = useState("");
  const [voidingManualPostexReceiptId, setVoidingManualPostexReceiptId] = useState("");
  const [voidCashbookEntryTarget, setVoidCashbookEntryTarget] = useState(null);
  const [voidCashbookConfirmation, setVoidCashbookConfirmation] = useState("");
  const [voidingCashbookEntryId, setVoidingCashbookEntryId] = useState("");
  const [resetCashConfirmation, setResetCashConfirmation] = useState("");
  const [showResetCashDialog, setShowResetCashDialog] = useState(false);
  const [resettingCash, setResettingCash] = useState(false);
  const [cprTrackingText, setCprTrackingText] = useState("");
  const [showAdvancedPostex, setShowAdvancedPostex] = useState(false);
  const [financeSetup, setFinanceSetup] = useState(null);
  const [migratingFinance, setMigratingFinance] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  // The new workspace is now the single finance source of truth. Keep the
  // legacy state below for backwards-compatible code paths, but never open a
  // legacy screen from an old URL or stale query parameter.
  const financeTab = "engine";

  // Finance is moving out of the store_settings JSON blob into its own tables.
  // Until the owner has run the SQL and imported the old rows, this tells them
  // exactly what is still pending instead of failing silently.
  useEffect(() => {
    if (!isOwnerFinance) return;
    let active = true;
    fetch("/api/admin/finance/setup", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => { if (active) setFinanceSetup(result); })
      .catch(() => {});
    return () => { active = false; };
  }, [isOwnerFinance]);

  async function runFinanceMigration() {
    setMigratingFinance(true);
    setMigrationResult(null);
    try {
      const response = await fetch("/api/admin/finance/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "migrate_legacy" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to import finance data.");
      setMigrationResult(result);
      const status = await fetch("/api/admin/finance/setup", { cache: "no-store" }).then((next) => next.json()).catch(() => null);
      if (status) setFinanceSetup(status);
    } catch (error) {
      setMigrationResult({ error: error.message });
    } finally {
      setMigratingFinance(false);
    }
  }

  useEffect(() => {
    if (!isOwnerFinance) {
      setCashbookLoading(false);
      return;
    }
    let active = true;
    fetch("/api/admin/finance-transactions", { cache: "no-store" })
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!ok) throw new Error(result.error || "Unable to load cashbook.");
        if (!active) return;
        const legacy = (() => { try { return JSON.parse(localStorage.getItem("bustaniya-admin-finance") || "{}"); } catch { return {}; } })();
        const serverHasManualData = Number(result.packagingExpense || 0) > 0 || Number(result.deliveryExpense || 0) > 0 || (result.manualExpenses || []).length > 0;
        const legacyHasManualData = Number(legacy.packagingExpense || 0) > 0 || Number(legacy.deliveryExpense || 0) > 0 || (legacy.expenses || []).length > 0;
        const manual = !serverHasManualData && legacyHasManualData ? { packagingExpense: Number(legacy.packagingExpense || 0), deliveryExpense: Number(legacy.deliveryExpense || 0), manualExpenses: Array.isArray(legacy.expenses) ? legacy.expenses : [] } : { packagingExpense: Number(result.packagingExpense || 0), deliveryExpense: Number(result.deliveryExpense || 0), manualExpenses: result.manualExpenses || [] };
        setCashbookTransactions(result.transactions || []);
        setSupplierBills(result.supplierBills || []);
        setFixedCosts(Number(result.fixedCosts || 0));
        setMarketingCampaigns(result.marketingCampaigns || []);
        setPostexSnapshot(result.postex || { setupAvailable: false, payments: [], batches: [], items: [], summary: {} });
        setProfitAllocation(result.allocation || { marketingPercent: 25, ownerPercent: 30, stockPercent: 45 });
        setPackagingExpense(manual.packagingExpense);
        setDeliveryExpense(manual.deliveryExpense);
        setExpenses(manual.manualExpenses);
        if (!serverHasManualData && legacyHasManualData) {
          fetch("/api/admin/finance-transactions", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(manual) }).then((migrationResponse) => { if (migrationResponse.ok) localStorage.removeItem("bustaniya-admin-finance"); }).catch(() => {});
        }
      })
      .catch((error) => { if (active) setCashbookError(error.message); })
      .finally(() => { if (active) setCashbookLoading(false); });
    return () => { active = false; };
  }, [isOwnerFinance]);

  const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
  const periodMatches = (order) => {
    if (financePeriod === "all") return true;
    const rawDate = order.createdAt || order.raw?.created_at || order.raw?.order_date || "";
    const date = rawDate ? new Date(rawDate) : null;
    if (!date || Number.isNaN(date.getTime())) return false;
    const now = new Date();
    const start = financePeriod === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = financePeriod === "month" ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= start && date < end;
  };
  const activeOrders = connected ? safeOrders.filter(isRevenueOrder).filter(periodMatches) : [];
  const deliveredOrders = activeOrders.filter(isDeliveredOrder);
  const returnedOrders = safeOrders.filter(isReturnedOrder).filter(periodMatches);
  const pendingOrders = activeOrders.filter(isPendingCodOrder);
  const deliveredItems = deliveredOrders.flatMap((order) => normalizeOrderItems(order.raw || order));
  const deliveredOrderCount = deliveredOrders.length;
  const returnedOrderCount = returnedOrders.length;
  const totalProductsSold = deliveredItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const grossRevenue = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const postexSummary = postexSnapshot?.summary || {};
  const postexPayments = Array.isArray(postexSnapshot?.payments) ? postexSnapshot.payments : [];
  const postexBatches = Array.isArray(postexSnapshot?.batches) ? postexSnapshot.batches : [];
  const manualPostexReceiptHistory = cashbookTransactions.filter((item) => item.type === "postex_bank_receipt");
  // CPR batches may carry the same reference as the bank receipt entered by
  // the owner. They serve different purposes and are intentionally allowed
  // to coexist: only the manual receipt contributes to Available Cash.
  const manualPostexReceipts = manualPostexReceiptHistory.filter((item) => !item.voided);
  const manualPostexBankReceived = manualPostexReceipts.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const calculatedPostex = postexCalculatedSummary(postexSnapshot || {});
  const postexAllocatedByPayment = calculatedPostex.allocations;
  const postexDateValue = (source, keys, fallback = "") => {
    const value = firstPostexValue(source, keys, fallback);
    return value ? formatFinanceDate(value) : "—";
  };
  const postexSettlementDetail = (payment) => {
    const tracking = postexRawTracking(payment);
    const paymentStatus = postexRawPayment(payment);
    const amounts = postexSettlementAmounts(payment);
    return {
      orderRef: firstPostexValue(tracking, ["orderRefNumber", "orderReference", "order_ref"], payment.order_number || "—"),
      trackingNumber: firstPostexValue(tracking, ["trackingNumber", "tracking_number"], payment.tracking_number || "—"),
      weight: firstPostexValue(tracking, ["weight", "orderWeight", "weightKg"], "—"),
      pickupDate: postexDateValue(tracking, ["pickupDate", "pickUpDate", "pickup_date"], payment.created_at),
      originCity: firstPostexValue(tracking, ["originCity", "pickupCity", "origin_city"], "—"),
      deliveryCity: firstPostexValue(tracking, ["deliveryCity", "destinationCity", "delivery_city"], "—"),
      status: firstPostexValue(tracking, ["transactionStatus", "status"], payment.courier_status || "—"),
      cod: amounts.invoice,
      upfrontAmount: postexNumber(paymentStatus, ["upfrontAmount", "upfront_amount"], 0),
      reserveAmount: postexNumber(paymentStatus, ["reserveAmount", "reserve_amount"], amounts.invoice),
      drDate: postexDateValue(paymentStatus, ["settlementDate", "upfrontPaymentDate", "reservePaymentDate"], payment.settlement_date),
      shipping: amounts.shipping,
      upfrontCharges: amounts.upfrontCharges,
      gst: amounts.gst,
      deduction4: amounts.deduction4,
      net: amounts.net,
    };
  };
  const receivedCash = manualPostexBankReceived;
  const expectedPostexReceivable = postexPayments.length
    ? Number(calculatedPostex.totalExpectedNetPkr || postexSummary.totalExpectedNetPkr || 0)
    : grossRevenue;
  // For cash visibility, the remaining amount is always expected PostEx net
  // less receipts manually verified in the bank. CPR allocations remain a
  // settlement audit trail and must not make cash look received early.
  const receivables = Math.max(0, expectedPostexReceivable - manualPostexBankReceived);
  const productCosts = new Map(safeProducts.map((product) => [String(product.id), Number(product.costTotalPkr || 0)]));
  const deliveredProductRevenue = deliveredItems
    .reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const deliveredCogs = deliveredOrders.reduce((sum, order) => sum + normalizeOrderItems(order.raw || order)
    .reduce((itemTotal, item) => itemTotal + Number(item.quantity || 0) * Number(productCosts.get(String(item.productId)) || 0), 0), 0);
  const activeCashbookTransactions = cashbookTransactions.filter(isActiveFinanceEntry);
  const manualInventoryExpenseTotal = expenses.filter((item) => FINANCE_INVENTORY_CATEGORIES.has(normalizedFinanceCategory(item.category))).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const manualOperatingExpenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0) - manualInventoryExpenseTotal;
  const manualExpenseTotal = manualOperatingExpenseTotal + manualInventoryExpenseTotal;
  const inventoryCashOutflow = activeCashbookTransactions.filter(isInventoryCashExpense).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const productionCashOutflow = activeCashbookTransactions.filter((item) => isInventoryCashExpense(item) && (item.productionBatchId || String(item.title || "").startsWith("Production batch "))).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const tailoringCashOutflow = activeCashbookTransactions.filter((item) => normalizedFinanceCategory(item.category) === "tailoring / stitching").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const laceCashOutflow = activeCashbookTransactions.filter((item) => normalizedFinanceCategory(item.category) === "lace / embellishment").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const fabricCashOutflow = activeCashbookTransactions.filter((item) => ["fabric / stock", "stock purchase"].includes(normalizedFinanceCategory(item.category))).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const supplierPaymentTotal = activeCashbookTransactions.filter((item) => item.type === "supplier_payment").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cashbookOperatingExpenses = activeCashbookTransactions
    .filter((item) => item.type === "business_expense" && !isInventoryCashExpense(item))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const ownerInvestments = activeCashbookTransactions.filter((item) => item.type === "owner_investment").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const ownerWithdrawals = activeCashbookTransactions.filter((item) => item.type === "owner_withdrawal").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const otherBusinessIncome = activeCashbookTransactions.filter((item) => item.type === "other_income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cashResetAdjustment = activeCashbookTransactions.filter((item) => item.type === "cash_reset").reduce((sum, item) => sum + financeEntryCashEffect(item), 0);
  const packagingTotal = Number(packagingExpense || 0);
  const deliveryTotal = Number(deliveryExpense || 0);
  // A batch purchase is cash spent now but becomes COGS only when its units sell.
  // Keeping it out of this P&L total prevents subtracting the same cost twice.
  const profitExpenseTotal = manualOperatingExpenseTotal + cashbookOperatingExpenses + packagingTotal + deliveryTotal;
  const cashOutflowTotal = manualOperatingExpenseTotal + manualInventoryExpenseTotal + cashbookOperatingExpenses + inventoryCashOutflow + supplierPaymentTotal + packagingTotal + deliveryTotal;
  const gstProvision = Math.round(Number(calculatedPostex.deliveredPostexGstPkr || 0));
  const taxProvision = Math.round(Number(calculatedPostex.deliveredPostexDeduction4Pkr || 0));
  const gstTaxTotal = gstProvision + taxProvision;
  const courierDeliveryCost = Math.max(0, Math.round(Number(calculatedPostex.deliveredPostexDeductionsPkr || 0)) - gstTaxTotal);
  const returnCourierCost = Math.round(Number(calculatedPostex.returnedPostexLossPkr || 0));
  const postexExpectedNet = Number(calculatedPostex.totalExpectedNetPkr || postexSummary.totalExpectedNetPkr || expectedPostexReceivable || 0);
  const receivedSettlementRatio = postexExpectedNet > 0 ? Math.min(1, receivedCash / postexExpectedNet) : 0;
  const cashGstTaxReserve = 0;
  const deliveryCollected = grossRevenue - deliveredProductRevenue;
  const profitAfterProductCost = grossRevenue - deliveredCogs;
  const netProfit = grossRevenue - deliveredCogs - courierDeliveryCost - returnCourierCost - profitExpenseTotal - gstTaxTotal;
  const totalCustomerAdvance = safeOrders.reduce((sum, order) => sum + Number(order.amount_payable_in_advance_pkr ?? order.amountPayableInAdvance ?? 0), 0);
  // PostEx bank receipts are already net of courier deductions. Delivered
  // revenue remains in P&L, but it becomes spendable cash only after a CPR
  // receipt is verified. Customer advance payments are verified manually by owner.
  const availableCash = receivedCash + ownerInvestments + otherBusinessIncome + cashResetAdjustment - cashOutflowTotal - ownerWithdrawals;
  const allocatableProfit = Math.max(0, netProfit);
  const marketingAllocation = Math.round(allocatableProfit * Number(profitAllocation.marketingPercent || 0) / 100);
  const ownerAllocation = Math.round(allocatableProfit * Number(profitAllocation.ownerPercent || 0) / 100);
  const stockAllocation = Math.max(0, allocatableProfit - marketingAllocation - ownerAllocation);
  const inventoryRetailValue = safeProducts.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);
  const inventoryCostValue = safeProducts.reduce((sum, product) => sum + Number(product.costTotalPkr || 0) * Number(product.stock || 0), 0);
  const lowStockValue = safeProducts
    .filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5))
    .reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);
  const profitMargin = grossRevenue ? Math.round((netProfit / grossRevenue) * 100) : 0;
  const supplierPayableTotal = supplierBills.reduce((sum, bill) => sum + Math.max(0, Number(bill.total || 0) - Number(bill.paid || 0)), 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdueSupplierBills = supplierBills.filter((bill) => bill.status !== "paid" && bill.dueDate && bill.dueDate < today);
  const upcomingPayables = supplierBills.filter((bill) => bill.status !== "paid" && (!bill.dueDate || bill.dueDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))).reduce((sum, bill) => sum + Math.max(0, Number(bill.total) - Number(bill.paid)), 0);
  const expectedClosingCash = availableCash + receivables - upcomingPayables;
  const contributionPerOrder = deliveredOrderCount ? Math.max(0, (grossRevenue - deliveredCogs - gstTaxTotal - courierDeliveryCost) / deliveredOrderCount) : 0;
  const breakEvenOrders = contributionPerOrder ? Math.ceil(Number(fixedCosts || 0) / contributionPerOrder) : 0;
  const marketingSpendTotal = marketingCampaigns.reduce((sum, item) => sum + Number(item.spend || 0), 0);
  const marketingSalesTotal = marketingCampaigns.reduce((sum, item) => sum + Number(item.sales || 0), 0);
  const marketingCustomersTotal = marketingCampaigns.reduce((sum, item) => sum + Number(item.customers || 0), 0);
  const financeCashVisual = [
    { label: "Available cash", value: Math.max(0, availableCash), color: "#1d6840" },
    { label: "PostEx receivable", value: receivables, color: "#4777a8" },
    { label: "Owner funds", value: ownerInvestments, color: "#6c7b43" },
    { label: "Withdrawals", value: ownerWithdrawals, color: "#b73543" },
  ].filter((item) => item.value > 0);
  const financeCostVisual = [
    { label: "Sales", value: grossRevenue, color: "#1d6840" },
    { label: "COGS", value: deliveredCogs, color: "#c78b2b" },
    { label: "PostEx costs", value: courierDeliveryCost + returnCourierCost + gstTaxTotal, color: "#b73543" },
    { label: "Operating expenses", value: profitExpenseTotal, color: "#8d2449" },
    { label: "Net profit", value: Math.max(0, netProfit), color: "#4777a8" },
  ].filter((item) => item.value > 0);

  async function addMarketingCampaign(event) { event.preventDefault(); const formElement = event.currentTarget; const data = new FormData(formElement); const next = [{ id: `campaign-${Date.now()}`, name: String(data.get("name") || "").trim(), platform: data.get("platform") || "Other", spend: Number(data.get("spend") || 0), sales: Number(data.get("sales") || 0), customers: Number(data.get("customers") || 0), date: data.get("date") || today }, ...marketingCampaigns]; if (!next[0].name) return; setCashbookLoading(true); try { const response = await fetch("/api/admin/finance-transactions", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ transactions:cashbookTransactions, allocation:profitAllocation, supplierBills, fixedCosts:Number(fixedCosts||0), marketingCampaigns:next }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to save campaign."); setMarketingCampaigns(result.marketingCampaigns || next); formElement?.reset(); } catch (error) { setCashbookError(error.message); } finally { setCashbookLoading(false); } }

  async function saveFixedCosts(event) {
    event.preventDefault(); setCashbookLoading(true); setCashbookError("");
    try { const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: cashbookTransactions, allocation: profitAllocation, supplierBills, fixedCosts: Number(fixedCosts || 0) }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to save fixed costs."); setFixedCosts(Number(result.fixedCosts || 0)); } catch (error) { setCashbookError(error.message); } finally { setCashbookLoading(false); }
  }

  async function addSupplierBill(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const total = Number(data.get("total") || 0);
    const paid = Math.min(total, Math.max(0, Number(data.get("paid") || 0)));
    if (!total) return;
    const billId = `supplier-bill-${Date.now()}`;
    const nextBills = [{ id: billId, supplier: String(data.get("supplier") || "").trim(), reference: String(data.get("reference") || "").trim(), total, paid, date: data.get("date") || today, dueDate: data.get("dueDate") || "", note: String(data.get("note") || "").trim(), status: paid >= total ? "paid" : "open" }, ...supplierBills];
    if (!nextBills[0].supplier) return;
    // A bill is only a payable. If money was already paid, create the matching
    // cash movement now so Available Cash never overstates the bank balance.
    const nextTransactions = paid > 0 ? [{ id: `supplier-opening-payment-${Date.now()}`, type: "supplier_payment", title: `Supplier payment: ${nextBills[0].supplier}`, category: "Supplier payable", amount: paid, date: nextBills[0].date, note: nextBills[0].reference || nextBills[0].note || "Opening payment recorded with supplier bill", supplierBillId: billId }, ...cashbookTransactions] : cashbookTransactions;
    setCashbookLoading(true); setCashbookError("");
    try {
      const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: nextTransactions, allocation: profitAllocation, supplierBills: nextBills }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save supplier bill.");
      setSupplierBills(result.supplierBills || nextBills); setCashbookTransactions(result.transactions || nextTransactions); formElement?.reset();
    } catch (error) { setCashbookError(error.message); } finally { setCashbookLoading(false); }
  }

  async function recordSupplierPayment(bill) {
    const remaining = Math.max(0, Number(bill.total) - Number(bill.paid));
    const amount = Number(window.prompt(`Record payment to ${bill.supplier}. Remaining: Rs. ${remaining.toLocaleString()}`, String(remaining)) || 0);
    if (!amount || amount < 0 || amount > remaining) return;
    const nextBills = supplierBills.map((item) => item.id === bill.id ? { ...item, paid: Number(item.paid || 0) + amount, status: Number(item.paid || 0) + amount >= Number(item.total) ? "paid" : "open" } : item);
    const nextTransactions = [{ id: `supplier-payment-${Date.now()}`, type: "supplier_payment", title: `Supplier payment: ${bill.supplier}`, category: "Supplier payable", amount, date: today, note: bill.reference || bill.note || "", supplierBillId: bill.id }, ...cashbookTransactions];
    setCashbookLoading(true); setCashbookError("");
    try { const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: nextTransactions, allocation: profitAllocation, supplierBills: nextBills, fixedCosts: Number(fixedCosts || 0), marketingCampaigns }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to record supplier payment."); setSupplierBills(result.supplierBills || nextBills); setCashbookTransactions(result.transactions || nextTransactions); } catch (error) { setCashbookError(error.message); } finally { setCashbookLoading(false); }
  }

  async function syncPostexSettlementData() {
    setPostexSyncing(true);
    setCashbookError("");
    try {
      const response = await fetch("/api/admin/postex-settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sync PostEx payments.");
      setPostexSnapshot(result.snapshot || postexSnapshot);
      if (result.failed?.length) {
        setCashbookError(`${result.synced} orders synced; ${result.failed.length} could not be refreshed.`);
      }
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setPostexSyncing(false);
    }
  }

  async function saveCprBatch(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    setPostexSyncing(true);
    setCashbookError("");
    try {
      const response = await fetch("/api/admin/postex-settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_batch",
          cprNumber: data.get("cprNumber"),
          cprDate: data.get("cprDate"),
          periodStart: data.get("periodStart"),
          periodEnd: data.get("periodEnd"),
          expectedAmountPkr: Number(data.get("expectedAmountPkr") || 0),
          additionalDeductionsPkr: Number(data.get("additionalDeductionsPkr") || 0),
          bankReceivedPkr: Number(data.get("bankReceivedPkr") || 0),
          bankReceivedDate: data.get("bankReceivedDate"),
          trackingNumbers: cprTrackingText,
          notes: data.get("notes"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save CPR reconciliation.");
      setPostexSnapshot(result.snapshot || postexSnapshot);
      setCprTrackingText("");
      formElement?.reset();
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setPostexSyncing(false);
    }
  }

  function requestVoidPostexBatch(batch) {
    if (!isOwnerFinance) {
      setCashbookError("Only an Owner can void a PostEx wallet receipt.");
      return;
    }
    setVoidPostexBatch(batch);
    setVoidPostexConfirmation("");
    setCashbookError("");
  }

  function closeVoidPostexBatch() {
    if (voidingPostexBatchId) return;
    setVoidPostexBatch(null);
    setVoidPostexConfirmation("");
  }

  async function voidPostexWalletReceipt(event) {
    event.preventDefault();
    const batch = voidPostexBatch;
    const confirmation = voidPostexConfirmation.trim();
    if (!batch || confirmation !== `VOID ${batch.cpr_number}`) return;
    setVoidingPostexBatchId(batch.id);
    setPostexSyncing(true);
    setCashbookError("");
    try {
      const response = await fetch("/api/admin/postex-settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void_batch", batchId: batch.id, confirmation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to void PostEx receipt.");
      setPostexSnapshot(result.snapshot || postexSnapshot);
      setVoidPostexBatch(null);
      setVoidPostexConfirmation("");
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setVoidingPostexBatchId("");
      setPostexSyncing(false);
    }
  }

  async function addPostexWalletReceipt(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const amount = Number(data.get("amount") || 0);
    if (!amount || amount < 0) return;
    const reference = String(data.get("reference") || "").trim();
    const bank = String(data.get("bank") || "").trim();
    if (!reference) {
      setCashbookError("Enter the PostEx CPR or bank reference so this receipt can be tracked and reversed safely.");
      return;
    }
    if (manualPostexReceipts.some((entry) => String(entry.reference || entry.title || "").replace(/^PostEx bank receipt:\s*/i, "").trim().toLowerCase() === reference.toLowerCase())) {
      setCashbookError("This PostEx CPR / bank reference is already recorded. Open its history below and void the wrong entry if needed.");
      return;
    }
    const nextTransactions = [{
      id: `postex-receipt-${Date.now()}`,
      type: "postex_bank_receipt",
      title: reference ? `PostEx bank receipt: ${reference}` : "PostEx bank receipt",
      category: bank || "PostEx wallet",
      amount,
      date: data.get("date") || today,
      reference,
      note: String(data.get("note") || "").trim(),
    }, ...cashbookTransactions];
    setCashbookLoading(true);
    setCashbookError("");
    try {
      const response = await fetch("/api/admin/finance-transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: nextTransactions }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save PostEx wallet receipt.");
      setCashbookTransactions(result.transactions || nextTransactions);
      formElement?.reset();
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setCashbookLoading(false);
    }
  }

  function requestVoidManualPostexReceipt(receipt) {
    if (!isOwnerFinance) {
      setCashbookError("Only an Owner can void a PostEx wallet receipt.");
      return;
    }
    setVoidManualPostexReceipt(receipt);
    setVoidManualPostexConfirmation("");
    setCashbookError("");
  }

  function closeVoidManualPostexReceipt() {
    if (voidingManualPostexReceiptId) return;
    setVoidManualPostexReceipt(null);
    setVoidManualPostexConfirmation("");
  }

  async function voidManualPostexWalletReceipt(event) {
    event.preventDefault();
    const receipt = voidManualPostexReceipt;
    const reference = String(receipt?.reference || receipt?.title || "").replace(/^PostEx bank receipt:\s*/i, "").trim();
    if (!receipt || voidManualPostexConfirmation.trim() !== `VOID ${reference}`) return;
    const nextTransactions = cashbookTransactions.map((entry) => entry.id === receipt.id ? {
      ...entry,
      voided: true,
      voidedAt: new Date().toISOString(),
      voidedBy: currentAdminUser?.name || currentAdminUser?.email || "Owner",
      note: [entry.note, `VOIDED ${new Date().toLocaleString("en-PK")}`].filter(Boolean).join(" · "),
    } : entry);
    setVoidingManualPostexReceiptId(receipt.id);
    setCashbookLoading(true);
    setCashbookError("");
    try {
      const response = await fetch("/api/admin/finance-transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: nextTransactions }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to void PostEx wallet receipt.");
      setCashbookTransactions(result.transactions || nextTransactions);
      setVoidManualPostexReceipt(null);
      setVoidManualPostexConfirmation("");
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setVoidingManualPostexReceiptId("");
      setCashbookLoading(false);
    }
  }

  function requestVoidCashbookEntry(entry) {
    if (!isOwnerFinance) {
      setCashbookError("Only an Owner can void a cashbook movement.");
      return;
    }
    if (!entry || entry.voided) return;
    if (isLinkedFinanceEntry(entry)) {
      setCashbookError("This movement is linked to a production batch. Void the batch from Inventory so stock and cost are reversed together.");
      return;
    }
    setVoidCashbookEntryTarget(entry);
    setVoidCashbookConfirmation("");
    setCashbookError("");
  }

  function closeVoidCashbookEntry() {
    if (voidingCashbookEntryId) return;
    setVoidCashbookEntryTarget(null);
    setVoidCashbookConfirmation("");
  }

  async function voidCashbookEntry(event) {
    event.preventDefault();
    const entry = voidCashbookEntryTarget;
    const confirmation = voidCashbookConfirmation.trim();
    if (!entry || confirmation !== `VOID ${entry.id}`) return;
    setVoidingCashbookEntryId(entry.id);
    setCashbookLoading(true);
    setCashbookError("");
    try {
      const response = await fetch("/api/admin/finance-transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void_transaction", transactionId: entry.id, confirmation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to void cashbook movement.");
      setCashbookTransactions(result.transactions || cashbookTransactions.map((item) => item.id === entry.id ? { ...item, voided: true } : item));
      setSupplierBills(result.supplierBills || supplierBills);
      setVoidCashbookEntryTarget(null);
      setVoidCashbookConfirmation("");
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setVoidingCashbookEntryId("");
      setCashbookLoading(false);
    }
  }

  function requestResetAvailableCash() {
    if (!isOwnerFinance) {
      setCashbookError("Only an Owner can reset the opening cash balance.");
      return;
    }
    if (Math.abs(Number(availableCash || 0)) < 0.01) {
      setCashbookError("Available Cash is already Rs. 0.");
      return;
    }
    setResetCashConfirmation("");
    setShowResetCashDialog(true);
    setCashbookError("");
  }

  function closeResetCashDialog() {
    if (resettingCash) return;
    setShowResetCashDialog(false);
    setResetCashConfirmation("");
  }

  async function resetAvailableCash(event) {
    event.preventDefault();
    if (resetCashConfirmation.trim() !== "RESET CASH TO 0") return;
    const currentCash = Number(availableCash || 0);
    if (!Number.isFinite(currentCash) || Math.abs(currentCash) < 0.01) {
      closeResetCashDialog();
      return;
    }
    const resetEntry = {
      id: `cash-reset-${Date.now()}`,
      type: "cash_reset",
      title: "Opening balance reset to Rs. 0",
      category: "Opening balance",
      amount: Math.abs(currentCash),
      cashDirection: currentCash > 0 ? "out" : "in",
      date: today,
      reference: "START-FRESH",
      note: "One-time reset. Historical finance entries remain visible for audit; future cash movements continue normally.",
    };
    const nextTransactions = [resetEntry, ...cashbookTransactions];
    setResettingCash(true);
    setCashbookLoading(true);
    setCashbookError("");
    try {
      const response = await fetch("/api/admin/finance-transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: nextTransactions }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to reset Available Cash.");
      setCashbookTransactions(result.transactions || nextTransactions);
      setShowResetCashDialog(false);
      setResetCashConfirmation("");
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setResettingCash(false);
      setCashbookLoading(false);
    }
  }

  async function importCprTrackingFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileText = await file.text();
    const trackingNumbers = fileText.match(/(?:CX-[A-Z0-9-]{6,30}|\b\d{10,20}\b)/gi) || [];
    setCprTrackingText([...new Set(trackingNumbers)].join("\n"));
    event.target.value = "";
  }

  if (!isOwnerFinance) {
    return <div className="financeSystem">
      <div className="adminTitle"><div><p>SALES OVERVIEW</p><h1>Finances</h1><span>Operational sales and delivery information for staff.</span></div></div>
      <div className="inventoryAlert materialAlert"><Landmark /><div><b>Staff finance view</b><span>Owner-only data such as product costs, profit, cashbook, withdrawals and allocation plans is hidden.</span></div></div>
      <div className="miniMetricGrid financeMetrics">
        <article><CircleDollarSign /><span><b>{money(grossRevenue)}</b>Delivered sales</span></article>
        <article><ShoppingBag /><span><b>{deliveredOrderCount}</b>Delivered orders</span></article>
        <article><Package /><span><b>{totalProductsSold}</b>Products sold</span></article>
        <article><Landmark /><span><b>{money(receivables)}</b>Pending COD</span></article>
        <article className={returnedOrderCount ? "alertMetric" : ""}><Package /><span><b>{returnedOrderCount}</b>Returned orders</span></article>
      </div>
      <section className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>What to do next</h2><p>Use Orders for booking, delivery, return and customer updates.</p></div></div><div className="financeStatement"><div><span>Orders waiting for COD / delivery follow-up</span><b>{pendingOrders.length}</b></div><div><span>Returns needing stock inspection</span><b>{returnedOrderCount}</b></div><div className="statementTotal"><span>For profit or cash details</span><b>Contact owner</b></div></div></section>
    </div>;
  }

  const ledgerRows = [
    ...deliveredOrders.slice(0, 8).map((order) => ({
      id: order.id,
      date: order.date,
      type: "Sale earned",
      account: order.customer,
      amount: Number(order.total || 0),
      status: order.status,
    })),
    ...expenses.slice(0, 5).map((expense) => ({
      id: `EXP-${expense.id}`,
      date: formatFinanceDate(expense.date),
      type: "Expense",
      account: expense.title,
      amount: -Number(expense.amount || 0),
      status: expense.category,
    })),
    ...returnedOrders.slice(0, 8).map((order) => ({
      id: order.id,
      date: order.date,
      type: "Returned order courier cost",
      account: order.customer,
      amount: -200,
      status: "Returned",
    })),
    ...cashbookTransactions.filter((entry) => entry.type !== "postex_bank_receipt").map((entry) => ({
      id: entry.id,
      date: formatFinanceDate(entry.date),
      type: financeEntryLabel(entry.type),
      account: [entry.title, entry.counterparty].filter(Boolean).join(" · "),
      amount: financeEntryCashEffect(entry),
      status: entry.voided ? "Voided" : entry.category,
      voided: entry.voided === true,
      financeEntry: entry,
    })),
  ];

  async function saveManualFinance(next = {}) {
    setCashbookLoading(true);
    setCashbookError("");
    const payload = { manualExpenses: next.manualExpenses ?? expenses, packagingExpense: Number(next.packagingExpense ?? packagingExpense ?? 0), deliveryExpense: Number(next.deliveryExpense ?? deliveryExpense ?? 0) };
    try {
      const response = await fetch("/api/admin/finance-transactions", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save Finance expenses.");
      setExpenses(result.manualExpenses || payload.manualExpenses);
      setPackagingExpense(Number(result.packagingExpense ?? payload.packagingExpense));
      setDeliveryExpense(Number(result.deliveryExpense ?? payload.deliveryExpense));
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setCashbookLoading(false);
    }
  }

  async function addExpense(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const nextExpenses = [{
      id: Date.now(),
      title: data.get("title"),
      category: data.get("category"),
      amount: Number(data.get("amount") || 0),
      date: data.get("date") || new Date().toISOString().slice(0, 10),
    }, ...expenses];
    await saveManualFinance({ manualExpenses: nextExpenses });
    formElement?.reset();
  }

  async function addCashbookTransaction(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const selectedCategory = String(data.get("category") || "Other").trim();
    const customCategory = String(data.get("otherCategory") || "").trim();
    const nextTransactions = [{
      id: `cash-${Date.now()}`,
      type: data.get("type"),
      title: String(data.get("title") || "Finance entry").trim(),
      category: selectedCategory === "Other" && customCategory ? customCategory : selectedCategory,
      amount: Number(data.get("amount") || 0),
      date: data.get("date") || new Date().toISOString().slice(0, 10),
      counterparty: String(data.get("counterparty") || "").trim(),
      reference: String(data.get("reference") || "").trim(),
      note: String(data.get("note") || "").trim(),
    }, ...cashbookTransactions];
    if (!nextTransactions[0].amount || nextTransactions[0].amount < 0) return;
    setCashbookLoading(true);
    setCashbookError("");
    try {
      const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: nextTransactions }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save cashbook entry.");
      setCashbookTransactions(result.transactions || nextTransactions);
      formElement?.reset();
      setCashbookCategory("Fabric / stock");
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setCashbookLoading(false);
    }
  }

  async function saveProfitAllocation(event) {
    event.preventDefault();
    const marketingPercent = Math.min(100, Math.max(0, Number(profitAllocation.marketingPercent || 0)));
    const ownerPercent = Math.min(100 - marketingPercent, Math.max(0, Number(profitAllocation.ownerPercent || 0)));
    const allocation = { marketingPercent, ownerPercent, stockPercent: 100 - marketingPercent - ownerPercent };
    setCashbookLoading(true);
    setCashbookError("");
    try {
      const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: cashbookTransactions, allocation }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save profit allocation.");
      setProfitAllocation(result.allocation || allocation);
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setCashbookLoading(false);
    }
  }

  function exportFinance() {
    const csv = [
      ["Metric","Value"],
      ["Gross revenue", grossRevenue],
      ["Delivered orders", deliveredOrderCount],
      ["Total products sold", totalProductsSold],
      ["Product sales total", deliveredProductRevenue],
      ["Manually verified PostEx bank receipts", receivedCash],
      ["PostEx receivable / carry forward", receivables],
      ["PostEx marked settled", Number(postexSummary.postexSettledPkr || 0)],
      ["PostEx settled but not bank reconciled", Number(postexSummary.settledNotBankedPkr || 0)],
      ["Open / partial CPR batches", Number(postexSummary.unreconciledBatchCount || 0)],
      ["Actual product cost (COGS)", deliveredCogs],
      ["Profit after product cost", profitAfterProductCost],
      ["Manual expenses", manualExpenseTotal],
      ["Operating expenses from cashbook", cashbookOperatingExpenses],
      ["Production batch cash spent (not deducted from profit twice)", productionCashOutflow],
      ["Owner investment / cash added", ownerInvestments],
      ["Owner withdrawals / personal use", ownerWithdrawals],
      ["Estimated available business cash", availableCash],
      ["Packaging expense", packagingTotal],
      ["Extra delivery expense", deliveryTotal],
      ["Returned orders", returnedOrderCount],
      ["Actual returned-order PostEx loss", returnCourierCost],
      ["Actual delivered-order PostEx shipping/service cost", courierDeliveryCost],
      ["Actual PostEx GST from synced CPR data", gstProvision],
      ["Actual PostEx 4% deduction", taxProvision],
      ["Actual PostEx GST + 4% deduction", gstTaxTotal],
      ["Net profit", netProfit],
      ["Inventory retail value", inventoryRetailValue],
      ["Inventory cost value", inventoryCostValue],
    ].map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    link.download = `bustaniya-finance-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <div className={`financeSystem financeTab-${financeTab}`} data-legacy-finance-error={cashbookError || undefined}>
    <div className="adminTitle">
      <div><p>FINANCE MANAGER</p><h1>Finances</h1><span>Cash, supplier bills, customer payments aur profit — ek hi verified workspace mein.</span></div>
    </div>

    {financeSetup && financeSetup.tablesReady === false && (
      <div className="financeSetupBanner financeSetupBannerPending">
        <div>
          <b>Finance database setup pending</b>
          <span>Finance tables abhi Supabase mein nahi bane. <code>scripts/supabase-finance.sql</code> ko Supabase SQL editor mein run karein, phir ye page refresh karein.</span>
        </div>
      </div>
    )}

    {financeSetup?.tablesReady && !financeSetup.legacyMigratedAt && (
      <div className="financeSetupBanner">
        <div>
          <b>Purana finance data import karein</b>
          <span>Aap ka finance data abhi purane storage mein hai. Import karne se har entry nayi tables mein chali jayegi — purana data delete nahi hota, aur dobara import karne se duplicate nahi bante.</span>
        </div>
        <button type="button" onClick={runFinanceMigration} disabled={migratingFinance} aria-busy={migratingFinance}>
          {migratingFinance ? "Importing..." : "Import old finance data"}
        </button>
      </div>
    )}

    {migrationResult?.error && <div className="adminErrorBanner financeErrorBanner">{migrationResult.error}</div>}
    {migrationResult?.success && (
      <div className="financeSetupBanner financeSetupBannerDone">
        <div>
          <b>Import complete</b>
          <span>
            {migrationResult.migrated
              ? `${migrationResult.counts?.transactions || 0} cash movements, ${migrationResult.counts?.supplierBills || 0} supplier bills aur ${migrationResult.counts?.marketingCampaigns || 0} campaigns import ho gaye.`
              : "Ye data pehle hi import ho chuka tha."}
            {migrationResult.skipped?.length ? ` ${migrationResult.skipped.length} entries skip hui — check karein: ${migrationResult.skipped.slice(0, 3).map((item) => item.legacyId).join(", ")}.` : ""}
          </span>
        </div>
      </div>
    )}

    {financeTab === "engine" && <FinanceWorkspace currentAdminUser={currentAdminUser} showTitle={false} />}

    {financeTab === "settlements" && <section className="postexSettlementPanel">
      <div className="settlementIntro">
        <div>
          <p>POSTEX WALLET</p>
          <h2>PostEx money — simple weekly view</h2>
          <span>Sirf teen cheezein dekhein: delivered orders ka net amount, PostEx ne settle kiya ya nahi, aur bank mein actual payment receive hui ya nahi.</span>
        </div>
        <button type="button" className="dashboardPrimaryAction" onClick={syncPostexSettlementData} disabled={postexSyncing}>
          <RefreshCw className={postexSyncing ? "spinIcon" : ""} /> {postexSyncing ? "Refreshing..." : "Refresh PostEx status"}
        </button>
      </div>

      {showAdvancedPostex && !postexSnapshot.setupAvailable && <div className="inventoryAlert materialAlert">
        <Landmark />
        <div><b>Settlement database setup required</b><span>The secure PostEx settlement tables must be installed before reconciliation can be saved.</span></div>
      </div>}

      <div className="miniMetricGrid settlementMetrics">
        <article><CircleDollarSign /><span><b>{money(expectedPostexReceivable)}</b>Expected from delivered orders</span></article>
        <article><ReceiptText /><span><b>{money(postexSummary.postexSettledPkr)}</b>PostEx marked settled (status only)</span></article>
        <article><WalletCards /><span><b>{money(receivedCash)}</b>Actually received in bank (manual)</span></article>
        <article className={receivables ? "alertMetric" : ""}><Landmark /><span><b>{money(receivables)}</b>Still pending / not received</span></article>
      </div>

      <div className="financeGrid financeGridWide postexWalletWorkspace">
        <form className="adminCard financeExpenseForm postexWalletForm" onSubmit={addPostexWalletReceipt}>
          <h2>Bank mein PostEx payment aayi?</h2>
          <p className="trackingNumber">Jab PostEx ki payment aapke bank/JazzCash mein nazar aaye, yahan us ka exact amount aur bank reference enter kar dein. Is ke baad woh amount Available Cash mein aa jayegi. PostEx ka “settled” status akela bank receipt nahi hota.</p>
          <div className="formRow"><label>Amount received<input name="amount" type="number" min="1" step="0.01" required placeholder="e.g. 18500" /></label><label>Receipt date<input name="date" type="date" defaultValue={today} /></label></div>
          <div className="formRow"><label>Bank / wallet<input name="bank" placeholder="Meezan, HBL, JazzCash..." /></label><label>Reference / CPR<input name="reference" required placeholder="Bank ref, CPR no, week no..." /></label></div>
          <label>Note<input name="note" placeholder="Short payment, carry forward, adjustment..." /></label>
          <button disabled={cashbookLoading}>{cashbookLoading ? "Saving..." : "Confirm bank receipt"}</button>
        </form>

        <div className="adminCard financeSummaryCard postexWalletGuide">
          <div className="cardHeading"><div><h2>Weekly routine</h2><p>No CPR work required for normal daily management.</p></div></div>
          <div className="financeStatement">
            <div><span>1</span><b>Refresh PostEx status</b></div>
            <div><span>2</span><b>Check your actual bank / wallet balance</b></div>
            <div><span>3</span><b>Enter one bank receipt with its reference</b></div>
            <div className="statementTotal"><span>Result</span><b>Only manual receipts update Available Cash</b></div>
          </div>
          <p className="cashBreakdownNote">“PostEx settled” means PostEx has processed the order. “Actually received in bank” is the only amount you can spend.</p>
        </div>
      </div>

      <div className="adminCard managementCard settlementHistory">
        <div className="inventoryListHead"><div><h2>Manual wallet receipt history</h2><span>Every manually entered bank receipt stays here. Void a wrong entry instead of editing or re-entering it.</span></div><b>{manualPostexReceiptHistory.length} entries</b></div>
        <div className="adminTableWrap"><table className="adminTable financeTable"><thead><tr><th>Reference / CPR</th><th>Bank / wallet</th><th>Date</th><th>Amount</th><th>Note</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {manualPostexReceiptHistory.map((receipt) => { const reference = String(receipt.reference || receipt.title || "").replace(/^PostEx bank receipt:\s*/i, "").trim() || receipt.id; return <tr key={receipt.id}><td><b>{reference}</b></td><td>{receipt.category || "PostEx wallet"}</td><td>{receipt.date || "—"}</td><td className={receipt.voided ? "" : "incomeAmount"}>{money(receipt.amount)}</td><td>{receipt.note || "—"}</td><td><span className={`statusBadge ${receipt.voided ? "cancelled" : "reconciled"}`}>{receipt.voided ? "Voided" : "Active"}</span>{receipt.voidedAt && <small className="trackingNumber"><br />{formatFinanceDate(receipt.voidedAt)}</small>}</td><td>{!receipt.voided && isOwnerFinance ? <button type="button" className="removeProductButton" onClick={() => requestVoidManualPostexReceipt(receipt)} disabled={cashbookLoading} aria-busy={cashbookLoading}>Void</button> : "—"}</td></tr>; })}
          {!manualPostexReceiptHistory.length && <tr><td colSpan="7" className="emptyFinanceCell">No manual PostEx wallet receipts recorded yet.</td></tr>}
        </tbody></table></div>
      </div>

      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Advanced CPR reconciliation</h2><p>Only use this when PostEx gives you a CPR statement and you need per-tracking-number matching.</p></div><button type="button" className="editProductButton" onClick={() => setShowAdvancedPostex((current) => !current)}>{showAdvancedPostex ? "Hide advanced tools" : "Open advanced CPR tools"}</button></div>
      </div>

      {showAdvancedPostex && <>
      <div className="financeGrid financeGridWide settlementWorkspace">
        <div className="adminCard managementCard">
          <div className="inventoryListHead"><div><h2>Order settlement status</h2><span>Full CPR-style PostEx deductions, settlement status and bank allocation by tracking number.</span></div><b>{postexPayments.length} tracked</b></div>
          <div className="adminTableWrap"><table className="adminTable financeTable settlementTable">
            <thead><tr><th>Sr.</th><th>Order ref.</th><th>Tracking</th><th>Weight</th><th>Pickup date</th><th>Origin city</th><th>Delivery city</th><th>Status</th><th>COD amount</th><th>Upfront amount</th><th>Reserve amount</th><th>D/R date</th><th>Shipping charges</th><th>Upfront charges</th><th>GST</th><th>Deduction (4%)</th><th>Net amount</th><th>Bank allocated</th><th>Remaining</th></tr></thead>
            <tbody>
              {postexPayments.map((payment, index) => {
                const detail = postexSettlementDetail(payment);
                const expected = Number(detail.net || payment.expected_net_pkr || 0);
                const allocated = Number(postexAllocatedByPayment.get(String(payment.id)) || 0);
                return <tr key={payment.id}>
                  <td>{index + 1}</td>
                  <td><b>{detail.orderRef}</b><small className="trackingNumber">{payment.order_number || ""}</small></td>
                  <td><a href={`https://merchant.postex.pk/main/order/${detail.trackingNumber}`} target="_blank">{detail.trackingNumber}</a></td>
                  <td>{detail.weight}</td>
                  <td>{detail.pickupDate}</td>
                  <td>{detail.originCity}</td>
                  <td>{detail.deliveryCity}</td>
                  <td><span className={`statusBadge ${payment.payment_status}`}>{detail.status}</span>{payment.postex_settled && <small className="trackingNumber">PostEx settled</small>}</td>
                  <td>{money(detail.cod)}</td>
                  <td>{money(detail.upfrontAmount)}</td>
                  <td>{money(detail.reserveAmount)}</td>
                  <td>{detail.drDate}</td>
                  <td className={detail.shipping ? "expenseAmount" : ""}>{money(detail.shipping)}</td>
                  <td className={detail.upfrontCharges ? "expenseAmount" : ""}>{money(detail.upfrontCharges)}</td>
                  <td className={detail.gst ? "expenseAmount" : ""}>{money(detail.gst)}</td>
                  <td className={detail.deduction4 ? "expenseAmount" : ""}>{money(detail.deduction4)}</td>
                  <td><b>{money(expected)}</b></td>
                  <td className={allocated ? "incomeAmount" : ""}>{money(allocated)}</td>
                  <td className={expected > allocated ? "expenseAmount" : "incomeAmount"}>{money(Math.max(0, expected - allocated))}</td>
                </tr>;
              })}
              {!postexPayments.length && <tr><td colSpan="7" className="emptyFinanceCell">Click “Sync PostEx” to load payment status for booked orders.</td></tr>}
            </tbody>
          </table></div>
        </div>

        <form className="adminCard financeExpenseForm settlementForm" onSubmit={saveCprBatch}>
          <h2>Record CPR / weekly receipt</h2>
          <p className="trackingNumber">Use this for PostEx settlement reconciliation only. The CPR amount/status will appear here, but it will not increase Available Cash. When the money is visible in your bank or wallet, enter the verified receipt in the form above.</p>
          <div className="formRow"><label>CPR number<input name="cprNumber" required placeholder="e.g. CPR-2026-W30" /></label><label>CPR date<input name="cprDate" type="date" /></label></div>
          <div className="formRow"><label>Period start<input name="periodStart" type="date" /></label><label>Period end<input name="periodEnd" type="date" /></label></div>
          <label>Tracking numbers<textarea rows="6" required value={cprTrackingText} onChange={(event) => setCprTrackingText(event.target.value)} placeholder={"One tracking number per line\n28640330000063"} /></label>
          <label className="settlementFileInput">Import tracking list (CSV/TXT)<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={importCprTrackingFile} /></label>
          <div className="formRow"><label>Expected CPR amount<input name="expectedAmountPkr" type="number" min="0" step="0.01" placeholder="Auto from selected orders" /></label><label>Other statement deductions<input name="additionalDeductionsPkr" type="number" min="0" step="0.01" defaultValue="0" /></label></div>
          <div className="formRow"><label>CPR bank amount (reconciliation only)<input name="bankReceivedPkr" type="number" min="0" step="0.01" required /></label><label>Statement date<input name="bankReceivedDate" type="date" /></label></div>
          <label>Notes<input name="notes" placeholder="Short payment, adjustment, bank reference..." /></label>
          <button disabled={postexSyncing || !postexSnapshot.setupAvailable}>{postexSyncing ? "Saving..." : "Save reconciliation"}</button>
        </form>
      </div>

      <div className="adminCard managementCard settlementHistory">
        <div className="inventoryListHead"><div><h2>CPR history</h2><span>Every weekly or biweekly PostEx settlement record. This is reconciliation only; Available Cash uses manual bank receipts.</span></div><b>{postexBatches.length} batches</b></div>
        <div className="adminTableWrap"><table className="adminTable financeTable"><thead><tr><th>CPR</th><th>Period</th><th>Orders</th><th>Expected bank</th><th>Received (reconciliation)</th><th>Carry forward</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {postexBatches.map((batch) => {
            const voided = isVoidedPostexBatch(batch);
            return <tr key={batch.id}><td><b>{batch.cpr_number}</b><small className="trackingNumber">{batch.cpr_date || "No CPR date"}</small></td><td>{batch.period_start || "—"} to {batch.period_end || "—"}</td><td>{batch.items?.length || 0}</td><td>{money(batch.expected_bank_pkr)}</td><td className={voided ? "" : "incomeAmount"}>{money(batch.bank_received_pkr)}</td><td className={Number(batch.carried_forward_pkr || 0) ? "expenseAmount" : ""}>{money(batch.carried_forward_pkr)}</td><td><span className={`statusBadge ${voided ? "cancelled" : batch.status}`}>{voided ? "voided" : batch.status}</span>{voided && <small className="trackingNumber"><br />Reversed</small>}</td><td>{!voided && isOwnerFinance ? <button type="button" className="removeProductButton" disabled={voidingPostexBatchId === batch.id || postexSyncing} aria-busy={voidingPostexBatchId === batch.id} onClick={() => requestVoidPostexBatch(batch)}>{voidingPostexBatchId === batch.id ? "Voiding..." : "Void"}</button> : "—"}</td></tr>;
          })}
          {!postexBatches.length && <tr><td colSpan="8" className="emptyFinanceCell">No CPR receipts have been recorded yet.</td></tr>}
        </tbody></table></div>
      </div>
      </>}
    </section>}

    {voidPostexBatch && <>
      <div className="adminOverlay" onClick={closeVoidPostexBatch} />
      <form className="inventoryDialog" onSubmit={voidPostexWalletReceipt}>
        <DialogHead title={`Void ${voidPostexBatch.cpr_number}`} onClose={closeVoidPostexBatch} />
        <div className="inventoryAlert materialAlert">
          <Landmark />
          <div>
            <b>This will reverse the PostEx bank receipt</b>
            <span>This reverses the CPR reconciliation and its linked settlement allocations. It does not change Available Cash; to correct cash, void the separate manual bank receipt. The CPR record stays visible as voided for audit.</span>
          </div>
        </div>
        <label>Type <b>{`VOID ${voidPostexBatch.cpr_number}`}</b> exactly to confirm<input value={voidPostexConfirmation} onChange={(event) => setVoidPostexConfirmation(event.target.value)} autoComplete="off" autoFocus /></label>
        <button className="removeProductButton" type="submit" disabled={voidingPostexBatchId === voidPostexBatch.id || voidPostexConfirmation.trim() !== `VOID ${voidPostexBatch.cpr_number}`}>{voidingPostexBatchId === voidPostexBatch.id ? "Voiding receipt..." : "Void / reverse receipt"}</button>
      </form>
    </>}

    {voidManualPostexReceipt && <>
      <div className="adminOverlay" onClick={closeVoidManualPostexReceipt} />
      <form className="inventoryDialog" onSubmit={voidManualPostexWalletReceipt}>
        <DialogHead title="Void manual PostEx receipt" onClose={closeVoidManualPostexReceipt} />
        <div className="inventoryAlert materialAlert">
          <Landmark />
          <div>
            <b>This will reverse this manually entered bank receipt</b>
            <span>Available cash will decrease by {money(voidManualPostexReceipt.amount)}. The receipt will remain visible as voided for audit, and the PostEx receivable will update again.</span>
          </div>
        </div>
        <label>Type <b>{`VOID ${String(voidManualPostexReceipt.reference || voidManualPostexReceipt.title || "").replace(/^PostEx bank receipt:\s*/i, "").trim()}`}</b> exactly to confirm<input value={voidManualPostexConfirmation} onChange={(event) => setVoidManualPostexConfirmation(event.target.value)} autoComplete="off" autoFocus /></label>
        <button className="removeProductButton" type="submit" disabled={voidingManualPostexReceiptId === voidManualPostexReceipt.id || voidManualPostexConfirmation.trim() !== `VOID ${String(voidManualPostexReceipt.reference || voidManualPostexReceipt.title || "").replace(/^PostEx bank receipt:\s*/i, "").trim()}`}>{voidingManualPostexReceiptId === voidManualPostexReceipt.id ? "Voiding receipt..." : "Void / reverse receipt"}</button>
      </form>
    </>}

    {voidCashbookEntryTarget && <>
      <div className="adminOverlay" onClick={closeVoidCashbookEntry} />
      <form className="inventoryDialog" onSubmit={voidCashbookEntry}>
        <DialogHead title="Void cash movement" onClose={closeVoidCashbookEntry} />
        <div className="inventoryAlert materialAlert">
          <Landmark />
          <div>
            <b>This will restore {money(voidCashbookEntryTarget.amount)} to Available Cash</b>
            <span>The movement will stay visible as Voided for audit. Supplier payments also restore that bill&apos;s unpaid balance.</span>
          </div>
        </div>
        <p className="trackingNumber"><b>{voidCashbookEntryTarget.title}</b><br />{financeEntryLabel(voidCashbookEntryTarget.type)} · {voidCashbookEntryTarget.date || "No date"}</p>
        <label>Type <b>{`VOID ${voidCashbookEntryTarget.id}`}</b> exactly to confirm<input value={voidCashbookConfirmation} onChange={(event) => setVoidCashbookConfirmation(event.target.value)} autoComplete="off" autoFocus /></label>
        <button className="removeProductButton" type="submit" disabled={voidingCashbookEntryId === voidCashbookEntryTarget.id || voidCashbookConfirmation.trim() !== `VOID ${voidCashbookEntryTarget.id}`}>{voidingCashbookEntryId === voidCashbookEntryTarget.id ? "Voiding movement..." : "Void / restore cash"}</button>
      </form>
    </>}

    {showResetCashDialog && <>
      <div className="adminOverlay" onClick={closeResetCashDialog} />
      <form className="inventoryDialog" onSubmit={resetAvailableCash}>
        <DialogHead title="Start Available Cash from zero" onClose={closeResetCashDialog} />
        <div className="inventoryAlert materialAlert">
          <Landmark />
          <div>
            <b>Current Available Cash: {money(availableCash)}</b>
            <span>This creates one auditable opening-balance adjustment and makes Available Cash Rs. 0. Existing orders, settlements and finance history are not deleted.</span>
          </div>
        </div>
        <p className="trackingNumber">After reset, add every real bank receipt, expense, supplier payment and withdrawal from today onward. You can void this reset later from the Cashbook ledger.</p>
        <label>Type <b>RESET CASH TO 0</b> exactly to confirm<input value={resetCashConfirmation} onChange={(event) => setResetCashConfirmation(event.target.value)} autoComplete="off" autoFocus /></label>
        <button className="removeProductButton" type="submit" disabled={resettingCash || resetCashConfirmation.trim() !== "RESET CASH TO 0"}>{resettingCash ? "Resetting cash..." : "Reset Available Cash to Rs. 0"}</button>
      </form>
    </>}

    {financeTab === "overview" && <>
    <div className="miniMetricGrid financeMetrics">
      <article><CircleDollarSign /><span><b>{money(grossRevenue)}</b>Total sales</span></article>
      <article><ShoppingBag /><span><b>{deliveredOrderCount}</b>Delivered orders</span></article>
      <article><Package /><span><b>{totalProductsSold}</b>Total products sold</span></article>
      <article><WalletCards /><span><b>{money(deliveredCogs)}</b>Total product cost</span></article>
      <article><ShoppingBag /><span><b>{money(courierDeliveryCost)}</b>Courier delivery cost</span></article>
      <article><WalletCards /><span><b>{money(availableCash)}</b>Available business cash</span></article>
      <article><Landmark /><span><b>{money(receivedCash)}</b>Manually verified PostEx receipts</span></article>
      {totalCustomerAdvance > 0 && <article><CircleDollarSign /><span><b style={{ color: "#15803d" }}>{money(totalCustomerAdvance)}</b>Customer advance recorded</span></article>}
      <article><CircleDollarSign /><span><b>{money(otherBusinessIncome)}</b>Other business income</span></article>
      <article><CircleDollarSign /><span><b>{money(ownerInvestments)}</b>Owner funds added</span></article>
      <article className={ownerWithdrawals ? "alertMetric" : ""}><CircleDollarSign /><span><b>{money(ownerWithdrawals)}</b>Owner withdrawals</span></article>
      <article className={returnedOrderCount ? "alertMetric" : ""}><Package /><span><b>{returnedOrderCount}</b>Returned orders</span></article>
      <article className={returnCourierCost ? "alertMetric" : ""}><TrendingUp /><span><b>{money(returnCourierCost)}</b>Return courier loss</span></article>
      <article className={receivables ? "alertMetric" : ""}><Landmark /><span><b>{money(receivables)}</b>PostEx receivable</span></article>
      <article className={overdueSupplierBills.length ? "alertMetric" : ""}><Landmark /><span><b>{money(supplierPayableTotal)}</b>Supplier payables</span></article>
      <article><TrendingUp /><span><b>{money(profitAfterProductCost)}</b>Profit before deductions</span></article>
      <article className={netProfit < 0 ? "alertMetric" : ""}><TrendingUp /><span><b>{money(netProfit)}</b>Final net profit</span></article>
    </div>
    <div className="adminVisualGrid">
      <VisualDonut title="Cash allocation" subtitle="Where your available cash, receivables and owner capital currently sit." centerValue={money(Math.max(0, availableCash))} centerLabel="available" items={financeCashVisual} />
      <VisualBars title="Profit waterfall" subtitle="Revenue flow from gross sales through costs to final net profit." format={(value) => money(value)} items={financeCostVisual} />
    </div>

    <section className="financeGrid financeGridWide">
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Where money comes from</h2><p>Only verified bank entries increase Available Cash.</p></div></div>
        <div className="financeStatement">
          <div><span>Manually verified PostEx receipts</span><b>+ {money(receivedCash)}</b></div>
          {totalCustomerAdvance > 0 && <div><span>Customer advance recorded (orders)</span><b style={{ color: "#15803d" }}>{money(totalCustomerAdvance)}</b></div>}
          <div><span>Other recorded business income</span><b>+ {money(otherBusinessIncome)}</b></div>
          <div><span>Owner funds added</span><b>+ {money(ownerInvestments)}</b></div>
          {cashResetAdjustment > 0 && <div><span>Opening balance adjustment</span><b>+ {money(cashResetAdjustment)}</b></div>}
          <div className="statementTotal"><span>Verified cash received</span><b>{money(receivedCash + otherBusinessIncome + ownerInvestments)}</b></div>
        </div>
      </div>
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Where money goes</h2><p>Stock purchases reduce cash now; COGS is recognised when the product sells.</p></div></div>
        <div className="financeStatement">
          <div><span>Fabric / stock</span><b>- {money(fabricCashOutflow)}</b></div>
          <div><span>Tailoring / stitching</span><b>- {money(tailoringCashOutflow)}</b></div>
          <div><span>Lace / embellishment</span><b>- {money(laceCashOutflow)}</b></div>
          <div><span>Other stock / production</span><b>- {money(Math.max(0, inventoryCashOutflow - fabricCashOutflow - tailoringCashOutflow - laceCashOutflow))}</b></div>
          <div><span>Operating expenses + supplier payments</span><b>- {money(manualOperatingExpenseTotal + cashbookOperatingExpenses + packagingTotal + deliveryTotal + supplierPaymentTotal)}</b></div>
          <div><span>Owner withdrawals</span><b>- {money(ownerWithdrawals)}</b></div>
          {cashResetAdjustment < 0 && <div><span>Opening balance reset</span><b>- {money(Math.abs(cashResetAdjustment))}</b></div>}
          <div className="statementTotal"><span>Available business cash</span><b>{money(availableCash)}</b></div>
        </div>
      </div>
    </section>

    {/* Customer Advance Receipts Breakdown Table Section */}
    <section className="adminCard managementCard" style={{ marginTop: "16px" }}>
      <div className="inventoryListHead">
        <div>
          <h2>🟢 Customer Advance Receipts</h2>
          <span>All advance confirmation fees (e.g. Rs. 250) and prepaid order payments recorded for customers.</span>
        </div>
        <b style={{ color: "#15803d", fontSize: "16px" }}>
          Total Advance: {money(totalCustomerAdvance)}
        </b>
      </div>
      <div className="adminTableWrap">
        <table className="adminTable financeTable">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Order Ref</th>
              <th>City</th>
              <th>Advance Recorded</th>
              <th>Remaining PostEx COD</th>
              <th>Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {safeOrders.filter((order) => Number(order.amount_payable_in_advance_pkr ?? order.amountPayableInAdvance ?? 0) > 0).map((order) => {
              const advance = Number(order.amount_payable_in_advance_pkr ?? order.amountPayableInAdvance ?? 0);
              const totalVal = Number(order.total_pkr ?? order.total ?? 0);
              const cod = Math.max(0, totalVal - advance);
              const refNum = order.order_number ? `#${order.order_number}` : (order.id ? (String(order.id).startsWith("#") ? order.id : `#${order.id}`) : "—");
              const custName = order.shipping_full_name || order.guest_name || order.customer || "Guest";
              const custPhone = order.shipping_phone || order.guest_phone || order.phone || "—";
              const custCity = order.shipping_city || order.city || "—";
              const pStatus = order.payment_proof_status || order.payment_status || order.paymentStatus || "Awaiting Payment";
              return (
                <tr key={String(order.id || order.order_number || Math.random())}>
                  <td><b>{custName}</b><small className="trackingNumber"><br />{custPhone}</small></td>
                  <td><b>{refNum}</b></td>
                  <td>{custCity}</td>
                  <td className="incomeAmount"><b>+ {money(advance)}</b></td>
                  <td style={{ color: cod === 0 ? "#15803d" : "#1e40af", fontWeight: 700 }}>
                    {cod === 0 ? "Rs. 0 (Prepaid)" : money(cod)}
                  </td>
                  <td>
                    <span className={`statusBadge ${String(pStatus).replaceAll(" ", "").toLowerCase()}`}>
                      {pStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!safeOrders.filter((order) => Number(order.amount_payable_in_advance_pkr ?? order.amountPayableInAdvance ?? 0) > 0).length && (
              <tr>
                <td colSpan="6" className="emptyFinanceCell">No customer advance receipts recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>

    <section className="financeGrid financeGridWide">
      <form className="adminCard financeExpenseForm" onSubmit={saveProfitAllocation}>
        <h2>Profit allocation planner <HelpHint text="This only plans how current net profit may be used. It does not move cash or create an expense." /></h2>
        <p className="trackingNumber">Plan from current net profit only. Saving this plan does not create an expense or personal withdrawal.</p>
        <div className="formRow"><label>Marketing %<input type="number" min="0" max="100" value={profitAllocation.marketingPercent} onChange={(event) => setProfitAllocation((current) => ({ ...current, marketingPercent: event.target.value }))} /></label><label>Owner / family %<input type="number" min="0" max="100" value={profitAllocation.ownerPercent} onChange={(event) => setProfitAllocation((current) => ({ ...current, ownerPercent: event.target.value }))} /></label></div>
        <div className="financeStatement"><div><span>Current net profit to allocate</span><b>{money(allocatableProfit)}</b></div><div><span>Marketing budget ({profitAllocation.marketingPercent || 0}%)</span><b>{money(marketingAllocation)}</b></div><div><span>Owner / family amount ({profitAllocation.ownerPercent || 0}%)</span><b>{money(ownerAllocation)}</b></div><div className="statementTotal"><span>New stock / reinvestment ({Math.max(0, 100 - Number(profitAllocation.marketingPercent || 0) - Number(profitAllocation.ownerPercent || 0))}%)</span><b>{money(stockAllocation)}</b></div></div>
        <button disabled={cashbookLoading}>{cashbookLoading ? "Saving..." : "Save allocation plan"}</button>
      </form>
    </section>

    <section className="financeGrid financeGridWide"><div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Management KPIs</h2><p>Owner view of sales, customers, inventory and cash health.</p></div></div><div className="financeStatement"><div><span>Average order value</span><b>{money(deliveredOrderCount ? grossRevenue / deliveredOrderCount : 0)}</b></div><div><span>Return rate</span><b>{deliveredOrderCount + returnedOrderCount ? Math.round(returnedOrderCount / (deliveredOrderCount + returnedOrderCount) * 100) : 0}%</b></div><div><span>Low-stock products</span><b>{safeProducts.filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5)).length}</b></div><div className="statementTotal"><span>Cash after 30-day forecast</span><b>{money(expectedClosingCash)}</b></div></div></div><div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Inventory finance</h2><p>Retail and saved purchase value</p></div></div><div className="inventoryFinanceList"><div><span>Retail value on hand</span><b>{money(inventoryRetailValue)}</b></div><div><span>Purchase value on hand</span><b>{money(inventoryCostValue)}</b></div><div><span>Low-stock retail exposure</span><b>{money(lowStockValue)}</b></div><div><span>Products tracked</span><b>{safeProducts.length}</b></div></div></div></section>

    <section className="financeGrid financeGridWide">
      <div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>30-day cash-flow forecast</h2><p>Estimate based on current cash, pending COD and supplier bills due within 30 days.</p></div></div><div className="financeStatement"><div><span>Current available cash</span><b>{money(availableCash)}</b></div><div><span>Expected COD collections</span><b>+ {money(receivables)}</b></div><div><span>Supplier payables due</span><b>- {money(upcomingPayables)}</b></div><div className="statementTotal"><span>Expected closing cash</span><b>{money(expectedClosingCash)}</b></div></div></div>
      <form className="adminCard financeExpenseForm" onSubmit={saveFixedCosts}><h2>Break-even calculator <HelpHint text="Fixed monthly costs are regular costs like rent, salaries, utilities and software. Contribution per order excludes fixed costs." /></h2><label>Monthly fixed costs<input type="number" min="0" value={fixedCosts} onChange={(event) => setFixedCosts(event.target.value)} placeholder="Rent, salaries, utilities..." /></label><div className="financeStatement"><div><span>Average contribution per delivered order</span><b>{money(contributionPerOrder)}</b></div><div><span>Break-even delivered orders</span><b>{breakEvenOrders || "Add sales data"}</b></div><div className="statementTotal"><span>Break-even sales target</span><b>{breakEvenOrders ? money(breakEvenOrders * (grossRevenue / deliveredOrderCount)) : "—"}</b></div></div><button disabled={cashbookLoading}>{cashbookLoading ? "Saving..." : "Save fixed costs"}</button></form>
    </section>
    </>}

    {financeTab === "marketing" && <>

    <section className="financeGrid financeGridWide"><div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Management KPIs</h2><p>Owner view of sales, customers, inventory and cash health.</p></div></div><div className="financeStatement"><div><span>Average order value</span><b>{money(deliveredOrderCount ? grossRevenue / deliveredOrderCount : 0)}</b></div><div><span>Return rate</span><b>{deliveredOrderCount + returnedOrderCount ? Math.round(returnedOrderCount / (deliveredOrderCount + returnedOrderCount) * 100) : 0}%</b></div><div><span>Low-stock products</span><b>{safeProducts.filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5)).length}</b></div><div className="statementTotal"><span>Cash after 30-day forecast</span><b>{money(expectedClosingCash)}</b></div></div></div><div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Marketing ROI</h2><p>Only campaign-attributed sales are included.</p></div></div><div className="financeStatement"><div><span>Campaign spend</span><b>{money(marketingSpendTotal)}</b></div><div><span>Attributed sales</span><b>{money(marketingSalesTotal)}</b></div><div><span>ROAS</span><b>{marketingSpendTotal ? `${(marketingSalesTotal / marketingSpendTotal).toFixed(2)}x` : "—"}</b></div><div className="statementTotal"><span>Customer acquisition cost</span><b>{marketingCustomersTotal ? money(marketingSpendTotal / marketingCustomersTotal) : "—"}</b></div></div></div></section>
    <section className="financeGrid financeGridWide"><div className="adminCard managementCard"><div className="inventoryListHead"><div><h2>Marketing campaigns</h2><span>Spend and attributed results</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Campaign</th><th>Platform</th><th>Spend</th><th>Sales</th><th>ROAS</th></tr></thead><tbody>{marketingCampaigns.map((campaign) => <tr key={campaign.id}><td><b>{campaign.name}</b></td><td>{campaign.platform}</td><td>{money(campaign.spend)}</td><td>{money(campaign.sales)}</td><td>{campaign.spend ? `${(campaign.sales / campaign.spend).toFixed(2)}x` : "—"}</td></tr>)}{!marketingCampaigns.length && <tr><td colSpan="5" className="emptyFinanceCell">No campaigns added yet.</td></tr>}</tbody></table></div></div><form className="adminCard financeExpenseForm" onSubmit={addMarketingCampaign}><h2>Add marketing campaign</h2><label>Campaign name<input name="name" required placeholder="e.g. Eid Instagram campaign" /></label><div className="formRow"><label>Platform<select name="platform"><option>Instagram</option><option>Meta Ads</option><option>TikTok</option><option>Google</option><option>Other</option></select></label><label>Date<input name="date" type="date" defaultValue={today} /></label></div><div className="formRow"><label>Spend<input name="spend" type="number" min="0" defaultValue="0" /></label><label>Attributed sales<input name="sales" type="number" min="0" defaultValue="0" /></label></div><label>New customers<input name="customers" type="number" min="0" defaultValue="0" /></label><button disabled={cashbookLoading}>{cashbookLoading ? "Saving..." : "Save campaign"}</button></form></section>
    </>}

    {financeTab === "suppliers" && <>
    <section className="financeGrid financeGridWide">
      <div className="adminCard managementCard">
        <div className="inventoryListHead"><div><h2>Supplier payables</h2><span>{overdueSupplierBills.length ? `${overdueSupplierBills.length} overdue — action needed` : "Bills and due dates"}</span></div><b>{money(supplierPayableTotal)} due</b></div>
      <div className="adminTableWrap"><table className="adminTable financeTable"><thead><tr><th>Supplier</th><th>Reference</th><th>Due date</th><th>Bill</th><th>Paid</th><th>Remaining</th><th /></tr></thead><tbody>{supplierBills.map((bill) => { const remaining = Math.max(0, Number(bill.total) - Number(bill.paid)); const payments = cashbookTransactions.filter((entry) => entry.supplierBillId === bill.id && !entry.voided); const dueSoon = bill.dueDate && bill.dueDate >= today && bill.dueDate <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10); return <tr key={bill.id}><td><b>{bill.supplier}</b>{payments.length > 0 && <small><br />{payments.length} active payment{payments.length === 1 ? "" : "s"}: {payments.map((entry) => `${entry.date} ${money(entry.amount)}`).join(" · ")}</small>}</td><td>{bill.reference || "—"}</td><td className={dueSoon && remaining ? "expenseAmount" : ""}>{bill.dueDate || "—"}{dueSoon && remaining ? <small><br />Due soon</small> : null}</td><td>{money(bill.total)}</td><td>{money(bill.paid)}</td><td className={bill.dueDate && bill.dueDate < today && remaining ? "expenseAmount" : ""}>{money(remaining)}</td><td>{remaining > 0 && <button className="editProductButton" onClick={() => recordSupplierPayment(bill)} disabled={cashbookLoading} aria-busy={cashbookLoading}>Pay</button>}</td></tr>; })}{!supplierBills.length && <tr><td colSpan="7" className="emptyFinanceCell">No supplier bills added yet.</td></tr>}</tbody></table></div>
      </div>
      <form className="adminCard financeExpenseForm" onSubmit={addSupplierBill}>
        <h2>Add supplier bill</h2><p className="trackingNumber">Record the full bill, any amount already paid, and the due date. This creates a payable, not an expense twice.</p>
        <label>Supplier<input name="supplier" required placeholder="e.g. Main fabric supplier" /></label><div className="formRow"><label>Bill/reference<input name="reference" placeholder="Invoice or WhatsApp ref" /></label><label>Bill date<input name="date" type="date" defaultValue={today} /></label></div><div className="formRow"><label>Total bill<input name="total" type="number" min="1" required /></label><label>Already paid<input name="paid" type="number" min="0" defaultValue="0" /></label></div><label>Due date<input name="dueDate" type="date" /></label><label>Note<input name="note" placeholder="What was purchased" /></label><button disabled={cashbookLoading}>{cashbookLoading ? "Saving..." : "Save payable"}</button>
      </form>
    </section>
    </>}

    {financeTab === "pnl" && <>
    <section className="financeGrid financeGridWide">
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Profit &amp; Loss statement</h2><p>Actual delivered-order performance. Product cost is recognised only when units sell.</p></div><b>{profitMargin}% net margin</b></div>
        <div className="financeStatement">
          <div><span>Sales revenue</span><b>+ {money(grossRevenue)}</b></div>
          <div><span>Less: cost of goods sold</span><b>- {money(deliveredCogs)}</b></div>
          <div><span>Gross profit</span><b>{money(grossRevenue - deliveredCogs)}</b></div>
          <div><span>Less: actual PostEx GST + 4% deduction</span><b>- {money(gstTaxTotal)}</b></div>
          <div><span>Less: actual delivered-order PostEx shipping</span><b>- {money(courierDeliveryCost)}</b></div>
          <div><span>Less: actual returned-order PostEx loss</span><b>- {money(returnCourierCost)}</b></div>
          <div><span>Less: operating expenses</span><b>- {money(profitExpenseTotal)}</b></div>
          <div className="statementTotal"><span>Net profit / loss</span><b>{money(netProfit)}</b></div>
        </div>
      </div>
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Returns-loss report</h2><p>Returned orders do not create sales revenue. Courier loss uses actual PostEx synced return/shipping deductions.</p></div></div>
        <div className="financeStatement">
          <div><span>Returned orders</span><b>{returnedOrderCount}</b></div>
          <div><span>Return rate</span><b>{deliveredOrderCount + returnedOrderCount ? Math.round((returnedOrderCount / (deliveredOrderCount + returnedOrderCount)) * 100) : 0}%</b></div>
          <div><span>Return courier cost</span><b>- {money(returnCourierCost)}</b></div>
          <div><span>Stock action</span><b>Inspect before restock</b></div>
        </div>
        {returnedOrders.length > 0 && <div className="trackingNumber">Returned: {returnedOrders.slice(0, 4).map((order) => `${order.id} (${order.customer})`).join(" · ")}{returnedOrders.length > 4 ? ` +${returnedOrders.length - 4} more` : ""}</div>}
      </div>
    </section>

    <section className="financeGrid">
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Profit summary <HelpHint text="COGS means the saved cost of delivered products. Cashbook stock purchases are not deducted twice; their cost is counted when units sell." /></h2><p>Follow the steps below from sales to final profit.</p></div><b>{profitMargin}% margin</b></div>
        <div className="financeStatement">
          <div><span>1. Product sales ({totalProductsSold} items)</span><b>+ {money(deliveredProductRevenue)}</b></div>
          <div><span>2. Delivery fees collected</span><b>{deliveryCollected >= 0 ? "+ " : "- "}{money(Math.abs(deliveryCollected))}</b></div>
          <div><span>3. Total sale received</span><b>{money(grossRevenue)}</b></div>
          <div><span>4. Less: saved product cost</span><b>- {money(deliveredCogs)}</b></div>
          <div><span>5. Profit after product cost</span><b>{money(profitAfterProductCost)}</b></div>
          <div><span>6. Less: actual PostEx GST + 4% deduction</span><b>- {money(gstTaxTotal)}</b></div>
          <div><span>7. Less: actual delivered-order PostEx shipping</span><b>- {money(courierDeliveryCost)}</b></div>
          <div><span>8. Less: actual returned-order PostEx loss</span><b>- {money(returnCourierCost)}</b></div>
          <div><span>9. Less: operating expenses</span><b>- {money(profitExpenseTotal)}</b></div>
          {productionCashOutflow > 0 && <div><span>Stock purchases tracked in Cashbook</span><b>{money(productionCashOutflow)} (deducted when units sell)</b></div>}
          <div className="statementTotal"><span>10. Final net profit</span><b>{money(netProfit)}</b></div>
        </div>
        <div className="financeControls">
          <label>GST<input readOnly value="Actual from PostEx" /></label>
          <label>Tax<input readOnly value="4% deduction / PostEx data" /></label>
          <label>Packaging expense<input type="number" min="0" value={packagingExpense} onChange={(event) => setPackagingExpense(event.target.value)} onBlur={() => saveManualFinance({ packagingExpense })} /></label>
          <label>Extra delivery expense<input type="number" min="0" value={deliveryExpense} onChange={(event) => setDeliveryExpense(event.target.value)} onBlur={() => saveManualFinance({ deliveryExpense })} /></label>
        </div>
      </div>

      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Inventory finance</h2><p>Retail and saved purchase value</p></div></div>
        <div className="inventoryFinanceList">
          <div><span>Retail value on hand</span><b>{money(inventoryRetailValue)}</b></div>
          <div><span>Purchase value on hand</span><b>{money(inventoryCostValue)}</b></div>
          <div><span>Low-stock retail exposure</span><b>{money(lowStockValue)}</b></div>
          <div><span>Products tracked</span><b>{safeProducts.length}</b></div>
        </div>
      </div>
    </section>

    </>}

    {financeTab === "cashbook" && <>
    <section className="financeGrid financeGridWide">
      <div className={`adminCard financeSummaryCard ${availableCash < 0 ? "alertMetric" : ""}`}>
        <div className="cardHeading"><div><h2>Available Cash</h2><p>Current spendable balance after every active receipt, payment, expense and withdrawal.</p></div><div className="cashBalanceCardActions"><WalletCards /><button type="button" className="removeProductButton" onClick={requestResetAvailableCash} disabled={cashbookLoading || Math.abs(Number(availableCash || 0)) < 0.01} aria-busy={cashbookLoading}>{cashbookLoading ? "Processing..." : "Reset to Rs. 0"}</button></div></div>
        <div className="financeStatement">
          <div><span>Current balance</span><b>{money(availableCash)}</b></div>
          <div><span>Cash coming in</span><b className="cashPlus">+ {money(receivedCash + otherBusinessIncome + ownerInvestments)}</b></div>
          <div><span>Cash already used</span><b className="cashMinus">- {money(cashOutflowTotal + ownerWithdrawals)}</b></div>
          {cashResetAdjustment !== 0 && <div><span>Opening balance adjustment</span><b className={cashResetAdjustment < 0 ? "cashMinus" : "cashPlus"}>{cashResetAdjustment < 0 ? "-" : "+"} {money(Math.abs(cashResetAdjustment))}</b></div>}
          <div className="statementTotal"><span>Rule</span><b>{availableCash < 0 ? "Cash shortfall — add funds or review entries" : "Every active movement is included"}</b></div>
        </div>
        <p className="cashBreakdownNote">Incoming receipts add to the balance. Expenses, supplier/tailor payments and withdrawals subtract from it. Voiding an entry restores exactly that movement.</p>
      </div>
      <div className="adminCard managementCard">
        <div className="inventoryListHead"><div><h2>Finance ledger</h2><span>Orders, cash movements and expenses. PostEx settlement status stays in Settlements.</span></div></div>
        <div className="adminTableWrap"><table className="adminTable financeTable"><thead><tr><th>Ref</th><th>Date</th><th>Type</th><th>Account</th><th>Status</th><th>Amount</th><th>Action</th></tr></thead><tbody>
          {ledgerRows.map((row) => <tr key={`${row.id}-${row.type}`}><td><b>{row.id}</b></td><td>{row.date}</td><td>{row.type}</td><td>{row.account}</td><td><span className={`statusBadge ${String(row.status).toLowerCase()}`}>{row.status}</span></td><td className={row.amount < 0 ? "expenseAmount" : "incomeAmount"}>{row.amount < 0 ? "-" : "+"} {money(Math.abs(row.amount))}</td><td>{row.financeEntry && !row.voided && isOwnerFinance ? (isLinkedFinanceEntry(row.financeEntry) ? <small className="trackingNumber">Use batch</small> : <button type="button" className="removeProductButton" onClick={() => requestVoidCashbookEntry(row.financeEntry)} disabled={cashbookLoading} aria-busy={cashbookLoading}>Void</button>) : row.voided ? <small className="trackingNumber">Voided</small> : "—"}</td></tr>)}
          {!ledgerRows.length && <tr><td colSpan="7" className="emptyFinanceCell">No finance entries yet.</td></tr>}
        </tbody></table></div>
      </div>

      <form className="adminCard financeExpenseForm" onSubmit={addCashbookTransaction}>
        <h2>Add cash movement</h2>
        <p className="trackingNumber">Har real cash movement yahan record karein. Expense, supplier/tailor payment aur withdrawal Available Cash se minus honge; income aur owner funds plus honge. PostEx settlement status khud cash nahi banata.</p>
        <div className="formRow"><label>Money direction<select name="type"><option value="business_expense">Money paid / expense</option><option value="other_income">Other business income</option><option value="owner_investment">Owner funds added</option><option value="owner_withdrawal">Owner withdrawal</option></select></label><label>Category<select name="category" value={cashbookCategory} onChange={(event) => setCashbookCategory(event.target.value)}><option>Fabric / stock</option><option>Tailoring / stitching</option><option>Lace / embellishment</option><option>Packaging</option><option>Marketing</option><option>Courier / delivery</option><option>Rent &amp; utilities</option><option>Salaries &amp; labour</option><option>Operations</option><option>Other</option></select></label></div>
        {cashbookCategory === "Other" && <label>Custom category name<input name="otherCategory" required maxLength="120" placeholder="e.g. Photography, repairs, samples" /></label>}
        <label>What was it for?<input name="title" required placeholder="e.g. Stitching payment for Farshi suits" /></label>
        <div className="formRow"><label>Tailor / supplier / source<input name="counterparty" placeholder="e.g. Amina Tailors" /></label><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0" /></label></div>
        <div className="formRow"><label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></label><label>Reference (optional)<input name="reference" placeholder="Invoice, bank ref, WhatsApp ref" /></label></div>
        <label>Note (optional)<input name="note" placeholder="Extra detail for later checking" /></label>
        <button disabled={cashbookLoading}>{cashbookLoading ? "Saving..." : "Save cash movement"}</button>
      </form>

    </section>

    </>}

    {financeTab === "reports" && <>
    <section className="financeGrid financeGridWide financeReportsPanel">
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Reports &amp; exports</h2><p>Download the current finance period for review or sharing.</p></div></div>
        <div className="financeStatement"><div><span>Selected period</span><b>{financePeriod === "all" ? "All time" : financePeriod === "month" ? "This month" : "Last month"}</b></div><div><span>Delivered sales</span><b>{money(grossRevenue)}</b></div><div><span>Net profit / loss</span><b>{money(netProfit)}</b></div><div className="statementTotal"><span>Supplier payables</span><b>{money(supplierPayableTotal)}</b></div></div>
      </div>
      <VisualBars
        title="Financial overview"
        subtitle="Period summary — revenue, costs and outstanding payables."
        format={(value) => money(value)}
        items={[
          { label: "Delivered revenue", value: grossRevenue, color: "#1d6840" },
          { label: "Product cost (COGS)", value: deliveredCogs, color: "#c78b2b" },
          { label: "PostEx & courier fees", value: courierDeliveryCost + returnCourierCost + gstTaxTotal, color: "#b73543" },
          { label: "Supplier payables", value: supplierPayableTotal, color: "#8d2449" },
        ]}
      />
      <div className="adminCard financeExpenseForm"><h2>Export finance report</h2><p className="trackingNumber">CSV includes sales, costs, courier, GST/tax, cash and inventory values for the selected period.</p><button type="button" onClick={exportFinance}><ReceiptText /> Download CSV report</button></div>
    </section>
    </>}
  </div>;
}

function ProductionBatchModal({ isOpen, onClose, onSubmit, products, saving }) {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(25);
  const [fabric, setFabric] = useState(0);
  const [stitching, setStitching] = useState(0);
  const [stitchingMaterial, setStitchingMaterial] = useState(0);
  const [packaging, setPackaging] = useState(0);
  const [travel, setTravel] = useState(0);
  const [other, setOther] = useState(0);

  if (!isOpen) return null;

  const totalCost = Number(fabric || 0) + Number(stitching || 0) + Number(stitchingMaterial || 0) + Number(packaging || 0) + Number(travel || 0) + Number(other || 0);
  const qtyNum = Math.max(1, Number(quantity || 1));
  const unitCost = Math.round(totalCost / qtyNum);

  return (
    <>
      <div className="adminOverlay" onClick={onClose} />
      <form className="inventoryDialog" onSubmit={onSubmit}>
        <DialogHead title="Create production batch" onClose={onClose} />
        <p className="trackingNumber">Add one design at a time. Stock, per-suit cost and Finance expense will update together.</p>

        <label>Design / product
          <select name="productId" required value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select product</option>
            <option value="__new__">+ Create new product/design</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>

        {productId === "__new__" && (
          <section className="adminCard" style={{ padding: "14px", marginBottom: "12px", background: "#f9fcfa", border: "1px solid #dce7dd" }}>
            <p className="fieldTitle" style={{ fontWeight: "700", color: "#132f22" }}>New product / design details</p>
            <div className="formRow">
              <label>Design Code / SKU (e.g. BST-301)
                <input name="newProductArticleNumber" placeholder="e.g. BST-301" />
                <small style={{ color: "#546e5f", fontSize: "11px", display: "block", marginTop: "2px" }}>Same code dubara use karne par stock &amp; cost update hogi (no duplicates).</small>
              </label>
              <label>Product / design name
                <input name="newProductName" placeholder="e.g. Blue Arora – Design 4" />
              </label>
            </div>
            <div className="formRow">
              <label>Selling price (PKR)
                <input name="newProductPrice" type="number" min="0" placeholder="0" />
              </label>
              <label>Category
                <input name="newProductCategory" placeholder="e.g. Kurtis" defaultValue="Kurtis" />
              </label>
            </div>
            <label>Image URL (optional)
              <input name="newProductImage" placeholder="https://... or uploaded image URL" />
            </label>
          </section>
        )}

        <div className="formRow">
          <label>Finished suits (Quantity)
            <input name="quantity" type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="25" />
          </label>
          <label>Date
            <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
        </div>

        <p className="fieldTitle" style={{ fontWeight: "700", color: "#132f22", marginTop: "12px" }}>Costs for this design batch (PKR)</p>
        <div className="formRow">
          <label>Fabric cost
            <input name="fabric" type="number" min="0" value={fabric} onChange={(e) => setFabric(e.target.value)} />
          </label>
          <label>Stitching cost
            <input name="stitching" type="number" min="0" value={stitching} onChange={(e) => setStitching(e.target.value)} />
          </label>
        </div>
        <div className="formRow">
          <label>Stitching material (Laces/Buttons)
            <input name="stitchingMaterial" type="number" min="0" value={stitchingMaterial} onChange={(e) => setStitchingMaterial(e.target.value)} />
          </label>
          <label>Packaging
            <input name="packaging" type="number" min="0" value={packaging} onChange={(e) => setPackaging(e.target.value)} />
          </label>
        </div>
        <div className="formRow">
          <label>Travel / Transport
            <input name="travel" type="number" min="0" value={travel} onChange={(e) => setTravel(e.target.value)} />
          </label>
          <label>Other expenses
            <input name="other" type="number" min="0" value={other} onChange={(e) => setOther(e.target.value)} />
          </label>
        </div>

        <div className="adminCard" style={{ padding: "12px 16px", margin: "14px 0", background: "linear-gradient(135deg, #173d29, #245d3f)", color: "#fff", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px", opacity: 0.9 }}>Total Batch Cost:</span>
            <b style={{ fontSize: "15px" }}>Rs. {totalCost.toLocaleString()}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: "700" }}>Unit Cost per Suit:</span>
            <b style={{ fontSize: "18px", color: "#aef3c7" }}>Rs. {unitCost.toLocaleString()} / suit</b>
          </div>
        </div>

        <label>Note
          <textarea name="note" rows="2" placeholder="Supplier, stitching unit or batch reference" />
        </label>

        <button
          type="submit"
          className="dialogSave"
          disabled={saving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            cursor: saving ? "not-allowed" : "pointer"
          }}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving batch, adding stock &amp; recording cost...</span>
            </>
          ) : (
            "Save batch, add stock & record cost"
          )}
        </button>
      </form>
    </>
  );
}

function InventoryPanel({ products, movements, orders, connected, currentAdminUser, onAdjust, onCreateCustomInventory, onCreateProductionBatch, onOpenOrder, initialView }) {
  const emptyProductionCosts = () => ({ fabric: 0, stitching: 0, stitchingMaterial: 0, packaging: 0, travel: 0, other: 0 });
  const inventoryMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
  const newProductionItem = () => ({ key: `batch-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, productId: "", quantity: "", newProductName: "", newProductPrice: "", newProductCategory: "Kurtis", newProductImage: "", directCostBreakdown: emptyProductionCosts() });
  const [tab, setTab] = useState("Stock");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogProductId, setDialogProductId] = useState("");
  const [productionOpen, setProductionOpen] = useState(false);
  const [productionSaving, setProductionSaving] = useState(false);
  // Kept for the legacy dialog markup below; multi-product batches use productionItems.
  const [productionProductId, setProductionProductId] = useState("");
  const [productionItems, setProductionItems] = useState(() => [newProductionItem()]);
  const [productionBatches, setProductionBatches] = useState([]);
  const [productionBatchesLoading, setProductionBatchesLoading] = useState(true);
  const [voidingBatchId, setVoidingBatchId] = useState("");
  const [voidBatch, setVoidBatch] = useState(null);
  const [voidConfirmation, setVoidConfirmation] = useState("");
  const [batchCostBatch, setBatchCostBatch] = useState(null);
  const [batchCostSaving, setBatchCostSaving] = useState(false);
  const [inventoryView, setInventoryView] = useState(initialView === "low-stock" ? "Low stock" : "All");
  const [inventorySearch, setInventorySearch] = useState("");
  const [localHistory, setLocalHistory] = useState([]);
  const [sourceSearch, setSourceSearch] = useState("");
  const [resourcesSaving, setResourcesSaving] = useState(false);
  const [profitProjectionView, setProfitProjectionView] = useState("product");
  const [expectedItemsPerOrder, setExpectedItemsPerOrder] = useState("");
  const [projectionTransactions, setProjectionTransactions] = useState([]);
  const [projectionPostex, setProjectionPostex] = useState({ setupAvailable: false, payments: [], batches: [], items: [], summary: {} });
  const [projectionFinanceLoaded, setProjectionFinanceLoaded] = useState(false);
  const [projectionFinanceAvailable, setProjectionFinanceAvailable] = useState(false);
  const [inventorySources, setInventorySources] = useState([
    { id: "stitching-main", name: "Main stitching unit", type: "Stitching unit", contact: "", location: "Pakistan", notes: "Primary production source", status: "Active" },
    { id: "materials-general", name: "General trims supplier", type: "Material supplier", contact: "", location: "Pakistan", notes: "Buttons, laces and finishing items", status: "Active" },
  ]);
  const [materials, setMaterials] = useState([
    { id: "buttons", item: "Buttons", category: "Buttons", sourceId: "materials-general", quantity: 0, unit: "pcs", unitCost: 0, reorderAt: 50, notes: "", status: "Tracked" },
    { id: "laces", item: "Laces", category: "Laces", sourceId: "materials-general", quantity: 0, unit: "meters", unitCost: 0, reorderAt: 20, notes: "", status: "Tracked" },
  ]);

  useEffect(() => {
    if (initialView !== "returns-inspection") return;
    const timer = window.setTimeout(() => document.getElementById("returned-order-inspection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => window.clearTimeout(timer);
  }, [initialView]);

  async function saveProductionBatch(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sharedCostBreakdown = Object.fromEntries(["fabric", "stitching", "stitchingMaterial", "packaging", "travel", "other"].map((key) => [key, Number(form.get(`shared-${key}`) || 0)]));
    setProductionSaving(true);
    try {
      await onCreateProductionBatch({ items: productionItems.map(({ key, ...item }) => ({ ...item, quantity: Number(item.quantity || 0), directCostBreakdown: Object.fromEntries(Object.entries(item.directCostBreakdown).map(([name, value]) => [name, Number(value || 0)])) })), sharedCostBreakdown, date: form.get("date"), note: form.get("note") });
      await loadProductionBatches();
      setProductionOpen(false);
      setProductionItems([newProductionItem()]);
    } catch (error) { window.alert(error.message || "Unable to save production batch."); } finally { setProductionSaving(false); }
  }

  function updateProductionItem(key, patch) {
    setProductionItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  function updateProductionItemCost(key, costKey, value) {
    setProductionItems((current) => current.map((item) => item.key === key ? { ...item, directCostBreakdown: { ...item.directCostBreakdown, [costKey]: value } } : item));
  }

  async function loadProductionBatches() {
    setProductionBatchesLoading(true);
    try {
      const response = await fetch("/api/admin/production-batches", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load production batches.");
      setProductionBatches(result.batches || []);
    } catch (error) {
      setProductionBatches([]);
    } finally {
      setProductionBatchesLoading(false);
    }
  }

  function requestVoidBatch(batch) {
    setVoidBatch(batch);
    setVoidConfirmation("");
  }

  function closeVoidBatch() {
    if (voidingBatchId) return;
    setVoidBatch(null);
    setVoidConfirmation("");
  }

  async function voidProductionBatch(event) {
    if (event?.id) {
      if (currentAdminUser?.role !== "Owner") {
        window.alert("Only an Owner can void a production batch.");
        return;
      }
      requestVoidBatch(event);
      return;
    }
    event.preventDefault();
    const batch = voidBatch;
    if (!batch || voidConfirmation.trim() !== `VOID ${batch.id}`) return;
    setVoidingBatchId(batch.id);
    try {
      const response = await fetch("/api/admin/production-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "void", batchId: batch.id, confirmation: voidConfirmation.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to void production batch.");
      setProductionBatches(result.batches || []);
      setVoidBatch(null);
      setVoidConfirmation("");
      window.alert("Production batch voided. Its Finance production expense has been removed.");
    } catch (error) {
      window.alert(error.message || "Unable to void production batch.");
    } finally {
      setVoidingBatchId("");
    }
  }

  async function addProductionBatchCost(event) {
    event.preventDefault();
    if (!batchCostBatch) return;
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount") || 0);
    if (!amount) return;
    setBatchCostSaving(true);
    try {
      const response = await fetch("/api/admin/production-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_cost", batchId: batchCostBatch.id, entryId: `batch-cost-${Date.now()}`, costKey: form.get("costKey"), amount, date: form.get("date"), counterparty: form.get("counterparty"), reference: form.get("reference"), note: form.get("note") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to add production cost.");
      setProductionBatches(result.batches || []);
      setBatchCostBatch(null);
    } catch (error) {
      window.alert(error.message || "Unable to add production cost.");
    } finally {
      setBatchCostSaving(false);
    }
  }

  useEffect(() => { loadProductionBatches(); }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/inventory-projection", { cache: "no-store" })
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!ok) throw new Error(result.error || "Unable to load finance assumptions.");
        if (active) {
          setProjectionTransactions(result.transactions || []);
          setProjectionPostex(result.postex || { setupAvailable: false, payments: [], batches: [], items: [], summary: {} });
          setProjectionFinanceAvailable(true);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setProjectionFinanceLoaded(true); });
    return () => { active = false; };
  }, []);

  async function saveInventoryResources(nextSources, nextMaterials) {
    setInventorySources(nextSources);
    setMaterials(nextMaterials);
    setResourcesSaving(true);
    try {
      const response = await fetch("/api/admin/inventory-resources", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sources: nextSources, materials: nextMaterials }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save sources and materials.");
      setInventorySources(result.sources || nextSources);
      setMaterials(result.materials || nextMaterials);
      localStorage.removeItem("bustaniya-inventory-sources");
    } catch (error) {
      window.alert(error.message || "Unable to save sources and materials.");
    } finally { setResourcesSaving(false); }
  }

  useEffect(() => {
    let active = true;
    const localFallback = (() => { try { return JSON.parse(localStorage.getItem("bustaniya-inventory-sources") || "{}"); } catch { return {}; } })();
    fetch("/api/admin/inventory-resources", { cache: "no-store" })
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!ok) throw new Error(result.error || "Unable to load sources and materials.");
        const remoteSources = result.sources || [];
        const remoteMaterials = result.materials || [];
        const fallbackSources = Array.isArray(localFallback.sources) ? localFallback.sources : [];
        const fallbackMaterials = Array.isArray(localFallback.materials) ? localFallback.materials : [];
        if (!active) return;
        if (remoteSources.length || remoteMaterials.length) {
          setInventorySources(remoteSources);
          setMaterials(remoteMaterials);
          localStorage.removeItem("bustaniya-inventory-sources");
        } else {
          // One-time migration for records created before Supabase persistence.
          saveInventoryResources(
            fallbackSources.length ? fallbackSources : inventorySources,
            fallbackMaterials.length ? fallbackMaterials : materials,
          );
        }
      })
      .catch(() => {})
    return () => { active = false; };
  }, []);

  const history = useMemo(() => {
    const remoteHistory = (movements || []).map((entry) => {
      const product = products.find((item) => String(item.id) === String(entry.product_id));
      return {
        id: entry.id,
        product: product?.name || entry.product_id,
        change: Number(entry.quantity_change || 0),
        reason: entry.reason || "Stock count correction",
        date: entry.created_at ? new Date(entry.created_at).toLocaleString("en-PK") : "",
        user: "Admin",
      };
    });
    return [...localHistory, ...remoteHistory];
  }, [localHistory, movements, products]);

  const total = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const out = products.filter((product) => Number(product.stock || 0) === 0).length;
  const low = products.filter((product) => {
    const stock = Number(product.stock || 0);
    return stock > 0 && stock <= Number(product.lowStockThreshold || 5);
  }).length;
  const value = products.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);
  const stockCostValue = products.reduce((sum, product) => sum + Number(product.costTotalPkr || 0) * Number(product.stock || 0), 0);
  const stockSalesTax = Math.round(value * 0.05);
  const potentialStockProfit = value - stockCostValue - stockSalesTax;
  const historicalOrders = connected ? (orders || []) : [];
  const deliveredHistoricalOrders = historicalOrders.filter(isDeliveredOrder);
  const returnedHistoricalOrders = historicalOrders.filter(isReturnedOrder);
  const historicalSoldUnits = deliveredHistoricalOrders.reduce((sum, order) => sum + normalizeOrderItems(order.raw || order)
    .reduce((itemTotal, item) => itemTotal + Number(item.quantity || 0), 0), 0);
  const cogsSold = deliveredHistoricalOrders.reduce((sum, order) => sum + normalizeOrderItems(order.raw || order).reduce((itemsTotal, item) => {
    const product = products.find((entry) => String(entry.id) === String(item.productId));
    return itemsTotal + Number(item.quantity || 0) * Number(product?.costTotalPkr || 0);
  }, 0), 0);
  const stockPurchaseCash = projectionTransactions.filter((entry) => entry.type === "business_expense" && (entry.productionBatchId || entry.category === "Inventory production" || String(entry.title || "").startsWith("Production batch "))).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const restockCashRequired = products.reduce((sum, product) => {
    const target = Math.max(Number(product.lowStockThreshold || 5) * 2, 10);
    return sum + Math.max(0, target - Number(product.stock || 0)) * Number(product.costTotalPkr || 0);
  }, 0);
  const healthyStockCount = products.filter((product) => Number(product.stock || 0) > Number(product.lowStockThreshold || 5)).length;
  const inventoryStockVisual = [
    { label: "Healthy", value: healthyStockCount, color: "#1d6840" },
    { label: "Low", value: low, color: "#d08a18" },
    { label: "Out", value: out, color: "#b73543" },
  ].filter((item) => item.value > 0);
  const inventoryValueVisual = [
    { label: "Stock cost value", value: stockCostValue, color: "#1d6840" },
    { label: "COGS sold", value: cogsSold, color: "#4777a8" },
    { label: "Stock purchase cash", value: stockPurchaseCash, color: "#c78b2b" },
    { label: "Restock cash required", value: restockCashRequired, color: "#b73543" },
  ].filter((item) => item.value > 0);
  const skuProfitRows = products.map((product) => {
    const soldItems = deliveredHistoricalOrders.flatMap((order) => normalizeOrderItems(order.raw || order)).filter((item) => String(item.productId) === String(product.id));
    const unitsSold = soldItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const sales = soldItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || product.price || 0), 0);
    const cost = unitsSold * Number(product.costTotalPkr || 0);
    const margin = sales ? Math.round(((sales - cost - Math.round(sales * .05)) / sales) * 100) : 0;
    return { product, unitsSold, sales, cost, margin };
  }).filter((row) => row.unitsSold > 0).sort((a, b) => b.sales - a.sales);
  const stockAgeRows = products.map((product) => {
    const receipts = (movements || []).filter((movement) => String(movement.product_id) === String(product.id) && Number(movement.quantity_change || 0) > 0 && movement.created_at).map((movement) => new Date(movement.created_at)).filter((date) => !Number.isNaN(date.getTime()));
    const oldestReceipt = receipts.length ? new Date(Math.min(...receipts.map((date) => date.getTime()))) : null;
    const days = oldestReceipt ? Math.max(0, Math.floor((Date.now() - oldestReceipt.getTime()) / 86400000)) : null;
    return { product, days };
  }).filter((row) => Number(row.product.stock || 0) > 0);
  const stockAgeCounts = { fresh: stockAgeRows.filter((row) => row.days !== null && row.days <= 30).length, normal: stockAgeRows.filter((row) => row.days > 30 && row.days <= 60).length, slow: stockAgeRows.filter((row) => row.days > 60 && row.days <= 90).length, dead: stockAgeRows.filter((row) => row.days > 90).length, legacy: stockAgeRows.filter((row) => row.days === null).length };
  const historicalItemsPerOrder = deliveredHistoricalOrders.length ? historicalSoldUnits / deliveredHistoricalOrders.length : 1;
  const projectionItemsPerOrder = Math.max(1, Number(expectedItemsPerOrder || historicalItemsPerOrder || 1));
  const projectedOrderCount = total ? Math.ceil(total / projectionItemsPerOrder) : 0;
  const historicalFulfilledOrderCount = deliveredHistoricalOrders.length + returnedHistoricalOrders.length;
  const returnRate = historicalFulfilledOrderCount ? returnedHistoricalOrders.length / historicalFulfilledOrderCount : 0;
  const projectionPostexSummary = postexCalculatedSummary(projectionPostex || {});
  const historicalReturnCourierLoss = Math.round(Number(projectionPostexSummary.returnedPostexLossPkr || 0));
  const estimatedReturnLossPerReturn = returnedHistoricalOrders.length && historicalReturnCourierLoss
    ? Math.round(historicalReturnCourierLoss / returnedHistoricalOrders.length)
    : 200;
  const projectedReturnCourierLoss = Math.round(projectedOrderCount * returnRate * estimatedReturnLossPerReturn);
  const marketingSpend = projectionTransactions
    .filter((entry) => entry.type === "business_expense" && String(entry.category || "").toLowerCase() === "marketing")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const projectedMarketingCost = historicalSoldUnits ? Math.round((marketingSpend / historicalSoldUnits) * total) : 0;
  const allCostsProjectedProfit = potentialStockProfit - projectedReturnCourierLoss - projectedMarketingCost;
  const displayedStockProfit = profitProjectionView === "all" ? allCostsProjectedProfit : potentialStockProfit;
  const materialValue = materials.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);
  const lowMaterialCount = materials.filter((item) => Number(item.quantity || 0) <= Number(item.reorderAt || 0)).length;

  const visibleInventoryRows = products.filter((product) => {
    const stock = Number(product.stock || 0);
    const threshold = Number(product.lowStockThreshold || 5);
    const query = inventorySearch.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      String(product.sku || product.articleNumber || "").toLowerCase().includes(query);
    const matchesView =
      inventoryView === "All" ||
      (inventoryView === "Low stock" && stock > 0 && stock <= threshold) ||
      (inventoryView === "Out of stock" && stock === 0);
    return matchesSearch && matchesView;
  });

  const filteredSources = inventorySources.filter((source) => {
    const query = sourceSearch.toLowerCase();
    return [source.name, source.type, source.contact, source.location, source.notes]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  const filteredMaterials = materials.filter((item) => {
    const source = inventorySources.find((entry) => entry.id === item.sourceId);
    const query = sourceSearch.toLowerCase();
    return [item.item, item.category, item.unit, item.notes, source?.name]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  function inventoryStatus(product) {
    const stock = Number(product.stock || 0);
    if (stock === 0) return { label: "Out of stock", className: "cancelled" };
    if (stock <= Number(product.lowStockThreshold || 5)) return { label: "Low stock", className: "processing" };
    return { label: "In stock", className: "delivered" };
  }

  function openAdjust(productId = "") {
    setDialogProductId(productId || products[0]?.id || "__custom__");
    setDialogOpen(true);
  }

  async function adjustStock(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = data.get("product");
    const amount = Number(data.get("amount"));
    const reason = data.get("reason");

    if (!Number.isFinite(amount) || amount === 0) {
      window.alert("Please enter a non-zero quantity, for example +10 or -2.");
      return;
    }

    if (id === "__custom__") {
      const name = String(data.get("customName") || "").trim();
      const sku = String(data.get("customSku") || "").trim() || `CUSTOM-${Date.now().toString().slice(-5)}`;
      if (!name) {
        window.alert("Please enter a product name.");
        return;
      }
      if (amount < 0) {
        window.alert("Opening stock cannot be negative.");
        return;
      }
      try {
        await onCreateCustomInventory({ name, sku, stock: amount });
        setLocalHistory((current) => [{
          id: `local-${Date.now()}`,
          product: name,
          change: amount,
          reason: "New product",
          date: new Date().toLocaleString("en-PK"),
          user: "Admin",
        }, ...current]);
        setDialogOpen(false);
        setTab("Stock");
      } catch (error) {
        window.alert(error.message || "Unable to add product.");
      }
      return;
    }

    const product = products.find((item) => String(item.id) === String(id));
    if (!product) {
      window.alert("Please select a valid product.");
      return;
    }

    try {
      await onAdjust(id, amount, reason);
      setLocalHistory((current) => [{
        id: `local-${Date.now()}`,
        product: product.name,
        change: amount,
        reason,
        date: new Date().toLocaleString("en-PK"),
        user: "Admin",
      }, ...current]);
      setDialogOpen(false);
      setTab("Stock");
    } catch (error) {
      window.alert(error.message || "Unable to adjust inventory.");
    }
  }

  function addInventorySource(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const nextSources = [{
      id: `source-${Date.now()}`,
      name,
      type: data.get("type") || "Material supplier",
      contact: data.get("contact") || "",
      location: data.get("location") || "",
      notes: data.get("notes") || "",
      status: data.get("status") || "Active",
    }, ...inventorySources];
    saveInventoryResources(nextSources, materials);
    event.currentTarget.reset();
  }

  function addMaterial(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const item = String(data.get("item") || "").trim();
    if (!item) return;
    const nextMaterials = [{
      id: `material-${Date.now()}`,
      item,
      category: data.get("category") || "Other material",
      sourceId: data.get("sourceId") || inventorySources[0]?.id || "",
      quantity: Number(data.get("quantity") || 0),
      unit: data.get("unit") || "pcs",
      unitCost: Number(data.get("unitCost") || 0),
      reorderAt: Number(data.get("reorderAt") || 0),
      notes: data.get("notes") || "",
      status: "Tracked",
    }, ...materials];
    saveInventoryResources(inventorySources, nextMaterials);
    event.currentTarget.reset();
  }

  function updateMaterialQuantity(materialId, change) {
    const nextMaterials = materials.map((item) =>
      item.id === materialId
        ? { ...item, quantity: Math.max(0, Number(item.quantity || 0) + change) }
        : item
    );
    saveInventoryResources(inventorySources, nextMaterials);
  }

  if (productionOpen) {
    return <div className="inventorySystem"><div className="adminOverlay" onClick={() => setProductionOpen(false)} /><form className="inventoryDialog" onSubmit={saveProductionBatch}>
      <DialogHead title="Create multi-product production batch" onClose={() => setProductionOpen(false)} />
      <p className="trackingNumber">Add every design in this production run. Shared costs are divided by total finished-suit quantity; direct costs remain with their selected design.</p>
      {productionItems.map((item, index) => <section className="adminCard" style={{ padding: "14px", marginBottom: "12px" }} key={item.key}>
        <div className="editorHeading"><p className="fieldTitle">Design {index + 1}</p>{productionItems.length > 1 && <button type="button" className="removeProductButton" onClick={() => setProductionItems((current) => current.filter((entry) => entry.key !== item.key))}>Remove</button>}</div>
        <label>Design / product<select required value={item.productId} onChange={(event) => updateProductionItem(item.key, { productId: event.target.value })}><option value="">Select product</option><option value="__new__">+ Create new product/design</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        {item.productId === "__new__" && <><label>Product / design name<input required value={item.newProductName} onChange={(event) => updateProductionItem(item.key, { newProductName: event.target.value })} placeholder="e.g. Blue Arora – Design 4" /></label><div className="formRow"><label>Selling price<input type="number" min="0" required value={item.newProductPrice} onChange={(event) => updateProductionItem(item.key, { newProductPrice: event.target.value })} placeholder="0" /></label><label>Category<input value={item.newProductCategory} onChange={(event) => updateProductionItem(item.key, { newProductCategory: event.target.value })} placeholder="Kurtis" /></label></div><label>Image URL (optional)<input value={item.newProductImage} onChange={(event) => updateProductionItem(item.key, { newProductImage: event.target.value })} placeholder="https://..." /></label></>}
        <label>Finished suits for this design<input type="number" min="1" required value={item.quantity} onChange={(event) => updateProductionItem(item.key, { quantity: event.target.value })} placeholder="25" /></label>
        <p className="fieldTitle">Direct costs for this design (PKR)</p>
        <div className="formRow"><label>Fabric<input type="number" min="0" value={item.directCostBreakdown.fabric || ""} onChange={(event) => updateProductionItemCost(item.key, "fabric", event.target.value)} /></label><label>Stitching<input type="number" min="0" value={item.directCostBreakdown.stitching || ""} onChange={(event) => updateProductionItemCost(item.key, "stitching", event.target.value)} /></label></div>
        <div className="formRow"><label>Stitching material<input type="number" min="0" value={item.directCostBreakdown.stitchingMaterial || ""} onChange={(event) => updateProductionItemCost(item.key, "stitchingMaterial", event.target.value)} /></label><label>Packaging<input type="number" min="0" value={item.directCostBreakdown.packaging || ""} onChange={(event) => updateProductionItemCost(item.key, "packaging", event.target.value)} /></label></div>
        <div className="formRow"><label>Travel / transport<input type="number" min="0" value={item.directCostBreakdown.travel || ""} onChange={(event) => updateProductionItemCost(item.key, "travel", event.target.value)} /></label><label>Other<input type="number" min="0" value={item.directCostBreakdown.other || ""} onChange={(event) => updateProductionItemCost(item.key, "other", event.target.value)} /></label></div>
      </section>)}
      <button type="button" onClick={() => setProductionItems((current) => [...current, newProductionItem()])}><Plus /> Add another design</button>
      <section className="adminCard" style={{ padding: "14px", marginTop: "12px" }}><p className="fieldTitle">Shared costs for all designs (PKR)</p><p className="trackingNumber">These costs are divided across every suit by quantity.</p><div className="formRow"><label>Shared fabric<input name="shared-fabric" type="number" min="0" defaultValue="0" /></label><label>Shared stitching<input name="shared-stitching" type="number" min="0" defaultValue="0" /></label></div><div className="formRow"><label>Shared stitching material<input name="shared-stitchingMaterial" type="number" min="0" defaultValue="0" /></label><label>Shared packaging<input name="shared-packaging" type="number" min="0" defaultValue="0" /></label></div><div className="formRow"><label>Shared travel / transport<input name="shared-travel" type="number" min="0" defaultValue="0" /></label><label>Shared other<input name="shared-other" type="number" min="0" defaultValue="0" /></label></div></section>
      <label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></label><label>Batch note<textarea name="note" rows="2" placeholder="Supplier, stitching unit or batch reference" /></label><button className="dialogSave" disabled={productionSaving}>{productionSaving ? "Saving batch..." : "Save batch, allocate costs & add stock"}</button>
    </form></div>;
  }

  return <div className="inventorySystem">
    <div className="adminTitle"><div><p>OPERATIONS</p><h1>Inventory</h1><span>Track finished products, stitching units, suppliers and materials like buttons, laces and trims.</span></div><button onClick={() => tab === "Sources" ? setTab("Sources") : openAdjust()}><Plus /> {tab === "Sources" ? "Add source below" : "Adjust stock"}</button></div>
    <div className="miniMetricGrid">
      <article><Boxes /><span><b>{total}</b>Available units</span></article>
      <article><WalletCards /><span><b>{inventoryMoney(stockCostValue)}</b>Stock value on hand</span></article>
      <article><CircleDollarSign /><span><b>{inventoryMoney(cogsSold)}</b>COGS sold</span></article>
      <article><Landmark /><span><b>{inventoryMoney(stockPurchaseCash)}</b>Stock purchase cash</span></article>
      <article className={restockCashRequired ? "alertMetric" : ""}><TrendingUp /><span><b>{inventoryMoney(restockCashRequired)}</b>Restock cash required</span></article>
      <article className={low ? "alertMetric" : ""}><TrendingUp /><span><b>{low}</b>Low stock</span></article>
      <article><Store /><span><b>{inventorySources.length}</b>Sources</span></article>
      <article><WalletCards /><span><b>Rs. {stockCostValue.toLocaleString()}</b>Stock cost value</span></article>
      <article><TrendingUp /><span><b>Rs. {value.toLocaleString()}</b>Potential sales value</span></article>
      <article className={displayedStockProfit < 0 ? "alertMetric" : ""}><CircleDollarSign /><span><b>Rs. {displayedStockProfit.toLocaleString()}</b>{profitProjectionView === "all" ? "All-cost projected profit" : "Product-only stock profit"}</span></article>
      <article className={lowMaterialCount ? "alertMetric" : ""}><Tags /><span><b>Rs. {materialValue.toLocaleString()}</b>Material value</span></article>
    </div>
    <div className="adminVisualGrid">
      <VisualDonut title="Stock health" subtitle="Healthy, low and out-of-stock product split at a glance." centerValue={products.filter(p => Number(p.stock || 0) > Number(p.lowStockThreshold || 5)).length} centerLabel="healthy" items={inventoryStockVisual} />
      <VisualBars title="Capital allocation" subtitle="Stock value on hand, COGS sold, purchase cost and restock investment needed." format={(value) => inventoryMoney(value)} items={inventoryValueVisual} />
    </div>

    {low + out > 0 && <div className="inventoryAlert"><Bell /><div><b>{low + out} products need attention</b><span>Out-of-stock products cannot be ordered, and low stock is highlighted here.</span></div><button onClick={() => setInventoryView(low ? "Low stock" : "Out of stock")}>Review items</button></div>}
    {returnedHistoricalOrders.length > 0 && <section id="returned-order-inspection" className="adminCard managementCard inventoryLedger"><div className="inventoryListHead"><div><h2>Returned-order inspection queue</h2><span>Inspect the physical parcel, then confirm stock restoration from its order workflow.</span></div><b>{returnedHistoricalOrders.length} pending</b></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Finance impact</th><th>Required action</th></tr></thead><tbody>{returnedHistoricalOrders.slice(0, 10).map((order) => <tr key={order.id}><td><b>{order.id}</b></td><td>{order.customer || "—"}</td><td>{normalizeOrderItems(order.raw || order).map((item) => `${item.name} × ${item.quantity}`).join(", ")}</td><td className="expenseAmount">Actual PostEx loss</td><td><button type="button" onClick={() => onOpenOrder?.(order)}>Inspect &amp; restore stock</button></td></tr>)}</tbody></table></div><p className="trackingNumber">Finance deducts the actual PostEx return, shipping, GST and tax loss from synced CPR/payment data. After inspection, select <b>Return received</b> and confirm the stock restoration once; the system records a movement and prevents a second restore.</p></section>}
    {lowMaterialCount > 0 && <div className="inventoryAlert materialAlert"><Bell /><div><b>{lowMaterialCount} material items need reorder review</b><span>Buttons, laces, trims and other raw materials are tracked separately from finished product stock.</span></div><button onClick={() => setTab("Sources")}>Review materials</button></div>}

    <section className="adminCard managementCard inventoryLedger">
      <div className="inventoryListHead"><div><h2>Inventory profit projection</h2><span>Estimate only — actual profit remains in Finance after orders are delivered.</span></div></div>
      <div className="inventoryViewBar"><button type="button" className={profitProjectionView === "product" ? "active" : ""} onClick={() => setProfitProjectionView("product")}>Product-only</button><button type="button" className={profitProjectionView === "all" ? "active" : ""} onClick={() => setProfitProjectionView("all")}>All costs included</button><HelpHint text="Estimated stock profit after expected return-courier loss and saved marketing spend. Actual profit remains in Finance." /></div>
      {profitProjectionView === "product" ? <div className="inventoryAlert materialAlert"><CircleDollarSign /><div><b>Product-only stock profit: Rs. {potentialStockProfit.toLocaleString()}</b><span>Potential sales minus saved per-item product cost and synced PostEx GST/4% deduction estimate where available. Delivery, returns and marketing stay in the all-cost estimate.</span></div></div> : <><div className="financeControls"><label>Expected items per order<input type="number" min="1" step="0.1" value={expectedItemsPerOrder || historicalItemsPerOrder.toFixed(1)} onChange={(event) => setExpectedItemsPerOrder(event.target.value)} /></label><label>Projected orders<input readOnly value={projectedOrderCount} /></label><label>Historical return rate<input readOnly value={`${Math.round(returnRate * 100)}%`} /></label></div><div className="financeStatement"><div><span>Product-only stock profit</span><b>{inventoryMoney(potentialStockProfit)}</b></div><div><span>Customer delivery fee collected</span><b>Rs. 200 / order</b></div><div><span>Expected returned-order PostEx loss</span><b>- {inventoryMoney(projectedReturnCourierLoss)}</b></div><div><span>Actual marketing spend allocated per sold item</span><b>- {inventoryMoney(projectedMarketingCost)}</b></div><div className="statementTotal"><span>All-cost projected inventory profit</span><b>{inventoryMoney(allCostsProjectedProfit)}</b></div></div><p className="trackingNumber">{!projectionFinanceLoaded ? "Loading Finance-linked assumptions..." : projectionFinanceAvailable ? "Marketing uses saved Cashbook entries in the Marketing category. Return loss uses actual synced PostEx history when available; change expected items per order if needed." : "Finance marketing data is unavailable for this account, so marketing is shown as Rs. 0. Product-only calculation remains accurate."}</p></>}
    </section>

    <section className="financeGrid financeGridWide">
      <div className="adminCard managementCard"><div className="inventoryListHead"><div><h2>SKU profitability</h2><span>Delivered sales less saved unit cost and synced PostEx GST/4% deduction estimate. Finance remains the final source of truth.</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Product / SKU</th><th>Units sold</th><th>Sales</th><th>COGS</th><th>Net margin</th></tr></thead><tbody>{skuProfitRows.slice(0, 12).map((row) => <tr key={row.product.id}><td><b>{row.product.name}</b><br /><small>{row.product.sku || row.product.articleNumber || "—"}</small></td><td>{row.unitsSold}</td><td>Rs. {row.sales.toLocaleString()}</td><td>Rs. {row.cost.toLocaleString()}</td><td className={row.margin < 15 ? "expenseAmount" : "incomeAmount"}>{row.margin}%</td></tr>)}{!skuProfitRows.length && <tr><td colSpan="5" className="emptyFinanceCell">No delivered SKU sales yet.</td></tr>}</tbody></table></div></div>
      <div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Stock ageing</h2><p>Based on the oldest dated positive inventory receipt. Legacy stock without receipt date is kept separate.</p></div></div><div className="financeStatement"><div><span>Fresh stock (0–30 days)</span><b>{stockAgeCounts.fresh}</b></div><div><span>Normal stock (31–60 days)</span><b>{stockAgeCounts.normal}</b></div><div><span>Slow-moving (61–90 days)</span><b>{stockAgeCounts.slow}</b></div><div><span>Legacy stock — no dated receipt</span><b>{stockAgeCounts.legacy}</b></div><div className="statementTotal"><span>Dead-stock risk (90+ days)</span><b>{stockAgeCounts.dead}</b></div></div></div>
    </section>

    <div className="inventoryTabs">
      {["Stock","Sources","History"].map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "Sources" ? "Sources & Materials" : item}</button>)}
    </div>

    {tab === "Stock" && <section className="adminCard managementCard inventoryLedger">
      <div className="inventoryViewBar">
        {["All","Low stock","Out of stock"].map(item => <button type="button" key={item} className={inventoryView === item ? "active" : ""} onClick={() => setInventoryView(item)}>{item}</button>)}
      </div>
      <div className="inventoryControlBar simpleInventoryControls">
        <div className="inlineSearch"><Search /><input value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Search products or SKU..." /></div>
        <button type="button" onClick={() => setProductionOpen(true)}><Plus /> Create production batch</button>
        <button type="button" onClick={() => openAdjust("__custom__")}><Plus /> Add product with stock</button>
      </div>
      <div className="adminTableWrap"><table className="adminTable inventoryTable simpleInventoryTable"><thead><tr><th>Product</th><th>SKU</th><th>Available</th><th>Threshold</th><th>Retail value</th><th>Status</th><th /></tr></thead><tbody>{visibleInventoryRows.map(product => { const status = inventoryStatus(product); return <tr key={product.id}><td><div className="tableProduct"><span style={{backgroundImage:`url(${product.image})`}}/><b>{product.name}</b></div></td><td>{product.sku || product.articleNumber || `BST-${String(product.id).padStart(4,"0")}`}</td><td><b className={Number(product.stock || 0) <= Number(product.lowStockThreshold || 5) ? "stockLow" : ""}>{Number(product.stock || 0)}</b></td><td>{Number(product.lowStockThreshold || 5)}</td><td>Rs. {(Number(product.price || 0) * Number(product.stock || 0)).toLocaleString()}</td><td><span className={`statusBadge ${status.className}`}>{status.label}</span></td><td><button className="adjustStockButton" onClick={() => openAdjust(product.id)}>Adjust</button></td></tr>})}</tbody></table>{!visibleInventoryRows.length&&<div className="inventoryEmpty">No products match this view.</div>}</div>
    </section>}

    {tab === "Stock" && <section className="adminCard managementCard inventoryLedger">
      <div className="editorHeading"><div><h2>Production batches</h2><p>Start a batch with the costs you know today, then add stitching, lace, packing or travel later. Every new cost updates the same batch and its per-suit cost once.</p></div></div>
      <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Batch</th><th>Product</th><th>Quantity</th><th>Total cost</th><th>Unit cost</th><th>Date</th><th>Status</th><th /></tr></thead><tbody>
        {productionBatches.map((batch) => <tr key={batch.id}><td><b>{batch.id}</b><small className="trackingNumber"><br />{Array.isArray(batch.costEntries) ? batch.costEntries.length : 0} cost entries</small></td><td>{batch.productName}</td><td>{Number(batch.quantity || 0).toLocaleString()}</td><td>Rs. {Number(batch.totalCost || 0).toLocaleString()}</td><td>Rs. {Number(batch.unitCost || 0).toLocaleString()}</td><td>{batch.date || "—"}</td><td><span className={`statusBadge ${batch.status === "voided" ? "cancelled" : "delivered"}`}>{batch.status === "voided" ? "Voided" : "Active"}</span></td><td>{batch.status !== "voided" && <div className="tableActionButtons"><button className="editProductButton" type="button" onClick={() => setBatchCostBatch(batch)}>Add cost</button><button className="removeProductButton" type="button" disabled={voidingBatchId === batch.id} onClick={() => voidProductionBatch(batch)}>{voidingBatchId === batch.id ? "Voiding..." : "Void test batch"}</button></div>}</td></tr>)}
        {!productionBatchesLoading && !productionBatches.length && <tr><td colSpan="8"><div className="inventoryEmpty">No production batches yet.</div></td></tr>}
        {productionBatchesLoading && <tr><td colSpan="8"><div className="inventoryEmpty">Loading production batches...</div></td></tr>}
      </tbody></table></div>
    </section>}

    {tab === "Sources" && <InventorySourcesPanel
      sources={filteredSources}
      allSources={inventorySources}
      materials={filteredMaterials}
      sourceSearch={sourceSearch}
      setSourceSearch={setSourceSearch}
      onAddSource={addInventorySource}
      onAddMaterial={addMaterial}
      onUpdateMaterialQuantity={updateMaterialQuantity}
      saving={resourcesSaving}
    />}

    {tab === "History" && <InventoryList title="Stock adjustment history" headers={["Product","Change","Reason","Date","User"]} rows={history.map(x => [x.product, x.change > 0 ? `+${x.change}` : x.change, x.reason, x.date, x.user])} empty="No stock adjustments yet." />}

    {dialogOpen && <InventoryDialog products={products} productChoice={dialogProductId} setProductChoice={setDialogProductId} onClose={() => setDialogOpen(false)} onAdjust={adjustStock} />}
    {voidBatch && <><div className="adminOverlay" onClick={closeVoidBatch} /><form className="inventoryDialog" onSubmit={voidProductionBatch}>
      <DialogHead title={`Void ${voidBatch.id}`} onClose={closeVoidBatch} />
      <p className="trackingNumber">Owner-only action. It reverses the batch stock, removes its linked Finance production expense and keeps a voided audit record. Do not void a batch that has customer orders.</p>
      <label>Type <b>{`VOID ${voidBatch.id}`}</b> exactly to confirm<input value={voidConfirmation} onChange={(event) => setVoidConfirmation(event.target.value)} autoComplete="off" autoFocus /></label>
      <button className="removeProductButton" type="submit" disabled={voidingBatchId === voidBatch.id || voidConfirmation.trim() !== `VOID ${voidBatch.id}`}>{voidingBatchId === voidBatch.id ? "Voiding batch..." : "Void batch permanently"}</button>
    </form></>}
    {batchCostBatch && <><div className="adminOverlay" onClick={() => !batchCostSaving && setBatchCostBatch(null)} /><form className="inventoryDialog" onSubmit={addProductionBatchCost}>
      <DialogHead title={`Add cost to ${batchCostBatch.id}`} onClose={() => !batchCostSaving && setBatchCostBatch(null)} />
      <p className="trackingNumber">Batch: {batchCostBatch.productName} · {Number(batchCostBatch.quantity || 0)} suits. Yeh amount isi batch ke total aur per-suit cost mein add hogi; Finance Cashbook mein bhi ek hi linked entry banegi.</p>
      <div className="formRow"><label>Cost type<select name="costKey" defaultValue="stitching"><option value="fabric">Fabric</option><option value="stitching">Stitching / tailor</option><option value="stitchingMaterial">Lace / embellishment</option><option value="packaging">Packaging</option><option value="travel">Travel / transport</option><option value="other">Other production cost</option></select></label><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required autoFocus /></label></div>
      <div className="formRow"><label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></label><label>Tailor / supplier<input name="counterparty" placeholder="e.g. Amina Tailors" /></label></div>
      <button
        type="submit"
        disabled={batchCostSaving}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          cursor: batchCostSaving ? "not-allowed" : "pointer"
        }}
      >
        {batchCostSaving ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Adding cost...</span>
          </>
        ) : (
          "Add to this batch"
        )}
      </button>
    </form></>}
    <ProductionBatchModal isOpen={productionOpen} onClose={() => setProductionOpen(false)} onSubmit={saveProductionBatch} products={products} saving={productionSaving} />
  </div>;
}

function InventorySourcesPanel({
  sources,
  allSources,
  materials,
  sourceSearch,
  setSourceSearch,
  onAddSource,
  onAddMaterial,
  onUpdateMaterialQuantity,
  saving,
}) {
  const sourceName = (sourceId) => allSources.find((source) => source.id === sourceId)?.name || "Unassigned";
  const materialValue = materials.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);

  return <div className="inventorySourcesGrid">
    <section className="adminCard managementCard inventorySourcesMain">
      <div className="inventoryListHead"><div><h2>Sources and units</h2><span>Stitching units, vendors and material suppliers</span></div></div>
      <div className="inventoryControlBar simpleInventoryControls sourceSearchBar">
        <div className="inlineSearch"><Search /><input value={sourceSearch} onChange={(event) => setSourceSearch(event.target.value)} placeholder="Search sources, material, supplier, contact..." /></div>
      </div>
      <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Source</th><th>Type</th><th>Contact</th><th>Location</th><th>Status</th></tr></thead><tbody>
        {sources.map((source) => <tr key={source.id}><td><b>{source.name}</b><small className="trackingNumber">{source.notes || "No notes"}</small></td><td>{source.type}</td><td>{source.contact || "-"}</td><td>{source.location || "-"}</td><td><span className={`statusBadge ${source.status === "Active" ? "activeStatus" : "processing"}`}>{source.status}</span></td></tr>)}
        {!sources.length && <tr><td colSpan="5"><div className="inventoryEmpty">No sources match this search.</div></td></tr>}
      </tbody></table></div>
    </section>

    <form className="adminCard sourceFormCard" onSubmit={onAddSource}>
      <h2>Add source</h2>
      <label>Name<input name="name" required placeholder="e.g. Lahore stitching unit" /></label>
      <div className="formRow"><label>Type<select name="type"><option>Stitching unit</option><option>Fabric supplier</option><option>Material supplier</option><option>Embroidery unit</option><option>Packaging supplier</option><option>Other source</option></select></label><label>Status<select name="status"><option>Active</option><option>Paused</option></select></label></div>
      <div className="formRow"><label>Contact<input name="contact" placeholder="Phone / WhatsApp" /></label><label>Location<input name="location" placeholder="City or area" /></label></div>
      <label>Notes<textarea name="notes" rows="3" placeholder="Capacity, rates, lead time..." /></label>
      <button disabled={saving}>{saving ? "Saving..." : "Add source"}</button>
    </form>

    <section className="adminCard managementCard inventoryMaterialsMain">
      <div className="inventoryListHead"><div><h2>Materials</h2><span>Buttons, laces, fabric, trims and packaging. Value: Rs. {materialValue.toLocaleString()}</span></div></div>
      <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Material</th><th>Category</th><th>Source</th><th>Qty</th><th>Reorder</th><th>Value</th><th /></tr></thead><tbody>
        {materials.map((item) => {
          const low = Number(item.quantity || 0) <= Number(item.reorderAt || 0);
          return <tr key={item.id}><td><b>{item.item}</b><small className="trackingNumber">{item.notes || item.unit}</small></td><td>{item.category}</td><td>{sourceName(item.sourceId)}</td><td><b className={low ? "stockLow" : ""}>{Number(item.quantity || 0).toLocaleString()} {item.unit}</b></td><td>{Number(item.reorderAt || 0).toLocaleString()} {item.unit}</td><td>Rs. {(Number(item.quantity || 0) * Number(item.unitCost || 0)).toLocaleString()}</td><td><div className="materialQtyActions"><button type="button" disabled={saving} aria-busy={saving} onClick={() => onUpdateMaterialQuantity(item.id, -1)}><Minus /></button><button type="button" disabled={saving} aria-busy={saving} onClick={() => onUpdateMaterialQuantity(item.id, 1)}><Plus /></button></div></td></tr>;
        })}
        {!materials.length && <tr><td colSpan="7"><div className="inventoryEmpty">No materials match this search.</div></td></tr>}
      </tbody></table></div>
    </section>

    <form className="adminCard sourceFormCard" onSubmit={onAddMaterial}>
      <h2>Add material</h2>
      <label>Material item<input name="item" required placeholder="e.g. Pearl buttons, cotton lace" /></label>
      <div className="formRow"><label>Category<select name="category"><option>Buttons</option><option>Laces</option><option>Fabric</option><option>Thread</option><option>Embroidery</option><option>Labels</option><option>Packaging</option><option>Other material</option></select></label><label>Source<select name="sourceId">{allSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</select></label></div>
      <div className="formRow"><label>Quantity<input name="quantity" type="number" min="0" step="0.01" defaultValue="0" /></label><label>Unit<select name="unit"><option>pcs</option><option>meters</option><option>yards</option><option>rolls</option><option>kg</option><option>packs</option></select></label></div>
      <div className="formRow"><label>Unit cost<input name="unitCost" type="number" min="0" step="0.01" defaultValue="0" /></label><label>Reorder at<input name="reorderAt" type="number" min="0" step="0.01" defaultValue="0" /></label></div>
      <label>Notes<textarea name="notes" rows="3" placeholder="Color, size, use in product, supplier rate..." /></label>
      <button disabled={saving}>{saving ? "Saving..." : "Add material"}</button>
    </form>
  </div>;
}

function InventoryList({ title, action, onAction, headers, rows, empty }) {
  return <section className="adminCard managementCard"><div className="inventoryListHead"><div><h2>{title}</h2><span>{rows.length} records</span></div>{action&&<button onClick={onAction}><Plus />{action}</button>}</div><div className="adminTableWrap"><table className="adminTable"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{j===0?<b>{cell}</b>:cell}</td>)}</tr>)}</tbody></table>{!rows.length&&<div className="inventoryEmpty">{empty||"No records found."}</div>}</div></section>;
}

function VariantInventoryDrawer({ product, onClose }) {
  const variants = productVariants(product);
  const total = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const low = variants.filter((variant) => Number(variant.stock || 0) <= Number(variant.low || 5)).length;
  return <><div className="adminOverlay" onClick={onClose} /><aside className="orderDetailDrawer">
    <header><div><p>VARIANT INVENTORY</p><h2>{product.name}</h2><span>{variants.length} size/color combinations - {total} units</span></div><button onClick={onClose}><X /></button></header>
    <div className="orderDetailBody">
      <div className="miniMetricGrid productMetrics"><article><Boxes /><span><b>{total}</b>Total units</span></article><article className={low ? "alertMetric" : ""}><TrendingUp /><span><b>{low}</b>Low variants</span></article><article><Tags /><span><b>{new Set(variants.map((variant) => variant.size)).size}</b>Sizes</span></article><article><Store /><span><b>{new Set(variants.map((variant) => variant.color)).size}</b>Colors</span></article></div>
      <section className="adminCard orderItemsCard"><div className="inventoryListHead"><div><h2>Variant stock</h2><span>Manage size and colour-level availability</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Size</th><th>Color</th><th>SKU</th><th>Available</th><th>Alert</th><th>Status</th></tr></thead><tbody>{variants.map((variant) => <tr key={variant.id}><td><b>{variant.size}</b></td><td>{variant.color}</td><td>{variant.sku}</td><td><input className="variantStockInput" type="number" min="0" defaultValue={variant.stock} /></td><td><input className="variantStockInput" type="number" min="0" defaultValue={variant.low} /></td><td><span className={`statusBadge ${variant.stock <= variant.low ? "processing" : "activeStatus"}`}>{variant.stock <= variant.low ? "Low stock" : "In stock"}</span></td></tr>)}</tbody></table></div></section>
      <section className="adminCard orderOpsCard"><h3>Private drops</h3><div className="formRow"><label>Status<select defaultValue={productStatus(product)}><option>Active</option><option>Draft</option><option>Archived</option><option>Unlisted</option></select></label><label>Collection<input defaultValue={productCollection(product)} /></label></div><button>Save variant plan</button></section>
    </div>
  </aside></>;
}

function InventoryDialog({ products, productChoice, setProductChoice, onClose, onAdjust }) {
  return <><div className="adminOverlay" onClick={onClose}/><form className="inventoryDialog" onSubmit={onAdjust}><DialogHead title="Adjust inventory" onClose={onClose}/>
    <label>Product<select name="product" value={productChoice} onChange={(event)=>setProductChoice(event.target.value)}><option value="__custom__">Add new product</option>{products.map(p=><option value={p.id} key={p.id}>{p.name} - {p.stock} available</option>)}</select></label>
    {productChoice==="__custom__"&&<div className="formRow"><label>Product name<input name="customName" required placeholder="e.g. Embroidered Dupatta"/></label><label>SKU<input name="customSku" placeholder="Optional"/></label></div>}
    <label>{productChoice==="__custom__"?"Opening stock":"Stock change"}<input name="amount" required type="number" placeholder={productChoice==="__custom__"?"10":"+10 or -2"}/></label>
    <label>Reason<select name="reason"><option>Stock count correction</option><option>Received stock</option><option>Damaged</option><option>Returned</option><option>Promotion</option></select></label>
    <button className="dialogSave">Save stock</button>
  </form></>;
}

function DialogHead({title,onClose}) { return <div className="dialogHead"><h2>{title}</h2><button type="button" onClick={onClose}><X/></button></div>; }

function DraftOrderDialog({ products = [], onClose, onCreate, saving = false }) {
  const makeItem = () => ({ key: `${Date.now()}-${Math.random()}`, productId: products[0]?.id ? String(products[0].id) : "__custom__", quantity: 1, size: "", color: "", customName: "", unitPrice: "" });
  const [draftItems, setDraftItems] = useState(() => [makeItem()]);
  const [paymentOption, setPaymentOption] = useState("cod");
  const [paymentStatus, setPaymentStatus] = useState("Awaiting Payment");
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [postexCities, setPostexCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const preparedItems = draftItems.map((entry, index) => {
    const product = products.find((candidate) => String(candidate.id) === entry.productId);
    return {
      id: product?.id || `custom-${index + 1}`,
      productId: product?.id || "",
      product_id: product?.id || "",
      name: product?.name || entry.customName || "Custom item",
      sku: product?.articleNumber || product?.article_number || product?.sku || "CUSTOM-ORDER",
      articleNumber: product?.articleNumber || product?.article_number || "",
      quantity: Math.max(1, Number(entry.quantity) || 1),
      price: Number(product?.price ?? entry.unitPrice ?? 0),
      size: entry.size || "",
      color: entry.color || "",
    };
  });
  const productSubtotal = preparedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const deliveryFee = paymentOption === "full_advance" ? 0 : 250;
  const orderTotal = productSubtotal + deliveryFee;
  const amountPayableInAdvance = Math.min(orderTotal, Math.max(0, Number(advanceAmount) || 0));
  const amountPayableOnDelivery = Math.max(0, orderTotal - amountPayableInAdvance);
  const updateItem = (key, changes) => setDraftItems((items) => items.map((item) => item.key === key ? { ...item, ...changes } : item));

  useEffect(() => {
    const nextAdvance = paymentOption === "full_advance" ? orderTotal : paymentOption === "cod_delivery_advance" ? deliveryFee : 0;
    setAdvanceAmount(nextAdvance);
    setPaymentStatus(paymentOption === "cod" ? "Awaiting Payment" : "Payment Verified");
  }, [paymentOption, orderTotal, deliveryFee]);

  useEffect(() => {
    let active = true;
    setCitiesLoading(true);
    fetch("/api/postex/cities")
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!active) return;
        if (!ok) throw new Error(result.error || "Unable to load PostEx cities.");
        setPostexCities(result.cities || []);
        setCitiesError("");
      })
      .catch((error) => {
        if (!active) return;
        setCitiesError(error.message);
      })
      .finally(() => {
        if (active) setCitiesLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <>
      <div className="adminOverlay" onClick={onClose} />
      <form className="orderDialog" onSubmit={onCreate} style={{ maxWidth: "720px", width: "95%" }}>
        <DialogHead title="Create Custom Order" onClose={onClose} />
        
        <div className="formRow">
          <label>
            Customer Full Name
            <input name="customer" required placeholder="e.g. Ayesha Khan" />
          </label>
          <label>
            Phone Number
            <input name="phone" required placeholder="03XXXXXXXXX" />
          </label>
        </div>

        <div className="formRow">
          <label>
            PostEx City
            <input
              name="city"
              required
              list="postex-city-options"
              placeholder={citiesLoading ? "Loading PostEx cities..." : "Type city name (e.g. Lahore)"}
              autoComplete="off"
            />
            {postexCities.length > 0 && (
              <datalist id="postex-city-options">
                {postexCities.map((city) => <option key={city} value={city} />)}
              </datalist>
            )}
            {citiesError && <small className="trackingNumber">{citiesError}</small>}
          </label>
          <label>
            Order Source
            <select name="source">
              <option value="Instagram DM">Instagram DM</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Phone call">Phone call</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Manual">Manual</option>
            </select>
          </label>
        </div>

        <div className="formRow">
          <label>
            Payment Option
            <select name="paymentOption" value={paymentOption} onChange={(event) => setPaymentOption(event.target.value)}>
              <option value="cod">Cash on Delivery (COD) — no advance</option>
              <option value="cod_delivery_advance">COD — delivery advance received</option>
              <option value="full_advance">Full Advance — free delivery</option>
            </select>
          </label>
          <label>
            Payment Status
            <select name="paymentStatus" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
              <option>Awaiting Payment</option>
              <option>Proof Submitted</option>
              <option>Payment Verified</option>
              <option>Payment Rejected</option>
            </select>
          </label>
        </div>

        <div className="formRow">
          <label>
            Advance Amount Received (PKR)
            <input
              name="advancePaid"
              type="number"
              min="0"
              max={orderTotal}
              step="0.01"
              value={amountPayableInAdvance}
              onChange={(event) => setAdvanceAmount(event.target.value)}
              readOnly={paymentOption !== "cod_delivery_advance"}
            />
          </label>
          <label>
            Delivery Charges (PKR)
            <input name="deliveryCharges" type="number" min="0" step="0.01" value={deliveryFee} readOnly />
          </label>
        </div>

        <div className="formRow">
          <label>
            Delivery Method
            <select name="deliveryMethod">
              <option>PostEx</option>
              <option>Rider / same city</option>
              <option>Customer pickup</option>
              <option>Staff delivery</option>
              <option>Manual courier</option>
              <option>PostEx later</option>
            </select>
          </label>
          <label>
            Order Status
            <select name="status">
              {customOrderStatusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>

        <label>
          Full Shipping Address
          <textarea name="address" rows="2" required placeholder="House/Flat number, Street, Area, Landmark, City" />
        </label>

        <div className="inventoryListHead" style={{ marginTop: "12px" }}>
          <div>
            <h3>Order Items &amp; Products</h3>
            <span>Add catalog products or custom items</span>
          </div>
          <button type="button" onClick={() => setDraftItems((items) => [...items, makeItem()])}>+ Add another item</button>
        </div>

        {draftItems.map((entry, index) => {
          const selectedProduct = products.find((product) => String(product.id) === entry.productId);
          const rawSizes = selectedProduct?.sizes || selectedProduct?.size;
          const parsedSizes = Array.isArray(rawSizes) ? rawSizes : typeof rawSizes === "string" ? (() => { try { return JSON.parse(rawSizes); } catch { return [rawSizes]; } })() : [];
          const sizes = parsedSizes.length ? [...parsedSizes, "Custom"] : ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "Custom"];
          const rawColors = selectedProduct?.colors || selectedProduct?.color;
          const parsedColors = Array.isArray(rawColors) ? rawColors : typeof rawColors === "string" ? (() => { try { return JSON.parse(rawColors); } catch { return [rawColors]; } })() : [];
          const colors = parsedColors.length ? [...parsedColors, "Custom"] : ["Default", "Custom"];
          const isCustomSize = entry.size === "Custom" || (entry.size && !sizes.filter((s) => s !== "Custom").includes(entry.size));

          return (
            <div className="adminCard" key={entry.key} style={{ padding: "14px", marginBottom: "10px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="inventoryListHead">
                <b>Item {index + 1}</b>
                {draftItems.length > 1 && (
                  <button type="button" onClick={() => setDraftItems((items) => items.filter((item) => item.key !== entry.key))} style={{ color: "#ef4444" }}>
                    Remove
                  </button>
                )}
              </div>
              <label>
                Product
                <select value={entry.productId} onChange={(event) => updateItem(entry.key, { productId: event.target.value, size: "", color: "" })}>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - Rs. {Number(product.price || 0).toLocaleString()}
                    </option>
                  ))}
                  <option value="__custom__">✏️ Custom / Other Suit Name</option>
                </select>
              </label>
              {selectedProduct ? (
                <div className="formRow">
                  <label>
                    Size
                    <select
                      value={sizes.includes(entry.size) ? entry.size : (entry.size ? "Custom" : "")}
                      onChange={(event) => updateItem(entry.key, { size: event.target.value })}
                    >
                      <option value="">Select Size</option>
                      {sizes.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                    {isCustomSize && (
                      <input
                        type="text"
                        value={entry.size === "Custom" ? "" : entry.size}
                        onChange={(event) => updateItem(entry.key, { size: event.target.value })}
                        placeholder="Type custom size (e.g. 38, M)"
                        style={{ marginTop: "4px" }}
                      />
                    )}
                  </label>
                  <label>
                    Color
                    <select value={entry.color} onChange={(event) => updateItem(entry.key, { color: event.target.value })}>
                      <option value="">Select Color</option>
                      {colors.map((color) => <option key={color} value={color}>{color}</option>)}
                    </select>
                    {entry.color === "Custom" && (
                      <input
                        type="text"
                        onChange={(event) => updateItem(entry.key, { color: event.target.value })}
                        placeholder="Type color name..."
                        style={{ marginTop: "4px" }}
                      />
                    )}
                  </label>
                </div>
              ) : (
                <div className="formRow">
                  <label>
                    Custom Item Name
                    <input required value={entry.customName} onChange={(event) => updateItem(entry.key, { customName: event.target.value })} placeholder="e.g. Lawn Embroidered 3-Piece" />
                  </label>
                  <label>
                    Variant / Size / Color
                    <input value={entry.size} onChange={(event) => updateItem(entry.key, { size: event.target.value })} placeholder="e.g. Medium / Maroon" />
                  </label>
                </div>
              )}
              <div className="formRow">
                <label>
                  Quantity
                  <input type="number" min="1" max="50" value={entry.quantity} onChange={(event) => updateItem(entry.key, { quantity: event.target.value })} />
                </label>
                <label>
                  Unit Price (PKR)
                  <input
                    type="number"
                    min="0"
                    value={selectedProduct ? Number(selectedProduct.price || 0) : entry.unitPrice}
                    onChange={(event) => updateItem(entry.key, { unitPrice: event.target.value })}
                    readOnly={!!selectedProduct}
                  />
                </label>
              </div>
            </div>
          );
        })}

        <input type="hidden" name="itemsJson" value={JSON.stringify(preparedItems)} />

        <div className="adminCard" style={{ padding: "14px", marginBottom: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div className="formRow" style={{ marginBottom: "6px" }}>
            <span>Products Subtotal: <b>Rs. {productSubtotal.toLocaleString()}</b></span>
            <span>Delivery: <b>{deliveryFee ? `Rs. ${deliveryFee.toLocaleString()}` : "Free"}</b></span>
          </div>
          <div className="formRow" style={{ marginBottom: "6px" }}>
            <span style={{ color: "#15803d" }}>Advance Received: <b>Rs. {amountPayableInAdvance.toLocaleString()}</b></span>
            <span style={{ color: amountPayableOnDelivery === 0 ? "#15803d" : "#1e40af" }}>
              Pay on Delivery (COD): <b>Rs. {amountPayableOnDelivery.toLocaleString()}</b>
            </span>
          </div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#166534", borderTop: "1px solid #dcfce7", paddingTop: "6px" }}>
            Total Order Value: Rs. {orderTotal.toLocaleString()}
          </div>
        </div>

        <div className="adminCard" style={{ padding: "14px", marginBottom: "12px", background: "#fefce8", border: "1px solid #fde047" }}>
          <label style={{ margin: 0 }}>
            <b style={{ color: "#854d0e" }}>📝 Internal Notes &amp; Special Instructions</b>
            <textarea
              name="notes"
              rows="3"
              placeholder="Enter Instagram DM link, customer phone verification note, rider instructions, custom sizing remarks..."
              style={{ background: "#fff", border: "1px solid #facc15", marginTop: "6px" }}
            />
            <small style={{ color: "#a16207", display: "block", marginTop: "4px" }}>
              These internal notes will be saved and permanently shown on the order details card and list.
            </small>
          </label>
        </div>

        <button
          className="dialogSave"
          disabled={saving}
          aria-busy={saving}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "14px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: saving ? "not-allowed" : "pointer"
          }}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Saving &amp; Creating Order...</span>
            </>
          ) : (
            "Create Custom Order"
          )}
        </button>
      </form>
    </>
  );
}

function OrderDetailDrawer({ order, catalogProducts = [], onClose, onUpdate, canRecordRefund, onNavigateToEvents }) {
  const [tracking, setTracking] = useState(order.tracking || "");
  const [orderStage, setOrderStage] = useState(order.postexStatus || order.status || "Un-Assigned By Me");
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || "COD pending");
  const [paymentReference, setPaymentReference] = useState(order.paymentReference || order.raw?.payment_reference || "");
  const [advancePaidAmount, setAdvancePaidAmount] = useState(Number(order.amountPayableInAdvance || 0));
  const [fulfillmentStatus, setFulfillmentStatus] = useState(order.fulfillmentStatus || "Unfulfilled");
  const [deliveryMethod, setDeliveryMethod] = useState(order.deliveryMethod || (order.tracking ? "PostEx" : "Rider / same city"));
  const [risk, setRisk] = useState(order.risk || "Standard COD");
  const [tags, setTags] = useState((order.tags || []).join(", "));
  const [notes, setNotes] = useState(order.notes || order.internalNotes || "");
  const [returnStatus, setReturnStatus] = useState(order.operation?.returnStatus || "No return");
  const [returnReason, setReturnReason] = useState(order.operation?.returnReason || "");
  const [returnResolution, setReturnResolution] = useState(order.operation?.returnResolution || "");
  const [refundAmount, setRefundAmount] = useState(order.operation?.refundAmount || 0);
  const [refundMethod, setRefundMethod] = useState(order.operation?.refundMethod || "");
  const [saving, setSaving] = useState(false);
  const [bookingPostex, setBookingPostex] = useState(false);
  const [resyncingCapi, setResyncingCapi] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [orderItems, setOrderItems] = useState(() => normalizeOrderItems(order));
  const items = orderItems;
  const returnStatusOptions = returnWorkflowTransitions[order.operation?.returnStatus || "No return"] || [returnStatus];
  const restoringReturnedStock = order.operation?.returnStatus !== "Return received" && returnStatus === "Return received";

  useEffect(() => {
    setOrderItems(normalizeOrderItems(order));
  }, [order.id, order.rawId, order.order_number, JSON.stringify(order.items), JSON.stringify(order.order_items)]);

  function updateItemField(index, field, value) {
    setOrderItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === "name") copy[index].title = value;
      if (field === "title") copy[index].name = value;
      return copy;
    });
  }

  function handleSelectProduct(index, productName) {
    const foundProduct = catalogProducts.find((p) => p.name === productName);
    if (foundProduct) {
      const parsedSizes = Array.isArray(foundProduct.size) ? foundProduct.size : typeof foundProduct.size === "string" ? (() => { try { return JSON.parse(foundProduct.size); } catch { return [foundProduct.size]; } })() : [];
      const parsedColors = Array.isArray(foundProduct.color) ? foundProduct.color : typeof foundProduct.color === "string" ? (() => { try { return JSON.parse(foundProduct.color); } catch { return [foundProduct.color]; } })() : [];

      setOrderItems((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          name: foundProduct.name,
          title: foundProduct.name,
          sku: foundProduct.article_number || foundProduct.stock_id || copy[index].sku || "",
          price: Number(foundProduct.price || copy[index].price || 0),
          imageUrl: foundProduct.img || foundProduct.images?.[0] || copy[index].imageUrl || "",
          size: parsedSizes[0] || copy[index].size || "M",
          color: parsedColors[0] || copy[index].color || "",
          productId: foundProduct.id || null,
          product_id: foundProduct.id || null,
        };
        return copy;
      });
    } else if (productName === "__custom__") {
      setOrderItems((prev) => {
        const copy = [...prev];
        const existingName = copy[index].name || copy[index].title || "";
        const customTitle = existingName && existingName !== "Custom Product" && !catalogProducts.some((p) => p.name === existingName) ? existingName : "Custom Product";
        copy[index] = {
          ...copy[index],
          name: customTitle,
          title: customTitle,
          productId: null,
          product_id: null,
        };
        return copy;
      });
    }
  }

  function handleAddProductItem() {
    const defaultProduct = catalogProducts[0];
    const newItem = {
      id: `manual-${Date.now()}`,
      name: defaultProduct ? defaultProduct.name : "Custom Product",
      title: defaultProduct ? defaultProduct.name : "Custom Product",
      sku: defaultProduct ? (defaultProduct.article_number || defaultProduct.stock_id || "") : "",
      price: defaultProduct ? Number(defaultProduct.price || 0) : 3000,
      quantity: 1,
      size: "M",
      color: "",
      imageUrl: defaultProduct?.img || defaultProduct?.images?.[0] || "",
      productId: defaultProduct?.id || null,
    };
    setOrderItems((prev) => [...prev, newItem]);
  }

  function handleRemoveProductItem(index) {
    if (orderItems.length <= 1) {
      alert("An order must have at least one product.");
      return;
    }
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  }

  const rawPhoneDigits = String(order.phone || "").replace(/\D/g, "");
  const waPhone = rawPhoneDigits.startsWith("0") ? `92${rawPhoneDigits.slice(1)}` : rawPhoneDigits.startsWith("92") ? rawPhoneDigits : `92${rawPhoneDigits}`;

  async function resyncOrderMetaPurchase() {
    if (resyncingCapi || saving) return;
    setResyncingCapi(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const orderRef = order.order_number || String(order.id).replace(/^#/, "");
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_order_purchase",
          orderId: orderRef,
          orderData: order,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.error || result.capiResult?.error || "Meta CAPI dispatch was not accepted.");
      }
      setSaveMessage(`✅ Meta Purchase event dispatched successfully for order ${orderRef}! (Event ID: ${result.orderRef}, 200 OK)`);
    } catch (err) {
      setSaveError(`Meta CAPI error: ${err.message}`);
    } finally {
      setResyncingCapi(false);
    }
  }

  function changes(overrides = {}) {
    return {
      tracking,
      status: orderStage,
      postexStatus: orderStage,
      paymentStatus,
      paymentReference,
      amountPayableInAdvance: Number(advancePaidAmount || 0),
      confirmationStatus: order.confirmationStatus,
      fulfillmentStatus,
      deliveryMethod,
      risk,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      notes,
      items: orderItems,
      operation: {
        returnStatus,
        returnReason,
        returnResolution,
        refundAmount: Number(refundAmount || 0),
        refundMethod,
      },
      ...overrides,
    };
  }

  async function saveChanges(overrides = {}) {
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const payload = changes(overrides);
      const saved = await onUpdate(order, payload);
      if (saved) {
        if (saved.items) {
          setOrderItems(normalizeOrderItems({ ...order, items: saved.items, order_items: saved.items }));
        }
        if (saved?.inventoryRestore?.restored) {
          setSaveMessage(`Order changes saved. ${saved.inventoryRestore.restoredItems} item(s) restored to inventory.`);
        } else if (saved?.operationPersistence === "unavailable" || saved?.operationPersistence === "failed") {
          setSaveMessage(saved.operationError || "Core order details saved, but return/refund workflow data was not saved.");
        } else {
          setSaveMessage("Order changes, items and notes saved successfully!");
        }
      }
      return saved;
    } catch (error) {
      setSaveError(error.message || "Order changes could not be saved.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function bookWithPostex() {
    if (bookingPostex || saving) return;
    setBookingPostex(true);
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const response = await fetch("/api/admin/postex-custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.rawId || String(order.id).replace(/^#/, ""),
          orderRef: order.order_number || String(order.id).replace(/^#/, ""),
          total: savedMoney.total,
          // Without these the server re-derived the money from current catalog
          // prices and guessed "full advance" from a verified payment status,
          // which handed PostEx a COD amount the customer never agreed to.
          paymentOption: savedMoney.isFullyAdvanced ? "full_advance" : savedMoney.hasAdvance ? "cod_delivery_advance" : "cod",
          deliveryCharges: savedMoney.delivery,
          advancePaid: savedMoney.advance,
          paymentStatus,
          bookPostex: true,
          deliveryMethod: "PostEx",
          source: order.source,
          notes,
          customer: {
            name: order.customer,
            phone: order.phone,
            address: order.address,
            city: order.city,
          },
          items,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to book PostEx order.");
      const trackingNumber = result.trackingNumber || result.tracking;
      setTracking(trackingNumber);
      setOrderStage(result.courierStatus || "booked");
      setFulfillmentStatus("Booked with PostEx");
      setDeliveryMethod("PostEx");
      await saveChanges({
        tracking: trackingNumber,
        status: result.courierStatus || "booked",
        postexStatus: result.courierStatus || "booked",
        fulfillmentStatus: "Booked with PostEx"
      });
      setSaveMessage(`Successfully booked with PostEx! Tracking: ${trackingNumber}`);
    } catch (error) {
      setSaveError(error.message || "Unable to create PostEx booking.");
    } finally {
      setBookingPostex(false);
      setSaving(false);
    }
  }

  function copyTrackingToClipboard() {
    if (!tracking) return;
    navigator.clipboard?.writeText(tracking);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  }

  function escapePrintText(value = "") {
    return String(value || "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
    }[char]));
  }

  function printDocument({ title, subtitle, compact = false }) {
    const total = orderMoney(order).total;
    const rows = items.map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.price || 0);
      const lineTotal = quantity * unitPrice;
      return `<tr>
        <td><b>${escapePrintText(item.name)}</b><small>${escapePrintText([item.sku, item.size, item.color].filter(Boolean).join(" / "))}</small></td>
        <td>${quantity}</td>
        ${compact ? "" : `<td>Rs. ${unitPrice.toLocaleString()}</td><td>Rs. ${lineTotal.toLocaleString()}</td>`}
      </tr>`;
    }).join("");
    const slip = window.open("", "_blank", "width=760,height=900");
    if (!slip) return;
    slip.document.write(`<!doctype html><html><head><title>${escapePrintText(title)} ${escapePrintText(order.id)}</title><style>
      body{font-family:Arial,sans-serif;margin:0;color:#173d29;background:#fff}
      main{padding:32px}
      header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #173d29;padding-bottom:18px;margin-bottom:22px}
      h1{margin:0;font-size:28px;letter-spacing:.02em}
      p{margin:4px 0;color:#59675d;line-height:1.45}
      .box{border:1px solid #dfe7df;border-radius:10px;padding:16px;margin:14px 0}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      table{width:100%;border-collapse:collapse;margin-top:18px}
      th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#59675d;border-bottom:1px solid #dfe7df;padding:10px}
      td{border-bottom:1px solid #eef2ee;padding:12px 10px;vertical-align:top}
      td small{display:block;color:#6b766e;margin-top:4px}
      .total{margin-left:auto;max-width:320px}
      .total div{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eef2ee}
      .total b{font-size:18px}
      @media print{button{display:none} main{padding:20px}}
    </style></head><body><main>
      <header><div><h1>Bustaniya</h1><p>${escapePrintText(subtitle)}</p></div><div><p><b>Order</b> ${escapePrintText(order.id)}</p><p><b>Date</b> ${escapePrintText(order.date || "")}</p><p><b>Status</b> ${escapePrintText(orderStage)}</p></div></header>
      <section class="grid">
        <div class="box"><b>Customer</b><p>${escapePrintText(order.customer)}</p><p>${escapePrintText(order.phone || "No phone saved")}</p></div>
        <div class="box"><b>Delivery</b><p>${escapePrintText(order.address || order.city || "No address saved")}</p><p>${escapePrintText(deliveryMethod)}${tracking ? ` — ${escapePrintText(tracking)}` : ""}</p></div>
      </section>
      <table><thead><tr><th>Item</th><th>Qty</th>${compact ? "" : "<th>Unit price</th><th>Total</th>"}</tr></thead><tbody>${rows}</tbody></table>
      ${compact ? `<div class="box"><b>Packing note</b><p>${escapePrintText(notes || "Check product, size, colour and packaging before dispatch.")}</p></div>` : `<section class="total"><div><span>Items</span><span>${items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</span></div><div><span>Payment</span><span>${escapePrintText(paymentStatus)}</span></div><div><b>Total</b><b>Rs. ${total.toLocaleString()}</b></div></section>`}
    </main><script>window.onload=()=>{window.print();}</script></body></html>`);
    slip.document.close();
  }

  function printInvoice() {
    printDocument({
      title: "Invoice",
      subtitle: "Customer invoice / order receipt",
      compact: false,
    });
  }

  function printPackingSlip() {
    printDocument({
      title: "Packing Slip",
      subtitle: "Warehouse packing slip — prices hidden",
      compact: true,
    });
  }

  // Saved figures drive the PostEx booking; `preview` folds in the unsaved
  // line-item and advance edits currently on screen so the operator sees what
  // the courier will be told to collect once they press save.
  const savedMoney = orderMoney(order);
  const preview = orderMoney(order, { items: orderItems, advance: Number(advancePaidAmount || 0) });
  const calculatedItemsTotal = preview.subtotal;
  const deliveryChargeVal = preview.delivery;
  const calculatedOrderTotal = preview.total;
  const currentAdvance = preview.advance;
  const currentCod = preview.cod;
  const unsavedTotalChange = Math.abs(preview.total - savedMoney.total) >= 1 || Math.abs(preview.advance - savedMoney.advance) >= 1;

  return (
    <>
      <div className="adminOverlay" onClick={onClose} />
      <aside className="orderDetailDrawer">
        <header>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className={`statusBadge ${String(orderStage).replaceAll(" ", "").replaceAll("-", "").toLowerCase()}`}>
                {orderStage}
              </span>
              <span className="statusBadge" style={{ background: "#f1f5f9", color: "#334155", fontSize: "11px" }}>
                {order.source || "Storefront"}
              </span>
            </div>
            <h2>{order.id}</h2>
            <span>{order.customer} · Rs. {calculatedOrderTotal.toLocaleString()} · {order.date}</span>
          </div>
          <button onClick={onClose} aria-label="Close details"><X /></button>
        </header>

        <div className="orderDetailBody">
          {/* Customer & Contact Card */}
          <section className="adminCard orderDetailCard" style={{ padding: "18px", background: "#fff" }}>
            <div className="inventoryListHead" style={{ marginBottom: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#173d29" }}>Customer &amp; Delivery Details</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Shipping and direct contact options</span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {rawPhoneDigits && (
                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "#22c55e",
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none"
                    }}
                    title="Open WhatsApp Chat with customer"
                  >
                    💬 WhatsApp
                  </a>
                )}
                {rawPhoneDigits && (
                  <a
                    href={`tel:${order.phone}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "#f1f5f9",
                      color: "#334155",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      textDecoration: "none"
                    }}
                  >
                    📞 Call
                  </a>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", fontSize: "13px", color: "#334155" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Customer Name</span>
                <b>{order.customer}</b>
                {order.email && <div style={{ color: "#64748b", fontSize: "12px" }}>{order.email}</div>}
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Phone Number</span>
                <b>{order.phone || "No phone saved"}</b>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>City &amp; Region</span>
                <b>📍 {order.city || "—"}</b>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Complete Delivery Address</span>
                <p style={{ margin: "2px 0 0", lineHeight: 1.4, color: "#1e293b" }}>{order.address || order.city || "No address saved"}</p>
              </div>
            </div>
          </section>

          {/* Internal Notes & Special Instructions Card (PROMINENT) */}
          <section className="adminCard orderOpsCard" style={{ background: "#fefce8", border: "1px solid #fde047", padding: "18px" }}>
            <div className="inventoryListHead" style={{ marginBottom: "10px" }}>
              <div>
                <h3 style={{ color: "#854d0e", display: "flex", alignItems: "center", gap: "6px", margin: 0, fontSize: "15px" }}>
                  📝 Internal Notes &amp; Special Remarks
                </h3>
                <span style={{ color: "#a16207", fontSize: "12px" }}>
                  Admin notes, DM context, customer requests, rider timing &amp; instructions
                </span>
              </div>
              {notes && (
                <span className="statusBadge" style={{ background: "#fef08a", color: "#854d0e", fontWeight: 700 }}>
                  Notes Active
                </span>
              )}
            </div>

            {notes && (
              <div style={{
                background: "#fff",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid #fef08a",
                color: "#713f12",
                fontSize: "13px",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
                marginBottom: "12px"
              }}>
                {notes}
              </div>
            )}

            <label style={{ margin: 0 }}>
              <span style={{ fontSize: "12px", color: "#854d0e", fontWeight: 700 }}>
                {notes ? "Edit / Append Internal Notes:" : "Add Internal Notes:"}
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows="3"
                placeholder="Write customer request, DM context, phone verification, rider instructions, custom sizes..."
                style={{ background: "#fff", border: "1px solid #facc15", marginTop: "6px", width: "100%" }}
              />
            </label>

            {saveError && <p className="checkoutError" role="alert" style={{ marginTop: "8px" }}>{saveError}</p>}
            {saveMessage && <p className="adminSuccessBanner" role="status" style={{ marginTop: "8px" }}>{saveMessage}</p>}

            <div className="orderActionRow" style={{ marginTop: "10px" }}>
              <button
                type="button"
                className="editProductButton"
                onClick={() => saveChanges({ notes })}
                disabled={saving}
                aria-busy={saving}
                style={{
                  background: "#ca8a04",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: saving ? "not-allowed" : "pointer"
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving Note...</span>
                  </>
                ) : (
                  "💾 Save Internal Note"
                )}
              </button>
            </div>
          </section>

          {/* Quick Selectors Grid */}
          <section className="orderDetailGrid">
            <article className="adminCard orderDetailCard">
              <h3>Order Stage</h3>
              <select value={orderStage} onChange={(event) => setOrderStage(event.target.value)}>
                {customOrderStatusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>
            </article>
            <article className="adminCard orderDetailCard">
              <h3>Payment Status</h3>
              <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
                <option>Awaiting Payment</option>
                <option>Proof Submitted</option>
                <option>Payment Verified</option>
                <option>Payment Rejected</option>
                <option>COD pending</option>
                <option>Advance pending</option>
                <option>Verification due</option>
                <option>Paid</option>
                <option>Refunded</option>
              </select>
            </article>
            <article className="adminCard orderDetailCard">
              <h3>Fulfillment</h3>
              <select value={fulfillmentStatus} onChange={(event) => setFulfillmentStatus(event.target.value)}>
                <option>Unfulfilled</option>
                <option>Packing</option>
                <option>Booked with PostEx</option>
                <option>Shipped</option>
                <option>Delivered</option>
                <option>On hold</option>
              </select>
            </article>
            <article className="adminCard orderDetailCard">
              <h3>Delivery Method</h3>
              <select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)}>
                <option>PostEx</option>
                <option>Rider / same city</option>
                <option>Customer pickup</option>
                <option>Staff delivery</option>
                <option>Manual courier</option>
                <option>PostEx later</option>
              </select>
            </article>
            <article className="adminCard orderDetailCard">
              <h3>Risk Level</h3>
              <select value={risk} onChange={(event) => setRisk(event.target.value)}>
                <option>Standard COD</option>
                <option>High risk COD</option>
                <option>Repeat customer</option>
              </select>
            </article>
          </section>

          {/* Order Items & Product Editor Section */}
          <section className="adminCard orderItemsCard" style={{ padding: "18px", background: "#fff" }}>
            <div className="inventoryListHead" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h2 style={{ fontSize: "16px", margin: 0, fontWeight: 700, color: "#173d29" }}>Ordered Items &amp; Product Settings</h2>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Change products, sizes, colors, or quantities and save directly</span>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleAddProductItem}
                  style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontWeight: 700, padding: "7px 12px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
                >
                  + Add Product to Order
                </button>
                <button
                  type="button"
                  className="editProductButton"
                  onClick={() => saveChanges({ items: orderItems })}
                  disabled={saving}
                  style={{
                    background: "#166534",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    padding: "7px 14px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: saving ? "not-allowed" : "pointer"
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    "💾 Save Items & Changes"
                  )}
                </button>
                <button type="button" onClick={printInvoice} style={{ padding: "6px 10px", fontSize: "12px" }}>📄 Print Invoice</button>
                <button type="button" onClick={printPackingSlip} style={{ padding: "6px 10px", fontSize: "12px" }}>📦 Packing Slip</button>
              </div>
            </div>

            <div className="adminTableWrap" style={{ marginTop: "14px", overflowX: "auto" }}>
              <table className="adminTable" style={{ minWidth: "680px" }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: "220px" }}>Product Name (Change / Select)</th>
                    <th style={{ minWidth: "140px" }}>Size (Edit)</th>
                    <th style={{ minWidth: "120px" }}>Color (Edit)</th>
                    <th style={{ width: "65px" }}>Qty</th>
                    <th style={{ width: "110px" }}>Unit Price (PKR)</th>
                    <th>Line Total</th>
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, index) => {
                    const standardSizes = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];
                    const isCustom = item.size && !standardSizes.includes(item.size);

                    return (
                      <tr key={item.id || index}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {item.imageUrl && (
                                <img src={item.imageUrl} alt={item.name} style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
                              )}
                              <select
                                value={catalogProducts.some((p) => p.name === (item.name || item.title)) ? (item.name || item.title) : "__custom__"}
                                onChange={(e) => handleSelectProduct(index, e.target.value)}
                                style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 700, color: "#1e293b", width: "100%" }}
                              >
                                <optgroup label="Store Catalog Products">
                                  {catalogProducts.map((p) => (
                                    <option key={p.id || p.name} value={p.name}>
                                      {p.name} (Rs. {Number(p.price || 0).toLocaleString()})
                                    </option>
                                  ))}
                                </optgroup>
                                <option value="__custom__">✏️ Custom / Other Suit Name</option>
                              </select>
                            </div>
                            {(!catalogProducts.some((p) => p.name === (item.name || item.title)) || item.name === "Custom Product" || item.title === "Custom Product") && (
                              <input
                                type="text"
                                value={item.name || item.title || ""}
                                onChange={(e) => updateItemField(index, "name", e.target.value)}
                                placeholder="Enter custom suit / product title..."
                                style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", border: "1.5px solid #2563eb", background: "#fff", fontWeight: 600 }}
                              />
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <select
                              value={standardSizes.includes(item.size) ? item.size : "Custom"}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateItemField(index, "size", val === "Custom" ? (item.size || "Custom") : val);
                              }}
                              style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 700, color: "#1e293b" }}
                            >
                              <option value="XS">XS (Extra Small)</option>
                              <option value="S">S (Small)</option>
                              <option value="M">M (Medium)</option>
                              <option value="L">L (Large)</option>
                              <option value="XL">XL (Extra Large)</option>
                              <option value="XXL">XXL (Double Extra Large)</option>
                              <option value="Free Size">Free Size / Unstitched</option>
                              <option value="Custom">Custom / Other Size...</option>
                            </select>
                            {(isCustom || item.size === "Custom") && (
                              <input
                                type="text"
                                value={item.size || ""}
                                onChange={(e) => updateItemField(index, "size", e.target.value)}
                                placeholder="Size (e.g. 38, Custom size)"
                                style={{ padding: "4px 8px", fontSize: "11px", borderRadius: "4px", border: "1px solid #94a3b8", background: "#fff" }}
                              />
                            )}
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.color || ""}
                            onChange={(e) => updateItemField(index, "color", e.target.value)}
                            placeholder="Color (e.g. Olive, Pink)"
                            style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", width: "100%" }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={item.quantity || 1}
                            onChange={(e) => updateItemField(index, "quantity", Math.max(1, Number(e.target.value) || 1))}
                            style={{ width: "48px", padding: "4px 6px", fontSize: "12px", textAlign: "center", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={item.price || 0}
                            onChange={(e) => updateItemField(index, "price", Math.max(0, Number(e.target.value) || 0))}
                            style={{ width: "90px", padding: "4px 6px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                          />
                        </td>
                        <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                          <b>Rs. {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}</b>
                        </td>
                        <td>
                          {orderItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProductItem(index)}
                              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px", padding: "4px" }}
                              title="Remove item"
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "16px", fontSize: "13px", color: "#334155", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
              <span>Items Subtotal: <b>Rs. {calculatedItemsTotal.toLocaleString()}</b></span>
              <span>Delivery Charges: <b>Rs. {deliveryChargeVal.toLocaleString()}</b></span>
              <span style={{ color: "#166534", fontWeight: 700 }}>Total Order Value: <b>Rs. {calculatedOrderTotal.toLocaleString()}</b></span>
            </div>
          </section>

          {/* Payment & Advance Verification Card */}
          <section className="adminCard orderOpsCard paymentVerificationWorkspace" style={{ padding: "18px" }}>
            <div className="inventoryListHead">
              <div>
                <h3 style={{ margin: 0, fontSize: "16px" }}>Financial Breakdown &amp; Advance Verification</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Payment tracking, advance received, and remaining COD collection</span>
              </div>
              <span className={`statusBadge ${String(paymentStatus).replaceAll(" ", "").toLowerCase()}`}>
                {paymentStatus}
              </span>
            </div>

            <div className="paymentOrderBreakdown" style={{ marginTop: "12px" }}>
              <span>Method: <b>{order.paymentMethod || "Cash on Delivery"}</b></span>
              <span>Product Subtotal: <b>Rs. {calculatedItemsTotal.toLocaleString()}</b></span>
              <span>Delivery Charges: <b>Rs. {deliveryChargeVal.toLocaleString()}</b></span>
              <span>Total Order Value: <b>Rs. {calculatedOrderTotal.toLocaleString()}</b></span>
              <span style={{ color: "#15803d" }}>Advance Received: <b>Rs. {currentAdvance.toLocaleString()}</b></span>
              <span style={{ color: currentCod === 0 ? "#15803d" : "#1e40af" }}>
                PostEx COD Collection: <b>{currentCod === 0 ? "Rs. 0 (Prepaid)" : `Rs. ${currentCod.toLocaleString()}`}</b>
              </span>
            </div>

            {unsavedTotalChange && (
              <p className="orderMoneyNotice orderMoneyNoticeInfo">
                Unsaved edits. Saved right now: total Rs. {savedMoney.total.toLocaleString()}, advance
                Rs. {savedMoney.advance.toLocaleString()}, COD Rs. {savedMoney.cod.toLocaleString()}. Save to apply the
                new figures before booking or re-booking PostEx.
              </p>
            )}
            {savedMoney.codMismatch && (
              <p className="orderMoneyNotice orderMoneyNoticeWarn">
                PostEx is booked to collect Rs. {savedMoney.bookedCod.toLocaleString()}. After the
                Rs. {savedMoney.advance.toLocaleString()} advance on a Rs. {savedMoney.total.toLocaleString()} order,
                only Rs. {savedMoney.cod.toLocaleString()} is actually due — update the shipment with PostEx so the
                rider collects the right amount.
              </p>
            )}

            <div className="formRow" style={{ marginTop: "12px" }}>
              <label>
                Advance Received (PKR)
                <input
                  type="number"
                  min="0"
                  max={calculatedOrderTotal}
                  value={advancePaidAmount}
                  onChange={(event) => setAdvancePaidAmount(event.target.value)}
                  placeholder="250, 500, or full total..."
                />
              </label>
              <label>
                Payment Reference ID / Transaction ID
                <input
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="Bank transfer / NayaPay / JazzCash reference"
                />
              </label>
            </div>

            <div className="formRow">
              <label>
                Payment Proof Status
                <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
                  <option>Awaiting Payment</option>
                  <option>Proof Submitted</option>
                  <option>Payment Verified</option>
                  <option>Payment Rejected</option>
                </select>
              </label>
              <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", paddingBottom: "2px" }}>
                <button
                  type="button"
                  className="editProductButton"
                  style={{ fontSize: "11px", padding: "6px 10px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}
                  onClick={() => {
                    setAdvancePaidAmount(calculatedOrderTotal);
                    setPaymentStatus("Payment Verified");
                  }}
                >
                  🟢 Set 100% Full Advance
                </button>
                <button
                  type="button"
                  className="editProductButton"
                  style={{ fontSize: "11px", padding: "6px 10px", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" }}
                  onClick={() => {
                    setAdvancePaidAmount(Math.min(deliveryChargeVal || 250, calculatedOrderTotal));
                    setPaymentStatus("Payment Verified");
                  }}
                >
                  🔵 Set delivery advance (Rs. {(Math.min(deliveryChargeVal || 250, calculatedOrderTotal)).toLocaleString()})
                </button>
              </div>
            </div>

            <div className="orderActionRow" style={{ marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => saveChanges({
                  paymentReference,
                  amountPayableInAdvance: Number(advancePaidAmount || 0),
                  confirmationStatus: "Confirmed",
                })}
                disabled={saving}
                aria-busy={saving}
              >
                Save Payment Details
              </button>
              <button
                type="button"
                className="editProductButton"
                onClick={() => {
                  setPaymentStatus("Payment Verified");
                  setFulfillmentStatus("Packing");
                  saveChanges({
                    paymentStatus: "Payment Verified",
                    paymentReference,
                    amountPayableInAdvance: Number(advancePaidAmount || 0),
                    fulfillmentStatus: "Packing",
                    confirmationStatus: "Confirmed",
                  });
                }}
                disabled={saving}
                aria-busy={saving}
              >
                ✅ Verify Payment &amp; Move to Packing
              </button>
              <button
                type="button"
                className="dangerButton"
                onClick={() => {
                  setPaymentStatus("Payment Rejected");
                  saveChanges({
                    paymentStatus: "Payment Rejected",
                    paymentReference,
                    confirmationStatus: "Confirmed",
                  });
                }}
                disabled={saving}
                aria-busy={saving}
              >
                ❌ Reject Payment
              </button>
            </div>
          </section>

          {/* Fulfillment & Courier Operations Card */}
          <section className="adminCard orderOpsCard" style={{ padding: "18px" }}>
            <div className="inventoryListHead">
              <div>
                <h3 style={{ margin: 0, fontSize: "16px" }}>Courier &amp; Delivery Tracking</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>PostEx shipment booking and tracking numbers</span>
              </div>
            </div>

            <div className="formRow" style={{ marginTop: "12px" }}>
              <label>
                Tracking Number
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    value={tracking}
                    onChange={(event) => setTracking(event.target.value)}
                    placeholder="PostEx tracking number (e.g. 123456789)"
                  />
                  {tracking && (
                    <button
                      type="button"
                      onClick={copyTrackingToClipboard}
                      className="editProductButton"
                      style={{ whiteSpace: "nowrap", padding: "0 12px" }}
                      title="Copy tracking number"
                    >
                      {copiedTracking ? "Copied!" : "Copy"}
                    </button>
                  )}
                </div>
              </label>
            </div>

            {tracking && !tracking.startsWith("MANUAL-") && (
              <div style={{ marginTop: "6px", fontSize: "12px" }}>
                <a
                  href={`https://postex.pk/tracking?cn=${tracking}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  🔗 Open live tracking page on PostEx.pk
                </a>
              </div>
            )}

            <div className="orderActionRow" style={{ marginTop: "12px" }}>
              {!order.postexBooked && !tracking && (
                <button
                  type="button"
                  className="editProductButton"
                  onClick={bookWithPostex}
                  disabled={saving || bookingPostex}
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: (saving || bookingPostex) ? "not-allowed" : "pointer"
                  }}
                >
                  {bookingPostex ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Booking with PostEx...</span>
                    </>
                  ) : (
                    "⚡ Book with PostEx Courier"
                  )}
                </button>
              )}
              {tracking && (
                <button
                  type="button"
                  onClick={() => saveChanges({ fulfillmentStatus: "Booked with PostEx", tracking })}
                  disabled={saving}
                  aria-busy={saving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: saving ? "not-allowed" : "pointer"
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Tracking Number"
                  )}
                </button>
              )}
            </div>
          </section>

          {/* Returns, Exchanges & Refunds */}
          <section className="adminCard orderOpsCard" style={{ padding: "18px" }}>
            <h3>Returns, Exchanges &amp; Refunds</h3>
            <div className="formRow">
              <label>
                Status
                <select value={returnStatus} onChange={(event) => setReturnStatus(event.target.value)}>
                  {returnStatusOptions.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label>
                Reason
                <input value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Size, defect, incorrect item..." />
              </label>
            </div>
            <div className="formRow">
              <label>
                Resolution
                <textarea value={returnResolution} onChange={(event) => setReturnResolution(event.target.value)} rows="2" placeholder="Approved replacement, customer contacted..." />
              </label>
              <label>
                Tags
                <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Urgent, DM, Exchange" />
              </label>
            </div>
            <div className="formRow">
              <label>
                Refund Amount (PKR)
                <input type="number" min="0" max={calculatedOrderTotal} step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} disabled={!canRecordRefund} />
              </label>
              <label>
                Refund Method
                <select value={refundMethod} onChange={(event) => setRefundMethod(event.target.value)} disabled={!canRecordRefund}>
                  <option value="">Select method</option>
                  <option>Bank transfer</option>
                  <option>Easypaisa</option>
                  <option>JazzCash</option>
                  <option>Card reversal</option>
                  <option>Cash</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
            {!canRecordRefund && <p className="shippingRuleHint">Only an Owner can approve or record refund details.</p>}
            {restoringReturnedStock ? (
              <p className="checkoutError">Final check: this will restore {items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} item(s) to stock once.</p>
            ) : null}
            <button
              type="button"
              onClick={() => saveChanges()}
              disabled={saving}
              aria-busy={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: saving ? "not-allowed" : "pointer"
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : restoringReturnedStock ? (
                "Confirm inspection & restore stock"
              ) : (
                "Save return workflow"
              )}
            </button>
          </section>

          {/* Meta Pixel & Conversions API (CAPI) */}
          <section className="adminCard orderOpsCard metaCapiOrderSection" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "18px" }}>
            <div className="inventoryListHead">
              <div>
                <h3 style={{ margin: 0, fontSize: "15px" }}>Meta Pixel &amp; Conversions API (CAPI)</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Conversion tracking and event deduplication</span>
              </div>
              <span className="statusBadge activeStatus" style={{ background: "#dcfce7", color: "#166534" }}>
                CAPI Linked
              </span>
            </div>
            <div style={{ fontSize: "12px", lineHeight: 1.8, color: "#334155", marginTop: "8px" }}>
              <div><b>Shared Event ID:</b> <code>{order.order_number || String(order.id).replace(/^#/, "")}</code></div>
              <div><b>Conversion Value:</b> Rs. {savedMoney.total.toLocaleString()} (PKR)</div>
            </div>
            <div className="orderActionRow" style={{ marginTop: "10px" }}>
              {onNavigateToEvents && (
                <button type="button" onClick={() => onNavigateToEvents(order.order_number || order.id)}>
                  🔍 View in Events Log
                </button>
              )}
              <button type="button" className="editProductButton" onClick={resyncOrderMetaPurchase} disabled={resyncingCapi || saving}>
                {resyncingCapi ? "Dispatching..." : "⚡ Re-sync Meta Purchase"}
              </button>
            </div>
          </section>

          {/* Order Timeline */}
          <section className="adminCard orderOpsCard" style={{ padding: "18px" }}>
            <h3>Order Timeline</h3>
            <div className="orderTimeline">
              <div><b>Order Created</b><span>{order.date}</span></div>
              {order.tracking && <div><b>Tracking Assigned</b><span>{order.tracking}</span></div>}
              {(order.operationEvents || []).map((event, index) => (
                <div key={`${event.created_at || "event"}-${index}`}>
                  <b>{event.event_type === "order_operation_updated" ? "Return / refund workflow updated" : formatOrderStatus(event.event_type)}</b>
                  <span>{event.created_at ? new Date(event.created_at).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Just now"}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

const ORDER_SOURCE_BADGES = [
  { match: "instagram", label: "Instagram DM", icon: "📸", tone: "pink" },
  { match: "whatsapp", label: "WhatsApp", icon: "💬", tone: "green" },
  { match: "walk-in", label: "Walk-in", icon: "🏬", tone: "amber" },
  { match: "manual", label: "Manual", icon: "🏬", tone: "amber" },
  { match: "phone", label: "Phone call", icon: "📞", tone: "violet" },
  { match: "facebook", label: "Facebook", icon: "🔵", tone: "blue" },
];

function orderSourceBadge(source = "") {
  const value = String(source || "").toLowerCase();
  return ORDER_SOURCE_BADGES.find((badge) => value.includes(badge.match))
    || { label: "Storefront", icon: "🌐", tone: "slate" };
}

const STANDARD_ITEM_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "FREE SIZE"];

function isCustomItemSize(size = "") {
  const value = String(size || "").trim().toUpperCase();
  return !value || !STANDARD_ITEM_SIZES.includes(value);
}

function whatsappNumber(phone = "") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return `92${digits}`;
}

function OrderTable({
  rows,
  onSelect,
  density = "comfortable",
  selectedOrderIds = [],
  onToggleSelectOrder,
  onToggleSelectAll,
  onPrintStitchingOrder,
  onPrintSingleOrder,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const selectable = Boolean(onToggleSelectOrder);
  const columnCount = selectable ? 8 : 7;

  return (
    <div className={`adminTableWrap orderTableWrap ${density === "compact" ? "compactTable" : ""}`}>
      <table className="adminTable orderTable">
        {/* Eight fixed columns. The date sits with the order identity and the
            tracking number with the courier status, which keeps the whole table
            inside a normal admin viewport instead of hiding a column behind the
            pinned actions cell. */}
        <colgroup>
          {selectable && <col className="colSelect" />}
          <col className="colOrder" />
          <col className="colCustomer" />
          <col className="colItems" />
          <col className="colMoney" />
          <col className="colPayment" />
          <col className="colStatus" />
          <col className="colActions" />
        </colgroup>
        <thead>
          <tr>
            {selectable && (
              <th className="orderCellSelect">
                <input
                  type="checkbox"
                  aria-label="Select all orders"
                  checked={rows.length > 0 && rows.every((row) => selectedOrderIds.includes(row.id))}
                  onChange={onToggleSelectAll}
                />
              </th>
            )}
            <th>Order</th>
            <th>Customer</th>
            <th>Items &amp; notes</th>
            <th>Amount &amp; advance</th>
            <th>Payment</th>
            <th>PostEx status</th>
            <th className="orderCellActions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => {
            const orderItems = normalizeOrderItems(order);
            const money = orderMoney(order);
            const isSelected = selectedOrderIds.includes(order.id);
            const isExpanded = expandedId === order.id;
            const waPhone = whatsappNumber(order.phone);
            const note = order.notes || order.internalNotes || "";
            const source = orderSourceBadge(order.source);
            const statusLabel = order.postexStatus || order.status || "Unbooked";
            const statusKey = orderStatus(order).replaceAll(" ", "").replaceAll("-", "");
            const paymentVerified = String(order.paymentStatus || "").toLowerCase().includes("verified");
            const rowClass = [
              "orderRow",
              isSelected ? "isSelected" : "",
              isExpanded ? "isExpanded" : "",
            ].filter(Boolean).join(" ");

            return (
              <Fragment key={order.id}>
                <tr className={rowClass}>
                  {selectable && (
                    <td className="orderCellSelect" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select order ${order.id}`}
                        checked={isSelected}
                        onChange={() => onToggleSelectOrder(order.id)}
                      />
                    </td>
                  )}

                  <td>
                    <span className="orderRef">{order.id}</span>
                    <span className={`orderSourceTag tone-${source.tone}`}>
                      <i aria-hidden="true">{source.icon}</i>{source.label}
                    </span>
                    <span className="orderMetaLine">{order.date}</span>
                  </td>

                  <td>
                    <span className="orderCustomerName">{order.customer}</span>
                    {order.phone && (
                      <span className="orderContactLine">
                        <span className="orderPhone">{order.phone}</span>
                        {waPhone && (
                          <a
                            className="orderWhatsappTag"
                            href={`https://wa.me/${waPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Chat with ${order.customer} on WhatsApp`}
                          >
                            WhatsApp
                          </a>
                        )}
                      </span>
                    )}
                    <span className="orderMetaLine">📍 {order.city || "—"}</span>
                  </td>

                  <td>
                    <ul className="orderItemList">
                      {orderItems.map((item, index) => (
                        <li key={item.id || index}>
                          <span className="orderItemName">{item.name || item.title}</span>
                          <span className={`orderSizeTag ${isCustomItemSize(item.size) ? "isCustom" : ""}`}>
                            {item.size || "Custom"}
                          </span>
                          {item.color && <span className="orderItemColor">{item.color}</span>}
                          <span className="orderItemQty">× {item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    {note && <p className="orderNotePreview" title={note}>📝 {note}</p>}
                  </td>

                  <td>
                    <span className="orderTotalValue">Rs. {money.total.toLocaleString()}</span>
                    <span className={`orderMoneyLine ${money.hasAdvance ? "isPaid" : "isMuted"}`}>
                      {money.isFullyAdvanced
                        ? "Advance: full (100%)"
                        : money.hasAdvance
                          ? `Advance: Rs. ${money.advance.toLocaleString()}`
                          : "Advance: Rs. 0"}
                    </span>
                    <span className={`orderCodValue ${money.isPrepaid ? "isPrepaid" : ""}`}>
                      COD: {money.isPrepaid ? "Rs. 0 · prepaid" : `Rs. ${money.cod.toLocaleString()}`}
                    </span>
                    {money.codMismatch && (
                      <span
                        className="orderMoneyFlag"
                        title={`PostEx was booked to collect Rs. ${money.bookedCod.toLocaleString()}. Re-book or update the shipment.`}
                      >
                        ⚠ Booked Rs. {money.bookedCod.toLocaleString()}
                      </span>
                    )}
                  </td>

                  <td>
                    <span className="orderPaymentMethod">{order.paymentMethod || "Cash on Delivery"}</span>
                    <span className={`statusBadge orderPaymentBadge ${paymentVerified ? "ok" : "pending"}`}>
                      {order.paymentStatus || "Awaiting Payment"}
                    </span>
                  </td>

                  <td>
                    <span className={`statusBadge orderStatusBadge ${statusKey.toLowerCase()}`}>{statusLabel}</span>
                    {order.tracking
                      ? <span className="orderTrackingTag" title={order.tracking}>🚚 {order.tracking}</span>
                      : <span className="orderMetaLine">Not booked with PostEx</span>}
                    {order.confirmationStatus
                      && !["confirmed", "payment verified", "verified"].includes(String(order.confirmationStatus).toLowerCase()) && (
                      <span className="statusBadge orderStatusNote unconfirmed">⚠️ {order.confirmationStatus}</span>
                    )}
                  </td>

                  <td className="orderCellActions">
                    <div className="orderRowActions">
                      {onSelect && (
                        <button type="button" className="orderActionPrimary" onClick={() => onSelect(order)} aria-label={`Open order ${order.id}`}>
                          View
                        </button>
                      )}
                      {onPrintStitchingOrder && (
                        <button type="button" className="orderActionGhost" onClick={() => onPrintStitchingOrder(order)} title="Print stitching production slip for the workshop">
                          🧵 Slip
                        </button>
                      )}
                      {onPrintSingleOrder && (
                        <button type="button" className="orderActionGhost" onClick={() => onPrintSingleOrder(order)} title="Print the customer invoice for this order">
                          📄 Invoice
                        </button>
                      )}
                      <button
                        type="button"
                        className="orderActionToggle"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? `Hide details for ${order.id}` : `Show details for ${order.id}`}
                        title="Toggle inline details"
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                    </div>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="orderExpandedRow">
                    <td colSpan={columnCount}>
                      <div className="orderExpandedGrid">
                        <section className="orderExpandedCard">
                          <h4>Delivery address</h4>
                          <p>{order.address || order.city || "No address saved"}</p>
                          {waPhone && (
                            <a className="orderWhatsappLink" href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer">
                              💬 Chat on WhatsApp · {order.phone}
                            </a>
                          )}
                        </section>

                        <section className="orderExpandedCard">
                          <h4>Ordered items</h4>
                          <ul className="orderExpandedItems">
                            {orderItems.map((item, index) => (
                              <li key={item.id || index}>
                                <b>{item.name || item.title}</b>
                                <span>Size {item.size || "Standard"}{item.color ? ` · ${item.color}` : ""} · × {item.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        </section>

                        <section className="orderExpandedCard">
                          <h4>Financial breakdown</h4>
                          <dl className="orderExpandedMoney">
                            <div><dt>Product subtotal</dt><dd>Rs. {money.subtotal.toLocaleString()}</dd></div>
                            <div><dt>Delivery charges</dt><dd>Rs. {money.delivery.toLocaleString()}</dd></div>
                            <div><dt>Total order value</dt><dd>Rs. {money.total.toLocaleString()}</dd></div>
                            <div><dt>Advance received</dt><dd className="isPaid">Rs. {money.advance.toLocaleString()}</dd></div>
                            <div className="isTotalRow">
                              <dt>PostEx COD to collect</dt>
                              <dd className={money.isPrepaid ? "isPrepaid" : "isDue"}>Rs. {money.cod.toLocaleString()}</dd>
                            </div>
                          </dl>
                          {money.codMismatch && (
                            <p className="orderMoneyNotice orderMoneyNoticeWarn">
                              PostEx is booked to collect Rs. {money.bookedCod.toLocaleString()}. Update the shipment so the rider collects Rs. {money.cod.toLocaleString()}.
                            </p>
                          )}
                        </section>

                        <section className="orderExpandedCard orderExpandedNotes">
                          <h4>Workshop notes</h4>
                          <p className="orderExpandedNoteBody">{note || "No special tailor instructions."}</p>
                          {onSelect && (
                            <button type="button" className="orderActionPrimary" onClick={() => onSelect(order)}>
                              Open order editor
                            </button>
                          )}
                        </section>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {!rows.length && (
        <EmptyState
          icon={ShoppingBag}
          title="No orders found"
          description="There are no orders matching this status or search filter."
        />
      )}
    </div>
  );
}

function buildCustomerProfiles(orders) {
  const profiles = new Map();
  orders.forEach((order) => {
    const key = (order.phone || order.customer || order.id).toLowerCase();
    const existing = profiles.get(key) || {
      id: key,
      name: order.customer || "Guest",
      phone: order.phone || "",
      email: order.raw?.guest_email || order.raw?.shipping_email || "",
      city: order.city || "",
      address: order.address || "",
      orders: [],
      totalSpent: 0,
      tags: [],
      notes: "",
    };
    existing.orders.push(order);
    if (isRevenueOrder(order)) existing.totalSpent += Number(order.total || 0);
    existing.lastOrder = order.date;
    profiles.set(key, existing);
  });
  if (!profiles.size) {
    [
      { name: "Ayesha Khan", phone: "0300 1112223", city: "Lahore", totalSpent: 21480, tags: ["VIP", "Repeat buyer"] },
      { name: "Hira Ali", phone: "0312 9876543", city: "Karachi", totalSpent: 12990, tags: ["Instagram DM"] },
      { name: "Mahnoor Shah", phone: "0333 4567890", city: "Islamabad", totalSpent: 4490, tags: ["New customer"] },
    ].forEach((customer, index) => profiles.set(customer.phone, { ...customer, id: customer.phone, email: "", address: customer.city, orders: demoOrders.slice(index, index + 2), notes: "", lastOrder: demoOrders[index]?.date || "No orders" }));
  }
  return [...profiles.values()].map((customer) => {
    const tags = new Set(customer.tags || []);
    if (customer.totalSpent >= 20000) tags.add("VIP");
    if ((customer.orders || []).length > 1) tags.add("Repeat buyer");
    if (!tags.size) tags.add("New customer");
    return { ...customer, tags: [...tags] };
  });
}

function DashboardAnalytics({ orders, products, connected, period, setPeriod }) {
  const days = Number(period);
  const end = new Date();
  const start = new Date(end); start.setDate(start.getDate() - days);
  const previousStart = new Date(start); previousStart.setDate(previousStart.getDate() - days);
  const orderDate = (order) => new Date(order.createdAt || order.raw?.created_at || 0);
  const scoped = (orders || []).filter((order) => { const date = orderDate(order); return !Number.isNaN(date.getTime()) && date >= start; });
  const previousScoped = (orders || []).filter((order) => { const date = orderDate(order); return !Number.isNaN(date.getTime()) && date >= previousStart && date < start; });
  const delivered = scoped.filter(isDeliveredOrder);
  const returned = scoped.filter(isReturnedOrder);
  const sales = delivered.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const previousSales = previousScoped.filter(isDeliveredOrder).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const salesChange = previousSales > 0 ? Math.round(((sales - previousSales) / previousSales) * 100) : null;
  const customerKeys = delivered.map(orderCustomerIdentity).filter(Boolean);
  const customerOrderCounts = customerKeys.reduce((map, key) => map.set(key, (map.get(key) || 0) + 1), new Map());
  const repeatCustomers = [...customerOrderCounts.values()].filter((count) => count > 1).length;
  const items = delivered.flatMap((order) => normalizeOrderItems(order.raw || order));
  const productsById = new Map((products || []).map((product) => [String(product.id), product]));
  const productsBySku = new Map((products || []).map((product) => [String(product.sku || product.articleNumber || "").trim().toLowerCase(), product]).filter(([key]) => key));
  const productsByName = new Map((products || []).map((product) => [String(product.name || "").trim().toLowerCase(), product]));
  const productSales = items.reduce((map, item) => {
    const product = productsById.get(String(item.productId)) || productsBySku.get(String(item.sku || "").trim().toLowerCase()) || productsByName.get(String(item.name || "").trim().toLowerCase());
    const key = product ? `id:${product.id}` : `item:${String(item.sku || item.name || "unknown").trim().toLowerCase()}`;
    const current = map.get(key) || { key, product, name: product?.name || item.name || "Unknown product", sku: product?.sku || product?.articleNumber || item.sku || "—", quantity: 0 };
    current.quantity += Number(item.quantity || 0);
    map.set(key, current);
    return map;
  }, new Map());
  const topProducts = [...productSales.values()].sort((a,b) => b.quantity - a.quantity).slice(0, 5);
  const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
  return <section className="analyticsSystem" aria-labelledby="dashboard-analytics-heading"><div className="adminTitle dashboardAnalyticsTitle"><div><p>BUSINESS INTELLIGENCE</p><h2 id="dashboard-analytics-heading">Performance analytics</h2><span>{connected ? "Live delivered-order performance, matched by customer identity and product ID / SKU." : "Connect live orders to view performance."}</span></div><div className="orderTabs" aria-label="Analytics period">{[["7","7 days"],["30","30 days"],["90","90 days"]].map(([value,label]) => <button type="button" className={period === value ? "active" : ""} aria-pressed={period === value} onClick={() => setPeriod(value)} key={value}>{label}</button>)}</div></div><div className="miniMetricGrid financeMetrics"><article><CircleDollarSign /><span><b>{money(sales)}</b>Delivered sales <small className={salesChange !== null && salesChange < 0 ? "metricTrendDown" : "metricTrendUp"}>{salesChange === null ? "No prior-period baseline" : `${salesChange >= 0 ? "+" : ""}${salesChange}% vs previous ${days} days`}</small></span></article><article><ShoppingBag /><span><b>{delivered.length}</b>Fulfilled orders</span></article><article><TrendingUp /><span><b>{money(delivered.length ? sales / delivered.length : 0)}</b>Average order value</span></article><article><Users /><span><b>{customerOrderCounts.size ? Math.round(repeatCustomers / customerOrderCounts.size * 100) : 0}%</b>Repeat customer rate</span></article><article className={returned.length ? "alertMetric" : ""}><Package /><span><b>{returned.length}</b>Returned orders</span></article></div><div className="financeGrid financeGridWide"><div className="adminCard managementCard"><div className="inventoryListHead"><div><h2>Top products sold</h2><span>Delivered units matched by product ID, then SKU, then exact product name.</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Product / SKU</th><th>Units sold</th><th>Current stock</th></tr></thead><tbody>{topProducts.map((row) => <tr key={row.key}><td><b>{row.name}</b><small className="trackingNumber">{row.sku}</small></td><td>{row.quantity}</td><td>{row.product?.stock ?? "—"}</td></tr>)}{!topProducts.length && <tr><td colSpan="3" className="emptyFinanceCell">No delivered product sales in this period.</td></tr>}</tbody></table></div></div><div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Operations health</h2><p>Actionable indicators for the selected period.</p></div></div><div className="financeStatement"><div><span>Return rate</span><b>{delivered.length + returned.length ? Math.round(returned.length / (delivered.length + returned.length) * 100) : 0}%</b></div><div><span>Low-stock products</span><b>{products.filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5)).length}</b></div><div><span>Products with missing cost</span><b>{products.filter((product) => !Number(product.costTotalPkr || 0)).length}</b></div><div className="statementTotal"><span>Next action</span><b>{products.some((product) => !Number(product.costTotalPkr || 0)) ? "Add missing product costs" : "Review low stock"}</b></div></div></div></div></section>;
}

function CustomersPanel({ orders, onOpen }) {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("All");
  const [selectedId, setSelectedId] = useState("");
  const [edits, setEdits] = useState({});
  const customers = useMemo(() => buildCustomerProfiles(orders).map((customer) => ({ ...customer, ...(edits[customer.id] || {}) })), [edits, orders]);
  const segments = ["All","VIP","Repeat buyer","New customer","Instagram DM"];
  const visibleCustomers = customers.filter((customer) => {
    const matchesSegment = segment === "All" || (customer.tags || []).includes(segment);
    const query = search.toLowerCase();
    const matchesSearch = [customer.name, customer.phone, customer.email, customer.city, ...(customer.tags || [])].join(" ").toLowerCase().includes(query);
    return matchesSegment && matchesSearch;
  });
  const selectedCustomer = customers.find((customer) => customer.id === selectedId);
  const segmentVisual = segments.filter((item) => item !== "All").map((item, index) => ({
    label: item,
    value: customers.filter((customer) => (customer.tags || []).includes(item)).length,
    color: ["#1d6840", "#4777a8", "#c78b2b", "#8d2449"][index] || "#1d6840",
  })).filter((item) => item.value > 0);
  const spendVisual = customers.slice().sort((a, b) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0)).slice(0, 6).map((customer, index) => ({
    label: customer.name,
    value: Number(customer.totalSpent || 0),
    color: ["#1d6840", "#4777a8", "#c78b2b", "#8d2449", "#6c7b43", "#7d5ba6"][index] || "#1d6840",
  }));

  function updateCustomer(customerId, changes) {
    setEdits((current) => ({ ...current, [customerId]: { ...(current[customerId] || {}), ...changes } }));
  }

  function exportCustomers() {
    const csv = [
      ["Name","Phone","Email","City","Orders","Total spent","Tags","Notes"],
      ...customers.map((customer) => [customer.name, customer.phone, customer.email, customer.city, customer.orders.length, customer.totalSpent, customer.tags.join(" | "), customer.notes || ""]),
    ].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `bustaniya-customers-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <><div className="adminTitle"><div><p>CUSTOMERS</p><h1>Customers</h1><span>Profiles, order history, total spent, segments, tags and notes.</span></div><button onClick={() => onOpen({ module: "Customers", feature: "Add customer", create: true })}><Plus /> Add customer</button></div>
    <div className="miniMetricGrid productMetrics"><article><Users /><span><b>{customers.length}</b>Customers</span></article><article><Tags /><span><b>{customers.filter((c) => c.tags.includes("VIP")).length}</b>VIP</span></article><article><ShoppingBag /><span><b>{customers.reduce((sum, customer) => sum + customer.orders.length, 0)}</b>Orders</span></article><article><CircleDollarSign /><span><b>Rs. {customers.reduce((sum, customer) => sum + Number(customer.totalSpent || 0), 0).toLocaleString()}</b>Total spent</span></article></div>
    <section className="adminCard managementCard">
      <div className="catalogToolbar">
        <div className="orderTabs">{segments.map((item) => <button key={item} className={segment === item ? "active" : ""} onClick={() => setSegment(item)}>{item}</button>)}</div>
        <div className="catalogActions">
          <div className="inlineSearch"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers..." /></div>
          <button onClick={exportCustomers}>Export CSV</button>
        </div>
      </div>
      <div className="adminTableWrap"><table className="adminTable customerTable"><thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Total spent</th><th>Last order</th><th>Tags</th><th /></tr></thead><tbody>
        {visibleCustomers.map((customer) => <tr key={customer.id}><td><b>{customer.name}</b><small className="trackingNumber"><br />{customer.city || "No city"}</small></td><td>{customer.phone || "-"}<small className="trackingNumber"><br />{customer.email || "No email"}</small></td><td>{customer.orders.length}</td><td><b>Rs. {Number(customer.totalSpent || 0).toLocaleString()}</b></td><td>{customer.lastOrder || "-"}</td><td><div className="tagList">{customer.tags.map((tag) => <span key={tag} className="statusBadge active">{tag}</span>)}</div></td><td><button className="editProductButton" onClick={() => setSelectedId(customer.id)}>Open</button></td></tr>)}
      </tbody></table>
      {!visibleCustomers.length && <EmptyState icon={Users} title="No customers found" description="No customer profiles match your search query or selected segment." />}
      </div>
    </section>
    {selectedCustomer && <CustomerProfileDrawer customer={selectedCustomer} onClose={() => setSelectedId("")} onUpdate={updateCustomer} />}
  </>;
}

function CustomerProfileDrawer({ customer, onClose, onUpdate }) {
  const [tags, setTags] = useState((customer.tags || []).join(", "));
  const [notes, setNotes] = useState(customer.notes || "");
  const [email, setEmail] = useState(customer.email || "");

  function saveCustomer() {
    onUpdate(customer.id, {
      email,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      notes,
    });
  }

  return <><div className="adminOverlay" onClick={onClose} /><aside className="orderDetailDrawer">
    <header><div><p>CUSTOMER PROFILE</p><h2>{customer.name}</h2><span>Rs. {Number(customer.totalSpent || 0).toLocaleString()} spent - {customer.orders.length} orders</span></div><button onClick={onClose}><X /></button></header>
    <div className="orderDetailBody">
      <section className="orderDetailGrid customerProfileGrid">
        <article className="adminCard orderDetailCard"><h3>Contact</h3><b>{customer.phone || "No phone"}</b><label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="customer@email.com" /></label><p>{customer.address || customer.city || "No address saved"}</p></article>
        <article className="adminCard orderDetailCard"><h3>Segment</h3><b>{customer.tags?.[0] || "New customer"}</b><span>{customer.orders.length > 1 ? "Repeat buyer" : "First purchase"}</span></article>
        <article className="adminCard orderDetailCard"><h3>Total spent</h3><b>Rs. {Number(customer.totalSpent || 0).toLocaleString()}</b><span>{customer.orders.length} orders</span></article>
      </section>
      <section className="adminCard orderOpsCard"><h3>Tags and notes</h3><label>Customer tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="VIP, Repeat buyer, Instagram DM" /></label><label>Customer notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="5" placeholder="Preferences, sizing, complaints, delivery instructions" /></label><button onClick={saveCustomer}>Save customer</button></section>
      <section className="adminCard orderItemsCard"><div className="inventoryListHead"><div><h2>Order history</h2><span>{customer.orders.length} orders</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th>Tracking</th></tr></thead><tbody>{customer.orders.map((order) => <tr key={order.id}><td><b>{order.id}</b></td><td>{order.date}</td><td>{order.postexStatus || order.status}</td><td>Rs. {Number(order.total || 0).toLocaleString()}</td><td>{order.tracking || "-"}</td></tr>)}</tbody></table></div></section>
    </div>
  </aside></>;
}

function BackendHealthPanel() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHealth() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/system-health", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to run backend health check.");
      setHealth(result);
    } catch (healthError) {
      setError(healthError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHealth();
  }, []);

  const summary = health?.summary || { ok: 0, warning: 0, fail: 0 };
  const checks = health?.checks || [];
  const completenessSummary = health?.completenessSummary || { complete: 0, partial: 0, missing: 0 };
  const completeness = health?.completeness || [];
  const securitySummary = health?.securitySummary || { ok: 0, warning: 0, fail: 0 };
  const securityAudit = health?.securityAudit || [];
  const deploymentSummary = health?.deploymentSummary || { ok: 0, warning: 0, fail: 0 };
  const deploymentAudit = health?.deploymentAudit || [];
  const performanceSummary = health?.performanceSummary || { ok: 0, warning: 0, fail: 0 };
  const performanceAudit = health?.performanceAudit || [];
  const healthTotal = Math.max(1, Number(summary.ok || 0) + Number(summary.warning || 0) + Number(summary.fail || 0));
  const completenessTotal = Math.max(1, Number(completenessSummary.complete || 0) + Number(completenessSummary.partial || 0) + Number(completenessSummary.missing || 0));
  const securityTotal = Math.max(1, Number(securitySummary.ok || 0) + Number(securitySummary.warning || 0) + Number(securitySummary.fail || 0));
  const statusClass = (status) => status === "ok" ? "activeStatus" : status === "warning" ? "processing" : "cancelled";
  const completenessStatusClass = (status) => status === "complete" ? "activeStatus" : status === "partial" ? "processing" : "cancelled";

  return <div className="settingsStack">
    <section className="adminCard settingsForm settingsWideForm">
      <div className="inventoryListHead">
        <div>
          <h2>Supabase backend health</h2>
          <span>Read-only audit for database tables, required env config and public-data safety.</span>
        </div>
        <button type="button" onClick={loadHealth} disabled={loading} aria-busy={loading}><RefreshCw /> {loading ? "Checking..." : "Refresh"}</button>
      </div>
      {error && <div className="adminErrorBanner">{error}</div>}
      <div className="dashboardMiniGrid">
        <article className="miniMetricCard"><span>Healthy</span><b>{summary.ok || 0}</b><small>Passing checks</small></article>
        <article className="miniMetricCard"><span>Needs review</span><b>{summary.warning || 0}</b><small>Warnings</small></article>
        <article className="miniMetricCard"><span>Fix now</span><b>{summary.fail || 0}</b><small>Failed checks</small></article>
      </div>
      <div className="adminVisualGrid">
        <section className="adminVisualCard">
          <div className="adminVisualHead"><div><h3>Readiness score</h3><p>Backend connectivity, module readiness and security coverage.</p></div></div>
          <VisualProgress label="Backend health" value={(Number(summary.ok || 0) / healthTotal) * 100} helper={`${summary.ok || 0} passing · ${summary.warning || 0} warnings · ${summary.fail || 0} failed`} color="#1d6840" />
          <VisualProgress label="Feature completeness" value={(Number(completenessSummary.complete || 0) / completenessTotal) * 100} helper={`${completenessSummary.complete || 0} of ${completenessTotal} modules complete`} color="#4777a8" />
          <VisualProgress label="Security checks" value={(Number(securitySummary.ok || 0) / securityTotal) * 100} helper={`${securitySummary.ok || 0} of ${securityTotal} checks secure`} color="#287a4c" />
        </section>
        <VisualDonut
          title="Backend status split"
          subtitle="Instant pass/warn/fail view."
          centerValue={summary.ok || 0}
          centerLabel="passing"
          items={[
            { label: "OK", value: summary.ok || 0, color: "#1d6840" },
            { label: "Warning", value: summary.warning || 0, color: "#d08a18" },
            { label: "Fail", value: summary.fail || 0, color: "#b73543" },
          ]}
        />
      </div>
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead><tr><th>Area</th><th>Check</th><th>Status</th><th>Detail</th><th>Next action</th></tr></thead>
          <tbody>
            {checks.map((check) => <tr key={`${check.area}-${check.name}`}>
              <td>{check.area}</td>
              <td><b>{check.name}</b></td>
              <td><span className={`statusBadge ${statusClass(check.status)}`}>{check.status}</span></td>
              <td>{check.detail}</td>
              <td>{check.action || "No action needed."}</td>
            </tr>)}
          </tbody>
        </table>
        {!checks.length && <div className="inventoryEmpty">{loading ? "Running backend checks..." : "No health checks available."}</div>}
      </div>
      <p className="paymentSecurityNote">Note: secret values are never shown here. This panel only confirms whether backend configuration and critical tables are reachable.</p>
    </section>
    <section className="adminCard settingsForm settingsWideForm">
      <div className="inventoryListHead">
        <div>
          <h2>Performance audit</h2>
          <span>API latency, image optimisation, bundle size, caching, loading states and layout stability.</span>
        </div>
      </div>
      <div className="dashboardMiniGrid">
        <article className="miniMetricCard"><span>Good</span><b>{performanceSummary.ok || 0}</b><small>Passing checks</small></article>
        <article className="miniMetricCard"><span>Review</span><b>{performanceSummary.warning || 0}</b><small>Optimise soon</small></article>
        <article className="miniMetricCard"><span>Slow/Risk</span><b>{performanceSummary.fail || 0}</b><small>Must fix</small></article>
      </div>
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead><tr><th>Area</th><th>Performance check</th><th>Status</th><th>Detail</th><th>Action</th></tr></thead>
          <tbody>
            {performanceAudit.map((item) => <tr key={`${item.area}-${item.check}`}>
              <td>{item.area}</td>
              <td><b>{item.check}</b></td>
              <td><span className={`statusBadge ${statusClass(item.status)}`}>{item.status}</span></td>
              <td>{item.detail}</td>
              <td>{item.action || "No action needed."}</td>
            </tr>)}
          </tbody>
        </table>
        {!performanceAudit.length && <div className="inventoryEmpty">{loading ? "Checking performance..." : "No performance audit data available."}</div>}
      </div>
      <p className="paymentSecurityNote">Performance note: these are lightweight server-side samples, not a replacement for Lighthouse/Web Vitals, but they quickly highlight the biggest operational bottlenecks.</p>
    </section>
    <section className="adminCard settingsForm settingsWideForm">
      <div className="inventoryListHead">
        <div>
          <h2>Vercel deployment audit</h2>
          <span>Production environment, domain, HTTPS, env readiness and serverless behaviour.</span>
        </div>
      </div>
      <div className="dashboardMiniGrid">
        <article className="miniMetricCard"><span>Ready</span><b>{deploymentSummary.ok || 0}</b><small>Passing checks</small></article>
        <article className="miniMetricCard"><span>Review</span><b>{deploymentSummary.warning || 0}</b><small>Warnings</small></article>
        <article className="miniMetricCard"><span>Broken</span><b>{deploymentSummary.fail || 0}</b><small>Must fix</small></article>
      </div>
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead><tr><th>Area</th><th>Deployment check</th><th>Status</th><th>Detail</th><th>Action</th></tr></thead>
          <tbody>
            {deploymentAudit.map((item) => <tr key={`${item.area}-${item.check}`}>
              <td>{item.area}</td>
              <td><b>{item.check}</b></td>
              <td><span className={`statusBadge ${statusClass(item.status)}`}>{item.status}</span></td>
              <td>{item.detail}</td>
              <td>{item.action || "No action needed."}</td>
            </tr>)}
          </tbody>
        </table>
        {!deploymentAudit.length && <div className="inventoryEmpty">{loading ? "Checking Vercel deployment..." : "No deployment audit data available."}</div>}
      </div>
      <p className="paymentSecurityNote">Vercel audit note: environment-variable values are never printed. For detailed build/runtime logs, use the Vercel dashboard.</p>
    </section>
    <section className="adminCard settingsForm settingsWideForm">
      <div className="inventoryListHead">
        <div>
          <h2>Authentication & admin security</h2>
          <span>Login, logout, sessions, roles, secrets and server-side authorization checks.</span>
        </div>
      </div>
      <div className="dashboardMiniGrid">
        <article className="miniMetricCard"><span>Secure</span><b>{securitySummary.ok || 0}</b><small>Passing checks</small></article>
        <article className="miniMetricCard"><span>Review</span><b>{securitySummary.warning || 0}</b><small>Warnings</small></article>
        <article className="miniMetricCard"><span>Risk</span><b>{securitySummary.fail || 0}</b><small>Must fix</small></article>
      </div>
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead><tr><th>Area</th><th>Security check</th><th>Status</th><th>Detail</th><th>Action</th></tr></thead>
          <tbody>
            {securityAudit.map((item) => <tr key={`${item.area}-${item.check}`}>
              <td>{item.area}</td>
              <td><b>{item.check}</b></td>
              <td><span className={`statusBadge ${statusClass(item.status)}`}>{item.status}</span></td>
              <td>{item.detail}</td>
              <td>{item.action || "No action needed."}</td>
            </tr>)}
          </tbody>
        </table>
        {!securityAudit.length && <div className="inventoryEmpty">{loading ? "Checking admin security..." : "No security audit data available."}</div>}
      </div>
      <p className="paymentSecurityNote">Security note: this audit never prints passwords, tokens or secret values. It only reports whether risky configuration is present.</p>
    </section>
    <section className="adminCard settingsForm settingsWideForm">
      <div className="inventoryListHead">
        <div>
          <h2>Database completeness</h2>
          <span>Feature-by-feature backend support matrix for the ecommerce system.</span>
        </div>
      </div>
      <div className="dashboardMiniGrid">
        <article className="miniMetricCard"><span>Complete</span><b>{completenessSummary.complete || 0}</b><small>Ready feature areas</small></article>
        <article className="miniMetricCard"><span>Partial</span><b>{completenessSummary.partial || 0}</b><small>Needs DB polish</small></article>
        <article className="miniMetricCard"><span>Missing</span><b>{completenessSummary.missing || 0}</b><small>Needs setup</small></article>
      </div>
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead><tr><th>Feature</th><th>Status</th><th>Required tables</th><th>Purpose</th><th>Gap / action</th></tr></thead>
          <tbody>
            {completeness.map((item) => <tr key={item.feature}>
              <td><b>{item.feature}</b>{item.note && <small className="trackingNumber">{item.note}</small>}</td>
              <td><span className={`statusBadge ${completenessStatusClass(item.status)}`}>{item.status}</span></td>
              <td><div className="tagList">{(item.requiredTables || []).map((table) => <span key={table}>{table}</span>)}</div></td>
              <td>{item.purpose}</td>
              <td>{item.gaps?.length ? <ul className="compactIssueList">{item.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul> : item.action}</td>
            </tr>)}
          </tbody>
        </table>
        {!completeness.length && <div className="inventoryEmpty">{loading ? "Checking database completeness..." : "No completeness data available."}</div>}
      </div>
      <p className="paymentSecurityNote">This matrix avoids unnecessary tables: for example, customer profiles and discounts can stay lightweight until real business rules require dedicated tables.</p>
    </section>
  </div>;
}

function SettingsPanel({ onOpen, signedInUser, initialTab = "" }) {
  const [activeTab, setActiveTab] = useState(initialTab || "Store");
  const [savedAt, setSavedAt] = useState("");
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);
  const [storeSettingsLoading, setStoreSettingsLoading] = useState(false);
  const [storeSettingsError, setStoreSettingsError] = useState("");
  const [storeSettingsSetup, setStoreSettingsSetup] = useState("");
  const [heroUrlInputs, setHeroUrlInputs] = useState({});
  const [staff, setStaff] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [currentAdminUser, setCurrentAdminUser] = useState(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffSaved, setStaffSaved] = useState("");
  const [capiTesting, setCapiTesting] = useState(false);
  const [capiTestResult, setCapiTestResult] = useState(null);
  const [shippingZones, setShippingZones] = useState([
    { zone: "Pakistan - Standard", cities: "All PostEx service cities", rate: "Rs. 200 COD", freeAbove: "Rs. 5,000" },
    { zone: "Lahore same-day", cities: "Lahore", rate: "Rs. 250", freeAbove: "Rs. 8,000" },
  ]);

  async function testCapiConnection() {
    setCapiTesting(true);
    setCapiTestResult(null);
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_event", eventName: "PageView" }),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.error || result.result?.error || "Meta API responded with error.");
      }
      setCapiTestResult({
        success: true,
        message: `✅ Test PageView event sent successfully to Meta CAPI! (Events received: ${result.result?.result?.events_received ?? 1}, fbtrace_id: ${result.result?.result?.fbtrace_id || "OK"})`,
      });
    } catch (err) {
      setCapiTestResult({
        success: false,
        message: `❌ CAPI test failed: ${err.message}`,
      });
    } finally {
      setCapiTesting(false);
    }
  }
  const canManageUsers = canUseAdminArea(signedInUser, "users");
  const tabs = ["Store", "Sections", "Tracking", "SizeChart", "Payments", "Shipping", ...(canManageUsers ? ["Users"] : []), "Notifications", "Domains", "Checkout", "System"];

  useEffect(() => {
    if (["Store", "Sections", "Tracking", "SizeChart", "Payments", "Shipping", "Notifications", "Domains", "Checkout"].includes(activeTab)) {
      loadStoreSettings();
    }
    if (activeTab === "Users") loadAdminUsers();
  }, [activeTab]);

  async function addHeroImageUrl(field) {
    const url = String(heroUrlInputs[field] || "").trim();
    if (!url) return;
    if (!url.startsWith("/") && !/^https?:\/\//i.test(url)) {
      setStoreSettingsError("Paste a valid image URL (https://...) or local image path (e.g. /hero-image.jpg).");
      return;
    }
    setStoreSettingsError("");
    setStoreSettings((current) => {
      const defaultImg = field === "heroDesktopImages" ? DEFAULT_STORE_SETTINGS.heroDesktopImage : DEFAULT_STORE_SETTINGS.heroMobileImage;
      const legacyField = field === "heroDesktopImages" ? "heroDesktopImage" : "heroMobileImage";
      const currentList = normalizeHeroImages(current[field] || current[legacyField], defaultImg);
      const isOnlyDefault = currentList.length === 1 && (
        currentList[0] === DEFAULT_STORE_SETTINGS.heroDesktopImage ||
        currentList[0] === DEFAULT_STORE_SETTINGS.heroMobileImage ||
        currentList[0] === "/bustaniya-campaign-hero-v5.png" ||
        currentList[0] === "/bustaniya-campaign-hero-mobile-v1.png"
      );
      const nextImages = isOnlyDefault ? [url] : [...currentList, url];
      return {
        ...current,
        [field]: nextImages,
        [legacyField]: nextImages[0] || "",
      };
    });
    setHeroUrlInputs((current) => ({ ...current, [field]: "" }));
  }

  function updateHeroContent(device, changes) {
    const key = device === "mobile" ? "heroMobileContent" : "heroDesktopContent";
    setStoreSettings((current) => {
      const fallback = device === "mobile"
        ? { ...(current.heroMobileContent || current.heroDesktopContent || {}), position: "bottom" }
        : (current.heroDesktopContent || {
          eyebrow: current.heroEyebrow || "",
          heading: current.heroHeading || "",
          supportingText: current.heroSupportingText || "",
          primaryButtonText: current.heroPrimaryButtonText || "",
          primaryButtonLink: current.heroPrimaryButtonLink || "#products",
          secondaryButtonText: current.heroSecondaryButtonText || "",
          secondaryButtonLink: current.heroSecondaryButtonLink || "",
          alignment: current.heroTextAlignment || "left",
          position: current.heroTextPosition || "left",
        });
      return { ...current, [key]: { ...fallback, ...changes } };
    });
  }

  async function loadStoreSettings() {
    setStoreSettingsLoading(true);
    setStoreSettingsError("");
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load store settings.");
      const nextSettings = result.settings || DEFAULT_STORE_SETTINGS;
      setStoreSettings(nextSettings);
      setShippingZones(nextSettings.shippingZones || DEFAULT_STORE_SETTINGS.shippingZones);
      setStoreSettingsSetup(result.needsSetup ? `Run ${result.setupSql || "scripts/supabase-store-settings.sql"} in Supabase before saving live settings.` : "");
    } catch (error) {
      setStoreSettingsError(error.message);
    } finally {
      setStoreSettingsLoading(false);
    }
  }

  async function loadAdminUsers() {
    setStaffLoading(true);
    setStaffError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load admin users.");
      setStaff(result.users || []);
      setAvailablePermissions(result.permissions || []);
      setCurrentAdminUser(result.currentUser || null);
    } catch (error) {
      setStaffError(error.message);
    } finally {
      setStaffLoading(false);
    }
  }

  async function saveStoreSettings(event) {
    event.preventDefault();
    setStoreSettingsLoading(true);
    setStoreSettingsError("");
    setStoreSettingsSetup("");
    setSavedAt("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: storeSettings }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save store settings.");
      setStoreSettings(result.settings || storeSettings);
      if (result.needsSetup) {
        setStoreSettingsSetup(`Run ${result.setupSql || "scripts/supabase-store-settings.sql"} in Supabase before saving live settings.`);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" }));
    } catch (error) {
      setStoreSettingsError(error.message);
    } finally {
      setStoreSettingsLoading(false);
    }
  }

  function saveSettings(event) {
    return saveStoreSettings(event);
  }

  function updateSettingsGroup(group, changes) {
    setStoreSettings((current) => ({ ...current, [group]: { ...(DEFAULT_STORE_SETTINGS[group] || {}), ...(current[group] || {}), ...changes } }));
  }

  function updateAnnouncement(index, changes) {
    setStoreSettings((current) => ({
      ...current,
      announcements: (current.announcements || []).map((announcement, itemIndex) =>
        itemIndex === index ? { ...announcement, ...changes } : announcement
      ),
    }));
  }

  function addAnnouncement() {
    setStoreSettings((current) => ({
      ...current,
      announcements: [
        ...(current.announcements || []),
        {
          id: `announcement-${Date.now()}`,
          text: "",
          linkLabel: "",
          linkHref: "",
          enabled: true,
        },
      ],
    }));
  }

  function removeAnnouncement(index) {
    setStoreSettings((current) => {
      const nextAnnouncements = (current.announcements || []).filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        announcements: nextAnnouncements.length ? nextAnnouncements : [{
          id: `announcement-${Date.now()}`,
          text: "",
          linkLabel: "",
          linkHref: "",
          enabled: true,
        }],
      };
    });
  }

  function updatePaymentSettings(changes) {
    setStoreSettings((current) => ({
      ...current,
      paymentSettings: {
        ...DEFAULT_STORE_SETTINGS.paymentSettings,
        ...(current.paymentSettings || {}),
        ...changes,
      },
    }));
  }

  function addStaff(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const permissions = availablePermissions.filter((permission) => form.get(`permission-${permission}`));
    setStaffError("");
    setStaffSaved("");
    setStaffLoading(true);
    fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
        permissions,
      }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to create admin user.");
        formElement.reset();
        setStaffSaved("Admin user added.");
        await loadAdminUsers();
      })
      .catch((error) => setStaffError(error.message))
      .finally(() => setStaffLoading(false));
  }

  async function updateStaffUser(userId, changes) {
    setStaffError("");
    setStaffSaved("");
    setStaffLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...changes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update admin user.");
      setStaffSaved("Admin access updated.");
      await loadAdminUsers();
    } catch (error) {
      setStaffError(error.message);
    } finally {
      setStaffLoading(false);
    }
  }

  async function deleteStaffUser(userId) {
    const user = staff.find((u) => u.id === userId);
    requestConfirm({
      title: "Remove Admin User",
      message: `Are you sure you want to remove admin user "${user?.name || "this user"}"? They will lose access to the admin portal.`,
      confirmText: "Remove User",
      isDanger: true,
      onConfirm: async () => {
        setStaffError("");
        setStaffSaved("");
        setStaffLoading(true);
        try {
          const response = await fetch("/api/admin/users", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Unable to remove admin user.");
          setStaffSaved("Admin user removed.");
          await loadAdminUsers();
        } catch (error) {
          setStaffError(error.message);
        } finally {
          setStaffLoading(false);
        }
      },
    });
  }

  function addShippingZone(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextZone = {
      id: `shipping-zone-${Date.now()}`,
      zone: String(form.get("zone") || "New zone"),
      cities: String(form.get("cities") || "Selected cities"),
      rate: Math.max(0, Number(form.get("rate") || 0)),
      freeAbove: Math.max(0, Number(form.get("freeAbove") || 0)),
    };
    setShippingZones((current) => [...current, nextZone]);
    setStoreSettings((current) => ({ ...current, shippingZones: [...(current.shippingZones || []), nextZone] }));
    event.currentTarget.reset();
  }

  function removeShippingZone(index) {
    const updated = (shippingZones || []).filter((_, idx) => idx !== index);
    setShippingZones(updated);
    setStoreSettings((current) => ({ ...current, shippingZones: updated }));
  }

  function updateDeliverySettings(changes) {
    setStoreSettings((current) => ({
      ...current,
      deliverySettings: {
        ...(DEFAULT_STORE_SETTINGS.deliverySettings || {}),
        ...(current.deliverySettings || {}),
        ...changes,
      },
    }));
  }


  return <><div className="adminTitle"><div><p>CONFIGURATION</p><h1>Settings</h1><span>Manage storefront and workspace configuration. Store Details changes save live; use the relevant section to save its settings.</span></div></div>
{savedAt && <div className="adminErrorBanner settingsSaved">Store settings saved at {savedAt}.</div>}
    <section className="settingsLayout">
      <aside className="settingsNav">{tabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}<span>{settingsTabHint(tab)}</span></button>)}</aside>
      <div className="settingsPanel">
        {activeTab === "Store" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveStoreSettings}>
          <h2>Store details</h2>
          {storeSettingsError && <div className="adminErrorBanner">{storeSettingsError}</div>}
          {storeSettingsSetup && <div className="adminErrorBanner">{storeSettingsSetup}</div>}
          <section className="settingsOption productCardStyleSetting"><div><b>Product card design</b><span>Choose the storefront product-card layout. Changes apply to home, collections and related products.</span></div><select value={storeSettings.productCardStyle || "connected"} onChange={(event) => setStoreSettings((current) => ({ ...current, productCardStyle: event.target.value }))}><option value="classic">Classic cards</option><option value="connected">Connected tiles (Sapphire-inspired)</option></select></section>
          <section className="settingsOption categoryStyleSetting"><div><b>Shop by Category design</b><span>Choose how the Shop by Category section displays on the homepage.</span></div><select value={storeSettings.categorySectionStyle || "atelier"} onChange={(event) => {
            const nextStyle = event.target.value;
            setStoreSettings((current) => {
              const sections = (current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).map((sec) =>
                sec.type === "shop_by_category" ? { ...sec, style: nextStyle } : sec
              );
              return { ...current, categorySectionStyle: nextStyle, homepageSections: sections };
            });
          }}><option value="atelier">Atelier Overlay Cards (Dark Theme Overlay)</option><option value="minimal">Minimal Collections Grid (House of Lucknawi Style - Rounded cards with titles below)</option></select></section>

          <div className="settingsOption"><div><b>Announcement bar</b><span>Shown above the main header. Multiple active announcements rotate automatically.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.announcementEnabled !== false} onChange={(event) => setStoreSettings((current) => ({ ...current, announcementEnabled: event.target.checked }))} /> Enabled</label></div>
          <section className="announcementEditor">
            <div className="inventoryListHead"><div><h2>Announcements</h2><span>{(storeSettings.announcements || []).length} messages</span></div><button type="button" onClick={addAnnouncement}><Plus /> Add announcement</button></div>
            {(storeSettings.announcements || []).map((announcement, index) => (
              <article className="announcementEditorItem" key={announcement.id || index}>
                <div className="announcementEditorHead">
                  <b>Announcement {index + 1}</b>
                  <label className="switchLabel"><input type="checkbox" checked={announcement.enabled !== false} onChange={(event) => updateAnnouncement(index, { enabled: event.target.checked })} /> Active</label>
                  <button type="button" onClick={() => removeAnnouncement(index)} aria-label={`Remove announcement ${index + 1}`}><X /></button>
                </div>
                <label>Message<textarea rows="2" value={announcement.text || ""} onChange={(event) => updateAnnouncement(index, { text: event.target.value })} placeholder="Free delivery, sale, advance payment, new arrivals..." /></label>
                <div className="formRow"><label>Link label<input value={announcement.linkLabel || ""} onChange={(event) => updateAnnouncement(index, { linkLabel: event.target.value })} placeholder="Shop now" /></label><label>Link URL<input value={announcement.linkHref || ""} onChange={(event) => updateAnnouncement(index, { linkHref: event.target.value })} placeholder="#products or /category/kurtis" /></label></div>
              </article>
            ))}
          </section>
          <div className="settingsOption"><div><b>Instagram feed gallery</b><span>Display 6-column Instagram feed (House of Lucknawi style) on homepage.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.instagramEnabled !== false} onChange={(event) => setStoreSettings((current) => ({ ...current, instagramEnabled: event.target.checked }))} /> Enabled</label></div>
          <div className="formRow"><label>Instagram Handle<input value={storeSettings.instagramHandle || "@bustaniya_"} onChange={(event) => setStoreSettings((current) => ({ ...current, instagramHandle: event.target.value }))} placeholder="@bustaniya_" /></label></div>

          <section className="heroSettingsEditor">
            <div className="heroSettingsHeading"><div><p>HOMEPAGE BANNERS</p><h2>Hero Carousel & Messaging</h2><span>Manage desktop and mobile campaign images, headings and primary call-to-actions.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.heroEnabled !== false} onChange={(event) => setStoreSettings((current) => ({ ...current, heroEnabled: event.target.checked }))} /> Enabled</label></div>
            {[{ field: "heroDesktopImages", legacyField: "heroDesktopImage", label: "Desktop Hero Slides", hint: "Select multiple wide campaign images · recommended 16:8" }, { field: "heroMobileImages", legacyField: "heroMobileImage", label: "Mobile Hero Slides", hint: "Select multiple portrait campaign images · recommended 4:5" }].map((item) => {
              const defaultImg = item.field === "heroDesktopImages" ? DEFAULT_STORE_SETTINGS.heroDesktopImage : DEFAULT_STORE_SETTINGS.heroMobileImage;
              const list = normalizeHeroImages(storeSettings[item.field] || storeSettings[item.legacyField], defaultImg);
              return (
                <div className={`heroSlideManager ${item.field === "heroDesktopImages" ? "heroDesktopManager" : "heroMobileManager"}`} key={item.field}>
                  <div className="heroSlideHead"><div><b>{item.label}</b><span>{item.hint}</span></div><small>{list.length} slide{list.length === 1 ? "" : "s"}</small></div>
                  <div className="heroSlideGrid">
                    {list.map((url, idx) => (
                      <div className="heroSlideCard" key={`${url}-${idx}`}>
                        <div className="heroSlideMedia"><img src={url} alt={`${item.label} ${idx + 1}`} />
                          <button
                            type="button"
                            onClick={() => {
                              const nextList = list.filter((_, i) => i !== idx);
                              const finalImages = nextList.length ? nextList : [defaultImg];
                              setStoreSettings((current) => ({
                                ...current,
                                [item.field]: finalImages,
                                [item.legacyField]: finalImages[0] || "",
                              }));
                            }}
                            title="Remove slide"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <span className="heroSlidePath">{url}</span>
                      </div>
                    ))}
                  </div>
                  <div className="heroUrlInputRow">
                    <input
                      value={heroUrlInputs[item.field] || ""}
                      onChange={(event) => setHeroUrlInputs((current) => ({ ...current, [item.field]: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addHeroImageUrl(item.field);
                        }
                      }}
                      placeholder="Paste image URL (https://...) or local path (/hero.png)"
                    />
                    <button type="button" onClick={() => addHeroImageUrl(item.field)}>+ Add slide URL</button>
                  </div>
                </div>
              );
            })}
            <div className="heroCopyEditors">{[{ key: "desktop", label: "Desktop content", hint: "Shown on laptop and desktop banners.", positions: ["left", "center", "right"] }, { key: "mobile", label: "Mobile content", hint: "Shown only on phones — place it at the top, center or bottom.", positions: ["top", "center", "bottom"] }].map((device) => {
              const contentKey = device.key === "mobile" ? "heroMobileContent" : "heroDesktopContent";
              const legacy = { eyebrow: storeSettings.heroEyebrow ?? "", heading: storeSettings.heroHeading ?? "", supportingText: storeSettings.heroSupportingText ?? "", primaryButtonText: storeSettings.heroPrimaryButtonText ?? "", primaryButtonLink: storeSettings.heroPrimaryButtonLink ?? "", secondaryButtonText: storeSettings.heroSecondaryButtonText ?? "", secondaryButtonLink: storeSettings.heroSecondaryButtonLink ?? "", alignment: storeSettings.heroTextAlignment || "left", position: device.key === "mobile" ? "bottom" : (storeSettings.heroTextPosition || "left") };
              const content = { ...legacy, ...(storeSettings[contentKey] || {}) };
              return <section className={`heroCopyEditor heroCopyEditor--${device.key}`} key={device.key}><div className="heroCopyEditorHead"><div><b>{device.label}</b><span>{device.hint}</span></div></div><div className="formRow"><label>Eyebrow<input value={content.eyebrow || ""} onChange={(event) => updateHeroContent(device.key, { eyebrow: event.target.value })} placeholder="e.g. NEW SEASON (optional)" /></label><label>Heading<input value={content.heading || ""} onChange={(event) => updateHeroContent(device.key, { heading: event.target.value })} placeholder="e.g. Unstitched Luxury Lawn (optional)" /></label></div><label>Supporting text<textarea rows="2" value={content.supportingText || ""} onChange={(event) => updateHeroContent(device.key, { supportingText: event.target.value })} placeholder="e.g. Crafted for effortless grace... (optional)" /></label><div className="formRow"><label>Primary CTA text<input value={content.primaryButtonText || ""} onChange={(event) => updateHeroContent(device.key, { primaryButtonText: event.target.value })} placeholder="e.g. Shop now (optional)" /></label><label>Primary CTA link<input value={content.primaryButtonLink || ""} onChange={(event) => updateHeroContent(device.key, { primaryButtonLink: event.target.value })} placeholder="#products or /category/kurtis" /></label></div><div className="formRow"><label>Secondary CTA text<input value={content.secondaryButtonText || ""} onChange={(event) => updateHeroContent(device.key, { secondaryButtonText: event.target.value })} placeholder="Optional" /></label><label>Secondary CTA link<input value={content.secondaryButtonLink || ""} onChange={(event) => updateHeroContent(device.key, { secondaryButtonLink: event.target.value })} placeholder="Optional" /></label></div><div className="formRow"><label>Text alignment<select value={content.alignment || "left"} onChange={(event) => updateHeroContent(device.key, { alignment: event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><label>{device.key === "mobile" ? "Vertical position" : "Horizontal position"}<select value={content.position || device.positions[0]} onChange={(event) => updateHeroContent(device.key, { position: event.target.value })}>{device.positions.map((position) => <option value={position} key={position}>{position[0].toUpperCase() + position.slice(1)}</option>)}</select></label></div></section>;
            })}</div>
            <label className="heroOverlayControl">Overlay Intensity — {Number(storeSettings.heroOverlayIntensity || 0)}%<input type="range" min="0" max="80" step="1" value={Number(storeSettings.heroOverlayIntensity || 0)} onChange={(event) => setStoreSettings((current) => ({ ...current, heroOverlayIntensity: Number(event.target.value) }))} /></label>
          </section>
          <div className="formRow"><label>Store name<input defaultValue="Bustaniya" /></label><label>Legal business name<input defaultValue="Bustaniya" /></label></div>
          <div className="formRow"><label>Support email<input defaultValue="hello@bustaniya.pk" /></label><label>Customer phone<input placeholder="+92 3xx xxxxxxx" /></label></div>
          <label>Business address<textarea rows="3" placeholder="Warehouse / office address" /></label>
          <div className="formRow"><label>Currency<select defaultValue="PKR"><option>PKR</option></select></label><label>Timezone<select defaultValue="Asia/Karachi"><option>Asia/Karachi</option></select></label></div>
          <button
            type="submit"
            disabled={storeSettingsLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: storeSettingsLoading ? "not-allowed" : "pointer"
            }}
          >
            {storeSettingsLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Store Settings...</span>
              </>
            ) : (
              "Save store settings"
            )}
          </button>
        </form>}

        {activeTab === "Sections" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveStoreSettings}>
          <div className="heroSettingsHeading"><div><p>HOMEPAGE BUILDER</p><h2>Page Sections</h2><span>Add, remove, reorder and configure homepage sections. Changes go live after saving.</span></div></div>
          {storeSettingsError && <div className="adminErrorBanner">{storeSettingsError}</div>}
          <div className="sectionManagerList">
            {(storeSettings.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).map((section, index, arr) => {
              const isHero = section.type === "hero";
              return (
                <article className={`sectionManagerItem ${section.enabled ? "" : "sectionDisabled"}`} key={section.id}>
                  <div className="sectionManagerHead">
                    <div className="sectionManagerMeta">
                      <div className="sectionMoveButtons">
                        <button type="button" disabled={index === 0} aria-label="Move up" onClick={() => setStoreSettings((current) => {
                          const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                          [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
                          return { ...current, homepageSections: sections };
                        })}>↑</button>
                        <button type="button" disabled={index === arr.length - 1} aria-label="Move down" onClick={() => setStoreSettings((current) => {
                          const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                          [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
                          return { ...current, homepageSections: sections };
                        })}>↓</button>
                      </div>
                      <div>
                        <b>{section.label}</b>
                        <small>{section.type.replace(/_/g, " ")}</small>
                      </div>
                    </div>
                    <div className="sectionManagerActions">
                      <label className="switchLabel"><input type="checkbox" checked={section.enabled !== false} onChange={(event) => setStoreSettings((current) => {
                        const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                        sections[index] = { ...sections[index], enabled: event.target.checked };
                        return { ...current, homepageSections: sections };
                      })} /> Visible</label>
                      {!isHero && <button type="button" className="sectionRemoveBtn" onClick={() => setStoreSettings((current) => ({
                        ...current,
                        homepageSections: (current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).filter((_, i) => i !== index),
                      }))} aria-label={`Remove ${section.label}`}><X size={14} /></button>}
                    </div>
                  </div>
                  {!isHero && (
                    <div className="sectionManagerFields">
                      <label>Eyebrow<input value={section.eyebrow || ""} placeholder="e.g. NEW ARRIVALS" onChange={(event) => setStoreSettings((current) => {
                        const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                        sections[index] = { ...sections[index], eyebrow: event.target.value };
                        return { ...current, homepageSections: sections };
                      })} /></label>
                      <label>Heading<input value={section.heading || ""} placeholder="Section heading" onChange={(event) => setStoreSettings((current) => {
                        const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                        sections[index] = { ...sections[index], heading: event.target.value };
                        return { ...current, homepageSections: sections };
                      })} /></label>
                      <label>Subtitle<textarea rows="2" value={section.subtitle || ""} placeholder="Short description..." onChange={(event) => setStoreSettings((current) => {
                        const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                        sections[index] = { ...sections[index], subtitle: event.target.value };
                        return { ...current, homepageSections: sections };
                      })} /></label>
                      {section.type === "shop_by_category" && (
                        <label style={{ gridColumn: "1 / -1" }}>Category Display Layout<select value={section.style || storeSettings.categorySectionStyle || "atelier"} onChange={(event) => {
                          const nextStyle = event.target.value;
                          setStoreSettings((current) => {
                            const sections = (current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).map((sec) =>
                              sec.type === "shop_by_category" ? { ...sec, style: nextStyle } : sec
                            );
                            return { ...current, categorySectionStyle: nextStyle, homepageSections: sections };
                          });
                        }}><option value="atelier">Atelier Overlay Cards (Dark Theme Overlay)</option><option value="minimal">Minimal Collections Grid (House of Lucknawi Style - Rounded cards with titles below)</option></select></label>
                      )}
                      {section.type === "instagram_feed" && (
                        <div className="instagramManager" style={{ gridColumn: "1 / -1" }}>
                          <div className="instagramManagerIntro"><div><b>Instagram gallery</b><span>Show campaign posts in a full-width gallery. Each image opens its post or your profile.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.instagramEnabled !== false} onChange={(event) => setStoreSettings((current) => ({ ...current, instagramEnabled: event.target.checked }))} /> Visible</label></div>
                          <label>Instagram handle<input value={storeSettings.instagramHandle || ""} placeholder="@bustaniya_" onChange={(event) => setStoreSettings((current) => ({ ...current, instagramHandle: event.target.value }))} /></label>
                          <div className="instagramManagerPosts">{(storeSettings.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || []).map((post, postIndex) => <article className="instagramManagerPost" key={post.id || postIndex}><div className="instagramManagerPostHead"><b>Post {postIndex + 1}</b><button type="button" className="sectionRemoveBtn" aria-label={`Remove Instagram post ${postIndex + 1}`} onClick={() => setStoreSettings((current) => ({ ...current, instagramPosts: (current.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || []).filter((_, itemIndex) => itemIndex !== postIndex) }))}><X size={14} /></button></div><label>Media type<select value={post.mediaType === "video" ? "video" : "image"} onChange={(event) => setStoreSettings((current) => { const posts = [...(current.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || [])]; posts[postIndex] = { ...posts[postIndex], mediaType: event.target.value }; return { ...current, instagramPosts: posts }; })}><option value="image">Image post</option><option value="video">Video / reel</option></select></label><label>{post.mediaType === "video" ? "Video URL" : "Image URL"}<input value={post.image || ""} placeholder="https://res.cloudinary.com/..." onChange={(event) => setStoreSettings((current) => { const posts = [...(current.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || [])]; posts[postIndex] = { ...posts[postIndex], image: event.target.value }; return { ...current, instagramPosts: posts }; })} /></label><label>Instagram post URL <small>Optional — otherwise the profile opens.</small><input value={post.url || ""} placeholder="https://www.instagram.com/p/..." onChange={(event) => setStoreSettings((current) => { const posts = [...(current.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || [])]; posts[postIndex] = { ...posts[postIndex], url: event.target.value }; return { ...current, instagramPosts: posts }; })} /></label><label>Hover caption <small>Optional</small><input value={post.caption || ""} placeholder="Short post description" onChange={(event) => setStoreSettings((current) => { const posts = [...(current.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || [])]; posts[postIndex] = { ...posts[postIndex], caption: event.target.value }; return { ...current, instagramPosts: posts }; })} /></label></article>)}</div>
                          <button type="button" className="addInstagramPost" onClick={() => setStoreSettings((current) => ({ ...current, instagramPosts: [...(current.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || []), { id: `instagram-${Date.now()}`, mediaType: "image", image: "", url: "", caption: "" }] }))}>+ Add Instagram post</button>
                        </div>
                      )}
                    </div>
                  )}
                  {isHero && <p className="sectionManagerHint">Hero banner settings are managed in the Store tab above.</p>}
                </article>
              );
            })}
          </div>
          {(() => {
            const currentTypes = (storeSettings.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).map((s) => s.type);
            const available = DEFAULT_HOMEPAGE_SECTIONS.filter((s) => !currentTypes.includes(s.type) && s.type !== "hero");
            if (!available.length) return null;
            return (
              <div className="sectionAddBar">
                <select id="sectionAddSelect" defaultValue="">
                  <option value="" disabled>Choose a section to add...</option>
                  {available.map((s) => <option key={s.type} value={s.type}>{s.label}</option>)}
                </select>
                <button type="button" onClick={() => {
                  const select = document.getElementById("sectionAddSelect");
                  const type = select?.value;
                  if (!type) return;
                  const template = DEFAULT_HOMEPAGE_SECTIONS.find((s) => s.type === type);
                  if (!template) return;
                  setStoreSettings((current) => ({
                    ...current,
                    homepageSections: [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS), { ...template, id: `${template.id}-${Date.now()}` }],
                  }));
                  select.value = "";
                }}>+ Add section</button>
              </div>
            );
          })()}
          <button
            type="submit"
            disabled={storeSettingsLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: storeSettingsLoading ? "not-allowed" : "pointer"
            }}
          >
            {storeSettingsLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving sections...</span>
              </>
            ) : (
              "Save sections"
            )}
          </button>
        </form>}


        {activeTab === "Theme" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveStoreSettings}>
          <section className="sectionColorEditor">
            <div className="heroSettingsHeading"><div><p>HOMEPAGE DESIGN</p><h2>Section Background & Text Colors</h2><span>Select custom background and text colors for each landing-page section.</span></div></div>
            <div className="sectionColorGrid">
              {HOMEPAGE_COLOR_SECTIONS.map((section) => {
                const selectedBg = storeSettings.sectionColors?.[section.key] || DEFAULT_STORE_SETTINGS.sectionColors[section.key];
                const selectedText = storeSettings.sectionTextColors?.[section.key] || DEFAULT_STORE_SETTINGS.sectionTextColors?.[section.key] || "#173d29";
                return (
                  <div className="sectionColorOption" key={section.key}>
                    <div className="sectionColorHeader">
                      <b>{section.label}</b>
                      <span className="badgePreview" style={{ background: selectedBg, color: selectedText, border: "1px solid #d5ddd3" }}>Preview Text</span>
                    </div>

                    <div className="colorControlBlock">
                      <div className="colorLabelRow">
                        <label>Background Color</label>
                        <div className="hexInputRow">
                          <input type="color" value={selectedBg} onChange={(event) => setStoreSettings((current) => ({ ...current, sectionColors: { ...DEFAULT_STORE_SETTINGS.sectionColors, ...(current.sectionColors || {}), [section.key]: event.target.value } }))} />
                          <span>{selectedBg}</span>
                        </div>
                      </div>
                      <div className="sectionColorSwatches" role="group" aria-label={`${section.label} background color`}>
                        {HOMEPAGE_COLOR_OPTIONS.map((color) => <button type="button" key={color.value} title={color.name} aria-label={`${section.label} BG: ${color.name}`} className={selectedBg === color.value ? "selected" : ""} style={{ background: color.value }} onClick={() => setStoreSettings((current) => ({ ...current, sectionColors: { ...DEFAULT_STORE_SETTINGS.sectionColors, ...(current.sectionColors || {}), [section.key]: color.value } }))} />)}
                      </div>
                    </div>

                    <div className="colorControlBlock" style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #e0e6df" }}>
                      <div className="colorLabelRow">
                        <label>Text Color</label>
                        <div className="hexInputRow">
                          <input type="color" value={selectedText} onChange={(event) => setStoreSettings((current) => ({ ...current, sectionTextColors: { ...DEFAULT_STORE_SETTINGS.sectionTextColors, ...(current.sectionTextColors || {}), [section.key]: event.target.value } }))} />
                          <span>{selectedText}</span>
                        </div>
                      </div>
                      <div className="sectionColorSwatches" role="group" aria-label={`${section.label} text color`}>
                        {HOMEPAGE_COLOR_OPTIONS.map((color) => <button type="button" key={color.value} title={color.name} aria-label={`${section.label} Text: ${color.name}`} className={selectedText === color.value ? "selected" : ""} style={{ background: color.value }} onClick={() => setStoreSettings((current) => ({ ...current, sectionTextColors: { ...DEFAULT_STORE_SETTINGS.sectionTextColors, ...(current.sectionTextColors || {}), [section.key]: color.value } }))} />)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <div className="settingsOption"><div><b>Announcement bar</b><span>Shown above the main header. Multiple active announcements rotate automatically.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.announcementEnabled} onChange={(event) => setStoreSettings((current) => ({ ...current, announcementEnabled: event.target.checked }))} /> Enabled</label></div>
          <section className="announcementEditor">
            <div className="inventoryListHead"><div><h2>Announcements</h2><span>{(storeSettings.announcements || []).length} messages</span></div><button type="button" onClick={addAnnouncement}><Plus /> Add announcement</button></div>
            {(storeSettings.announcements || []).map((announcement, index) => (
              <article className="announcementEditorItem" key={announcement.id || index}>
                <div className="announcementEditorHead">
                  <b>Announcement {index + 1}</b>
                  <label className="switchLabel"><input type="checkbox" checked={announcement.enabled !== false} onChange={(event) => updateAnnouncement(index, { enabled: event.target.checked })} /> Active</label>
                  <button type="button" onClick={() => removeAnnouncement(index)} aria-label={`Remove announcement ${index + 1}`}><X /></button>
                </div>
                <label>Message<textarea rows="2" value={announcement.text || ""} onChange={(event) => updateAnnouncement(index, { text: event.target.value })} placeholder="Free delivery, sale, advance payment, new arrivals..." /></label>
                <div className="formRow"><label>Link label<input value={announcement.linkLabel || ""} onChange={(event) => updateAnnouncement(index, { linkLabel: event.target.value })} placeholder="Shop now" /></label><label>Link URL<input value={announcement.linkHref || ""} onChange={(event) => updateAnnouncement(index, { linkHref: event.target.value })} placeholder="#products or /category/kurtis" /></label></div>
              </article>
            ))}
          </section>
          <button
            type="submit"
            disabled={storeSettingsLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: storeSettingsLoading ? "not-allowed" : "pointer"
            }}
          >
            {storeSettingsLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving theme settings...</span>
              </>
            ) : (
              "Save theme settings"
            )}
          </button>
        </form>}

        {activeTab === "Payments" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveStoreSettings}>
          <h2>Payment methods</h2>
          {storeSettingsError && <div className="adminErrorBanner">{storeSettingsError}</div>}
          {storeSettingsSetup && <div className="adminErrorBanner">{storeSettingsSetup}</div>}
          <div className="adminVisualGrid">
            <section className="adminVisualCard">
              <div className="adminVisualHead"><div><h3>Payment readiness</h3><p>Enabled methods and operational safeguards.</p></div></div>
              <VisualProgress label="COD flow" value={storeSettings.paymentSettings?.codEnabled !== false ? 100 : 0} helper={storeSettings.paymentSettings?.codEnabled !== false ? "COD is active at checkout" : "COD is currently disabled"} color="#1d6840" />
              <VisualProgress label="Full advance payment" value={storeSettings.paymentSettings?.manualTransferEnabled !== false ? 100 : 0} helper="Customer pays the complete product subtotal before confirmation." color="#4777a8" />
            </section>
            <VisualDonut
              title="Payment methods"
              subtitle="Current checkout method visibility."
              centerValue={[storeSettings.paymentSettings?.codEnabled !== false, storeSettings.paymentSettings?.manualTransferEnabled !== false].filter(Boolean).length}
              centerLabel="enabled"
              items={[
                { label: "COD", value: storeSettings.paymentSettings?.codEnabled !== false ? 1 : 0, color: "#1d6840" },
                { label: "Full advance", value: storeSettings.paymentSettings?.manualTransferEnabled !== false ? 1 : 0, color: "#4777a8" },
              ]}
            />
          </div>
          <div className="paymentSettingsGrid">
            <div className="settingsOption"><div><b>Cash on Delivery</b><span>Customer pays the full order amount in cash to the courier upon delivery.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.paymentSettings?.codEnabled !== false} onChange={(event) => updatePaymentSettings({ codEnabled: event.target.checked })} /> Enabled</label></div>
            <div className="settingsOption"><div><b>Full advance payment</b><span>Customer pays the complete product subtotal in advance and receives free delivery.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.paymentSettings?.manualTransferEnabled !== false} onChange={(event) => updatePaymentSettings({ manualTransferEnabled: event.target.checked })} /> Enabled</label></div>
          </div>
          <div className="paymentRulesCard">
            <h3>COD risk rules</h3>
            <div className="settingsOption"><div><b>Phone verification</b><span>Staff should verify COD number before dispatch.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.paymentSettings?.codPhoneVerification !== false} onChange={(event) => updatePaymentSettings({ codPhoneVerification: event.target.checked })} /> Required</label></div>
            <div className="formRow"><label>Minimum COD order (PKR)<input type="number" min="0" value={storeSettings.paymentSettings?.codMinOrderPkr ?? 0} onChange={(event) => updatePaymentSettings({ codMinOrderPkr: event.target.value })} /></label><label>Maximum COD order (PKR)<input type="number" min="0" value={storeSettings.paymentSettings?.codMaxOrderPkr ?? 50000} onChange={(event) => updatePaymentSettings({ codMaxOrderPkr: event.target.value })} /></label><label>COD delivery charge (PKR)<input type="number" min="0" value={storeSettings.paymentSettings?.codDeliveryChargePkr ?? 250} onChange={(event) => updatePaymentSettings({ codDeliveryChargePkr: event.target.value })} /></label></div>
          </div>

          <div className="paymentRulesCard">
            <h3>Checkout Payment Instructions (COD & Full Advance)</h3>
            <p className="settingsHint">Customize section headings and bullet points for both Cash on Delivery (COD) and Full Advance Payment instructions shown on the checkout page.</p>

            <PaymentInstructionEditor
              title="1. Cash on Delivery (COD) Instructions"
              headingValue={storeSettings.paymentSettings?.codHeading}
              headingPlaceholder="Cash on Delivery Instructions"
              instructionsValue={storeSettings.paymentSettings?.codInstructions}
              onUpdateHeading={(heading) => updatePaymentSettings({ codHeading: heading })}
              onUpdateInstructions={(text) => updatePaymentSettings({ codInstructions: text })}
            />

            <PaymentInstructionEditor
              title="2. Full Advance Payment Instructions"
              headingValue={storeSettings.paymentSettings?.advanceHeading}
              headingPlaceholder="Full Advance Payment Instructions"
              instructionsValue={storeSettings.paymentSettings?.instructions}
              onUpdateHeading={(heading) => updatePaymentSettings({ advanceHeading: heading })}
              onUpdateInstructions={(text) => updatePaymentSettings({ instructions: text })}
            />
          </div>

          <div className="paymentRulesCard">
            <h3>Payment receiving details</h3>
            <p className="settingsHint">These details are shown for advance payment orders. Customers transfer funds and send a screenshot to WhatsApp for payment verification.</p>
            <div className="formRow"><label>Bank name<input value={storeSettings.paymentSettings?.bankName || ""} onChange={(event) => updatePaymentSettings({ bankName: event.target.value })} placeholder="e.g. Meezan Bank" /></label><label>Account title<input value={storeSettings.paymentSettings?.bankTitle || ""} onChange={(event) => updatePaymentSettings({ bankTitle: event.target.value })} placeholder="Account holder name" /></label></div>
            <div className="formRow"><label>Account number<input value={storeSettings.paymentSettings?.bankAccountNumber || ""} onChange={(event) => updatePaymentSettings({ bankAccountNumber: event.target.value })} placeholder="Bank account number" /></label><label>IBAN (optional)<input value={storeSettings.paymentSettings?.bankIban || ""} onChange={(event) => updatePaymentSettings({ bankIban: event.target.value })} placeholder="PK..." /></label></div>
            <div className="formRow"><label>WhatsApp support & verification number<input type="tel" value={storeSettings.paymentSettings?.whatsappNumber || ""} onChange={(event) => updatePaymentSettings({ whatsappNumber: event.target.value })} placeholder="923001234567" /><small>This number powers the website chat button and checkout payment-screenshot button.</small></label></div>
          </div>
          <button
            type="submit"
            disabled={storeSettingsLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: storeSettingsLoading ? "not-allowed" : "pointer"
            }}
          >
            {storeSettingsLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving payment settings...</span>
              </>
            ) : (
              "Save payment settings"
            )}
          </button>
        </form>}

        {activeTab === "Shipping" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveStoreSettings}>
          <h2>Shipping &amp; Delivery Settings</h2>
          {storeSettingsError && <div className="adminErrorBanner">{storeSettingsError}</div>}
          
          <div className="paymentRulesCard">
            <h3>Global Delivery Information (Storewide Fallback)</h3>
            <p className="settingsHint">These defaults appear on product detail pages whenever a product does not have a custom delivery note specified.</p>
            
            <div className="formRow">
              <label>
                Estimated Delivery Timeline
                <input
                  value={storeSettings.deliverySettings?.estimatedDays || ""}
                  onChange={(event) => updateDeliverySettings({ estimatedDays: event.target.value })}
                  placeholder="e.g. 3-5 business days"
                />
              </label>
              <label>
                Free Delivery Above Order (PKR)
                <input
                  type="number"
                  min="0"
                  value={storeSettings.deliverySettings?.freeDeliveryThreshold ?? 5000}
                  onChange={(event) => updateDeliverySettings({ freeDeliveryThreshold: event.target.value })}
                  placeholder="5000"
                />
              </label>
            </div>

            <label>
              Standard Delivery Charges Copy
              <input
                value={storeSettings.deliverySettings?.deliveryFeeText || ""}
                onChange={(event) => updateDeliverySettings({ deliveryFeeText: event.target.value })}
                placeholder="e.g. Rs. 200 standard delivery nationwide · Free above Rs. 5,000"
              />
            </label>

            <div className="settingsOption" style={{ margin: "14px 0 8px" }}>
              <div>
                <b>Cash on Delivery (COD) availability</b>
                <span>Highlight COD availability badge on product detail pages.</span>
              </div>
              <label className="switchLabel">
                <input
                  type="checkbox"
                  checked={storeSettings.deliverySettings?.codAvailable !== false}
                  onChange={(event) => updateDeliverySettings({ codAvailable: event.target.checked })}
                />
                Available
              </label>
            </div>

            <label>
              Cash on Delivery Note
              <input
                value={storeSettings.deliverySettings?.codNote || ""}
                onChange={(event) => updateDeliverySettings({ codNote: event.target.value })}
                placeholder="e.g. Cash on Delivery available nationwide (Rs. 250 advance confirmation fee)"
              />
            </label>

            <label>
              Global Default Delivery Information Text
              <textarea
                rows="4"
                value={storeSettings.deliverySettings?.defaultDeliveryInfo || ""}
                onChange={(event) => updateDeliverySettings({ defaultDeliveryInfo: event.target.value })}
                placeholder="Orders are processed within 24 hours and delivered within 3-5 business days across Pakistan. Tracking details are shared via SMS and WhatsApp once dispatched."
              />
              <small className="settingsHint">Shown in the Delivery accordion on all products unless overridden per product.</small>
            </label>
          </div>

          <div className="paymentRulesCard">
            <div className="inventoryListHead">
              <div>
                <h3>Shipping Zones &amp; Rates</h3>
                <span>Configured courier delivery rates</span>
              </div>
            </div>
            <div className="adminTableWrap">
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Cities</th>
                    <th>Rate</th>
                    <th>Free above</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(shippingZones || []).map((zone, index) => (
                    <tr key={zone.id || index}>
                      <td><b>{zone.zone}</b></td>
                      <td>{zone.cities}</td>
                      <td>Rs. {Number(zone.rate || 0).toLocaleString()}</td>
                      <td>{Number(zone.freeAbove || 0) > 0 ? `Rs. ${Number(zone.freeAbove).toLocaleString()}` : "—"}</td>
                      <td>
                        <button type="button" onClick={() => removeShippingZone(index)} aria-label="Remove zone" style={{ padding: "4px 8px", background: "none", border: "none", cursor: "pointer", color: "#b91c1c" }}>
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="submit"
            disabled={storeSettingsLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: storeSettingsLoading ? "not-allowed" : "pointer"
            }}
          >
            {storeSettingsLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving shipping settings...</span>
              </>
            ) : (
              "Save shipping settings"
            )}
          </button>
        </form>}

        {activeTab === "Users" && <div className="settingsStack">

          {staffError && <div className="adminErrorBanner">{staffError}</div>}
          {staffSaved && <div className="adminErrorBanner settingsSaved">{staffSaved}</div>}
          <section className="adminCard settingsForm settingsWideForm">
            <div className="inventoryListHead"><div><h2>Users and permissions</h2><span>{currentAdminUser ? `Signed in as ${currentAdminUser.name}` : "Manage admin access"}</span></div>{staffLoading && <span>Loading...</span>}</div>
            <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th><th>Status</th><th /></tr></thead><tbody>{staff.map((user) => <tr key={user.id}><td><b>{user.name}</b><small className="trackingNumber">{user.lastLoginAt ? `Last login ${new Date(user.lastLoginAt).toLocaleString("en-PK")}` : "No login yet"}</small></td><td>{user.email}</td><td>{user.role}</td><td><div className="tagList">{(user.permissions || []).map((permission) => <span key={permission}>{permission}</span>)}</div></td><td><span className={`statusBadge ${user.status === "Active" ? "activeStatus" : "processing"}`}>{user.status}</span></td><td><div className="orderActionRow"><button type="button" onClick={() => updateStaffUser(user.id, { status: user.status === "Active" ? "Disabled" : "Active" })}>{user.status === "Active" ? "Disable" : "Enable"}</button>{user.role !== "Owner" && <button type="button" onClick={() => deleteStaffUser(user.id)}>Remove</button>}</div></td></tr>)}</tbody></table>{!staff.length && <div className="inventoryEmpty">No admin users found.</div>}</div>
          </section>
          <form className="adminCard settingsForm settingsWideForm" onSubmit={addStaff}>
            <h2>Add admin user</h2>
            <div className="formRow"><label>Name<input name="name" required placeholder="Team member" /></label><label>Email<input name="email" type="email" required placeholder="team@bustaniya.pk" /></label></div>
            <div className="formRow"><label>Password<input name="password" type="password" minLength="10" required placeholder="Minimum 10 characters" /></label><label>Role<select name="role" defaultValue="Staff"><option>Staff</option><option>Owner</option></select></label></div>
            <div className="settingsPermissionGrid">
              {availablePermissions.map((permission) => <label className="switchLabel" key={permission}><input name={`permission-${permission}`} type="checkbox" defaultChecked={["dashboard", "orders"].includes(permission)} /> {permission}</label>)}
            </div>
            <button disabled={staffLoading} aria-busy={staffLoading}>Add admin user</button>
          </form>
        </div>}

        {activeTab === "Notifications" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveSettings}>
          <h2>Notification templates</h2>
          <div className="settingsOption"><div><b>Order confirmation</b><span>Template configuration saved for your order communication workflow.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.notificationSettings?.orderConfirmationEnabled !== false} onChange={(event) => updateSettingsGroup("notificationSettings", { orderConfirmationEnabled: event.target.checked })} /> Enabled</label></div>
          <label>Order confirmation subject<input value={storeSettings.notificationSettings?.orderConfirmationSubject || ""} onChange={(event) => updateSettingsGroup("notificationSettings", { orderConfirmationSubject: event.target.value })} /></label>
          <label>Email template<textarea rows="6" value={storeSettings.notificationSettings?.orderConfirmationTemplate || ""} onChange={(event) => updateSettingsGroup("notificationSettings", { orderConfirmationTemplate: event.target.value })} /></label>
          <div className="settingsOption"><div><b>Fulfillment update</b><span>Used when tracking number or PostEx status changes.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.notificationSettings?.fulfillmentUpdateEnabled !== false} onChange={(event) => updateSettingsGroup("notificationSettings", { fulfillmentUpdateEnabled: event.target.checked })} /> Enabled</label></div>
          <div className="settingsOption"><div><b>COD phone verification reminder</b><span>Internal reminder for risky COD orders.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.notificationSettings?.codVerificationReminderEnabled !== false} onChange={(event) => updateSettingsGroup("notificationSettings", { codVerificationReminderEnabled: event.target.checked })} /> Enabled</label></div>
          <button
            type="submit"
            disabled={storeSettingsLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: storeSettingsLoading ? "not-allowed" : "pointer"
            }}
          >
            {storeSettingsLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving notification settings...</span>
              </>
            ) : (
              "Save notification settings"
            )}
          </button>
        </form>}

        {activeTab === "Tracking" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveSettings}>
          <h2>Meta Pixel & Conversions API (CAPI) Tracking</h2>
          <p className="settingsHint">Configure your Meta Pixel and Conversions API (CAPI) server-side tracking here. Changes save directly to the database and go live instantly.</p>
          <div className="formRow">
            <label>Meta (Facebook) Pixel ID<input value={storeSettings.domainSettings?.metaPixelId || ""} onChange={(event) => updateSettingsGroup("domainSettings", { metaPixelId: event.target.value })} placeholder="e.g. 1972532723444962" /></label>
            <label>Google Analytics measurement ID (GA4)<input value={storeSettings.domainSettings?.analyticsMeasurementId || ""} onChange={(event) => updateSettingsGroup("domainSettings", { analyticsMeasurementId: event.target.value })} placeholder="G-..." /></label>
          </div>
          <label>Meta Conversions API (CAPI) Access Token<textarea rows="4" value={storeSettings.domainSettings?.metaCapiAccessToken || ""} onChange={(event) => updateSettingsGroup("domainSettings", { metaCapiAccessToken: event.target.value })} placeholder="EAAN... (Paste your Meta System User Access Token here)" style={{ fontFamily: "monospace", fontSize: "12px" }} /></label>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 16px", marginTop: "12px" }}>
            <div style={{ fontWeight: 600, color: "#166534", marginBottom: "4px" }}>🎯 Active Standard Events:</div>
            <div style={{ fontSize: "13px", color: "#15803d", lineHeight: 1.5 }}>
              • <b>PageView</b> (All page loads)<br />
              • <b>ViewContent</b> (Product details page)<br />
              • <b>AddToCart</b> (When product added to bag)<br />
              • <b>InitiateCheckout</b> (When checkout page opens)<br />
              • <b>Purchase</b> (When order is placed successfully)
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={storeSettingsLoading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: storeSettingsLoading ? "not-allowed" : "pointer"
              }}
            >
              {storeSettingsLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Tracking Settings...</span>
                </>
              ) : (
                "Save Tracking Settings"
              )}
            </button>
            <button
              type="button"
              onClick={testCapiConnection}
              disabled={capiTesting}
              style={{ background: "#2563eb", color: "#fff", borderColor: "#1d4ed8" }}
            >
              {capiTesting ? "Testing CAPI..." : "⚡ Test Meta CAPI Connection"}
            </button>
            <a
              href="https://eventsmanager.facebook.com"
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", padding: "8px 16px", borderRadius: "6px", background: "#f3f4f6", color: "#1f2937", fontSize: "13px", fontWeight: 600, textDecoration: "none", border: "1px solid #d1d5db" }}
            >
              Open Meta Events Manager ↗
            </a>
          </div>
          {capiTestResult && (
            <div style={{ marginTop: "12px", padding: "12px 16px", borderRadius: "8px", background: capiTestResult.success ? "#f0fdf4" : "#fef2f2", border: `1px solid ${capiTestResult.success ? "#bbf7d0" : "#fecaca"}`, color: capiTestResult.success ? "#166534" : "#991b1b", fontSize: "13px", fontWeight: 500 }}>
              {capiTestResult.message}
            </div>
          )}
        </form>}

        {activeTab === "Domains" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveSettings}>
          <h2>Domains & SEO</h2>
          <p className="settingsHint">These saved values control storefront domain, www redirects, and default SEO title.</p>
          <label>Primary domain<input value={storeSettings.domainSettings?.primaryDomain || ""} onChange={(event) => updateSettingsGroup("domainSettings", { primaryDomain: event.target.value })} /></label>
          <div className="settingsOption"><div><b>www redirect</b><span>Keep the preferred public domain recorded for SEO and support links.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.domainSettings?.wwwRedirect !== false} onChange={(event) => updateSettingsGroup("domainSettings", { wwwRedirect: event.target.checked })} /> Enabled</label></div>
          <label>SEO title<input value={storeSettings.domainSettings?.seoTitle || ""} onChange={(event) => updateSettingsGroup("domainSettings", { seoTitle: event.target.value })} /></label>
          <button
            type="submit"
            disabled={storeSettingsLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: storeSettingsLoading ? "not-allowed" : "pointer"
            }}
          >
            {storeSettingsLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving domain settings...</span>
              </>
            ) : (
              "Save domain settings"
            )}
          </button>
        </form>}

        {activeTab === "SizeChart" && (
          <form className="adminCard settingsForm settingsWideForm" onSubmit={saveStoreSettings}>
            <h2>Size chart settings</h2>
            <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 20px" }}>
              Customize the size guide modal title, fit advice and measurement values shown across product pages and quick view.
            </p>

            {storeSettingsError && <div className="adminErrorBanner">{storeSettingsError}</div>}

            <div className="formRow">
              <label>
                Size guide title
                <input
                  value={storeSettings.sizeChartSettings?.title || "Bustaniya Size Guide"}
                  onChange={(event) => updateSettingsGroup("sizeChartSettings", { title: event.target.value })}
                  placeholder="e.g. Bustaniya Size Guide"
                />
              </label>
              <label>
                Subtitle note
                <input
                  value={storeSettings.sizeChartSettings?.subtitle || "Standard Ready-to-Wear Measurements (Inches)"}
                  onChange={(event) => updateSettingsGroup("sizeChartSettings", { subtitle: event.target.value })}
                  placeholder="e.g. Standard Ready-to-Wear Measurements (Inches)"
                />
              </label>
            </div>

            <label>
              Fit advice text
              <textarea
                rows="2"
                value={storeSettings.sizeChartSettings?.advice || ""}
                onChange={(event) => updateSettingsGroup("sizeChartSettings", { advice: event.target.value })}
                placeholder="Fit advice text shown under measurement table..."
              />
            </label>

            <div className="sizeChartManager" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
              <div className="inventoryListHead" style={{ marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Size Measurement Matrix</h3>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>
                    Edit measurements for ready-stitched garments across XS, S, M, L, XL (in inches)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current = storeSettings.sizeChartSettings?.measurements || DEFAULT_STORE_SETTINGS.sizeChartSettings.measurements;
                    const next = [
                      ...current,
                      { name: "NEW MEASUREMENT", values: { XS: "0", S: "0", M: "0", L: "0", XL: "0" } },
                    ];
                    updateSettingsGroup("sizeChartSettings", { measurements: next });
                  }}
                >
                  <Plus size={14} /> Add measurement
                </button>
              </div>

              <div className="adminTableWrap" style={{ overflowX: "auto" }}>
                <table className="adminTable" style={{ width: "100%", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px" }}>Measurement</th>
                      <th style={{ textAlign: "center", padding: "10px" }}>XS</th>
                      <th style={{ textAlign: "center", padding: "10px" }}>S</th>
                      <th style={{ textAlign: "center", padding: "10px" }}>M</th>
                      <th style={{ textAlign: "center", padding: "10px" }}>L</th>
                      <th style={{ textAlign: "center", padding: "10px" }}>XL</th>
                      <th style={{ textAlign: "center", padding: "10px", width: "50px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(storeSettings.sizeChartSettings?.measurements || DEFAULT_STORE_SETTINGS.sizeChartSettings.measurements).map((m, mIdx) => (
                      <tr key={mIdx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px" }}>
                          <input
                            style={{ width: "160px", fontWeight: 700, padding: "6px 10px", borderRadius: "4px", border: "1px solid #d1d5db", textTransform: "uppercase" }}
                            value={m.name || ""}
                            onChange={(event) => {
                              const measurements = [...(storeSettings.sizeChartSettings?.measurements || DEFAULT_STORE_SETTINGS.sizeChartSettings.measurements)];
                              measurements[mIdx] = { ...measurements[mIdx], name: event.target.value.toUpperCase() };
                              updateSettingsGroup("sizeChartSettings", { measurements });
                            }}
                            placeholder="SHIRT LENGTH"
                          />
                        </td>
                        {["XS", "S", "M", "L", "XL"].map((sz) => (
                          <td key={sz} style={{ padding: "8px", textAlign: "center" }}>
                            <input
                              style={{ width: "65px", padding: "6px 8px", borderRadius: "4px", border: "1px solid #d1d5db", textAlign: "center" }}
                              value={m.values?.[sz] || ""}
                              onChange={(event) => {
                                const measurements = [...(storeSettings.sizeChartSettings?.measurements || DEFAULT_STORE_SETTINGS.sizeChartSettings.measurements)];
                                const values = { ...(measurements[mIdx].values || {}), [sz]: event.target.value };
                                measurements[mIdx] = { ...measurements[mIdx], values };
                                updateSettingsGroup("sizeChartSettings", { measurements });
                              }}
                              placeholder="0"
                            />
                          </td>
                        ))}
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          <button
                            type="button"
                            className="sectionRemoveBtn"
                            title="Remove measurement"
                            onClick={() => {
                              const measurements = (storeSettings.sizeChartSettings?.measurements || DEFAULT_STORE_SETTINGS.sizeChartSettings.measurements).filter((_, i) => i !== mIdx);
                              updateSettingsGroup("sizeChartSettings", { measurements });
                            }}
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="submit"
              disabled={storeSettingsLoading}
              style={{
                marginTop: "20px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: storeSettingsLoading ? "not-allowed" : "pointer"
              }}
            >
              {storeSettingsLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving size chart settings...</span>
                </>
              ) : (
                "Save size chart settings"
              )}
            </button>
          </form>
        )}

        {activeTab === "Checkout" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveSettings}>
          <h2>Checkout settings</h2>
          <div className="settingsOption"><div><b>Guest checkout</b><span>Let Instagram and walk-in customers order without accounts.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.checkoutSettings?.guestCheckoutEnabled !== false} onChange={(event) => updateSettingsGroup("checkoutSettings", { guestCheckoutEnabled: event.target.checked })} /> Enabled</label></div>
          <div className="settingsOption"><div><b>Phone required</b><span>Required for PostEx booking and COD verification.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.checkoutSettings?.phoneRequired !== false} onChange={(event) => updateSettingsGroup("checkoutSettings", { phoneRequired: event.target.checked })} /> Enabled</label></div>
          <div className="formRow"><label>Default payment<select value={storeSettings.checkoutSettings?.defaultPayment || "cod"} onChange={(event) => updateSettingsGroup("checkoutSettings", { defaultPayment: event.target.value })}><option value="cod">COD — delivery charge in advance</option><option value="full_advance">Full advance — free delivery</option></select></label><label>Address fields<select value={storeSettings.checkoutSettings?.addressMode || "detailed"} onChange={(event) => updateSettingsGroup("checkoutSettings", { addressMode: event.target.value })}><option value="detailed">Full address required</option><option value="simple">Simple city/address only</option></select></label></div>
          <label>Checkout note<textarea rows="3" value={storeSettings.checkoutSettings?.checkoutNote || ""} onChange={(event) => updateSettingsGroup("checkoutSettings", { checkoutNote: event.target.value })} /></label>
          <button
            type="submit"
            disabled={storeSettingsLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: storeSettingsLoading ? "not-allowed" : "pointer"
            }}
          >
            {storeSettingsLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving checkout settings...</span>
              </>
            ) : (
              "Save checkout settings"
            )}
          </button>
        </form>}

        {activeTab === "System" && <BackendHealthPanel />}
      </div>
    </section>
  </>;
}

function settingsTabHint(tab) {
  return {
    Store: "Details",
    Sections: "Page builder",
    Tracking: "Meta Pixel & CAPI",
    SizeChart: "Measurements",
    Payments: "COD, bank",
    Shipping: "Zones, rates",
    Users: "Staff access",
    Notifications: "Email templates",
    Domains: "Store URL",
    Checkout: "Customer flow",
    System: "Backend audit",
  }[tab];
}

function PaymentInstructionEditor({ title, headingValue, headingPlaceholder, instructionsValue, onUpdateHeading, onUpdateInstructions }) {
  const bullets = useMemo(() => {
    const raw = String(instructionsValue || "").replace(/\r\n?/g, "\n").trim();
    if (!raw) return [""];
    const points = raw.split(/(?<=\.)\s+|\n+/).map(p => p.trim()).filter(Boolean);
    return points.length > 0 ? points : [""];
  }, [instructionsValue]);

  function updateBullet(index, val) {
    const nextBullets = [...bullets];
    nextBullets[index] = val;
    onUpdateInstructions(nextBullets.filter(Boolean).join(". "));
  }

  function addBullet() {
    const nextBullets = [...bullets, ""];
    onUpdateInstructions(nextBullets.join(". "));
  }

  function removeBullet(index) {
    const nextBullets = bullets.filter((_, i) => i !== index);
    onUpdateInstructions(nextBullets.join(". "));
  }

  return (
    <div className="paymentInstructionEditorCard">
      <h4>{title}</h4>
      <div className="formRow">
        <label>
          Section Heading / Title
          <input
            value={headingValue || ""}
            onChange={(e) => onUpdateHeading(e.target.value)}
            placeholder={headingPlaceholder}
          />
        </label>
      </div>

      <div className="instructionBulletsManager">
        <label>Instruction Bullet Points</label>
        {bullets.map((bullet, index) => (
          <div className="instructionBulletRow" key={`${index}-${bullet.slice(0, 10)}`}>
            <span className="bulletNumberBadge">•</span>
            <input
              value={bullet}
              onChange={(e) => updateBullet(index, e.target.value)}
              placeholder={`Bullet point ${index + 1}`}
            />
            {bullets.length > 1 && (
              <button
                type="button"
                className="removeBulletBtn"
                title="Remove bullet point"
                onClick={() => removeBullet(index)}
              >
                &times;
              </button>
            )}
          </div>
        ))}
        <button type="button" className="addBulletBtn" onClick={addBullet}>
          + Add Bullet Point
        </button>
      </div>

      <div className="instructionPreviewCard">
        <span className="previewBadge">CUSTOMER CHECKOUT PREVIEW</span>
        <b>{headingValue || headingPlaceholder}</b>
        <ul className="previewBulletList">
          {bullets.filter(Boolean).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function WorkspaceDrawer({ workspace, onClose, onSave, activity }) {
  const [createMode, setCreateMode] = useState(Boolean(workspace.create));
  const records = activity.filter(item => item.module === workspace.module && item.feature === workspace.feature);

  function saveRecord(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      id: Date.now(),
      module: workspace.module,
      feature: workspace.feature,
      title: form.get("title") || `${workspace.feature} record`,
      status: form.get("status") || "Active",
      value: form.get("value") || "—",
      created: "Just now"
    });
  }

  return <><div className="adminOverlay" onClick={onClose} />
    <aside className="workspaceDrawer">
      <header><div><p>{workspace.module}</p><h2>{workspace.feature}</h2></div><button onClick={onClose}><X /></button></header>
      <div className="workspaceBody">
        <div className="workspaceToolbar">
          <div className="inlineSearch"><Search /><input placeholder={`Search ${workspace.feature.toLowerCase()}...`} /></div>
          <button onClick={() => setCreateMode(!createMode)}><Plus /> New record</button>
        </div>

        {createMode && <form className="workspaceForm" onSubmit={saveRecord}>
          <h3>Create {workspace.feature.toLowerCase()}</h3>
          <label>Title or name<input name="title" required placeholder={`Enter ${workspace.feature.toLowerCase()} name`} /></label>
          {(workspace.module === "Discounts" || workspace.module === "Gift cards" || workspace.module === "Finances") &&
            <div className="formRow"><label>Amount / value<input name="value" type="number" placeholder="0" /></label><label>Value type<select><option>PKR</option><option>Percentage</option></select></label></div>}
          {workspace.module === "Marketing" && <div className="formRow"><label>Channel<select><option>Email</option><option>Instagram</option><option>Facebook</option><option>SMS</option></select></label><label>Audience<select><option>All customers</option><option>Subscribers</option><option>Returning customers</option></select></label></div>}
          {workspace.module === "Inventory" && <div className="formRow"><label>Origin<input placeholder="Supplier or location" /></label><label>Destination<input defaultValue="Bustaniya warehouse" /></label></div>}
          {workspace.module === "Orders" && <div className="formRow"><label>Customer<input placeholder="Customer name" /></label><label>Order value<input name="value" type="number" placeholder="0" /></label></div>}
          {workspace.module === "Markets" && <div className="formRow"><label>Country / region<input placeholder="Pakistan" /></label><label>Currency<select><option>PKR</option><option>USD</option><option>GBP</option><option>AED</option></select></label></div>}
          <div className="formRow"><label>Status<select name="status"><option>Active</option><option>Draft</option><option>Scheduled</option><option>Paused</option></select></label><label>Date<input type="date" /></label></div>
          <label>Notes<textarea rows="4" placeholder="Add internal notes..." /></label>
          <div className="workspaceFormActions"><button type="button" onClick={() => setCreateMode(false)}>Cancel</button><button>Save record</button></div>
        </form>}

        <section className="workspaceRecords">
          <div className="workspaceInfo"><div><b>{records.length}</b><span>Local records</span></div><div><b>Ready</b><span>Supabase status</span></div></div>
          <div className="workspaceList">
            {records.length ? records.map(record => <article key={record.id}><div><b>{record.title}</b><span>{record.created}</span></div><p>{record.value}</p><i>{record.status}</i><button><MoreHorizontal /></button></article>)
            : <div className="workspaceEmpty"><Package /><h3>No records yet</h3><p>Create your first {workspace.feature.toLowerCase()} record. It will work locally until Supabase is connected.</p><button onClick={() => setCreateMode(true)}><Plus /> Create record</button></div>}
          </div>
        </section>
      </div>
    </aside>
  </>;
}
