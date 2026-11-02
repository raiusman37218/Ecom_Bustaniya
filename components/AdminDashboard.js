"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertCircle, Archive, ArrowDown, ArrowLeft, ArrowUp, BarChart3, Bell, Boxes, Calendar, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleDollarSign,
  Clock, Copy, CreditCard, Edit, ExternalLink, Eye, FileText, Folder, FolderPlus, FolderTree, Globe, Grid, HelpCircle, Info, Landmark, Layers, LayoutDashboard, List, Loader2, LogOut, MapPin, Menu, MessageSquare,
  Minus, MoreHorizontal, Package, Phone, Plus, Printer, ReceiptText, RefreshCw, RotateCcw, Save, Search, Settings,
  ShoppingBag, Sparkles, Star, Store, Tags, Trash2, TrendingUp, Truck, UploadCloud, User, Users, WalletCards, X, Scissors, Calculator
} from "lucide-react";
import { categories as fallbackCategoryNames, categoryDetails, categoryToSlug, products as initialProducts, slugifyCategory } from "../data/store";
import { DEFAULT_HOMEPAGE_SECTIONS, DEFAULT_STORE_SETTINGS, SECTION_TEMPLATES } from "../data/storeSettings";
import FinanceWorkspace from "./FinanceWorkspace";
import EventsWorkspace from "./EventsWorkspace";
import DashboardWorkspace from "./DashboardWorkspace";
import PluginsWorkspace from "./PluginsWorkspace";
import ArticlePriceCalculator from "./ArticlePriceCalculator";
import ProductColorPicker from "./ProductColorPicker";
import { apparelSizes, detectColorsFromText, fashionColors, getColorHex } from "../data/variantOptions";
import AdminLogin from "./AdminLogin";

const STANDARD_APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Custom"];

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
  setActive = () => { },
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

export function AdminLoadingShell() {
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
      image: categoryDetails[slug]?.image || "/bustaniya-campaign-hero-v4.webp",
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
  { name: "Price Calculator", icon: Calculator, section: "COMMERCE" },
  { name: "Categories", icon: Tags, section: "COMMERCE" },
  { name: "Inventory", icon: Boxes, section: "COMMERCE" },
  { name: "Customers", icon: Users, section: "COMMERCE" },
  { name: "Finances", icon: Landmark, section: "COMMERCE" },
  { name: "Courier Ops", icon: Truck, section: "OPERATIONS" },
  { name: "Couriers", icon: Truck, section: "OPERATIONS" },
  { name: "Apps & Plugins", icon: Sparkles, section: "OPERATIONS" },
  { name: "Settings", icon: Settings, section: "OPERATIONS" }
];

const navPermissionMap = {
  Dashboard: "dashboard",
  Events: "dashboard",
  Orders: "orders",
  Products: "products",
  "Price Calculator": "products",
  Categories: "products",
  Inventory: "inventory",
  Customers: "customers",
  Finances: "dashboard",
  "Courier Ops": "orders",
  Couriers: "settings",
  "Apps & Plugins": "settings",
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
  const [selectedColors, setSelectedColors] = useState([]);
  const [detectedColorsHint, setDetectedColorsHint] = useState([]);
  const [colorHexMap, setColorHexMap] = useState({});
  const [bottomOptions, setBottomOptions] = useState([]);
  const [enableBottomOptions, setEnableBottomOptions] = useState(false);
  const [newBottomName, setNewBottomName] = useState("");
  const [newBottomDelta, setNewBottomDelta] = useState(0);
  const [productCategory, setProductCategory] = useState("Kurtis");
  const [additionalCategories, setAdditionalCategories] = useState([]);
  const [categoryPrices, setCategoryPrices] = useState({});
  const [sizeSearch, setSizeSearch] = useState("");
  const [colorSearch, setColorSearch] = useState("");
  const [productMedia, setProductMedia] = useState([]);
  const [productImageUrl, setProductImageUrl] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [productPrice, setProductPrice] = useState(0);
  const [costPerItem, setCostPerItem] = useState(0);
  const [isNewProduct, setIsNewProduct] = useState(true);
  const [isBestsellerProduct, setIsBestsellerProduct] = useState(false);
  const [productStatus, setProductStatus] = useState("Active");
  const [showExtendedSizes, setShowExtendedSizes] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showPriceCalcModal, setShowPriceCalcModal] = useState(false);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const fileInputRef = useRef(null);
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

  const [products, setProducts] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("bustaniya-admin-products");
        if (saved) return JSON.parse(saved);
      } catch { }
    }
    return initialProducts.map((p, index) => ({
      ...p,
      stock: [12, 7, 3, 18, 5, 9, 4, 11, 2, 14, 8, 6][index] ?? 10,
    }));
  });
  const [adminReady, setAdminReady] = useState(true);
  const [orders, setOrders] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("bustaniya-admin-orders");
        if (cached) return JSON.parse(cached);
      } catch { }
    }
    return [];
  });
  const [ordersConnected, setOrdersConnected] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("bustaniya-admin-orders");
        return Boolean(cached && JSON.parse(cached).length > 0);
      } catch { }
    }
    return false;
  });
  const [ordersLoading, setOrdersLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("bustaniya-admin-orders");
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch { }
    }
    return true;
  });
  const [ordersError, setOrdersError] = useState("");
  const [ordersLoadError, setOrdersLoadError] = useState("");
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [inventoryMovements, setInventoryMovements] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState(fallbackCategoryRecords);
  const [categorySetupNeeded, setCategorySetupNeeded] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("bustaniya-admin-user");
        if (cached) return JSON.parse(cached);
      } catch { }
    }
    return null;
  });
  const [adminAuthChecked, setAdminAuthChecked] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return Boolean(localStorage.getItem("bustaniya-admin-user"));
      } catch { }
    }
    return false;
  });
  const [loggingOut, setLoggingOut] = useState(false);
  const [requestedOrderId, setRequestedOrderId] = useState("");
  const [requestedAdminFocus, setRequestedAdminFocus] = useState(null);
  const [metrics, setMetrics] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("bustaniya-admin-metrics");
        if (cached) return JSON.parse(cached);
      } catch { }
    }
    return {
      totalSales: 0,
      orders: 0,
      customers: 0,
      products: 0,
      lowStock: 0,
    };
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
      try { setProducts(JSON.parse(saved)); } catch { }
    }
    setAdminReady(true);
    refreshWorkspace();

    fetch("/api/admin/me")
      .then((response) => {
        if (response.ok) return response.json();
        if (response.status === 401 || response.status === 403) {
          try {
            localStorage.removeItem("bustaniya-admin-user");
          } catch { }
          setCurrentAdminUser(null);
        }
        return null;
      })
      .then((result) => {
        if (!result?.user) return;
        setCurrentAdminUser(result.user);
        try {
          localStorage.setItem("bustaniya-admin-user", JSON.stringify(result.user));
        } catch { }
      })
      .catch(() => { })
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
    setAdditionalCategories([]);
    setCategoryPrices({});
    setSelectedSizes(["XS", "S", "M", "L", "XL"]);
    setSelectedColors([]);
    setDetectedColorsHint([]);
    setColorHexMap({});
    setEnableBottomOptions(true);
    setBottomOptions([
      { name: "Shirt Only", priceDelta: 0 },
      { name: "With Plazo", priceDelta: 1500 },
      { name: "With Shalwar", priceDelta: 1500 },
      { name: "With Trouser", priceDelta: 1500 },
    ]);
    setNewBottomName("");
    setNewBottomDelta(0);
    setProductMedia([]);
    setProductImageUrl("");
    setMediaError("");
    setProductPrice(0);
    setCostPerItem(0);
    setIsNewProduct(true);
    setIsBestsellerProduct(false);
    setProductStatus("Active");
    setShowUrlInput(false);
    setShowExtendedSizes(false);
    setCostBreakdown({ fabric: 0, stitching: 0, embellishment: 0, packaging: 0, delivery: 0, other: 0 });
    setShowProductForm(true);
  }

  function openEditProductForm(product) {
    setEditingProduct(product);
    const primaryCat = product.category || "Kurtis";
    setProductCategory(primaryCat);
    const existingCats = Array.isArray(product.categories)
      ? product.categories
      : (Array.isArray(product.costBreakdown?.metadata?.categories || product.cost_breakdown?.metadata?.categories) ? (product.costBreakdown?.metadata?.categories || product.cost_breakdown?.metadata?.categories) : []);
    setAdditionalCategories(existingCats.filter((c) => normalizeCategory(c).toLowerCase() !== normalizeCategory(primaryCat).toLowerCase()));
    const existingPrices = (product.categoryPrices && typeof product.categoryPrices === "object" ? product.categoryPrices : null)
      || (product.costBreakdown?.metadata?.categoryPrices && typeof product.costBreakdown.metadata.categoryPrices === "object" ? product.costBreakdown.metadata.categoryPrices : null)
      || (product.cost_breakdown?.metadata?.categoryPrices && typeof product.cost_breakdown.metadata.categoryPrices === "object" ? product.cost_breakdown.metadata.categoryPrices : {});
    setCategoryPrices(existingPrices || {});
    setSelectedSizes(Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["XS", "S", "M", "L", "XL"]);
    setSelectedColors(Array.isArray(product.colors) ? product.colors : []);
    setDetectedColorsHint(detectColorsFromText(product.name || ""));
    setColorHexMap(product.colorHexMap || {});
    const explicitEnable = product.enableBottomOptions !== undefined ? product.enableBottomOptions : null;
    const hasExplicitBottoms = Array.isArray(product.bottomOptions);
    const hasBottoms = hasExplicitBottoms && product.bottomOptions.length > 0 && explicitEnable !== false;
    const isExplicitlyDisabled = explicitEnable === false || (hasExplicitBottoms && product.bottomOptions.length === 0);
    const isKurti = String(product.category || "").toLowerCase().includes("kurti");
    if (isExplicitlyDisabled || !hasBottoms) {
      setEnableBottomOptions(false);
      setBottomOptions([]);
    } else {
      setEnableBottomOptions(true);
      setBottomOptions(product.bottomOptions);
    }
    setNewBottomName("");
    setNewBottomDelta(0);
    const existingColorImages = product.colorImages || product.color_images || product.costBreakdown?.metadata?.colorImages || {};
    setProductMedia((product.images || [product.image]).filter(Boolean).map((src, index) => {
      let assignedColor = "";
      for (const [col, imgs] of Object.entries(existingColorImages)) {
        const arr = Array.isArray(imgs) ? imgs : [imgs];
        if (arr.includes(src)) {
          assignedColor = col;
          break;
        }
      }
      return {
        id: `existing-${product.id}-${index}`,
        name: `Product image ${index + 1}`,
        src,
        colorTag: assignedColor,
      };
    }));
    setProductImageUrl("");
    setMediaError("");
    setProductPrice(Number(product.price || 0));
    setCostPerItem(Number(product.costTotalPkr || product.cost_total_pkr || product.costBreakdown?.fabric || 0));
    setIsNewProduct(Boolean(product.isNew ?? product.new));
    setIsBestsellerProduct(Boolean(product.isBestseller ?? product.bestsellere));
    setProductStatus(product.status || "Active");
    setShowUrlInput(false);
    setShowExtendedSizes(false);
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
        const orderNotes = cleanUserNote(order.internal_notes || order.notes || "");

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
          ...(() => {
            const rawStatus = String(order.status || "").trim();
            const rawCourierStatus = String(order.courier_status || "").trim();
            const rawTracking = String(order.courier_tracking_number || order.tracking_number || "").trim();
            const hasRealTracking = Boolean(rawTracking && !rawTracking.startsWith("MANUAL-"));
            const isExplicitUnbooked = !hasRealTracking && (
              rawStatus.toLowerCase().includes("unbook") ||
              rawCourierStatus.toLowerCase().includes("unbook") ||
              rawStatus.toLowerCase().includes("unassigned") ||
              rawCourierStatus.toLowerCase().includes("unassigned")
            );

            let effectiveStatus;
            if (isExplicitUnbooked) {
              effectiveStatus = "Unbooked";
            } else if (hasRealTracking) {
              const raw = order.courier_raw_status || order.courier_status || order.status || "";
              if (!raw || raw.toLowerCase() === "unbooked" || raw.toLowerCase() === "pending" || raw.toLowerCase() === "unassigned") {
                effectiveStatus = "Booked";
              } else {
                effectiveStatus = formatOrderStatus(raw);
              }
            } else {
              const raw = order.status || order.courier_status || "";
              effectiveStatus = (!raw || raw.toLowerCase() === "pending") ? "Unbooked" : formatOrderStatus(raw);
            }

            return {
              status: effectiveStatus,
              postexStatus: effectiveStatus,
              courierRawStatus: isExplicitUnbooked ? "Unbooked" : (hasRealTracking && (order.courier_raw_status || "").toLowerCase() === "unbooked" ? "Booked" : (order.courier_raw_status || order.courier_status || "")),
              courierNormalizedStatus: isExplicitUnbooked ? "unassigned" : (hasRealTracking && (order.courier_normalized_status || "").toLowerCase() === "unassigned" ? "booked" : (order.courier_normalized_status || "unassigned")),
              courierServiceType: order.courier_service_type || "",
              paymentStatus: formatPaymentStatus(order.payment_proof_status || order.payment_status || "", { advance, total }),
              fulfillmentStatus: isExplicitUnbooked ? "Unfulfilled" : (order.fulfillment_status || (hasRealTracking ? "Booked with PostEx" : "Unfulfilled")),
              tracking: hasRealTracking ? rawTracking : "",
            };
          })(),
          phone: order.shipping_phone || order.guest_phone || "",
          address: [order.shipping_address || order.shipping_line1, order.shipping_city, order.shipping_postal_code].filter(Boolean).join(", "),
          email: order.customer_email || order.guest_email || "",
          items: orderItems,
          order_items: orderItems,
          notes: orderNotes,
          internalNotes: orderNotes,
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
      try {
        localStorage.setItem("bustaniya-admin-orders", JSON.stringify(formatted.slice(0, 30)));
      } catch { }
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
      try {
        localStorage.setItem("bustaniya-admin-metrics", JSON.stringify(dashboard.metrics || metrics));
      } catch { }
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
      const { urls: mediaImages, items: finalMediaItems } = await uploadProductMedia();
      const colorImagesMap = {};
      if (selectedColors.length > 0) {
        selectedColors.forEach((c) => {
          colorImagesMap[c] = [];
        });
        (finalMediaItems || []).forEach((item) => {
          if (item.colorTag && colorImagesMap[item.colorTag]) {
            colorImagesMap[item.colorTag].push(item.src);
          }
        });
        Object.keys(colorImagesMap).forEach((c) => {
          if (!colorImagesMap[c].length) delete colorImagesMap[c];
        });
      }
      const seoTitle = String(form.get("seoTitle") || "").trim();
      const name = String(form.get("name") || "").trim();
      const priceVal = Number(form.get("price") || 0);
      const compareVal = Number(form.get("comparePrice") || 0) || null;
      const costVal = Number(form.get("costPerItem") || 0);
      const stockVal = Number(form.get("stock") || 0);
      const skuVal = String(form.get("sku") || "").trim();
      const categoryVal = form.get("category") || productCategory;
      const cleanAdditional = additionalCategories
        .map((c) => String(c || "").trim())
        .filter((c) => c && normalizeCategory(c).toLowerCase() !== normalizeCategory(categoryVal).toLowerCase());
      const allCategories = [categoryVal, ...cleanAdditional];
      const cleanCategoryPrices = {};
      Object.entries(categoryPrices || {}).forEach(([cat, pr]) => {
        if (Number(pr) > 0 && allCategories.some((c) => normalizeCategory(c).toLowerCase() === normalizeCategory(cat).toLowerCase())) {
          cleanCategoryPrices[cat] = Number(pr);
        }
      });
      const subcategoryVal = form.get("subcategory") || "";
      const collectionVal = String(form.get("collection") || "").trim();
      const statusVal = form.get("status") || productStatus || "Active";
      const tagsList = String(form.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean);
      const instagramUrl = String(form.get("instagramVideoUrl") || "").trim();
      const finalBottomOptions = enableBottomOptions
        ? bottomOptions.filter((opt) => opt && opt.name && String(opt.name).trim()).map((opt) => ({
          name: String(opt.name).trim(),
          priceDelta: Math.max(0, Number(opt.priceDelta || 0)),
        }))
        : [];

      const productPayload = {
        name,
        description: form.get("description") || "",
        category: categoryVal,
        categories: allCategories,
        categoryPrices: cleanCategoryPrices,
        subcategory: subcategoryVal,
        collection: collectionVal,
        productType: categoryVal || "Women's clothing",
        price: priceVal,
        compare_at_price: compareVal,
        bottomOptions: finalBottomOptions,
            enableBottomOptions: Boolean(enableBottomOptions && finalBottomOptions.length > 0),
        sku: skuVal,
        sizes: selectedSizes,
        colors: selectedColors,
        colorHexMap: {
          ...colorHexMap,
          ...Object.fromEntries(selectedColors.map((c) => [c, colorHexMap[c] || getColorHex(c)])),
        },
        variants: selectedSizes.flatMap((size) => selectedColors.map((color) => ({
          size,
          color,
          sku: `${skuVal || "BST"}-${size}-${color}`.replace(/\s+/g, "-").toUpperCase(),
          stock: Math.max(0, Math.floor(stockVal / Math.max(1, selectedSizes.length * selectedColors.length))),
          image: colorImagesMap[color]?.[0] || mediaImages[0] || "",
        }))),
        colorImages: colorImagesMap,
        tags: tagsList,
        status: statusVal,
        publishDate: new Date().toISOString().split("T")[0],
        images: mediaImages.length
          ? mediaImages
          : ["/bustaniya-campaign-hero-v4.webp"],
        delivery_fee_mode: "inherit",
        delivery_fee_pkr: null,
        deliveryInfo: "",
        instagramVideoUrl: instagramUrl,
        cost_total_pkr: costVal,
        cost_breakdown: {
          fabric: costVal,
          stitching: 0,
          embellishment: 0,
          packaging: 0,
          delivery: 0,
          other: 0,
          metadata: {
            fabricDetails: "",
            careInstructions: "",
            deliveryInfo: "",
            instagramVideoUrl: instagramUrl,
            vendor: "Bustaniya",
            barcode: "",
            weight: "",
            weightUnit: "kg",
            countryOfOrigin: "Pakistan",
            hsTariffCode: "",
            seoTitle: seoTitle || name,
            seoDescription: String(form.get("seoDescription") || "").trim(),
            urlHandle: String(form.get("urlHandle") || "").trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            bottomOptions: finalBottomOptions,
            enableBottomOptions: Boolean(enableBottomOptions && finalBottomOptions.length > 0),
            compareAtPrice: compareVal,
            status: statusVal,
            productType: categoryVal || "Women's clothing",
            categories: allCategories,
            categoryPrices: cleanCategoryPrices,
            tags: tagsList,
            publishDate: new Date().toISOString().split("T")[0],
            colorImages: colorImagesMap,
            variants: selectedSizes.flatMap((size) => selectedColors.map((color) => ({
              size,
              color,
              sku: `${skuVal || "BST"}-${size}-${color}`.replace(/\s+/g, "-").toUpperCase(),
              stock: Math.max(0, Math.floor(stockVal / Math.max(1, selectedSizes.length * selectedColors.length))),
              image: colorImagesMap[color]?.[0] || mediaImages[0] || "",
            }))),
          },
        },
      };

      productPayload.is_new = isNewProduct;
      productPayload.is_bestseller = isBestsellerProduct;

      const response = await fetch("/api/admin/catalog", {
        method: editingProduct ? "PATCH" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(editingProduct ? { productId: editingProduct.id } : {}),
          product: productPayload,
          stock: stockVal,
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
      setMediaError(saveError.message);
    } finally {
      setProductSaving(false);
      setCatalogLoading(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      try {
        localStorage.removeItem("bustaniya-admin-user");
        localStorage.removeItem("bustaniya-admin-orders");
        localStorage.removeItem("bustaniya-admin-metrics");
      } catch { }
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
      const items = await Promise.all(imageFiles.map(async (file) => {
        const detected = detectColorsFromText(file.name);
        const autoColor = detected.length ? detected[0] : "";
        return {
          id: `${file.name}-${file.lastModified}-${file.size}`,
          name: file.name,
          file,
          src: await readImageFile(file),
          colorTag: autoColor,
        };
      }));
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

  function setMainCoverImage(index) {
    setProductMedia((prev) => {
      if (index === 0 || !prev[index]) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
  }

  async function uploadProductMedia() {
    if (!productMedia.length) return { urls: [], items: [] };
    const form = new FormData();
    const uploadItems = productMedia.filter((item) => item.file);
    uploadItems.forEach((item) => form.append("files", item.file, item.name));

    let uploadedUrls = [];
    if (uploadItems.length) {
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to upload product photos.");
      uploadedUrls = [...(result.urls || [])];
    }

    const finalItems = productMedia.map((item) => ({
      src: item.file ? uploadedUrls.shift() : item.src,
      colorTag: item.colorTag || "",
    })).filter((item) => Boolean(item.src));

    return {
      urls: finalItems.map((i) => i.src),
      items: finalItems,
    };
  }

  function closeProductForm() {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductCategory("Kurtis");
    setProductMedia([]);
    setProductImageUrl("");
    setMediaError("");
    setProductPrice(0);
    setCostPerItem(0);
    setShowUrlInput(false);
    setShowExtendedSizes(false);
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
      setMediaError(saveError.message);
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
            images: ["/bustaniya-campaign-hero-v4.webp"],
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
      setMediaError(saveError.message);
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

  async function archiveCategory(category, permanent = false) {
    setCategorySaving(true);
    setOrdersError("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categoryId: category.id || category.slug, permanent }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to archive category.");
      if (result.needsSetup) {
        setCategorySetupNeeded(true);
        setOrdersError(`Run ${result.setupSql || "scripts/supabase-catalog-categories.sql"} in Supabase before archiving categories.`);
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
          {canAccessActive && active === "Dashboard" && (
            <DashboardWorkspace
              setActive={navigateAdminSection}
              orders={orders}
              products={products}
              metrics={metrics}
              connected={ordersConnected}
              loading={ordersLoading || catalogLoading}
              ordersError={ordersLoadError}
              currentAdminUser={currentAdminUser}
              onRefresh={() => refreshWorkspace()}
              onAddProduct={() => {
                navigateAdminSection("Products");
                openNewProductForm();
              }}
              onOpenOrder={(order) => {
                setRequestedOrderId(order.order_number || order.id);
                navigateAdminSection("Orders");
              }}
            />
          )}
          {canAccessActive && active === "Events" && <EventsWorkspace onNavigateToSettings={() => navigateAdminSection("Settings", { focus: "Tracking" })} onNavigateToOrder={(orderId) => { setRequestedOrderId(orderId); navigateAdminSection("Orders"); }} />}
          {canAccessActive && active === "Products" && <ProductsPanel products={filteredProducts} search={search} setSearch={setSearch} onAdd={openNewProductForm} onEdit={openEditProductForm} onDelete={deleteProduct} onDeliveryChange={updateProductDelivery} loading={catalogLoading} initialView={requestedAdminFocus?.section === "Products" ? requestedAdminFocus.focus : ""} tableDensity={tableDensity} setTableDensity={handleTableDensityChange} />}
          {canAccessActive && active === "Price Calculator" && (
            <ArticlePriceCalculator
              products={products}
              onApplyToProduct={(calcData) => {
                openNewProductForm();
                setProductPrice(calcData.price);
                setCostPerItem(calcData.costPerItem);
                setCostBreakdown(calcData.costBreakdown);
                setProductCategory(calcData.category || "Kurtis");
                setTimeout(() => {
                  const nameInput = document.querySelector('input[name="name"]');
                  if (nameInput) nameInput.value = calcData.name || "";
                  const compInput = document.querySelector('input[name="comparePrice"]');
                  if (compInput) compInput.value = calcData.compareAtPrice || "";
                }, 50);
              }}
            />
          )}
          {canAccessActive && active === "Categories" && (
            <CategoriesPanel
              categories={catalogCategories}
              products={products}
              onSave={saveCategory}
              onArchive={archiveCategory}
              saving={categorySaving}
              needsSetup={categorySetupNeeded}
              onConfirmAction={({ title, message, confirmLabel, danger, onConfirm }) =>
                requestConfirm({
                  title,
                  message,
                  confirmText: confirmLabel || "Confirm",
                  isDanger: danger ?? true,
                  onConfirm,
                })
              }
              onNavigateToProducts={(categoryName) => {
                setSearch(categoryName);
                navigateAdminSection("Products");
              }}
            />
          )}
          {canAccessActive && active === "Orders" && <OrdersPanel rows={orders} products={products} pagination={ordersPagination} canExport={currentAdminUser?.role === "Owner" || currentAdminUser?.permissions?.includes("orders.export")} currentAdminUser={currentAdminUser} connected={ordersConnected} loading={ordersLoading} error={ordersError} onRetry={() => loadOrders()} onPageChange={(page) => loadOrders({ page })} initialSelectedId={requestedOrderId} onInitialSelectionHandled={() => setRequestedOrderId("")} tableDensity={tableDensity} setTableDensity={handleTableDensityChange} onNavigateToEvents={() => navigateAdminSection("Events")} />}
          {canAccessActive && active === "Inventory" && <InventoryPanel products={products} movements={inventoryMovements} orders={orders} connected={ordersConnected} currentAdminUser={currentAdminUser} onAdjust={adjustInventory} onCreateCustomInventory={createCustomInventory} onCreateProductionBatch={createProductionBatch} onOpenOrder={(order) => { setRequestedOrderId(order.id); navigateAdminSection("Orders"); }} initialView={requestedAdminFocus?.section === "Inventory" ? requestedAdminFocus.focus : ""} />}
          {canAccessActive && active === "Customers" && <CustomersPanel orders={orders} onOpen={setWorkspace} />}
          {canAccessActive && active === "Finances" && <FinancePanel orders={orders} products={products} connected={ordersConnected} currentAdminUser={currentAdminUser} initialTab={requestedAdminFocus?.section === "Finances" ? requestedAdminFocus.focus : ""} />}
          {canAccessActive && active === "Courier Ops" && <CourierOperationsPanel />}
          {canAccessActive && active === "Couriers" && <CouriersPanel />}
          {canAccessActive && active === "Apps & Plugins" && <PluginsWorkspace currentAdminUser={currentAdminUser} />}
          {canAccessActive && active === "Settings" && <SettingsPanel onOpen={setWorkspace} signedInUser={currentAdminUser} initialTab={requestedAdminFocus?.section === "Settings" ? requestedAdminFocus.focus : ""} categories={catalogCategories} />}
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

      {showProductForm && (
        <div className="shopifyProductModalOverlay">
          <div className="shopifyProductModalContainer">
            {/* Top Sticky Bar */}
            <header className="shopifyProductTopBar">
              <div className="shopifyTopBarLeft">
                <button
                  type="button"
                  className="shopifyBackBtn"
                  onClick={closeProductForm}
                  aria-label="Back to products"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="shopifyTopBarTitleWrap">
                  <div className="shopifyBreadcrumb">Products / {editingProduct ? "Edit" : "New"}</div>
                  <h1 className="shopifyTopBarTitle">
                    {editingProduct ? (editingProduct.name || "Edit product") : "Add product"}
                  </h1>
                </div>
                <span className={`shopifyStatusBadge ${productStatus === "Active" ? "active" : "draft"}`}>
                  <span className="statusDot" />
                  {productStatus}
                </span>
              </div>
              <div className="shopifyTopBarRight">
                <button
                  type="button"
                  className="shopifyBtnSecondary"
                  onClick={closeProductForm}
                  disabled={productSaving}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="shopifyBtnPrimary"
                  onClick={() => {
                    const formElement = document.getElementById("shopify-product-form");
                    if (formElement) formElement.requestSubmit();
                  }}
                  disabled={productSaving}
                >
                  {productSaving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    editingProduct ? "Save changes" : "Save product"
                  )}
                </button>
              </div>
            </header>

            {/* Main Form Body */}
            <form id="shopify-product-form" onSubmit={addProduct} key={editingProduct?.id || "new-product"}>
              <div className="shopifyProductGrid">
                {/* LEFT COLUMN: Main Product Details */}
                <div className="shopifyMainCol">
                  {/* Card 1: Title & Description */}
                  <div className="shopifyCard">
                    <div className="shopifyField">
                      <label className="shopifyLabel">Title</label>
                      <input
                        className="shopifyInput shopifyTitleInput"
                        name="name"
                        required
                        defaultValue={editingProduct?.name || ""}
                        placeholder="Short sleeve t-shirt, Aylin co-ord set, etc."
                        onChange={(e) => {
                          const val = e.target.value;
                          const detected = detectColorsFromText(val);
                          setDetectedColorsHint(detected);
                          if (detected.length > 0) {
                            setSelectedColors((prev) => {
                              const merged = Array.from(new Set([...prev, ...detected]));
                              const newMap = { ...colorHexMap };
                              merged.forEach((c) => {
                                if (!newMap[c]) newMap[c] = getColorHex(c);
                              });
                              setColorHexMap(newMap);
                              return merged;
                            });
                          }
                        }}
                      />
                      {detectedColorsHint.length > 0 && (
                        <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "12px", color: "#166534" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                            <Sparkles size={13} color="#16a34a" /> Auto-detected color{detectedColorsHint.length > 1 ? "s" : ""}:
                          </span>
                          {detectedColorsHint.map((c) => (
                            <span
                              key={c}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                background: "#dcfce7",
                                color: "#15803d",
                                border: "1px solid #86efac",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontWeight: 500,
                              }}
                            >
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: getColorHex(c) }} />
                              {c} ✓
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shopifyField">
                      <div className="shopifyToolbarHeader">
                        <label className="shopifyLabel">Description</label>
                        <div className="shopifyFormattingToolbar">
                          <button type="button" onClick={() => insertProductDetailsFormat("heading")}>
                            Heading
                          </button>
                          <button type="button" onClick={() => insertProductDetailsFormat("bullet")}>
                            • Bullet
                          </button>
                        </div>
                      </div>
                      <textarea
                        id="product-details-editor"
                        ref={productDetailsEditorRef}
                        name="description"
                        className="shopifyTextarea"
                        rows="7"
                        defaultValue={getUnifiedProductDetails(editingProduct)}
                        placeholder={"Describe the fabric, cut, embroidery, and care instructions..."}
                      />
                    </div>
                  </div>

                  {/* Card 2: Media */}
                  <div className="shopifyCard">
                    <div className="shopifyCardHeader">
                      <div>
                        <h3 className="shopifyCardTitle">Media</h3>
                        <p className="shopifyCardSubtitle">Add photos of your product from different angles</p>
                      </div>
                      <span className="shopifyBadgeCount">{productMedia.length} / 8 photos</span>
                    </div>

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      onChange={addProductFiles}
                      style={{ display: "none" }}
                    />

                    {/* Drag & drop upload area */}
                    <div
                      className={`shopifyDropzone ${isDraggingMedia ? "dragging" : ""}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingMedia(true); }}
                      onDragLeave={() => setIsDraggingMedia(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingMedia(false);
                        addProductFiles({ target: { files: e.dataTransfer.files, value: "" } });
                      }}
                    >
                      <UploadCloud size={28} className="shopifyUploadIcon" />
                      <div className="shopifyDropzoneText">
                        <b>Click to upload</b> or drag and drop images
                      </div>
                      <span className="shopifyDropzoneHint">PNG, JPG, WEBP up to 10MB each</span>
                    </div>

                    {/* URL toggle button */}
                    <div className="shopifyMediaUrlAction">
                      <button
                        type="button"
                        className="shopifyTextLinkBtn"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                      >
                        {showUrlInput ? "− Hide image URL input" : "+ Add image from Cloudinary link"}
                      </button>
                    </div>

                    {showUrlInput && (
                      <div className="shopifyUrlRow">
                        <input
                          className="shopifyInput"
                          value={productImageUrl}
                          onChange={(e) => setProductImageUrl(e.target.value)}
                          placeholder="https://res.cloudinary.com/.../photo.jpg"
                        />
                        <button type="button" className="shopifyBtnSecondary" onClick={addProductImageUrl}>
                          Add URL
                        </button>
                      </div>
                    )}

                    {mediaError && <div className="shopifyErrorBanner">{mediaError}</div>}

                    {/* Image preview grid */}
                    {productMedia.length > 0 && (
                      <div className="shopifyMediaList">
                        {productMedia.map((item, idx) => (
                          <div className={`shopifyMediaCard ${idx === 0 ? "isCover" : ""}`} key={item.id}>
                            <img src={item.src} alt={item.name} />
                            {idx === 0 && (
                              <span className="shopifyCoverPill">
                                <Star size={10} fill="#ffffff" /> Cover photo
                              </span>
                            )}
                            <div className="shopifyMediaOverlay">
                              {idx !== 0 && (
                                <button
                                  type="button"
                                  className="shopifySetCoverBtn"
                                  onClick={(e) => { e.stopPropagation(); setMainCoverImage(idx); }}
                                  title="Set as main cover photo"
                                >
                                  Make cover
                                </button>
                              )}
                              <button
                                type="button"
                                className="shopifyDeletePhotoBtn"
                                onClick={(e) => { e.stopPropagation(); removeProductMedia(item.id); }}
                                title="Remove photo"
                                aria-label="Remove photo"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            {selectedColors.length > 1 && (
                              <div className="shopifyMediaColorSelect">
                                <select
                                  value={item.colorTag || ""}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setProductMedia((prev) =>
                                      prev.map((m) => (m.id === item.id ? { ...m, colorTag: val } : m))
                                    );
                                  }}
                                  title="Assign photo to color"
                                >
                                  <option value="">All / Shared</option>
                                  {selectedColors.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card 3: Pricing (Clean Shopify standard) */}
                  <div className="shopifyCard">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <h3 className="shopifyCardTitle">Pricing</h3>
                      <button
                        type="button"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 12px",
                          borderRadius: "7px",
                          border: "1px solid #16452c",
                          background: "#f0fdf4",
                          color: "#16452c",
                          fontSize: "12px",
                          fontWeight: "750",
                          cursor: "pointer",
                        }}
                        onClick={() => setShowPriceCalcModal(true)}
                        title="Calculate selling price, compare-at MSRP, and profit breakdown"
                      >
                        <Calculator size={13} />
                        <span>Price Calculator</span>
                      </button>
                    </div>
                    <div className="shopifyGrid2">
                      <div className="shopifyField">
                        <label className="shopifyLabel">Price (PKR)</label>
                        <div className="shopifyCurrencyInput">
                          <span className="currencyPrefix">Rs.</span>
                          <input
                            name="price"
                            required
                            type="number"
                            min="0"
                            value={productPrice || ""}
                            onChange={(e) => setProductPrice(e.target.value)}
                            placeholder="4,990"
                          />
                        </div>
                      </div>
                      <div className="shopifyField">
                        <label className="shopifyLabel">
                          Compare-at price (PKR)
                          <span className="shopifyLabelHint">Optional original price</span>
                        </label>
                        <div className="shopifyCurrencyInput">
                          <span className="currencyPrefix">Rs.</span>
                          <input
                            name="comparePrice"
                            type="number"
                            min="0"
                            defaultValue={editingProduct?.compareAtPrice || editingProduct?.compare_at_price || ""}
                            placeholder="5,990"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="shopifyField" style={{ marginTop: "6px" }}>
                      <label className="shopifyLabel">
                        Cost per item (PKR)
                        <span className="shopifyLabelHint">Customers won&apos;t see this</span>
                      </label>
                      <div className="shopifyCurrencyInput" style={{ maxWidth: "260px" }}>
                        <span className="currencyPrefix">Rs.</span>
                        <input
                          name="costPerItem"
                          type="number"
                          min="0"
                          value={costPerItem || ""}
                          onChange={(e) => setCostPerItem(e.target.value)}
                          placeholder="2,500"
                        />
                      </div>
                    </div>

                    {/* Live Profit & Margin Widget */}
                    {Number(productPrice || 0) > 0 && Number(costPerItem || 0) > 0 && (
                      <div className="shopifyProfitBanner">
                        <div className="profitStat">
                          <span className="statLabel">Estimated Profit</span>
                          <b className="statValue">Rs. {(Number(productPrice) - Number(costPerItem)).toLocaleString()}</b>
                        </div>
                        <div className="statDivider" />
                        <div className="profitStat">
                          <span className="statLabel">Margin</span>
                          <b className="statValue">
                            {(((Number(productPrice) - Number(costPerItem)) / Number(productPrice)) * 100).toFixed(1)}%
                          </b>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 4: Inventory */}
                  <div className="shopifyCard">
                    <h3 className="shopifyCardTitle">Inventory</h3>
                    <div className="shopifyGrid2">
                      <div className="shopifyField">
                        <label className="shopifyLabel">Available stock quantity</label>
                        <input
                          name="stock"
                          required
                          type="number"
                          min="0"
                          defaultValue={editingProduct?.stock ?? 10}
                          placeholder="10"
                        />
                      </div>
                      <div className="shopifyField">
                        <label className="shopifyLabel">
                          SKU (Stock Keeping Unit)
                          <span className="shopifyLabelHint">Auto-created if empty</span>
                        </label>
                        <input
                          name="sku"
                          defaultValue={editingProduct?.sku || editingProduct?.articleNumber || ""}
                          placeholder="BST-AYL-001"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 5: Variants (Sizes & Colors) */}
                  <div className="shopifyCard">
                    <div className="shopifyCardHeader">
                      <div>
                        <h3 className="shopifyCardTitle">Variants</h3>
                        <p className="shopifyCardSubtitle">Select available sizes and colors for this outfit</p>
                      </div>
                      <span className="shopifyBadgeCount">
                        {selectedSizes.length * selectedColors.length} combinations
                      </span>
                    </div>

                    {/* Sizes Section */}
                    <div className="shopifyVariantSection">
                      <div className="shopifyVariantHeader">
                        <b>Sizes</b>
                        <span className="shopifySelectedPill">{selectedSizes.length} selected</span>
                      </div>
                      <div className="shopifyChipsGrid">
                        {STANDARD_APPAREL_SIZES.map((size) => {
                          const isSelected = selectedSizes.includes(size);
                          return (
                            <button
                              type="button"
                              key={size}
                              className={`shopifyChip ${isSelected ? "selected" : ""}`}
                              onClick={() => {
                                setSelectedSizes((curr) =>
                                  curr.includes(size) ? curr.filter((s) => s !== size) : [...curr, size]
                                );
                              }}
                            >
                              {isSelected && <Check size={13} />} {size}
                            </button>
                          );
                        })}
                      </div>

                      {/* Extended sizes dropdown */}
                      <div style={{ marginTop: "8px" }}>
                        <button
                          type="button"
                          className="shopifyTextLinkBtn"
                          onClick={() => setShowExtendedSizes(!showExtendedSizes)}
                        >
                          {showExtendedSizes ? "− Hide extra sizes" : "+ Add other sizes (UK, EU, Waist)"}
                        </button>
                      </div>

                      {showExtendedSizes && (
                        <div className="shopifyExtendedSizesBox">
                          <input
                            className="shopifyInput shopifySearchInput"
                            value={sizeSearch}
                            onChange={(e) => setSizeSearch(e.target.value)}
                            placeholder="Filter sizes (e.g. UK 12, Waist 30)..."
                          />
                          <div className="shopifyChipsScroll">
                            {apparelSizes
                              .filter((s) => !STANDARD_APPAREL_SIZES.includes(s) && s.toLowerCase().includes(sizeSearch.toLowerCase()))
                              .map((size) => {
                                const isSelected = selectedSizes.includes(size);
                                return (
                                  <button
                                    type="button"
                                    key={size}
                                    className={`shopifyChip small ${isSelected ? "selected" : ""}`}
                                    onClick={() => {
                                      setSelectedSizes((curr) =>
                                        curr.includes(size) ? curr.filter((s) => s !== size) : [...curr, size]
                                      );
                                    }}
                                  >
                                    {size}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom & Style Pairing Options (WearAroha Style) */}
                    <div className="shopifyVariantSection" style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                            Bottom & Pairing Options (WearAroha Style)
                          </h4>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                            Sell as Shirt Only or let customers add matching bottoms (Plazo, Shalwar, Trouser, etc.) with price deltas.
                          </p>
                        </div>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#1f2937", background: "#f3f4f6", padding: "6px 12px", borderRadius: "6px" }}>
                          <input
                            type="checkbox"
                            checked={enableBottomOptions}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEnableBottomOptions(checked);
                              if (checked && (!bottomOptions || !bottomOptions.length)) {
                                setBottomOptions([
                                  { name: "Shirt Only", priceDelta: 0 },
                                  { name: "With Plazo", priceDelta: 1500 },
                                  { name: "With Shalwar", priceDelta: 1500 },
                                  { name: "With Trouser", priceDelta: 1500 },
                                ]);
                              }
                            }}
                            style={{ width: "16px", height: "16px", accentColor: "#1d6840" }}
                          />
                          Enable pairing options
                        </label>
                      </div>

                      {enableBottomOptions && (
                        <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "16px", border: "1px solid #e5e7eb" }}>
                          {/* Quick Preset Buttons */}
                          <div style={{ marginBottom: "14px" }}>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                              ⚡ Quick Add Presets:
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {[
                                { name: "Shirt Only", priceDelta: 0 },
                                { name: "With Plazo", priceDelta: 1500 },
                                { name: "With Shalwar", priceDelta: 1500 },
                                { name: "With Trouser", priceDelta: 1500 },
                                { name: "With Tulip Shalwar", priceDelta: 1800 },
                                { name: "With Straight Pants", priceDelta: 1500 },
                                { name: "With Gharara", priceDelta: 2500 },
                                { name: "With Dupatta", priceDelta: 1200 },
                              ].map((preset) => {
                                const exists = bottomOptions.some((o) => o.name.toLowerCase() === preset.name.toLowerCase());
                                return (
                                  <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => {
                                      if (exists) {
                                        setBottomOptions(bottomOptions.filter((o) => o.name.toLowerCase() !== preset.name.toLowerCase()));
                                      } else {
                                        setBottomOptions([...bottomOptions, preset]);
                                      }
                                    }}
                                    style={{
                                      fontSize: "12px",
                                      padding: "5px 11px",
                                      borderRadius: "6px",
                                      border: exists ? "1.5px solid #1d6840" : "1px solid #d1d5db",
                                      background: exists ? "#e8f5e9" : "#fff",
                                      color: exists ? "#1d6840" : "#374151",
                                      fontWeight: exists ? 600 : 400,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {exists ? "✓ " : "+ "}
                                    {preset.name} {preset.priceDelta > 0 ? `(+Rs. ${preset.priceDelta.toLocaleString()})` : "(Base)"}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* List of Configured Bottom Options */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                            {bottomOptions.map((opt, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  background: "#fff",
                                  padding: "8px 12px",
                                  borderRadius: "6px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, width: "20px" }}>
                                  #{idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={opt.name}
                                  placeholder="Option name (e.g. With Plazo)"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setBottomOptions(bottomOptions.map((o, i) => (i === idx ? { ...o, name: val } : o)));
                                  }}
                                  style={{
                                    flex: 2,
                                    padding: "6px 10px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                  }}
                                />
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1.2 }}>
                                  <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>+Rs.</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    value={opt.priceDelta}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Math.max(0, Number(e.target.value) || 0);
                                      setBottomOptions(bottomOptions.map((o, i) => (i === idx ? { ...o, priceDelta: val } : o)));
                                    }}
                                    style={{
                                      width: "100%",
                                      padding: "6px 8px",
                                      border: "1px solid #d1d5db",
                                      borderRadius: "4px",
                                      fontSize: "13px",
                                    }}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setBottomOptions(bottomOptions.filter((_, i) => i !== idx))}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    padding: "4px 8px",
                                    fontSize: "16px",
                                    fontWeight: "bold",
                                  }}
                                  title="Remove option"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            {!bottomOptions.length && (
                              <p style={{ margin: "4px 0", fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>
                                No pairing options added yet. Click a preset above or add a custom option below.
                              </p>
                            )}
                          </div>

                          {/* Add Custom Option Row */}
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", borderTop: "1px dashed #d1d5db", paddingTop: "12px", flexWrap: "wrap" }}>
                            <input
                              type="text"
                              value={newBottomName}
                              onChange={(e) => setNewBottomName(e.target.value)}
                              placeholder="Add custom option (e.g. With Straight Trouser)"
                              style={{ flex: 2, minWidth: "160px", padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px" }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newBottomName.trim()) {
                                  e.preventDefault();
                                  setBottomOptions([...bottomOptions, { name: newBottomName.trim(), priceDelta: Number(newBottomDelta) || 0 }]);
                                  setNewBottomName("");
                                  setNewBottomDelta(0);
                                }
                              }}
                            />
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1.2, minWidth: "110px" }}>
                              <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>+Rs.</span>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={newBottomDelta}
                                onChange={(e) => setNewBottomDelta(Math.max(0, Number(e.target.value) || 0))}
                                placeholder="0"
                                style={{ width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px" }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (newBottomName.trim()) {
                                  setBottomOptions([...bottomOptions, { name: newBottomName.trim(), priceDelta: Number(newBottomDelta) || 0 }]);
                                  setNewBottomName("");
                                  setNewBottomDelta(0);
                                }
                              }}
                              disabled={!newBottomName.trim()}
                              style={{
                                padding: "6px 14px",
                                background: newBottomName.trim() ? "#1d6840" : "#d1d5db",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: newBottomName.trim() ? "pointer" : "not-allowed",
                                whiteSpace: "nowrap",
                              }}
                            >
                              + Add Option
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Colors & Variants Section */}
                    <div className="shopifyVariantSection" style={{ marginTop: "18px" }}>
                      <ProductColorPicker
                        selectedColors={selectedColors}
                        colorHexMap={colorHexMap}
                        onChange={(newColors, newMap) => {
                          setSelectedColors(newColors);
                          if (newMap) setColorHexMap(newMap);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Sidebar (Status, Organization, Merchandising) */}
                <div className="shopifySideCol">
                  {/* Sidebar Card 1: Status */}
                  <div className="shopifyCard">
                    <h3 className="shopifyCardTitle">Status</h3>
                    <select
                      name="status"
                      className="shopifySelect"
                      value={productStatus}
                      onChange={(e) => setProductStatus(e.target.value)}
                    >
                      <option value="Active">Active (Visible on store)</option>
                      <option value="Draft">Draft (Hidden from store)</option>
                      <option value="Archived">Archived</option>
                    </select>
                    <p className="shopifyFieldHint">
                      {productStatus === "Active"
                        ? "This product is published and available for purchase."
                        : "This product is hidden from customers in your catalog."}
                    </p>
                  </div>

                  {/* Sidebar Card 2: Organization */}
                  <div className="shopifyCard">
                    <h3 className="shopifyCardTitle">Product organization</h3>
                    <div className="shopifyField">
                      <label className="shopifyLabel">Primary Category</label>
                      <select
                        name="category"
                        className="shopifySelect"
                        value={productCategory}
                        onChange={(e) => {
                          const newPrimary = e.target.value;
                          setProductCategory(newPrimary);
                          setAdditionalCategories((prev) => prev.filter((c) => normalizeCategory(c).toLowerCase() !== normalizeCategory(newPrimary).toLowerCase()));
                        }}
                      >
                        {mainCategoryOptions.map((cat) => (
                          <option key={cat.slug} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Multi-Category Selection & Category Pricing */}
                    <div className="shopifyField" style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #edf2ee" }}>
                      <label className="shopifyLabel">
                        Also Show In (Multiple Categories)
                        <span className="shopifyLabelHint">Show this product in other categories simultaneously</span>
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                        {mainCategoryOptions
                          .filter((cat) => normalizeCategory(cat.name).toLowerCase() !== normalizeCategory(productCategory).toLowerCase())
                          .map((cat) => {
                            const isChecked = additionalCategories.some((c) => normalizeCategory(c).toLowerCase() === normalizeCategory(cat.name).toLowerCase());
                            const overridePrice = categoryPrices[cat.name] ?? "";
                            return (
                              <div key={cat.slug} style={{ background: isChecked ? "#f0fdf4" : "#f9fafb", border: isChecked ? "1.5px solid #16a34a" : "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 12px" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: isChecked ? 650 : 500, color: "#111827", margin: 0 }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setAdditionalCategories((prev) => [...prev, cat.name]);
                                      } else {
                                        setAdditionalCategories((prev) => prev.filter((c) => normalizeCategory(c).toLowerCase() !== normalizeCategory(cat.name).toLowerCase()));
                                        setCategoryPrices((prev) => {
                                          const copy = { ...prev };
                                          delete copy[cat.name];
                                          return copy;
                                        });
                                      }
                                    }}
                                    style={{ width: "16px", height: "16px", accentColor: "#16a34a" }}
                                  />
                                  <span>{cat.name}</span>
                                </label>
                                {isChecked && (
                                  <div style={{ marginTop: "8px", paddingLeft: "24px" }}>
                                    <label style={{ fontSize: "11.5px", color: "#4b5563", display: "block", marginBottom: "4px" }}>
                                      Display Price in {cat.name} (PKR):
                                      <span style={{ color: "#9ca3af", marginLeft: "4px" }}>(e.g. Kurti-only price)</span>
                                    </label>
                                    <input
                                      type="number"
                                      className="shopifyInput"
                                      style={{ padding: "6px 10px", fontSize: "12.5px", width: "100%", maxWidth: "220px", background: "#fff" }}
                                      value={overridePrice}
                                      placeholder={`Base: Rs. ${Number(productPrice || 0).toLocaleString()}`}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCategoryPrices((prev) => ({
                                          ...prev,
                                          [cat.name]: val === "" ? "" : Math.max(0, Number(val)),
                                        }));
                                      }}
                                    />
                                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6b7280" }}>
                                      Leave empty to use base price (Rs. {Number(productPrice || 0).toLocaleString()}).
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {!!productSubcategoryOptions.length && (
                      <div className="shopifyField">
                        <label className="shopifyLabel">Subcategory</label>
                        <select
                          name="subcategory"
                          className="shopifySelect"
                          defaultValue={editingProduct?.subcategory || productSubcategoryOptions[0]?.slug}
                        >
                          {productSubcategoryOptions.map((cat) => (
                            <option key={cat.slug} value={cat.slug}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="shopifyField">
                      <label className="shopifyLabel">
                        Collection
                        <span className="shopifyLabelHint">e.g. Summer &apos;26</span>
                      </label>
                      <input
                        name="collection"
                        className="shopifyInput"
                        defaultValue={editingProduct?.collection || ""}
                        placeholder="Summer Drop, Festive..."
                      />
                    </div>

                    <div className="shopifyField">
                      <label className="shopifyLabel">
                        Tags
                        <span className="shopifyLabelHint">Comma-separated</span>
                      </label>
                      <input
                        name="tags"
                        className="shopifyInput"
                        defaultValue={Array.isArray(editingProduct?.tags) ? editingProduct.tags.join(", ") : ""}
                        placeholder="lawn, printed, festive, party"
                      />
                    </div>
                  </div>

                  {/* Sidebar Card 3: Badges */}
                  <div className="shopifyCard">
                    <h3 className="shopifyCardTitle">Store Badges</h3>
                    <div className="shopifyCheckboxList">
                      <label className="shopifyCheckboxLabel">
                        <input
                          type="checkbox"
                          checked={isNewProduct}
                          onChange={(e) => setIsNewProduct(e.target.checked)}
                        />
                        <div>
                          <b>New Arrival</b>
                          <span>Shows &quot;New&quot; tag on product card</span>
                        </div>
                      </label>
                      <label className="shopifyCheckboxLabel">
                        <input
                          type="checkbox"
                          checked={isBestsellerProduct}
                          onChange={(e) => setIsBestsellerProduct(e.target.checked)}
                        />
                        <div>
                          <b>Bestseller</b>
                          <span>Shows &quot;Bestseller&quot; highlight badge</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Sidebar Card 4: Instagram Reel Showcase */}
                  <div className="shopifyCard">
                    <h3 className="shopifyCardTitle">Showcase Reel (Optional)</h3>
                    <p className="shopifyCardSubtitle">Embed a silhouette video on the product page</p>
                    <input
                      name="instagramVideoUrl"
                      type="url"
                      className="shopifyInput"
                      defaultValue={editingProduct?.instagramVideoUrl || editingProduct?.cost_breakdown?.metadata?.instagramVideoUrl || ""}
                      placeholder="https://www.instagram.com/reel/..."
                    />
                  </div>

                  {/* Sidebar Card 5: Search engine listing */}
                  <div className="shopifyCard">
                    <h3 className="shopifyCardTitle">Search Engine (SEO)</h3>
                    <div className="shopifySeoPreview">
                      <span className="seoUrl">https://bustaniya.pk › product › ...</span>
                      <b className="seoTitle">{editingProduct?.name || "Product Title — Bustaniya"}</b>
                      <p className="seoDesc">
                        {editingProduct?.seoDescription || "Discover handcrafted Pakistani wear from Bustaniya..."}
                      </p>
                    </div>
                    <div className="shopifyField">
                      <label className="shopifyLabel">Page Title</label>
                      <input
                        name="seoTitle"
                        maxLength="70"
                        className="shopifyInput"
                        defaultValue={editingProduct?.seoTitle || ""}
                        placeholder="Leave blank to auto-use product title"
                      />
                    </div>
                    <div className="shopifyField">
                      <label className="shopifyLabel">Meta Description</label>
                      <textarea
                        name="seoDescription"
                        rows="2"
                        maxLength="160"
                        className="shopifyTextarea"
                        defaultValue={editingProduct?.seoDescription || ""}
                        placeholder="Brief summary for Google search..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar on mobile/scroll */}
              <div className="shopifyBottomBar">
                <button
                  type="button"
                  className="shopifyBtnSecondary"
                  onClick={closeProductForm}
                  disabled={productSaving}
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="shopifyBtnPrimary"
                  disabled={productSaving}
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
          </div>
        </div>
      )}
      {showPriceCalcModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(10, 25, 18, 0.72)",
            backdropFilter: "blur(4px)",
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowPriceCalcModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "1200px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "20px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ArticlePriceCalculator
              isOpenAsModal
              products={products}
              onClose={() => setShowPriceCalcModal(false)}
              initialProduct={editingProduct || (productPrice ? { name: "", price: productPrice, category: productCategory } : null)}
              onApplyToProduct={(calcData) => {
                setProductPrice(calcData.price);
                setCostPerItem(calcData.costPerItem);
                setCostBreakdown(calcData.costBreakdown);
                const compInput = document.querySelector('input[name="comparePrice"]');
                if (compInput) compInput.value = calcData.compareAtPrice || "";
                setShowPriceCalcModal(false);
              }}
            />
          </div>
        </div>
      )}
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
      .catch(() => { });
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
        <p>{dashboardNow ? dashboardNow.toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" }) : "Loading date…"}</p>
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
    <div className="adminLoadingMetricGrid">{[1, 2, 3, 4].map((item) => <div className="adminLoadingMetric" key={item}><span className="adminSkeleton" /><span className="adminSkeleton" /><span className="adminSkeleton" /></div>)}</div>
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

function CategoriesPanel({
  categories = [],
  products = [],
  onSave,
  onArchive,
  saving = false,
  needsSetup = false,
  onConfirmAction,
  onNavigateToProducts,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'main' | 'sub' | 'archived'
  const [viewMode, setViewMode] = useState("tree"); // 'tree' | 'table'
  const [editing, setEditing] = useState(null); // category object or null
  const [expandedSlugs, setExpandedSlugs] = useState(new Set());

  // Split categories
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.status !== "Archived"),
    [categories]
  );
  const archivedCategories = useMemo(
    () => categories.filter((c) => c.status === "Archived"),
    [categories]
  );
  const mainCategories = useMemo(
    () => visibleCategories.filter((c) => !c.parentSlug),
    [visibleCategories]
  );
  const subCategories = useMemo(
    () => visibleCategories.filter((c) => Boolean(c.parentSlug)),
    [visibleCategories]
  );

  // Initialize expanded slugs only for main categories that have subcategories
  useEffect(() => {
    if (mainCategories.length > 0 && expandedSlugs.size === 0) {
      const withChildren = mainCategories
        .filter((cat) => visibleCategories.some((c) => c.parentSlug === cat.slug))
        .map((c) => c.slug);
      setExpandedSlugs(new Set(withChildren));
    }
  }, [mainCategories, visibleCategories]);

  // Product count helper
  function getCategoryProductCount(category) {
    if (!category || !products.length) return 0;
    if (category.parentSlug) {
      return products.filter(
        (p) => String(p.subcategory || "").toLowerCase() === category.slug.toLowerCase()
      ).length;
    }
    return products.filter(
      (p) =>
        String(p.category || "").toLowerCase() === category.name.toLowerCase() ||
        String(p.categorySlug || "").toLowerCase() === category.slug.toLowerCase()
    ).length;
  }

  // Total products mapped across all active categories
  const totalMappedProducts = useMemo(() => {
    if (!products.length || !visibleCategories.length) return 0;
    const activeCategoryNames = new Set(
      visibleCategories.filter((c) => !c.parentSlug).map((c) => c.name.toLowerCase())
    );
    const activeSubcategorySlugs = new Set(
      visibleCategories.filter((c) => c.parentSlug).map((c) => c.slug.toLowerCase())
    );
    return products.filter(
      (p) =>
        activeCategoryNames.has(String(p.category || "").toLowerCase()) ||
        activeSubcategorySlugs.has(String(p.subcategory || "").toLowerCase())
    ).length;
  }, [products, visibleCategories]);

  // Toggle card expansion
  function toggleExpanded(slug) {
    setExpandedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  // Open modal for new main category
  function openNewMainCategory() {
    setEditing({
      parentSlug: "",
      status: "Active",
      sortOrder: (mainCategories.length + 1) * 10,
      showInHeader: true,
      showOnHomepage: true,
      showInFooter: false,
      showInSearch: true,
    });
  }

  // Open modal for new subcategory
  function openNewSubcategory(parentCategory = null) {
    const parent = parentCategory || mainCategories[0];
    const siblings = parent
      ? visibleCategories.filter((c) => c.parentSlug === parent.slug)
      : [];
    setEditing({
      parentSlug: parent ? parent.slug : "",
      status: "Active",
      sortOrder: (siblings.length + 1) * 10,
      showInHeader: true,
      showOnHomepage: true,
      showInFooter: false,
      showInSearch: true,
    });
    if (parent) {
      setExpandedSlugs((prev) => new Set(prev).add(parent.slug));
    }
  }

  // Reorder categories
  function moveCategory(category, direction) {
    const siblings = visibleCategories
      .filter((item) => (item.parentSlug || "") === (category.parentSlug || ""))
      .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    const index = siblings.findIndex((item) => item.id === category.id || item.slug === category.slug);
    if (index === -1) return;
    const target = siblings[index + direction];
    if (!target) return;

    const currentOrder = Number(category.sortOrder) || (index + 1) * 10;
    const targetOrder = Number(target.sortOrder) || (index + direction + 1) * 10;
    const finalCurrentOrder = currentOrder === targetOrder ? currentOrder + direction : targetOrder;

    onSave({ ...category, sortOrder: finalCurrentOrder });
    onSave({ ...target, sortOrder: currentOrder });
  }

  // Archive category with confirmation
  function handleArchive(category) {
    const count = getCategoryProductCount(category);
    const isSub = Boolean(category.parentSlug);
    const childCount = isSub
      ? 0
      : visibleCategories.filter((item) => item.parentSlug === category.slug).length;

    const warningMsg = isSub
      ? `Are you sure you want to archive subcategory "${category.name}"?${count > 0 ? ` ${count} product${count === 1 ? "" : "s"} are mapped to this subcategory.` : ""
      } It will be hidden from storefront navigation. Products will not be deleted.`
      : `Are you sure you want to archive collection "${category.name}"?${count > 0 ? ` ${count} product${count === 1 ? "" : "s"} are mapped to it.` : ""
      }${childCount > 0 ? ` ${childCount} nested subcategor${childCount === 1 ? "y" : "ies"} will also be hidden.` : ""
      } It will be hidden from storefront navigation. Products will not be deleted.`;

    if (typeof onConfirmAction === "function") {
      onConfirmAction({
        title: `Archive ${isSub ? "Subcategory" : "Main Category"}`,
        message: warningMsg,
        confirmLabel: "Archive Category",
        danger: true,
        onConfirm: () => onArchive(category, false),
      });
    } else if (window.confirm(warningMsg)) {
      onArchive(category, false);
    }
  }

  // Permanent delete for archived category
  function handlePermanentDelete(category) {
    const warningMsg = `Permanently delete "${category.name}" from the database? This action cannot be undone.`;
    if (typeof onConfirmAction === "function") {
      onConfirmAction({
        title: "Permanently Delete Category",
        message: warningMsg,
        confirmLabel: "Delete Forever",
        danger: true,
        onConfirm: () => onArchive(category, true),
      });
    } else if (window.confirm(warningMsg)) {
      onArchive(category, true);
    }
  }

  // Restore archived category
  function handleRestore(category) {
    onSave({ ...category, status: "Active" });
  }

  // Filter categories according to search and active tab
  const filteredMainCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return mainCategories.filter((cat) => {
      if (activeTab === "sub") return false;
      if (!query) return true;
      const matchesMain =
        cat.name.toLowerCase().includes(query) ||
        cat.slug.toLowerCase().includes(query) ||
        (cat.description || "").toLowerCase().includes(query);
      const matchesAnyChild = visibleCategories.some(
        (child) =>
          child.parentSlug === cat.slug &&
          (child.name.toLowerCase().includes(query) ||
            child.slug.toLowerCase().includes(query) ||
            (child.description || "").toLowerCase().includes(query))
      );
      return matchesMain || matchesAnyChild;
    });
  }, [mainCategories, visibleCategories, searchQuery, activeTab]);

  const filteredArchivedCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return archivedCategories.filter((cat) => {
      if (!query) return true;
      return (
        cat.name.toLowerCase().includes(query) ||
        cat.slug.toLowerCase().includes(query) ||
        (cat.description || "").toLowerCase().includes(query)
      );
    });
  }, [archivedCategories, searchQuery]);

  const tableRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let source = [];
    if (activeTab === "archived") {
      source = archivedCategories;
    } else if (activeTab === "main") {
      source = mainCategories;
    } else if (activeTab === "sub") {
      source = subCategories;
    } else {
      source = visibleCategories;
    }

    if (!query) return source;
    return source.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.slug.toLowerCase().includes(query) ||
        (c.parentSlug || "").toLowerCase().includes(query) ||
        (c.description || "").toLowerCase().includes(query)
    );
  }, [visibleCategories, archivedCategories, mainCategories, subCategories, activeTab, searchQuery]);

  return (
    <div className="shopifyCategoryWorkspace">
      {/* Workspace Header */}
      <div className="shopifyCategoryHeader">
        <div className="shopifyCategoryTitleGroup">
          <h1>Collections & Categories</h1>
          <p>
            Organize storefront collections, manage hierarchical subcategories, configure SEO, and control
            navigation placement.
          </p>
        </div>
        <div className="shopifyCategoryHeaderActions">
          <button
            type="button"
            className="shopifySecondaryBtn"
            onClick={() => openNewSubcategory()}
            disabled={saving || !mainCategories.length}
          >
            <FolderPlus size={15} />
            <span>Add Subcategory</span>
          </button>
          <button
            type="button"
            className="shopifyPrimaryBtn"
            onClick={openNewMainCategory}
            disabled={saving}
          >
            <Plus size={16} />
            <span>Add Main Category</span>
          </button>
        </div>
      </div>

      {/* Supabase table setup warning if needed */}
      {needsSetup && (
        <div className="adminErrorBanner" style={{ marginBottom: 20 }}>
          <AlertCircle size={16} />
          <span>
            Supabase category table setup is pending. Run <b>scripts/supabase-catalog-categories.sql</b> in your Supabase
            SQL editor, then reconnect admin data.
          </span>
        </div>
      )}

      {/* 4-Stat Metric Strip */}
      <div className="shopifyCategoryStatsGrid">
        <div className="shopifyCategoryStatCard">
          <div className="shopifyCategoryStatIcon">
            <Folder size={20} />
          </div>
          <div className="shopifyCategoryStatInfo">
            <b>{mainCategories.length}</b>
            <span>Main Collections</span>
          </div>
        </div>

        <div className="shopifyCategoryStatCard">
          <div className="shopifyCategoryStatIcon sub">
            <FolderTree size={20} />
          </div>
          <div className="shopifyCategoryStatInfo">
            <b>{subCategories.length}</b>
            <span>Subcategories</span>
          </div>
        </div>

        <div className="shopifyCategoryStatCard">
          <div className="shopifyCategoryStatIcon visible">
            <Store size={20} />
          </div>
          <div className="shopifyCategoryStatInfo">
            <b>{visibleCategories.length}</b>
            <span>Live on Storefront</span>
          </div>
        </div>

        <div
          className="shopifyCategoryStatCard"
          style={{ cursor: onNavigateToProducts ? "pointer" : "default" }}
          onClick={() => onNavigateToProducts && onNavigateToProducts("")}
          title="Click to view all products"
        >
          <div className="shopifyCategoryStatIcon products">
            <Boxes size={20} />
          </div>
          <div className="shopifyCategoryStatInfo">
            <b>{totalMappedProducts}</b>
            <span>Products Mapped</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filter Tabs, and View Mode Toggle */}
      <div className="shopifyCategoryToolbar">
        <div className="shopifyCategorySearchBox">
          <Search size={15} color="#6a7c70" />
          <input
            type="text"
            placeholder="Search by collection, subcategory, slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              <X size={14} color="#8a9c90" />
            </button>
          )}
        </div>

        <div className="shopifyCategoryTabs">
          <button
            type="button"
            className={`shopifyCategoryTabBtn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <span>All</span>
            <span className="shopifyCategoryTabCount">{visibleCategories.length}</span>
          </button>
          <button
            type="button"
            className={`shopifyCategoryTabBtn ${activeTab === "main" ? "active" : ""}`}
            onClick={() => setActiveTab("main")}
          >
            <span>Main Collections</span>
            <span className="shopifyCategoryTabCount">{mainCategories.length}</span>
          </button>
          <button
            type="button"
            className={`shopifyCategoryTabBtn ${activeTab === "sub" ? "active" : ""}`}
            onClick={() => setActiveTab("sub")}
          >
            <span>Subcategories</span>
            <span className="shopifyCategoryTabCount">{subCategories.length}</span>
          </button>
          <button
            type="button"
            className={`shopifyCategoryTabBtn ${activeTab === "archived" ? "active" : ""}`}
            onClick={() => setActiveTab("archived")}
          >
            <span>Archived</span>
            <span className="shopifyCategoryTabCount">{archivedCategories.length}</span>
          </button>
        </div>

        <div className="shopifyViewModeToggle">
          <button
            type="button"
            className={`shopifyViewModeBtn ${viewMode === "tree" ? "active" : ""}`}
            onClick={() => setViewMode("tree")}
            title="Tree View with nested subcategories"
          >
            <FolderTree size={14} />
            <span>Tree</span>
          </button>
          <button
            type="button"
            className={`shopifyViewModeBtn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
            title="Table View"
          >
            <List size={14} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "tree" ? (
        activeTab === "archived" ? (
          /* Tree view for Archived items */
          <div className="shopifyCategoryTreeList">
            {filteredArchivedCategories.map((category) => {
              const count = getCategoryProductCount(category);
              const isSub = Boolean(category.parentSlug);
              return (
                <div key={category.id || category.slug} className="shopifyCategoryCard">
                  <div className="shopifyCategoryCardHeader">
                    <div className="shopifyCategoryCardLeft">
                      <img
                        src={category.image || "/bustaniya-campaign-hero-v4.webp"}
                        alt={category.name}
                        className="shopifyCategoryThumb"
                        onError={(e) => {
                          e.currentTarget.src = "/bustaniya-campaign-hero-v4.webp";
                        }}
                      />
                      <div className="shopifyCategoryDetails">
                        <div className="shopifyCategoryTitleRow">
                          <span className="shopifyCategoryName">{category.name}</span>
                          <span className="statusBadge archived">Archived</span>
                          {isSub && <span className="shopifyPlacementPill">Subcategory of {category.parentSlug}</span>}
                        </div>
                        <div className="shopifyCategoryMetaRow">
                          <span>{category.description || "No description"}</span>
                          <span>•</span>
                          <span>{count} products affected</span>
                        </div>
                      </div>
                    </div>
                    <div className="shopifyCategoryCardRight">
                      <button
                        type="button"
                        className="shopifySecondaryBtn"
                        onClick={() => handleRestore(category)}
                        disabled={saving}
                      >
                        <RotateCcw size={13} />
                        <span>Restore</span>
                      </button>
                      <button
                        type="button"
                        className="shopifyDangerBtn"
                        onClick={() => handlePermanentDelete(category)}
                        disabled={saving}
                      >
                        <Trash2 size={13} />
                        <span>Delete Forever</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!filteredArchivedCategories.length && (
              <div className="unifiedEmptyState">
                <div className="emptyStateIcon">
                  <Archive />
                </div>
                <h3>No Archived Categories</h3>
                <p>When you archive a category, it will safely appear here where you can restore it anytime.</p>
              </div>
            )}
          </div>
        ) : (
          /* Standard Tree View */
          <div className="shopifyCategoryTreeList">
            {filteredMainCategories.map((category) => {
              const count = getCategoryProductCount(category);
              const isExpanded = expandedSlugs.has(category.slug);
              const children = visibleCategories.filter((item) => item.parentSlug === category.slug);
              const query = searchQuery.trim().toLowerCase();
              const matchingChildren = query
                ? children.filter(
                  (c) =>
                    c.name.toLowerCase().includes(query) ||
                    c.slug.toLowerCase().includes(query) ||
                    (c.description || "").toLowerCase().includes(query)
                )
                : children;

              return (
                <div key={category.id || category.slug} className="shopifyCategoryCard">
                  {/* Master Card Header */}
                  <div className="shopifyCategoryCardHeader">
                    <div className="shopifyCategoryCardLeft">
                      <button
                        type="button"
                        className="shopifyIconBtn"
                        onClick={() => toggleExpanded(category.slug)}
                        title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      <img
                        src={category.image || "/bustaniya-campaign-hero-v4.webp"}
                        alt={category.name}
                        className="shopifyCategoryThumb"
                        onError={(e) => {
                          e.currentTarget.src = "/bustaniya-campaign-hero-v4.webp";
                        }}
                      />

                      <div className="shopifyCategoryDetails">
                        <div className="shopifyCategoryTitleRow">
                          <span className="shopifyCategoryName">{category.name}</span>
                          <span
                            className={`statusBadge ${category.status === "Active" ? "activeStatus" : "processing"
                              }`}
                          >
                            {category.status}
                          </span>
                          <a
                            href={`/category/${category.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="shopifyCategorySlugLink"
                            title="Open storefront category page in new tab"
                          >
                            <span>/category/{category.slug}</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>

                        <div className="shopifyCategoryMetaRow">
                          {/* Storefront placement pills */}
                          {category.showInHeader && <span className="shopifyPlacementPill">Header</span>}
                          {category.showOnHomepage && <span className="shopifyPlacementPill">Home</span>}
                          {category.showInFooter && <span className="shopifyPlacementPill">Footer</span>}
                          {category.showInSearch && <span className="shopifyPlacementPill">Search</span>}

                          {/* Product count pill */}
                          <span
                            className="shopifyProductCountPill"
                            onClick={() => onNavigateToProducts && onNavigateToProducts(category.name)}
                            title="Click to view products in this collection"
                          >
                            <Boxes size={11} />
                            <span>{count} products</span>
                          </span>

                          <span>•</span>
                          <span>{children.length} subcategories</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shopifyCategoryCardRight">
                      <button
                        type="button"
                        className="shopifyIconBtn"
                        onClick={() => moveCategory(category, -1)}
                        disabled={saving}
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="shopifyIconBtn"
                        onClick={() => moveCategory(category, 1)}
                        disabled={saving}
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="shopifyActionBtn"
                        onClick={() => openNewSubcategory(category)}
                        disabled={saving}
                        title="Add subcategory inside this collection"
                      >
                        <Plus size={13} />
                        <span>Subcategory</span>
                      </button>
                      <button
                        type="button"
                        className="shopifyActionBtn"
                        onClick={() => setEditing(category)}
                        disabled={saving}
                        title="Edit collection details"
                      >
                        <Edit size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="shopifyDangerBtn"
                        onClick={() => handleArchive(category)}
                        disabled={saving}
                        title="Archive collection"
                      >
                        <Archive size={13} />
                        <span>Archive</span>
                      </button>
                    </div>
                  </div>

                  {/* Nested Subcategories Container */}
                  {isExpanded && (
                    <div className="shopifySubcategoryContainer">
                      <div className="shopifySubcategoryHeader">
                        <span>Nested Subcategories ({children.length})</span>
                        <button
                          type="button"
                          className="shopifyActionBtn"
                          onClick={() => openNewSubcategory(category)}
                          disabled={saving}
                          style={{ fontSize: 11, padding: "3px 8px" }}
                        >
                          <Plus size={12} />
                          <span>Add to {category.name}</span>
                        </button>
                      </div>

                      {matchingChildren.length > 0 ? (
                        <div className="shopifySubcategoryList">
                          {matchingChildren.map((sub) => {
                            const subProductCount = getCategoryProductCount(sub);
                            return (
                              <div key={sub.id || sub.slug} className="shopifySubcategoryRow">
                                <div className="shopifySubcategoryLeft">
                                  <span className="shopifySubTreeBranch">↳</span>
                                  <img
                                    src={sub.image || "/bustaniya-campaign-hero-v4.webp"}
                                    alt={sub.name}
                                    className="shopifySubcategoryThumb"
                                    onError={(e) => {
                                      e.currentTarget.src = "/bustaniya-campaign-hero-v4.webp";
                                    }}
                                  />
                                  <div className="shopifySubcategoryDetails">
                                    <div className="shopifyCategoryTitleRow">
                                      <span className="shopifySubcategoryTitle">{sub.name}</span>
                                      <span
                                        className={`statusBadge ${sub.status === "Active" ? "activeStatus" : "processing"
                                          }`}
                                      >
                                        {sub.status}
                                      </span>
                                      <a
                                        href={`/category/${category.slug}/${sub.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shopifyCategorySlugLink"
                                        title="Open subcategory page in new tab"
                                      >
                                        <span>
                                          /category/{category.slug}/{sub.slug}
                                        </span>
                                        <ExternalLink size={10} />
                                      </a>
                                    </div>
                                    <div className="shopifySubcategoryMeta">
                                      <span className="shopifySubcategoryDesc">{sub.description || "No description"}</span>
                                      <span>•</span>
                                      <span
                                        className="shopifyProductCountPill"
                                        onClick={() => onNavigateToProducts && onNavigateToProducts(sub.name)}
                                        title="Click to view products in this subcategory"
                                      >
                                        <Boxes size={11} />
                                        <span>{subProductCount} products</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="shopifySubcategoryRight">
                                  <button
                                    type="button"
                                    className="shopifyIconBtn"
                                    onClick={() => moveCategory(sub, -1)}
                                    disabled={saving}
                                    title="Move Up"
                                  >
                                    <ArrowUp size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="shopifyIconBtn"
                                    onClick={() => moveCategory(sub, 1)}
                                    disabled={saving}
                                    title="Move Down"
                                  >
                                    <ArrowDown size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="shopifyActionBtn"
                                    onClick={() => setEditing(sub)}
                                    disabled={saving}
                                  >
                                    <Edit size={12} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="shopifyDangerBtn"
                                    onClick={() => handleArchive(sub)}
                                    disabled={saving}
                                  >
                                    <Archive size={12} />
                                    <span>Archive</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "16px 0",
                            textAlign: "center",
                            color: "#7a8c80",
                            fontSize: 12.5,
                          }}
                        >
                          {query
                            ? `No subcategories in "${category.name}" match "${searchQuery}".`
                            : `No subcategories inside ${category.name} yet.`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!filteredMainCategories.length && (
              <div className="unifiedEmptyState">
                <div className="emptyStateIcon">
                  <Tags />
                </div>
                <h3>{searchQuery ? "No matching categories" : "No Main Collections Yet"}</h3>
                <p>
                  {searchQuery
                    ? `No categories or subcategories match "${searchQuery}". Try a different keyword or clear the search filter.`
                    : "Create your first main category to organize products across your storefront."}
                </p>
                {searchQuery ? (
                  <button type="button" className="emptyStateAction" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </button>
                ) : (
                  <button type="button" className="emptyStateAction" onClick={openNewMainCategory}>
                    <Plus size={14} /> Add Main Category
                  </button>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        /* Table View */
        <div className="shopifyCategoryTableCard">
          <table className="shopifyCategoryTable">
            <thead>
              <tr>
                <th>Category</th>
                <th>Hierarchy</th>
                <th>Store URL</th>
                <th>Products</th>
                <th>Placement</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((cat) => {
                const count = getCategoryProductCount(cat);
                const isSub = Boolean(cat.parentSlug);
                const isArchived = cat.status === "Archived";
                const url = isSub
                  ? `/category/${cat.parentSlug}/${cat.slug}`
                  : `/category/${cat.slug}`;

                return (
                  <tr key={cat.id || cat.slug}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img
                          src={cat.image || "/bustaniya-campaign-hero-v4.webp"}
                          alt={cat.name}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            objectFit: "cover",
                            border: "1px solid #dce4dd",
                          }}
                          onError={(e) => {
                            e.currentTarget.src = "/bustaniya-campaign-hero-v4.webp";
                          }}
                        />
                        <div>
                          <b style={{ display: "block", color: "#122a1e", fontSize: 13.5 }}>{cat.name}</b>
                          <small style={{ color: "#6a7c70", fontSize: 11.5 }}>
                            {cat.description ? `${cat.description.slice(0, 45)}...` : "No description"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {isSub ? (
                        <span className="shopifyPlacementPill" style={{ color: "#1e40af", borderColor: "#bfdbfe" }}>
                          Sub of {cat.parentSlug}
                        </span>
                      ) : (
                        <span className="shopifyPlacementPill" style={{ color: "#166534", borderColor: "#bbf7d0" }}>
                          Main Collection
                        </span>
                      )}
                    </td>
                    <td>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="shopifyCategorySlugLink"
                        title="View on store"
                      >
                        <span>{url}</span>
                        <ExternalLink size={10} />
                      </a>
                    </td>
                    <td>
                      <span
                        className="shopifyProductCountPill"
                        onClick={() => onNavigateToProducts && onNavigateToProducts(cat.name)}
                      >
                        <Boxes size={11} />
                        <span>{count}</span>
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {cat.showInHeader && <span className="shopifyPlacementPill">Header</span>}
                        {cat.showOnHomepage && <span className="shopifyPlacementPill">Home</span>}
                        {cat.showInSearch && <span className="shopifyPlacementPill">Search</span>}
                        {!cat.showInHeader && !cat.showOnHomepage && !cat.showInSearch && (
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>None</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`statusBadge ${cat.status === "Active"
                            ? "activeStatus"
                            : cat.status === "Archived"
                              ? "archived"
                              : "processing"
                          }`}
                      >
                        {cat.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        {isArchived ? (
                          <>
                            <button
                              type="button"
                              className="shopifySecondaryBtn"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                              onClick={() => handleRestore(cat)}
                              disabled={saving}
                            >
                              <RotateCcw size={11} />
                              <span>Restore</span>
                            </button>
                            <button
                              type="button"
                              className="shopifyDangerBtn"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                              onClick={() => handlePermanentDelete(cat)}
                              disabled={saving}
                            >
                              <Trash2 size={11} />
                              <span>Delete</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="shopifyActionBtn"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                              onClick={() => setEditing(cat)}
                              disabled={saving}
                            >
                              <Edit size={11} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="shopifyDangerBtn"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                              onClick={() => handleArchive(cat)}
                              disabled={saving}
                            >
                              <Archive size={11} />
                              <span>Archive</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!tableRows.length && (
                <tr>
                  <td colSpan="7">
                    <div className="unifiedEmptyState">
                      <h3>No categories found</h3>
                      <p>Try clearing your search query or tab filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {editing && (
        <CategoryEditModal
          category={editing}
          mainCategories={mainCategories}
          onClose={() => !saving && setEditing(null)}
          onSave={async (payload) => {
            const success = await onSave(payload);
            if (success) {
              setEditing(null);
            }
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

// Modal component for Adding & Editing Categories
function CategoryEditModal({ category, mainCategories = [], onClose, onSave, saving }) {
  const isEditing = Boolean(category?.id);
  const [name, setName] = useState(category?.name || "");
  const [slug, setSlug] = useState(category?.slug || "");
  const [isSlugLocked, setIsSlugLocked] = useState(Boolean(category?.slug));
  const [parentSlug, setParentSlug] = useState(category?.parentSlug || "");
  const [description, setDescription] = useState(category?.description || "");
  const [image, setImage] = useState(category?.image || "");
  const [imageAlt, setImageAlt] = useState(category?.imageAlt || "");
  const [status, setStatus] = useState(category?.status || "Active");
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 100);
  const [showInHeader, setShowInHeader] = useState(category?.showInHeader ?? true);
  const [showOnHomepage, setShowOnHomepage] = useState(category?.showOnHomepage ?? true);
  const [showInFooter, setShowInFooter] = useState(category?.showInFooter ?? false);
  const [showInSearch, setShowInSearch] = useState(category?.showInSearch ?? true);
  const [seoTitle, setSeoTitle] = useState(category?.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(category?.seoDescription || "");
  const [imageTestError, setImageTestError] = useState("");

  // Auto-slugify when name changes (unless slug is manually customized)
  function handleNameChange(e) {
    const newName = e.target.value;
    setName(newName);
    if (!isSlugLocked) {
      setSlug(slugifyCategory(newName));
    }
  }

  function handleSlugChange(e) {
    setIsSlugLocked(true);
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
  }

  const liveUrl = `https://bustaniya.com/category/${parentSlug ? `${parentSlug}/` : ""}${slug || "collection-handle"}`;

  async function handleSubmit(e) {
    e.preventDefault();
    const finalSlug = slug.trim() || slugifyCategory(name);
    const payload = {
      id: category?.id,
      name: name.trim(),
      slug: finalSlug,
      parentSlug: parentSlug.trim() || null,
      description: description.trim(),
      image: image.trim(),
      imageAlt: imageAlt.trim() || name.trim(),
      status,
      sortOrder: Number(sortOrder) || 100,
      showInHeader,
      showOnHomepage,
      showInFooter,
      showInSearch,
      seoTitle: seoTitle.trim(),
      seoDescription: seoDescription.trim(),
    };

    await onSave(payload);
  }

  return (
    <div className="shopifyCategoryModalOverlay" onClick={() => !saving && onClose()}>
      <div className="shopifyCategoryModal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="shopifyCategoryModalHeader">
          <h2>{isEditing ? `Edit Category: ${category.name}` : parentSlug ? "Add Subcategory" : "Add Main Category"}</h2>
          <button
            type="button"
            className="shopifyIconBtn"
            onClick={onClose}
            disabled={saving}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form id="shopifyCategoryForm" onSubmit={handleSubmit} className="shopifyCategoryModalBody">
          {/* Section 1: Basic Information */}
          <div className="shopifyFormSection">
            <span className="shopifyFormSectionTitle">Basic Information</span>
            <label>
              Category Name *
              <input
                type="text"
                required
                placeholder="e.g. Silk Kurtis, Festive Edit, Daily Wear"
                value={name}
                onChange={handleNameChange}
              />
            </label>

            <div className="shopifyFormRow">
              <label>
                Parent Collection
                <select
                  value={parentSlug}
                  onChange={(e) => setParentSlug(e.target.value)}
                >
                  <option value="">None (Top-Level Collection)</option>
                  {mainCategories
                    .filter((c) => c.slug !== category?.slug)
                    .map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Active">Active (Live on store)</option>
                  <option value="Draft">Draft (Admin hidden)</option>
                  <option value="Archived">Archived</option>
                </select>
              </label>
            </div>

            <div className="shopifyFormRow">
              <label>
                URL Handle / Slug
                <input
                  type="text"
                  required
                  placeholder="e.g. silk-kurtis"
                  value={slug}
                  onChange={handleSlugChange}
                />
              </label>

              <label>
                Sort Priority (Order)
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="100"
                />
              </label>
            </div>

            {/* Live URL Preview Bar */}
            <div className="shopifyUrlPreviewBar">
              <Globe size={13} style={{ flexShrink: 0 }} />
              <span>
                Live URL Preview: <b>{liveUrl}</b>
              </span>
            </div>
          </div>

          {/* Section 2: Visuals & Cover Image */}
          <div className="shopifyFormSection">
            <span className="shopifyFormSectionTitle">Cover Image</span>
            <label>
              Image URL
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="https://... or /bustaniya-campaign-hero-v4.webp"
                  value={image}
                  onChange={(e) => {
                    setImage(e.target.value);
                    setImageTestError("");
                  }}
                />
              </div>
            </label>

            {image && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <img
                  src={image}
                  alt="Preview"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    objectFit: "cover",
                    border: "1px solid #dce4dd",
                    background: "#f8faf8",
                  }}
                  onError={() => setImageTestError("Image failed to load. Check URL format.")}
                />
                <div>
                  <b style={{ display: "block", fontSize: 12, color: "#166534" }}>Cover Image Ready</b>
                  <span style={{ fontSize: 11.5, color: "#6a7c70" }}>
                    {imageTestError ? (
                      <span style={{ color: "#b91c1c" }}>{imageTestError}</span>
                    ) : (
                      "This image will display on category cards and collection pages."
                    )}
                  </span>
                </div>
              </div>
            )}

            <label>
              Image Alt Text
              <input
                type="text"
                placeholder="Accessible description for screen readers and SEO"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
              />
            </label>
          </div>

          {/* Section 3: Description & Storefront Placement */}
          <div className="shopifyFormSection">
            <span className="shopifyFormSectionTitle">Description & Storefront Placement</span>
            <label>
              Category Description
              <textarea
                rows={3}
                placeholder="Short SEO-friendly description shown at the top of the category collection page."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <label style={{ marginTop: 4 }}>Storefront Navigation Visibility</label>
            <div className="shopifyCheckboxGroup">
              <label className="shopifyCheckboxLabel">
                <input
                  type="checkbox"
                  checked={showInHeader}
                  onChange={(e) => setShowInHeader(e.target.checked)}
                />
                <span>Header Navigation Menu</span>
              </label>

              <label className="shopifyCheckboxLabel">
                <input
                  type="checkbox"
                  checked={showOnHomepage}
                  onChange={(e) => setShowOnHomepage(e.target.checked)}
                />
                <span>Homepage Curated Section</span>
              </label>

              <label className="shopifyCheckboxLabel">
                <input
                  type="checkbox"
                  checked={showInFooter}
                  onChange={(e) => setShowInFooter(e.target.checked)}
                />
                <span>Footer Collections Link</span>
              </label>

              <label className="shopifyCheckboxLabel">
                <input
                  type="checkbox"
                  checked={showInSearch}
                  onChange={(e) => setShowInSearch(e.target.checked)}
                />
                <span>Search & Filters Filterable</span>
              </label>
            </div>
          </div>

          {/* Section 4: Search Engine Optimization (SEO) */}
          <div className="shopifyFormSection">
            <span className="shopifyFormSectionTitle">Search Engine Optimization (SEO)</span>
            <label>
              SEO Meta Title ({seoTitle.length}/60)
              <input
                type="text"
                maxLength={60}
                placeholder={name ? `${name} | Bustaniya Online Store` : "Category Title for Search Engines"}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
              />
            </label>

            <label>
              Meta Description ({seoDescription.length}/160)
              <textarea
                rows={2}
                maxLength={160}
                placeholder={
                  description || "Explore handcrafted luxury collection on Bustaniya with fast delivery across Pakistan."
                }
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
              />
            </label>

            {/* Google SERP Preview Box */}
            <div className="shopifyGooglePreview">
              <span className="shopifyGoogleUrl">{liveUrl}</span>
              <span className="shopifyGoogleTitle">
                {seoTitle || (name ? `${name} | Bustaniya` : "Collection Title | Bustaniya")}
              </span>
              <span className="shopifyGoogleDesc">
                {seoDescription ||
                  (description ? description.slice(0, 150) : "Shop handcrafted Pakistani fashion collections online with fast doorstep delivery across Pakistan.")}
              </span>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="shopifyCategoryModalFooter">
          <button
            type="button"
            className="shopifySecondaryBtn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="shopifyCategoryForm"
            className="shopifyPrimaryBtn"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Saving Category...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>{isEditing ? "Update Category" : "Save Category"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
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
      ["Title", "Description", "Images", "Price", "Compare at price", "Category", "Collection", "Status", "Sizes", "Colors", "Stock", "Low stock threshold"],
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
    ].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `bustaniya-products-${new Date().toISOString().slice(0, 10)}.csv`;
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
        <div className="orderTabs">{["All", "Active", "Draft", "Archived", "Unlisted", "Low stock", "Missing cost"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
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
            <td><div className="tableProduct"><span style={{ backgroundImage: `url(${product.image})` }} /><div><b>{product.name}</b><small className="trackingNumber">{product.sku || product.articleNumber || `BST-${String(product.id).padStart(4, "0")}`}</small></div></div></td>
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
  const cat = normalizePostexCategory(order.postexStatus || order.status);
  return cat === "Returned" || cat === "Out For Return";
}

const orderCategoryLabels = [
  "Total Orders",
  "Unbooked",
  "In Courier",
  "Out For Delivery",
  "Delivered",
  "Returned",
  "Cancelled",
];

const customOrderStatusOptions = [
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
  "Un-Assigned By Me",
];

const newOrderInitialStatusOptions = [
  "Unbooked",
  "On Hold",
  "Manual Delivery",
  "Customer Pickup",
  "Booked",
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

function cleanUserNote(rawNote = "") {
  if (!rawNote || typeof rawNote !== "string") return "";
  const lines = rawNote.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const genuine = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isBoilerplate =
      lower.startsWith("payment option:") ||
      lower.startsWith("payment status:") ||
      lower.startsWith("advance received:") ||
      lower.startsWith("pay on delivery:") ||
      lower.startsWith("source:") ||
      lower.startsWith("delivery:") ||
      lower.startsWith("postex:") ||
      lower.startsWith("method:") ||
      lower.startsWith("product subtotal:") ||
      lower.startsWith("delivery charges:") ||
      lower.startsWith("pay now:") ||
      lower.includes("checkout payment verification pending") ||
      lower.includes("order confirmed; full advance payment verification") ||
      lower.includes("cash on delivery order placed and confirmed");
    if (!isBoilerplate) genuine.push(line);
  }
  return genuine.join("\n").trim();
}

function formatPaymentStatus(value = "", { advance = 0, total = 0 } = {}) {
  const s = String(value || "").trim().toLowerCase();
  if (s === "paid" || s.includes("full paid") || s.includes("fully paid") || (total > 0 && advance >= total && advance > 0)) return "Paid";
  if (s.includes("reject") || s.includes("decline") || s.includes("fail")) return "Payment Rejected";
  if (s.includes("refund")) return "Refunded";
  if (s.includes("verif") && !s.includes("await") && !s.includes("due") && !s.includes("pending")) return "Payment Verified";
  if (s.includes("proof") || s.includes("submitted") || s.includes("due")) return "Proof Submitted";
  if (s.includes("advance") || advance > 0) return "Advance Pending";
  if (s.includes("cod")) return "COD Pending";
  if (s.includes("awaiting")) return advance > 0 ? "Advance Pending" : "COD Pending";
  return "COD Pending";
}

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
  if (normalized.includes("out for delivery")) return "Out For Delivery";
  if (normalized.includes("out for return")) return "Out For Return";
  if (normalized.includes("under review") || normalized.includes("review")) return "Delivery Under Review";
  if (normalized.includes("attempt")) return "Attempted";
  if (normalized.includes("return")) return "Returned";
  if (normalized.includes("deliver") || normalized.includes("complete")) return "Delivered";
  if (normalized.includes("warehouse")) return "PostEx Warehouse";
  if (normalized.includes("transit")) return "In-Transit";
  if (normalized.includes("transfer")) return "Transferred";
  if (normalized.includes("book")) return "Booked";
  if (normalized.includes("unbook") || normalized.includes("unassigned") || normalized.includes("un assigned") || normalized.includes("pending") || normalized.includes("draft")) return "Unbooked";
  return "Unbooked";
}

function orderMatchesCategory(order, tab) {
  const hasTracking = Boolean(order.tracking && !String(order.tracking).startsWith("MANUAL-"));
  const rawStatus = String(order.status || "").toLowerCase();
  const rawPostex = String(order.postexStatus || "").toLowerCase();
  const isUnbooked = !hasTracking && (
    rawStatus.includes("unbook") ||
    rawPostex.includes("unbook") ||
    rawStatus.includes("unassigned") ||
    rawPostex.includes("unassigned") ||
    rawStatus.includes("pending") ||
    rawStatus === ""
  );

  if (tab === "Total Orders") return true;
  if (tab === "Advance Paid") return Number(order.amountPayableInAdvance || 0) > 0;
  if (tab === "Unbooked") return isUnbooked;

  // If order is explicitly unbooked, it NEVER matches In Courier or Delivered
  if (isUnbooked) return false;

  const category = normalizePostexCategory(order.postexStatus || order.status);

  if (tab === "In Courier") {
    return (
      ["Booked", "PostEx Warehouse", "Transferred", "Rider Assigned", "In-Transit"].includes(category) ||
      (hasTracking && !["Delivered", "Returned", "Out For Return", "Out For Delivery", "Attempted", "Cancelled"].includes(category))
    );
  }
  if (tab === "Out For Delivery") {
    return ["Out For Delivery", "Attempted"].includes(category);
  }
  if (tab === "Delivered") {
    return category === "Delivered";
  }
  if (tab === "Returned") {
    return ["Returned", "Out For Return"].includes(category);
  }
  if (tab === "Cancelled") {
    return category === "Cancelled";
  }

  return category === tab;
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
  const status = String(form.get("status") || "Unbooked").trim();
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
    status: formatOrderStatus(order?.courier_status || order?.status || fallback.status || "Unbooked"),
    postexStatus: formatOrderStatus(order?.courier_status || order?.status || fallback.postexStatus || "Unbooked"),
    paymentStatus: order?.payment_proof_status || order?.payment_status || fallback.paymentStatus || "Awaiting Payment",
    confirmationStatus: "Confirmed",
    paymentReference: order?.payment_reference || fallback.paymentReference || "",
    fulfillmentStatus: order?.fulfillment_status || fallback.fulfillmentStatus || "Unfulfilled",
    tracking: (order?.courier_tracking_number && !String(order.courier_tracking_number).startsWith("MANUAL-")) ? order.courier_tracking_number : (fallback.tracking || ""),
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
    // Professional, Brief Workshop Stitching Slip
    htmlContent = orders.map((order, orderIndex) => {
      const items = normalizeOrderItems(order);
      const customNotes = (order.notes || order.internalNotes || "").trim();

      const itemsHtml = items.map((item, itIdx) => {
        const qty = Number(item.quantity || 1);
        const rawSize = String(item.size || "Standard").trim();
        const isCustom = !rawSize || rawSize.toLowerCase().includes("custom") || rawSize.toUpperCase() === "C" || isCustomItemSize(rawSize);
        const displaySize = isCustom ? "C (Custom)" : rawSize;
        const articleNo = item.articleNumber || item.article_number || item.sku || (item.id && !String(item.id).startsWith("manual") ? `BST-${item.id}` : "—");
        const colorText = item.color ? String(item.color).trim() : "";

        return `
          <div class="stitchingArticleRow">
            <div class="articleDetails">
              <div class="articleTitleRow">
                <span class="articleIndex">#${itIdx + 1}</span>
                <span class="articleName">${escapeHtml(item.name || item.title)}</span>
              </div>
              <div class="articleMetaRow">
                <span class="articleMetaItem"><b>Article No:</b> ${escapeHtml(articleNo)}</span>
                ${colorText ? `<span class="articleMetaItem"><b>Color:</b> ${escapeHtml(colorText)}</span>` : ""}
                ${qty > 1 ? `<span class="articleMetaItem"><b>Qty:</b> ${qty}</span>` : ""}
              </div>
            </div>
            <div class="articleSizeBox">
              <span class="sizeLabel">SIZE</span>
              <span class="sizeValue">${escapeHtml(displaySize)}</span>
            </div>
          </div>
        `;
      }).join("");

      const isCustomOrder = items.some((it) => {
        const s = String(it.size || "").trim();
        return !s || s.toLowerCase().includes("custom") || s.toUpperCase() === "C" || isCustomItemSize(s);
      }) || Boolean(customNotes);

      return `
        <div class="stitchingPage ${orderIndex < orders.length - 1 ? 'pageBreak' : ''}">
          <div class="stitchingSlipCard">
            <!-- Header -->
            <div class="slipHeader">
              <div>
                <span class="brandName">BUSTANIYA</span>
                <span class="slipBadge">STITCHING SLIP</span>
              </div>
              <div class="orderIdBlock">
                <span class="orderIdText">${escapeHtml(order.id)}</span>
                <span class="orderDateText">${escapeHtml(order.date || "")}</span>
              </div>
            </div>

            <!-- Customer & Order Details Bar -->
            <div class="slipCustomerBar">
              <div>
                <span class="barLabel">Customer Name</span>
                <b class="barValue">${escapeHtml(order.customer || "—")}</b>
                ${order.phone ? `<span class="barPhone">📞 ${escapeHtml(order.phone)}</span>` : ""}
              </div>
              <div style="text-align:right;">
                <span class="barLabel">Order ID</span>
                <b class="barValue" style="color:#166534;">${escapeHtml(order.id)}</b>
              </div>
            </div>

            <!-- Articles List -->
            <div class="slipArticlesList">
              ${itemsHtml}
            </div>

            <!-- Custom Instructions Section (ONLY SHOWN IF CUSTOM ORDER) -->
            ${isCustomOrder && customNotes ? `
              <div class="customInstructionsBox">
                <div class="customInstructionsHead">✂️ CUSTOM STITCHING INSTRUCTIONS:</div>
                <div class="customInstructionsBody">${escapeHtml(customNotes)}</div>
              </div>
            ` : ""}

            <!-- Slip Footer -->
            <div class="slipFooter">
              <span>Bustaniya Production · ${escapeHtml(order.id)}</span>
              <span>Printed: ${new Date().toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
            </div>
          </div>
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
          
          /* Brief & Professional Stitching Slip Styles */
          .stitchingPage {
            padding: 16px;
            max-width: 720px;
            margin: 0 auto;
          }
          .stitchingSlipCard {
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 16px 20px;
            background: #fff;
            page-break-inside: avoid;
          }
          .slipHeader {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .brandName {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 0.08em;
            color: #0f172a;
          }
          .slipBadge {
            display: inline-block;
            margin-left: 10px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            background: #f1f5f9;
            color: #334155;
            border: 1px solid #cbd5e1;
            padding: 2px 8px;
            border-radius: 4px;
            vertical-align: middle;
          }
          .orderIdBlock {
            text-align: right;
          }
          .orderIdText {
            display: block;
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
          }
          .orderDateText {
            display: block;
            font-size: 11px;
            color: #64748b;
          }
          .slipCustomerBar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 14px;
            margin-bottom: 14px;
          }
          .barLabel {
            display: block;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            font-weight: 700;
          }
          .barValue {
            font-size: 15px;
            color: #0f172a;
          }
          .barPhone {
            display: inline-block;
            margin-left: 8px;
            font-size: 12px;
            color: #2563eb;
            font-weight: 600;
          }
          .slipArticlesList {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 14px;
          }
          .stitchingArticleRow {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1.5px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 14px;
            background: #fff;
          }
          .articleDetails {
            flex: 1;
          }
          .articleTitleRow {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
          }
          .articleIndex {
            font-size: 11px;
            font-weight: 800;
            background: #0f172a;
            color: #fff;
            padding: 1px 6px;
            border-radius: 3px;
          }
          .articleName {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
          }
          .articleMetaRow {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #475569;
            flex-wrap: wrap;
          }
          .articleMetaItem {
            background: #f1f5f9;
            padding: 2px 7px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
          }
          .articleSizeBox {
            text-align: center;
            background: #eaf1fb;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 6px 14px;
            min-width: 80px;
          }
          .sizeLabel {
            display: block;
            font-size: 9px;
            font-weight: 800;
            color: #1e40af;
            letter-spacing: 0.05em;
          }
          .sizeValue {
            display: block;
            font-size: 16px;
            font-weight: 900;
            color: #1e40af;
          }
          .customInstructionsBox {
            background: #fefce8;
            border: 1.5px solid #facc15;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 14px;
          }
          .customInstructionsHead {
            font-size: 11px;
            font-weight: 800;
            color: #854d0e;
            letter-spacing: 0.04em;
            margin-bottom: 4px;
          }
          .customInstructionsBody {
            font-size: 13px;
            font-weight: 700;
            color: #713f12;
            line-height: 1.4;
            white-space: pre-wrap;
          }
          .slipFooter {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
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
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showCharts, setShowCharts] = useState(false);
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
  const unfulfilledCount = useMemo(() => allRows.filter((order) => orderMatchesCategory(order, "Unbooked")).length, [allRows]);
  const inTransitCount = useMemo(() => allRows.filter((order) => orderMatchesCategory(order, "In Courier")).length, [allRows]);
  const deliveredRevenue = useMemo(() => allRows.filter(isDeliveredOrder).reduce((sum, order) => sum + orderMoney(order).total, 0), [allRows]);

  useEffect(() => {
    localStorage.removeItem("bustaniya-custom-orders");
    if (connected) setLocalOrders([]);
  }, [connected, rows]);

  useEffect(() => {
    if (!connected) return;
    let isMounted = true;
    async function autoSyncPostex() {
      try {
        const res = await fetch("/api/admin/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync_postex" }),
        });
        const data = await res.json();
        if (isMounted && data?.updatedCount > 0) {
          onRetry?.();
        }
      } catch {
        // Silently ignore background polling blips
      }
    }

    const initialTimer = setTimeout(autoSyncPostex, 3000);
    const intervalTimer = setInterval(autoSyncPostex, 45000);

    function onFocus() {
      autoSyncPostex();
    }
    window.addEventListener("focus", onFocus);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener("focus", onFocus);
    };
  }, [connected, onRetry]);

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
        : allRows.filter((order) => orderMatchesCategory(order, label)).length,
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
    const query = orderSearch.toLowerCase();
    const matchesTab = orderMatchesCategory(order, activeTab);
    const matchesSearch = [order.id, order.customer, order.city, order.tracking, order.phone, order.postexStatus, order.status, order.deliveryMethod, order.source]
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
    const stage = changes.postexStatus || changes.status || "";
    const isUnbook = stage.toLowerCase().includes("unbook");
    const resolvedTracking = changes.tracking !== undefined ? changes.tracking : order.tracking;
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.rawId || order.raw?.id || order.id || order.order_number,
        orderStage: stage,
        status: stage,
        paymentStatus: changes.paymentStatus,
        paymentReference: changes.paymentReference,
        amountPayableInAdvance: changes.amountPayableInAdvance,
        confirmationStatus: changes.confirmationStatus,
        fulfillmentStatus: isUnbook ? "Unfulfilled" : changes.fulfillmentStatus,
        tracking: resolvedTracking,
        deliveryMethod: changes.deliveryMethod,
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
      ...(isUnbook ? { fulfillmentStatus: "Unfulfilled", status: "Unbooked", postexStatus: "Unbooked" } : {}),
      ...(result.operation ? { operation: result.operation } : {}),
      ...(result.operation ? { operationEvents: [{ event_type: "order_operation_updated", new_value: { operation: result.operation }, created_at: new Date().toISOString() }, ...(order.operationEvents || [])] } : {}),
      ...(result.operationPersistence !== "saved" && result.operationPersistence !== "not_requested" ? { operationStorageAvailable: false } : {}),
    };
    updateLocalOrder(order.id, nextChanges);
    onRetry?.();
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

  async function confirmDeleteOrder() {
    if (!orderToDelete) return;
    setDeletingOrder(true);
    setDeleteError("");
    try {
      const targetId = orderToDelete.rawId || orderToDelete.raw?.id || orderToDelete.id || orderToDelete.order_number;
      const response = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: targetId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "Order delete nahi ho saka.");

      setLocalOrders((current) => current.filter((o) => o.id !== orderToDelete.id && o.rawId !== orderToDelete.rawId));
      if (selectedId === orderToDelete.id) {
        setSelectedId("");
      }
      setOrderToDelete(null);
      await onRetry?.();
    } catch (err) {
      setDeleteError(err.message || "Order delete karte waqt masla pesh aya.");
    } finally {
      setDeletingOrder(false);
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
      link.download = `bustaniya-orders-${new Date().toISOString().slice(0, 10)}.csv`;
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

  return (
    <div className="shopifyOrdersWorkspace">
      <div className="shopifyOrdersHeader">
        <div className="shopifyOrdersHeaderLeft">
          <h1>Orders</h1>
          <p>Track customer orders, manage PostEx shipments, and verify payments.</p>
        </div>
        <div className="shopifyOrdersHeaderActions">
          <button
            type="button"
            className={`shopifyHeaderActionBtn ${showCharts ? "active" : ""}`}
            onClick={() => setShowCharts((prev) => !prev)}
            title="Toggle visual pipeline and city revenue charts"
          >
            <BarChart3 size={15} />
            <span>{showCharts ? "Hide Analytics" : "View Analytics"}</span>
          </button>
          <button
            type="button"
            className="shopifyBtnSecondary"
            onClick={exportOrders}
            disabled={loading || exportingOrders || !canExport || !connected || !allRows.length}
            aria-busy={exportingOrders}
          >
            <ArrowDown size={14} />
            <span>{exportingOrders ? "Exporting..." : "Export orders"}</span>
          </button>
          <button
            type="button"
            className="shopifyBtnPrimary"
            onClick={() => setShowDraft(true)}
          >
            <Plus size={16} />
            <span>Create custom order</span>
          </button>
        </div>
      </div>

      {!loading && error && (
        <div className="ordersConnect">
          <div><b>Orders could not be loaded.</b><span>{error}</span></div>
          <button onClick={onRetry}>Retry</button>
        </div>
      )}
      {!loading && !connected && !error && (
        <div className="ordersConnect">
          <div><b>Session expired</b><span>Please sign in again to view orders.</span></div>
        </div>
      )}

      {showSkeleton && <OrdersLoadingSkeleton />}

      {!showSkeleton && (connected || allRows.length > 0) && (
        <>
          {/* Executive KPI Summary Ribbon */}
          <div className="shopifyKpiGrid">
            <div className="shopifyKpiCard">
              <div className="shopifyKpiTop">
                <span className="shopifyKpiLabel">Total Orders</span>
                <span className="shopifyKpiIconBadge shopifyKpiTotal">
                  <Package size={17} />
                </span>
              </div>
              <div className="shopifyKpiValue">{allRows.length}</div>
              <span className="shopifyKpiSub">Store lifetime volume</span>
            </div>

            <div className="shopifyKpiCard">
              <div className="shopifyKpiTop">
                <span className="shopifyKpiLabel">Needs Action</span>
                <span className="shopifyKpiIconBadge shopifyKpiPending">
                  <Clock size={17} />
                </span>
              </div>
              <div className={`shopifyKpiValue ${unfulfilledCount > 0 ? "shopifyKpiAlert" : ""}`}>
                {unfulfilledCount} {unfulfilledCount === 1 ? "order" : "orders"}
              </div>
              <span className="shopifyKpiSub">Unfulfilled / Unbooked</span>
            </div>

            <div className="shopifyKpiCard">
              <div className="shopifyKpiTop">
                <span className="shopifyKpiLabel">In Transit</span>
                <span className="shopifyKpiIconBadge shopifyKpiTransit">
                  <Truck size={17} />
                </span>
              </div>
              <div className="shopifyKpiValue">{inTransitCount}</div>
              <span className="shopifyKpiSub">With PostEx courier</span>
            </div>

            <div className="shopifyKpiCard">
              <div className="shopifyKpiTop">
                <span className="shopifyKpiLabel">Delivered Revenue</span>
                <span className="shopifyKpiIconBadge shopifyKpiDelivered">
                  <TrendingUp size={17} />
                </span>
              </div>
              <div className="shopifyKpiValue shopifyKpiSuccess">
                Rs. {Math.round(deliveredRevenue).toLocaleString()}
              </div>
              <span className="shopifyKpiSub">Delivered COD revenue</span>
            </div>
          </div>

          {showCharts && (
            <div className="adminVisualGrid" style={{ marginTop: "4px", marginBottom: "6px" }}>
              <VisualDonut title="Order pipeline" subtitle="Live fulfilment health — booked, in-transit, delivered and returned." centerValue={allRows.length} centerLabel="total" items={orderStatusVisual} />
              <VisualBars title="Revenue by city" subtitle="Top shipping destinations ranked by delivered order value." format={(value) => `Rs. ${Math.round(Number(value || 0)).toLocaleString()}`} items={cityVisual} />
            </div>
          )}

          {/* Main Shopify Orders Table Card */}
          <section className={`shopifyOrdersCard ${isRefreshing ? "isRefreshing" : ""}`}>
            {isRefreshing && <div className="ordersRefreshBar" role="status" aria-label="Refreshing orders" />}

            {/* Sticky Bulk Action Bar */}
            {selectedOrderIds.length > 0 && (
              <div className="shopifyBulkBar">
                <div className="shopifyBulkSummary">
                  <span className="shopifyBulkCheck"><Check size={13} /></span>
                  <span>{selectedOrderIds.length} {selectedOrderIds.length === 1 ? "order" : "orders"} selected</span>
                </div>
                <div className="shopifyBulkActions">
                  <button type="button" className="shopifyBulkBtn" title="Print workshop tailor stitching slips" onClick={() => generateBulkOrdersPdf({ orders: allRows.filter((order) => selectedOrderIds.includes(order.id)), type: "stitching" })}>
                    <Scissors size={13} /> Stitching slips
                  </button>
                  <button type="button" className="shopifyBulkBtn" title="Print master cutting sheet" onClick={() => generateBulkOrdersPdf({ orders: allRows.filter((order) => selectedOrderIds.includes(order.id)), type: "batch_sheet" })}>
                    <Layers size={13} /> Cutting sheet
                  </button>
                  <button type="button" className="shopifyBulkBtn" title="Print customer invoices" onClick={() => generateBulkOrdersPdf({ orders: allRows.filter((order) => selectedOrderIds.includes(order.id)), type: "invoice" })}>
                    <FileText size={13} /> Invoices
                  </button>
                  <button type="button" className="shopifyBulkBtn" title="Print courier manifest" onClick={() => generateBulkOrdersPdf({ orders: allRows.filter((order) => selectedOrderIds.includes(order.id)), type: "manifest" })}>
                    <Truck size={13} /> Courier manifest
                  </button>
                  <button type="button" className="shopifyBulkClearBtn" onClick={() => setSelectedOrderIds([])}>Clear selection</button>
                </div>
              </div>
            )}

            {/* Shopify Filter Tabs */}
            <div className="shopifyTabsWrap" role="tablist">
              {orderStatusCounts.map((category) => {
                const isActive = activeTab === category.label;
                const tabDisplayLabel = category.label === "Total Orders" ? "All" : category.label === "Unbooked" ? "Unfulfilled" : category.label;
                return (
                  <button
                    key={category.label}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`shopifyTabBtn ${isActive ? "active" : ""}`}
                    onClick={() => setActiveTab(category.label)}
                  >
                    <span>{tabDisplayLabel}</span>
                    <span className="shopifyTabBadge">{category.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Orders Toolbar */}
            <div className="shopifyOrdersToolbar">
              <div className="shopifySearchWrap">
                <Search size={15} color="#68796e" />
                <input
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="Filter orders by order #, customer, phone, city, tracking..."
                  aria-label="Filter orders"
                />
                {orderSearch && (
                  <button type="button" className="shopifySearchClearBtn" onClick={() => setOrderSearch("")} title="Clear search">✕</button>
                )}
              </div>

              <div className="shopifyToolbarRight">
                <span className="shopifyToolbarCount">
                  {isRefreshing ? "Refreshing…" : <>Showing <b>{visibleRows.length}</b> of {allRows.length} {allRows.length === 1 ? "order" : "orders"}{activeTab !== "Total Orders" ? ` · ${activeTab}` : ""}</>}
                </span>
                <TableDensityToggle density={tableDensity} onChange={setTableDensity} />
              </div>
            </div>

            {allRows.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="No orders received" description="There are no orders in your store database yet." />
            ) : (
              <OrderTable
                rows={visibleRows}
                products={products}
                density={tableDensity}
                onSelect={(order) => setSelectedId(order.id)}
                selectedOrderIds={selectedOrderIds}
                onToggleSelectOrder={toggleSelectOrder}
                onToggleSelectAll={toggleSelectAll}
                onPrintStitchingOrder={(order) => generateBulkOrdersPdf({ orders: [order], type: "stitching" })}
                onPrintSingleOrder={(order) => generateBulkOrdersPdf({ orders: [order], type: "invoice" })}
                onDeleteOrder={(order) => {
                  setDeleteError("");
                  setOrderToDelete(order);
                }}
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
        </>
      )}

      {showDraft && <DraftOrderDialog products={products} onClose={() => setShowDraft(false)} onCreate={createDraft} saving={creatingDraft} />}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          catalogProducts={products}
          onClose={() => setSelectedId("")}
          onUpdate={persistOrderUpdate}
          canRecordRefund={currentAdminUser?.role === "Owner"}
          onNavigateToEvents={onNavigateToEvents}
          onDelete={(order) => {
            setDeleteError("");
            setOrderToDelete(order);
          }}
        />
      )}

      {orderToDelete && (
        <>
          <div className="adminOverlay" onClick={() => !deletingOrder && setOrderToDelete(null)} />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100,
              width: "min(520px, 92vw)",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)",
              padding: "26px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              fontFamily: "var(--font-sans, sans-serif)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "50%",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#111827" }}>
                  Delete Order Confirmation
                </h3>
                <span style={{ fontSize: "13px", color: "#6b7280" }}>
                  Kya aap waqayi yeh order delete karna chahte hain?
                </span>
              </div>
            </div>

            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                padding: "16px",
                fontSize: "13px",
                color: "#991b1b",
                lineHeight: "1.5",
              }}
            >
              <p style={{ margin: "0 0 10px 0", fontWeight: 700, fontSize: "13.5px" }}>
                🚨 Ghalati se delete na ho, barah-e-karam tasdeeq karein:
              </p>
              <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "8px", border: "1px solid #fee2e2", marginBottom: "10px", display: "grid", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Order ID:</span>
                  <b style={{ color: "#111827" }}>{orderToDelete.id || orderToDelete.order_number}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Customer:</span>
                  <b style={{ color: "#111827" }}>{orderToDelete.customer}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>City:</span>
                  <span style={{ color: "#111827" }}>{orderToDelete.city || "Pakistan"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Total Amount:</span>
                  <b style={{ color: "#059669" }}>Rs. {orderMoney(orderToDelete).total?.toLocaleString()}</b>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#b91c1c", fontWeight: 500 }}>
                Yeh order <b>Supabase database</b> aur saare related order items se <b>permanent delete</b> ho jayega. Yeh action wapas nahi ho sakta!
              </p>
            </div>

            {deleteError && (
              <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px", border: "1px solid #fca5a5" }}>
                ❌ {deleteError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                disabled={deletingOrder}
                onClick={() => setOrderToDelete(null)}
                style={{
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: deletingOrder ? "not-allowed" : "pointer",
                }}
              >
                Cancel (Nahi)
              </button>
              <button
                type="button"
                disabled={deletingOrder}
                onClick={confirmDeleteOrder}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: deletingOrder ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 10px rgba(220, 38, 38, 0.4)",
                }}
              >
                {deletingOrder ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Supabase se delete ho raha hai...</span>
                  </>
                ) : (
                  "🗑️ Haan, Permanently Delete Karein"
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function orderPillTone(label) {
  if (label === "Total Orders") return "neutral";
  if (label === "Advance Paid") return "money";
  if (label === "Delivered") return "delivered";
  if (label === "In Courier" || label === "Booked" || label === "Transferred") return "booked";
  if (label === "Unbooked" || label === "Un-Assigned By Me") return "unbooked";
  if (label === "Returned" || label === "Out For Return") return "returned";
  if (label === "Cancelled") return "cancelled";
  if (label === "Out For Delivery" || label === "Attempted" || label === "Delivery Under Review") return "attention";
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
    <section className="adminCard settingsForm settingsWideForm courierFilters"><div className="formRow"><label>Courier<select value={filters.courier} onChange={(event) => setFilters((current) => ({ ...current, courier: event.target.value }))}><option value="all">All couriers</option>{snapshot.couriers.map((courier) => <option key={courier.id} value={courier.provider}>{courier.name}</option>)}</select></label><label>Status<select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="all">All statuses</option>{["booked", "picked_up", "in_transit", "out_for_delivery", "delivered", "attempted", "on_hold", "returned", "cancelled", "manual_delivery"].map((status) => <option value={status} key={status}>{statusLabel(status)}</option>)}</select></label><label>Queue<select value={filters.queue} onChange={(event) => setFilters((current) => ({ ...current, queue: event.target.value }))}><option value="all">All shipments</option><option value="delayed">Delayed only</option><option value="failed">Failed sync only</option></select></label></div><div className="orderTabs courierQuickFilters"><button type="button" className={filters.queue === "all" && filters.status === "all" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, queue: "all", status: "all" }))}>All</button><button type="button" className={filters.status === "out_for_delivery" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, status: "out_for_delivery", queue: "all" }))}>Out for delivery</button><button type="button" className={filters.status === "delivered" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, status: "delivered", queue: "all" }))}>Delivered</button><button type="button" className={filters.queue === "delayed" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, queue: "delayed", status: "all" }))}>Delayed</button><button type="button" className={filters.queue === "failed" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, queue: "failed", status: "all" }))}>Needs retry</button></div></section>
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
      .catch(() => { });
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
          fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(manual) }).then((migrationResponse) => { if (migrationResponse.ok) localStorage.removeItem("bustaniya-admin-finance"); }).catch(() => { });
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

  async function addMarketingCampaign(event) { event.preventDefault(); const formElement = event.currentTarget; const data = new FormData(formElement); const next = [{ id: `campaign-${Date.now()}`, name: String(data.get("name") || "").trim(), platform: data.get("platform") || "Other", spend: Number(data.get("spend") || 0), sales: Number(data.get("sales") || 0), customers: Number(data.get("customers") || 0), date: data.get("date") || today }, ...marketingCampaigns]; if (!next[0].name) return; setCashbookLoading(true); try { const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: cashbookTransactions, allocation: profitAllocation, supplierBills, fixedCosts: Number(fixedCosts || 0), marketingCampaigns: next }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to save campaign."); setMarketingCampaigns(result.marketingCampaigns || next); formElement?.reset(); } catch (error) { setCashbookError(error.message); } finally { setCashbookLoading(false); } }

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
      const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
      ["Metric", "Value"],
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
    ].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `bustaniya-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <div className={`financeSystem financeTab-${financeTab}`} data-legacy-finance-error={cashbookError || undefined}>
    {financeTab !== "engine" && (
      <div className="adminTitle">
        <div><p>FINANCE MANAGER</p><h1>Finances</h1><span>Cash, supplier bills, customer payments aur profit — ek hi verified workspace mein.</span></div>
      </div>
    )}

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

    {financeTab === "engine" && <FinanceWorkspace currentAdminUser={currentAdminUser} showTitle={true} />}

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
          <div className="adminTableWrap"><table className="adminTable financeTable"><thead><tr><th>Supplier</th><th>Reference</th><th>Due date</th><th>Bill</th><th>Paid</th><th>Remaining</th><th /></tr></thead><tbody>{supplierBills.map((bill) => { const remaining = Math.max(0, Number(bill.total) - Number(bill.paid)); const payments = cashbookTransactions.filter((entry) => entry.supplierBillId === bill.id && !entry.voided); const dueSoon = bill.dueDate && bill.dueDate >= today && bill.dueDate <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10); return <tr key={bill.id}><td><b>{bill.supplier}</b>{payments.length > 0 && <small><br />{payments.length} active payment{payments.length === 1 ? "" : "s"}: {payments.map((entry) => `${entry.date} ${money(entry.amount)}`).join(" · ")}</small>}</td><td>{bill.reference || "—"}</td><td className={dueSoon && remaining ? "expenseAmount" : ""}>{bill.dueDate || "—"}{dueSoon && remaining ? <small><br />Due soon</small> : null}</td><td>{money(bill.total)}</td><td>{money(bill.paid)}</td><td className={bill.dueDate && bill.dueDate < today && remaining ? "expenseAmount" : ""}>{money(remaining)}</td><td>{remaining > 0 && <button className="editProductButton" onClick={() => recordSupplierPayment(bill)} disabled={cashbookLoading} aria-busy={cashbookLoading}>Pay</button>}</td></tr>; })}{!supplierBills.length && <tr><td colSpan="7" className="emptyFinanceCell">No supplier bills added yet.</td></tr>}</tbody></table></div>
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
          <div className="formRow"><label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Reference (optional)<input name="reference" placeholder="Invoice, bank ref, WhatsApp ref" /></label></div>
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
      .catch(() => { })
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
      .catch(() => { })
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
      <label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Batch note<textarea name="note" rows="2" placeholder="Supplier, stitching unit or batch reference" /></label><button className="dialogSave" disabled={productionSaving}>{productionSaving ? "Saving batch..." : "Save batch, allocate costs & add stock"}</button>
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
      {["Stock", "Sources", "History"].map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "Sources" ? "Sources & Materials" : item}</button>)}
    </div>

    {tab === "Stock" && <section className="adminCard managementCard inventoryLedger">
      <div className="inventoryViewBar">
        {["All", "Low stock", "Out of stock"].map(item => <button type="button" key={item} className={inventoryView === item ? "active" : ""} onClick={() => setInventoryView(item)}>{item}</button>)}
      </div>
      <div className="inventoryControlBar simpleInventoryControls">
        <div className="inlineSearch"><Search /><input value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Search products or SKU..." /></div>
        <button type="button" onClick={() => setProductionOpen(true)}><Plus /> Create production batch</button>
        <button type="button" onClick={() => openAdjust("__custom__")}><Plus /> Add product with stock</button>
      </div>
      <div className="adminTableWrap"><table className="adminTable inventoryTable simpleInventoryTable"><thead><tr><th>Product</th><th>SKU</th><th>Available</th><th>Threshold</th><th>Retail value</th><th>Status</th><th /></tr></thead><tbody>{visibleInventoryRows.map(product => { const status = inventoryStatus(product); return <tr key={product.id}><td><div className="tableProduct"><span style={{ backgroundImage: `url(${product.image})` }} /><b>{product.name}</b></div></td><td>{product.sku || product.articleNumber || `BST-${String(product.id).padStart(4, "0")}`}</td><td><b className={Number(product.stock || 0) <= Number(product.lowStockThreshold || 5) ? "stockLow" : ""}>{Number(product.stock || 0)}</b></td><td>{Number(product.lowStockThreshold || 5)}</td><td>Rs. {(Number(product.price || 0) * Number(product.stock || 0)).toLocaleString()}</td><td><span className={`statusBadge ${status.className}`}>{status.label}</span></td><td><button className="adjustStockButton" onClick={() => openAdjust(product.id)}>Adjust</button></td></tr> })}</tbody></table>{!visibleInventoryRows.length && <div className="inventoryEmpty">No products match this view.</div>}</div>
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

    {tab === "History" && <InventoryList title="Stock adjustment history" headers={["Product", "Change", "Reason", "Date", "User"]} rows={history.map(x => [x.product, x.change > 0 ? `+${x.change}` : x.change, x.reason, x.date, x.user])} empty="No stock adjustments yet." />}

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
      <div className="formRow"><label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Tailor / supplier<input name="counterparty" placeholder="e.g. Amina Tailors" /></label></div>
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
  return <section className="adminCard managementCard"><div className="inventoryListHead"><div><h2>{title}</h2><span>{rows.length} records</span></div>{action && <button onClick={onAction}><Plus />{action}</button>}</div><div className="adminTableWrap"><table className="adminTable"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{j === 0 ? <b>{cell}</b> : cell}</td>)}</tr>)}</tbody></table>{!rows.length && <div className="inventoryEmpty">{empty || "No records found."}</div>}</div></section>;
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
  return <><div className="adminOverlay" onClick={onClose} /><form className="inventoryDialog" onSubmit={onAdjust}><DialogHead title="Adjust inventory" onClose={onClose} />
    <label>Product<select name="product" value={productChoice} onChange={(event) => setProductChoice(event.target.value)}><option value="__custom__">Add new product</option>{products.map(p => <option value={p.id} key={p.id}>{p.name} - {p.stock} available</option>)}</select></label>
    {productChoice === "__custom__" && <div className="formRow"><label>Product name<input name="customName" required placeholder="e.g. Embroidered Dupatta" /></label><label>SKU<input name="customSku" placeholder="Optional" /></label></div>}
    <label>{productChoice === "__custom__" ? "Opening stock" : "Stock change"}<input name="amount" required type="number" placeholder={productChoice === "__custom__" ? "10" : "+10 or -2"} /></label>
    <label>Reason<select name="reason"><option>Stock count correction</option><option>Received stock</option><option>Damaged</option><option>Returned</option><option>Promotion</option></select></label>
    <button className="dialogSave">Save stock</button>
  </form></>;
}

function DialogHead({ title, onClose }) { return <div className="dialogHead"><h2>{title}</h2><button type="button" onClick={onClose}><X /></button></div>; }

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
      productId: produ
... [truncated for diff preview]