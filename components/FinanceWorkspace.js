"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeftRight, CheckCircle2, ChevronRight, CircleDollarSign,
  Download, FileSpreadsheet, Landmark, Loader2, Package, Plus, ReceiptText,
  RefreshCw, ShoppingBag, TrendingUp, WalletCards, X,
} from "lucide-react";

const PERIODS = [
  ["all", "All time"],
  ["today", "Today"],
  ["month", "This month"],
  ["lastMonth", "Last month"],
  ["year", "This year"],
  ["custom", "Custom range"],
];

const TABS = [
  ["overview", "Overview"],
  ["cash", "Cash & Accounts"],
  ["pnl", "Profit & Loss"],
  ["payments", "Courier & Advances"],
  ["reports", "Reports & Analytics"],
];

function money(value) {
  return `Rs. ${Math.round(Number(value || 0)).toLocaleString()}`;
}

const ACCOUNT_PRIORITY = ["nayapay_amina", "alfalah_owner", "postex_wallet", "cash_in_hand"];

function sortFinanceAccounts(accounts = []) {
  return [...accounts]
    .filter((account) => account && account.isActive !== false)
    .sort((left, right) => {
      const leftIndex = ACCOUNT_PRIORITY.indexOf(left.slug);
      const rightIndex = ACCOUNT_PRIORITY.indexOf(right.slug);
      const leftRank = leftIndex === -1 ? ACCOUNT_PRIORITY.length : leftIndex;
      const rightRank = rightIndex === -1 ? ACCOUNT_PRIORITY.length : rightIndex;
      return leftRank - rightRank || String(left.name).localeCompare(String(right.name));
    });
}

function AccountOptions({ accounts = [] }) {
  return sortFinanceAccounts(accounts).map((account) => (
    <option key={account.id} value={account.id}>
      {account.name} · {money(account.balancePkr)} current
    </option>
  ));
}

function AccountSelect({ accounts, name = "accountId", required = false, label = "Account", defaultValue = "", value, onChange }) {
  const isControlled = value !== undefined;
  return (
    <label>{label}
      <select
        name={name}
        required={required}
        value={isControlled ? value : undefined}
        defaultValue={isControlled ? undefined : defaultValue}
        onChange={onChange}
      >
        <option value="">Select account</option>
        <AccountOptions accounts={accounts} />
      </select>
    </label>
  );
}

function percent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatementRow({ label, value, help, strong = false, sign = "" }) {
  return (
    <div className={strong ? "shopifyStatementRow font-bold bg-[#fafcfa] rounded px-2" : "shopifyStatementRow"}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span>{label}</span>
        {help ? <small style={{ display: "block", fontSize: "11px", color: "#667a6e", marginTop: "2px", fontWeight: "normal" }}>{help}</small> : null}
      </div>
      <b className={sign === "+" ? "shopifyStatementValue in" : sign === "-" ? "shopifyStatementValue out" : ""}>
        {sign}{sign ? " " : ""}{value}
      </b>
    </div>
  );
}

function Card({ title, subtitle, right, children, className = "" }) {
  return (
    <div className={`shopifySectionCard ${className}`}>
      <div className="shopifySectionHeader">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Table({ head, children, empty, colSpan }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(rows) ? rows.length === 0 : !rows;
  return (
    <div className="adminTableWrap">
      <table className="adminTable financeTable">
        <thead><tr>{head.map((label) => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>
          {isEmpty ? <tr><td colSpan={colSpan || head.length} className="emptyFinanceCell">{empty}</td></tr> : rows}
        </tbody>
      </table>
    </div>
  );
}

export default function FinanceWorkspace({ currentAdminUser, showTitle = true }) {
  const isOwner = !currentAdminUser || currentAdminUser.role === "Owner";
  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [report, setReport] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // "expense" | "income" | "transfer" | null
  const [modalDefaultAccount, setModalDefaultAccount] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (period === "custom") {
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    return params;
  }, [period, customFrom, customTo]);

  const load = useCallback(async ({ withTrend = false } = {}) => {
    if (period === "custom" && (!customFrom || !customTo)) {
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(query);
      if (withTrend) params.set("trend", "1");
      const response = await fetch(`/api/admin/finance?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error([result.error, result.detail, result.hint].filter(Boolean).join("\n\nDatabase ne kaha: "));
      }
      setReport(result.report);
      if (result.trend) setTrend(result.trend);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [query, period, customFrom, customTo]);

  useEffect(() => { load({ withTrend: tab === "reports" && !trend.length }); }, [load]);

  useEffect(() => {
    if (tab === "reports" && !trend.length && report) load({ withTrend: true });
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function post(body, successMessage) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Ye action pura nahi ho saka.");
      if (successMessage) setNotice(typeof successMessage === "function" ? successMessage(result) : successMessage);
      await load();
      setActiveModal(null);
      return result;
    } catch (actionError) {
      setError(actionError.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (!isOwner) {
    return (
      <div className="shopifySectionCard" style={{ padding: "40px 20px", textAlign: "center" }}>
        <h2 style={{ fontSize: "20px", color: "#122a1e" }}>Owner Access Required</h2>
        <p style={{ color: "#667a6e", marginTop: "8px" }}>Finance workspace sirf Store Owner ke liye hai.</p>
      </div>
    );
  }

  if (loading && !report) {
    return (
      <div className="shopifySectionCard" style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <Loader2 size={32} className="animate-spin text-[#173d29]" />
        <h2 style={{ fontSize: "18px", color: "#122a1e", margin: 0 }}>Loading Financial Hub...</h2>
        <p style={{ color: "#667a6e", margin: 0, fontSize: "13px" }}>Accounts, ledger, delivered orders aur P&amp;L load ho rahe hain.</p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="shopifySectionCard" style={{ padding: "30px", borderLeft: "4px solid #b91c1c" }}>
        <h2 style={{ fontSize: "18px", color: "#991b1b" }}>Finance Setup Adhoora Hai</h2>
        <pre className="financeErrorDetail" style={{ marginTop: "12px" }}>{error}</pre>
        <button type="button" className="shopifyPrimaryButton" style={{ marginTop: "16px" }} onClick={() => load()}>
          Dobara Koshish Karein
        </button>
      </div>
    );
  }

  if (!report) return null;

  const { cash, sales, pnl, postex, advances, suppliers, marketing, inventory, accounts, alerts, products, categories, orders, settings } = report;

  return (
    <div className="shopifyFinanceWorkspace">
      {/* Top Header with Quick Actions */}
      {showTitle && (
        <header className="shopifyFinanceHeader">
          <div className="shopifyFinanceHeaderLeft">
            <h1>
              <WalletCards className="text-[#173d29]" size={28} />
              Finances
            </h1>
            <p>
              Live Multi-Account Cashbook, Real-time P&amp;L, PostEx Courier Receivables &amp; Supplier Payables.
            </p>
          </div>
          <div className="shopifyFinanceHeaderActions">
            <button
              type="button"
              className="shopifyFinanceActionBtn expense"
              onClick={() => { setModalDefaultAccount(""); setActiveModal("expense"); }}
            >
              <Plus size={15} /> Record Expense
            </button>
            <button
              type="button"
              className="shopifyFinanceActionBtn income"
              onClick={() => { setModalDefaultAccount(""); setActiveModal("income"); }}
            >
              <Plus size={15} /> Add Income
            </button>
            <button
              type="button"
              className="shopifyFinanceActionBtn transfer"
              onClick={() => { setModalDefaultAccount(""); setActiveModal("transfer"); }}
            >
              <ArrowLeftRight size={15} /> Transfer Funds
            </button>
            <button
              type="button"
              className="shopifySecondaryButton"
              onClick={() => load({ withTrend: true })}
              disabled={loading}
              aria-busy={loading}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>
      )}

      {/* Unified Toolbar: 5 Section Tabs + Period Filter */}
      <div className="shopifyFinanceToolbar">
        <div className="shopifyFinanceTabs" role="tablist">
          {TABS.map(([value, label]) => {
            const isActive = tab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`shopifyFinanceTab ${isActive ? "active" : ""}`}
                onClick={() => setTab(value)}
              >
                {value === "overview" && <TrendingUp size={15} />}
                {value === "cash" && <Landmark size={15} />}
                {value === "pnl" && <CircleDollarSign size={15} />}
                {value === "payments" && <Package size={15} />}
                {value === "reports" && <ReceiptText size={15} />}
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="shopifyFinancePeriodWrap">
          <select
            className="shopifyFinancePeriodSelect"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Filter by time period"
          >
            {PERIODS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {period === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="date"
                className="shopifyFinancePeriodSelect"
                style={{ padding: "6px 8px", fontSize: "12px" }}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span style={{ fontSize: "12px", color: "#667a6e" }}>to</span>
              <input
                type="date"
                className="shopifyFinancePeriodSelect"
                style={{ padding: "6px 8px", fontSize: "12px" }}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Notification and Error Messages */}
      {error && (
        <div className="adminErrorBanner financeErrorBanner" style={{ borderRadius: "10px", margin: 0 }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", padding: "12px 18px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px", color: "#166534" }}>
          <CheckCircle2 size={18} />
          <span style={{ fontSize: "13.5px", fontWeight: "650" }}>{notice}</span>
        </div>
      )}

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <div className="financeAlertStrip">
          {alerts.map((alert) => (
            <div key={alert.id} className={`financeAlert financeAlert-${alert.level}`}>
              <AlertTriangle />
              <div><b>{alert.title}</b><span>{alert.detail}</span></div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          TAB 1: OVERVIEW
          ========================================================================= */}
      {tab === "overview" && (
        <>
          {/* 8 Modern High-Impact KPI Cards */}
          <div className="shopifyFinanceKpiGrid">
            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon cash"><WalletCards size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">Available Cash</span>
                <span className={`shopifyFinanceKpiValue ${cash.availableCashPkr < 0 ? "negative" : ""}`}>{money(cash.availableCashPkr)}</span>
                <span className="shopifyFinanceKpiHelp">Jo paisa abhi kharch kar sakte hain</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon sales"><ShoppingBag size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">Sales (Delivered)</span>
                <span className="shopifyFinanceKpiValue">{money(sales.grossRevenuePkr)}</span>
                <span className="shopifyFinanceKpiHelp">{sales.deliveredOrders} delivered orders</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon profit"><TrendingUp size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">Net Profit</span>
                <span className={`shopifyFinanceKpiValue ${pnl.netProfitPkr < 0 ? "negative" : ""}`}>{money(pnl.netProfitPkr)}</span>
                <span className="shopifyFinanceKpiHelp">{percent(pnl.marginPercent)} profit margin</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon postex"><Landmark size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">PostEx Receivable</span>
                <span className={`shopifyFinanceKpiValue ${postex.receivablePkr ? "text-amber-700" : ""}`}>{money(postex.receivablePkr)}</span>
                <span className="shopifyFinanceKpiHelp">Delivered, awaiting courier payout</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon advance"><CircleDollarSign size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">Advance Received</span>
                <span className="shopifyFinanceKpiValue">{money(advances.cashPostedPkr || 0)}</span>
                <span className="shopifyFinanceKpiHelp">{money(advances.verifiedPkr)} verified ({money(advances.notInCashPkr || 0)} unposted)</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon units"><Package size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">Units Sold</span>
                <span className="shopifyFinanceKpiValue">{sales.unitsSold}</span>
                <span className="shopifyFinanceKpiHelp">{money(sales.averageOrderValuePkr)} average order</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon returns"><ShoppingBag size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">Returned Orders</span>
                <span className={`shopifyFinanceKpiValue ${sales.returnedOrders ? "negative" : ""}`}>{sales.returnedOrders}</span>
                <span className="shopifyFinanceKpiHelp">{percent(sales.returnRatePercent)} return rate</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon payable"><Landmark size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">Supplier Payable</span>
                <span className={`shopifyFinanceKpiValue ${suppliers.payablePkr > 0 ? "text-orange-700" : ""}`}>{money(suppliers.payablePkr)}</span>
                <span className="shopifyFinanceKpiHelp">{suppliers.overdue.length ? `${suppliers.overdue.length} overdue bills` : "No overdue bills"}</span>
              </div>
            </div>
          </div>

          {/* Account Balances Snapshot Bar */}
          <div className="shopifySectionCard" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "750", color: "#122a1e" }}>Operating Accounts &amp; Cash Balances</h3>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#667a6e" }}>Daily real-time liquid balance per account</p>
              </div>
              <button
                type="button"
                className="shopifySecondaryButton"
                style={{ fontSize: "12px", padding: "6px 12px" }}
                onClick={() => setTab("cash")}
              >
                View Full Cash Ledger →
              </button>
            </div>
            <div className="shopifyAccountsGrid">
              {sortFinanceAccounts(accounts).map((acc) => (
                <div key={acc.id} className="shopifyAccountCard">
                  <div className="shopifyAccountCardHead">
                    <div>
                      <b>{acc.name}</b>
                      <div style={{ fontSize: "11px", color: "#667a6e" }}>{acc.holder || (acc.kind === "cash" ? "Physical Cash" : "Digital Account")}</div>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "4px", background: "#f0fdf4", color: "#166534" }}>
                      {acc.movementCount} movements
                    </span>
                  </div>
                  <div className="shopifyAccountBalance">
                    {money(acc.balancePkr)}
                  </div>
                  <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f1f5f2", paddingTop: "10px" }}>
                    <button
                      type="button"
                      className="shopifyAccountQuickBtn"
                      onClick={() => { setModalDefaultAccount(acc.id); setActiveModal("expense"); }}
                    >
                      <Plus size={12} /> Expense
                    </button>
                    <button
                      type="button"
                      className="shopifyAccountQuickBtn"
                      onClick={() => { setModalDefaultAccount(acc.id); setActiveModal("transfer"); }}
                    >
                      <ArrowLeftRight size={12} /> Transfer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Money In vs Money Out Statement */}
          <section className="financeGrid financeGridWide">
            <Card title="Money in" subtitle="Sirf woh paisa jo asal mein mila — is period mein.">
              <div className="financeStatement">
                <StatementRow label="PostEx bank receipts" value={money(cash.postexReceiptsPkr)} sign="+" help="Aap ne bank mein confirm kiye" />
                <StatementRow label="Customer advances" value={money(cash.advanceReceiptsPkr)} sign="+" help="Verified advance, NayaPay mein" />
                <StatementRow label="Other income" value={money(cash.otherIncomePkr)} sign="+" />
                <StatementRow label="Owner funds added" value={money(cash.ownerInvestmentsPkr)} sign="+" />
                <StatementRow label="Total in" value={money(cash.inPkr)} strong sign="+" />
              </div>
            </Card>
            <Card title="Money out" subtitle="Stock ka kharcha abhi cash kam karta hai; profit mein tab ginta hai jab woh maal bikta hai.">
              <div className="financeStatement">
                <StatementRow label="Stock / production" value={money(cash.inventorySpendPkr)} sign="-" help="Fabric, stitching, lace" />
                <StatementRow label="Operating expenses" value={money(cash.operatingExpensesPkr)} sign="-" />
                <StatementRow label="Supplier payments" value={money(cash.supplierPaymentsPkr)} sign="-" />
                <StatementRow label="Owner withdrawals" value={money(cash.ownerWithdrawalsPkr)} sign="-" />
                <StatementRow label="Total out" value={money(cash.outPkr)} strong sign="-" />
              </div>
            </Card>
          </section>

          {/* Products & Categories Breakdown */}
          <section className="financeGrid financeGridWide">
            <Card title="Best & worst products" subtitle="Delivered units par profit — cost sale ke waqt wali use hoti hai.">
              <Table head={["Product", "Units", "Revenue", "Profit", "Margin"]} empty="Is period mein koi delivered sale nahi." >
                {products.slice(0, 8).map((row) => (
                  <tr key={row.productId || row.name}>
                    <td><div style={{ display: "flex", flexDirection: "column" }}><b>{row.name}</b>{row.sku ? <small style={{ display: "block", fontSize: "11px", color: "#667a6e" }}>{row.sku}</small> : null}</div></td>
                    <td>{row.units}</td>
                    <td>{money(row.revenuePkr)}</td>
                    <td className={row.profitPkr < 0 ? "expenseAmount font-bold" : "incomeAmount font-bold"}>{money(row.profitPkr)}</td>
                    <td><span className="shopifyStatusBadge active">{percent(row.marginPercent)}</span></td>
                  </tr>
                ))}
              </Table>
            </Card>
            <Card title="Category profit" subtitle="Kaun si category sab se zyada kamati hai.">
              <Table head={["Category", "Units", "Revenue", "Profit", "Margin"]} empty="Koi data nahi.">
                {categories.map((row) => (
                  <tr key={row.category}>
                    <td><b>{row.category}</b></td>
                    <td>{row.units}</td>
                    <td>{money(row.revenuePkr)}</td>
                    <td className={row.profitPkr < 0 ? "expenseAmount font-bold" : "incomeAmount font-bold"}>{money(row.profitPkr)}</td>
                    <td><span className="shopifyStatusBadge active">{percent(row.marginPercent)}</span></td>
                  </tr>
                ))}
              </Table>
            </Card>
          </section>

          {/* Forecast & Stock Cards */}
          <section className="financeGrid financeGridWide">
            <Card title="Inventory mein phansa paisa" subtitle="Stock ki purchase value aur jo bilkul nahi bik raha.">
              <div className="financeStatement">
                <StatementRow label="Purchase value on hand" value={money(inventory.costValuePkr)} help="Itna paisa stock mein phansa hai" />
                <StatementRow label="Retail value on hand" value={money(inventory.retailValuePkr)} />
                <StatementRow label="Dead stock (is period mein 0 bika)" value={money(inventory.deadStockValuePkr)} help={`${inventory.deadStock.length} products`} />
                <StatementRow label="Low stock products" value={inventory.lowStockCount} strong />
              </div>
            </Card>
            <Card title="30-day cash forecast" subtitle="Abhi ka cash + aane wala PostEx paisa − 30 din mein due supplier bills.">
              <div className="financeStatement">
                <StatementRow label="Available cash" value={money(cash.availableCashPkr)} />
                <StatementRow label="PostEx receivable" value={money(postex.receivablePkr)} sign="+" />
                <StatementRow label="Supplier bills due" value={money(suppliers.dueIn30DaysPkr)} sign="-" />
                <StatementRow label="Expected closing cash" value={money(cash.expectedClosingCashPkr)} strong />
              </div>
            </Card>
          </section>

          {/* Orders Pipeline Breakdown */}
          <Card
            title="Orders kis status par hain"
            subtitle="Sale tab ginti hai jab order 'Delivered' ho jaye. Agar sales kam lag rahi hain, wajah yahan dikhegi."
          >
            <Table head={["Status", "Orders"]} empty="Koi order nahi.">
              {sales.statusBreakdown.map((row) => (
                <tr key={row.status} className={row.status === "Delivered" ? "bg-[#f0fdf4]" : ""}>
                  <td>
                    <b>{row.status}</b>
                    {row.status === "Delivered" ? <small className="block text-xs text-[#166534] font-semibold">Yehi delivered revenue mein ginte hain</small> : null}
                  </td>
                  <td><b>{row.count}</b></td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* =========================================================================
          TAB 2: CASH & ACCOUNTS
          ========================================================================= */}
      {tab === "cash" && (
        <>
          <div className="shopifySectionCard" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "750", color: "#122a1e" }}>Active Operating Accounts</h3>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#667a6e" }}>Total liquid funds: <b>{money(cash.availableCashPkr)}</b></p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="shopifyFinanceActionBtn expense"
                  onClick={() => { setModalDefaultAccount(""); setActiveModal("expense"); }}
                >
                  <Plus size={14} /> Add Expense
                </button>
                <button
                  type="button"
                  className="shopifyFinanceActionBtn transfer"
                  onClick={() => { setModalDefaultAccount(""); setActiveModal("transfer"); }}
                >
                  <ArrowLeftRight size={14} /> Transfer
                </button>
              </div>
            </div>
            <div className="shopifyAccountsGrid">
              {sortFinanceAccounts(accounts).map((acc) => (
                <div key={acc.id} className="shopifyAccountCard">
                  <div className="shopifyAccountCardHead">
                    <div>
                      <b>{acc.name}</b>
                      <div style={{ fontSize: "11px", color: "#667a6e" }}>{acc.holder || (acc.kind === "cash" ? "Cash" : "Bank")}</div>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "4px", background: "#f0fdf4", color: "#166534" }}>
                      {acc.movementCount} entries
                    </span>
                  </div>
                  <div className="shopifyAccountBalance">
                    {money(acc.balancePkr)}
                  </div>
                  <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f1f5f2", paddingTop: "10px" }}>
                    <button
                      type="button"
                      className="shopifyAccountQuickBtn"
                      onClick={() => { setModalDefaultAccount(acc.id); setActiveModal("expense"); }}
                    >
                      <Plus size={12} /> Expense
                    </button>
                    <button
                      type="button"
                      className="shopifyAccountQuickBtn"
                      onClick={() => { setModalDefaultAccount(acc.id); setActiveModal("income"); }}
                    >
                      <Plus size={12} /> Income
                    </button>
                    <button
                      type="button"
                      className="shopifyAccountQuickBtn"
                      onClick={() => { setModalDefaultAccount(acc.id); setActiveModal("transfer"); }}
                    >
                      <ArrowLeftRight size={12} /> Transfer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card
            title="Cash ledger"
            subtitle={`${report.transactions.length} movements is period mein. Voided entries ka cash par koi asar nahi hota.`}
            right={
              <button
                type="button"
                className="shopifySecondaryButton"
                style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => downloadCsv("transactions", report.transactions, report)}
              >
                <Download size={13} /> Export Ledger CSV
              </button>
            }
          >
            <Table head={["Date", "Type", "Detail", "Account", "Amount", "Action"]} empty="Is period mein koi cash movement nahi.">
              {report.transactions.map((entry) => {
                const account = accounts.find((row) => row.id === entry.account_id);
                return (
                  <tr key={entry.id} className={entry.voided ? "opacity-40 line-through bg-gray-50" : ""}>
                    <td>{formatDate(entry.occurred_on)}</td>
                    <td>
                      <span className="shopifyStatusBadge" style={{ textTransform: "capitalize" }}>
                        {entry.entry_type.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <b>{entry.title}</b>
                        {entry.counterparty ? <small style={{ display: "block", fontSize: "11px", color: "#667a6e" }}>{entry.counterparty}</small> : null}
                      </div>
                    </td>
                    <td>{account?.name || <span className="expenseAmount">Unassigned</span>}</td>
                    <td className={entry.cash_direction === "in" ? "incomeAmount font-bold" : "expenseAmount font-bold"}>
                      {entry.cash_direction === "in" ? "+" : "-"} {money(entry.amount_pkr)}
                    </td>
                    <td>
                      {entry.voided ? (
                        <small className="text-xs text-gray-500 font-semibold">Voided</small>
                      ) : entry.production_batch_id ? (
                        <small className="text-xs text-gray-500">Batch entry</small>
                      ) : (
                        <VoidButton
                          entry={entry}
                          busy={busy}
                          onVoid={(confirmation) => post({ action: "void_transaction", transactionId: entry.id, confirmation }, "Entry void ho gayi.")}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          </Card>

          {cash.unassignedBalancePkr !== 0 && (
            <UnassignedFixer
              accounts={accounts}
              transactions={report.transactions.filter((entry) => !entry.account_id && !entry.voided)}
              busy={busy}
              onAssign={(transactionIds, accountId) => post({ action: "assign_account", transactionIds, accountId }, "Account assign ho gaya.")}
            />
          )}
        </>
      )}

      {/* =========================================================================
          TAB 3: PROFIT & LOSS
          ========================================================================= */}
      {tab === "pnl" && (
        <>
          <section className="financeGrid financeGridWide">
            <Card
              title="Profit & Loss Statement"
              subtitle="Sirf delivered orders. Product cost delivery ke waqt lock hoti hai."
              right={<span className="shopifyStatusBadge active" style={{ fontSize: "14px", padding: "4px 10px" }}>{percent(pnl.marginPercent)} Net Margin</span>}
            >
              <div className="financeStatement">
                <StatementRow label="Sales revenue (delivered)" value={money(pnl.revenuePkr)} sign="+" help={`${sales.deliveredOrders} delivered orders`} />
                <StatementRow label="Less: cost of goods sold (COGS)" value={money(pnl.cogsPkr)} sign="-" help={pnl.estimatedCogsOrderCount ? `${pnl.estimatedCogsOrderCount} orders estimated` : "All costs locked"} />
                <StatementRow label="Gross profit" value={money(pnl.grossProfitPkr)} strong />
                <StatementRow label="Less: PostEx GST" value={money(pnl.gstPkr)} sign="-" />
                <StatementRow label="Less: PostEx 4% deduction" value={money(pnl.taxPkr)} sign="-" />
                <StatementRow label="Less: courier delivery charges" value={money(pnl.courierCostPkr)} sign="-" />
                <StatementRow label="Less: return delivery loss" value={money(pnl.returnLossPkr)} sign="-" help="Actual PostEx return charges" />
                <StatementRow label="Less: operating expenses" value={money(pnl.operatingExpensesPkr)} sign="-" />
                <StatementRow label="Net profit" value={money(pnl.netProfitPkr)} strong sign={pnl.netProfitPkr >= 0 ? "+" : "-"} />
              </div>
            </Card>

            <Card title="Break-even Analysis" subtitle="Har delivered order kitna contribute karta hai aur fixed costs cover karne ke orders.">
              <div className="financeStatement">
                <StatementRow label="Contribution per order" value={money(pnl.contributionPerOrderPkr)} help="Sale − cost − courier − GST/tax" />
                <StatementRow label="Monthly fixed costs" value={money(settings.monthlyFixedCostsPkr)} help="Rent, salaries, utilities" />
                <StatementRow label="Break-even orders needed" value={pnl.breakEvenOrders || "—"} strong />
              </div>
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #edf2ee" }}>
                <FixedCostForm value={settings.monthlyFixedCostsPkr} busy={busy} onSave={(monthly) => post({ action: "save_settings", settings: { monthly_fixed_costs_pkr: monthly } }, "Fixed costs save ho gaye.")} />
              </div>
            </Card>
          </section>

          <Card
            title="Order-wise profit"
            subtitle="Har delivered order par asal net profit. Loss wale orders light red hain."
            right={
              <button
                type="button"
                className="shopifySecondaryButton"
                style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => downloadCsv("orders", orders, report)}
              >
                <Download size={13} /> Export Order Profit CSV
              </button>
            }
          >
            <Table head={["Order", "Customer", "Delivered", "Sale", "Cost", "Courier+Tax", "Net Profit"]} empty="Is period mein koi delivered order nahi.">
              {orders.slice(0, 60).map((row) => (
                <tr key={row.id} className={row.netProfitPkr < 0 ? "bg-[#fef2f2]" : ""}>
                  <td><b>{row.orderNumber ? `#${row.orderNumber}` : String(row.id).slice(0, 8)}</b></td>
                  <td><div style={{ display: "flex", flexDirection: "column" }}><b>{row.customer}</b>{row.city ? <small style={{ display: "block", fontSize: "11px", color: "#667a6e" }}>{row.city}</small> : null}</div></td>
                  <td>{formatDate(row.deliveredAt)}</td>
                  <td>{money(row.revenuePkr)}</td>
                  <td>{money(row.costPkr)}{row.costEstimated ? <small className="block text-xs text-amber-700">estimate</small> : null}</td>
                  <td>{money(row.courierCostPkr + row.gstPkr + row.taxPkr)}</td>
                  <td className={row.netProfitPkr < 0 ? "expenseAmount font-bold" : "incomeAmount font-bold"}>
                    {money(row.netProfitPkr)}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* =========================================================================
          TAB 4: COURIER & ADVANCES (Payments)
          ========================================================================= */}
      {tab === "payments" && (
        <>
          <div className="shopifyFinanceKpiGrid">
            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon postex"><Landmark size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">PostEx Expected (All time)</span>
                <span className="shopifyFinanceKpiValue">{money(postex.expectedNetAllTimePkr)}</span>
                <span className="shopifyFinanceKpiHelp">Delivered orders ka net settlement</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon cash"><WalletCards size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">Bank Mein Confirm Hua</span>
                <span className="shopifyFinanceKpiValue">{money(postex.receivedPkr)}</span>
                <span className="shopifyFinanceKpiHelp">Aap ne khud confirm kiya</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon payable"><AlertTriangle size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">Abhi Milna Baaki</span>
                <span className={`shopifyFinanceKpiValue ${postex.receivablePkr ? "text-amber-700" : ""}`}>{money(postex.receivablePkr)}</span>
                <span className="shopifyFinanceKpiHelp">PostEx se bank aane wala</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon advance"><CircleDollarSign size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">Advance Verified</span>
                <span className="shopifyFinanceKpiValue">{money(advances.verifiedPkr)}</span>
                <span className="shopifyFinanceKpiHelp">{money(advances.pendingPkr)} pending verification</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon units"><WalletCards size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">In Amina NayaPay</span>
                <span className="shopifyFinanceKpiValue">{money(advances.cashPostedPkr || 0)}</span>
                <span className="shopifyFinanceKpiHelp">{advances.notInCashPkr ? `${money(advances.notInCashPkr)} posting pending` : "All advances posted"}</span>
              </div>
            </div>
          </div>

          {/* 1-Click Backfill Banner */}
          <div className="shopifySectionCard" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: advances.notInCashCount || pnl.estimatedCogsOrderCount ? "#fffbeb" : "#f0fdf4", borderColor: advances.notInCashCount || pnl.estimatedCogsOrderCount ? "#fde68a" : "#bbf7d0" }}>
            <div style={{ maxWidth: "750px" }}>
              <b style={{ fontSize: "14px", color: advances.notInCashCount || pnl.estimatedCogsOrderCount ? "#92400e" : "#166534" }}>
                Financial Data Synchronization &amp; Backfill
              </b>
              <span style={{ display: "block", fontSize: "12.5px", color: advances.notInCashCount || pnl.estimatedCogsOrderCount ? "#78350f" : "#15803d", marginTop: "3px" }}>
                {pnl.estimatedCogsOrderCount || advances.notInCashCount ? (
                  <>
                    {pnl.estimatedCogsOrderCount ? `${pnl.estimatedCogsOrderCount} delivered orders ki product cost lock nahi hui. ` : ""}
                    {advances.notInCashCount ? `${advances.notInCashCount} verified advance (${money(advances.notInCashPkr || 0)}) abhi Amina NayaPay mein post nahi hua. ` : ""}
                    Backfill chalane se yeh ek baar mein verify ho jayega.
                  </>
                ) : (
                  <>Sab kuch up to date hai: {sales.deliveredOrders} delivered orders ki cost locked hai aur har verified advance Amina NayaPay mein ja chuka hai.</>
                )}
              </span>
            </div>
            <button
              type="button"
              className="shopifyPrimaryButton"
              style={{ fontSize: "13px" }}
              onClick={() => post({ action: "backfill" }, (result) => `Scan: ${result.cogs?.delivered ?? 0} delivered orders, ${result.advances?.scanned ?? 0} advance orders. Locked: ${result.cogs?.snapshotted || 0} costs. Cash posted: ${result.advances?.recorded || 0} advances.`)}
              disabled={busy}
            >
              {busy ? "Syncing..." : "Run Backfill Sync"}
            </button>
          </div>

          <Card title="Customer advance receipts" subtitle="Verified advance NayaPay account mein cash ban jata hai. Unverified sirf pending dikhta hai.">
            <Table head={["Customer", "Order", "City", "Advance", "COD Baqi", "Status"]} empty="Is period mein koi advance nahi.">
              {advances.rows.map((row) => (
                <tr key={row.id}>
                  <td><div style={{ display: "flex", flexDirection: "column" }}><b>{row.customer}</b>{row.phone ? <small style={{ display: "block", fontSize: "11px", color: "#667a6e" }}>{row.phone}</small> : null}</div></td>
                  <td>{row.orderNumber ? `#${row.orderNumber}` : String(row.id).slice(0, 8)}</td>
                  <td>{row.city || "—"}</td>
                  <td className="incomeAmount font-bold">+ {money(row.advancePkr)}</td>
                  <td>{row.codRemainingPkr === 0 ? "Rs. 0 (Prepaid)" : money(row.codRemainingPkr)}</td>
                  <td>
                    <span className={`shopifyStatusBadge ${row.verified && row.cashPosted ? "active" : "pending"}`}>
                      {row.verified ? (row.cashPosted ? "Verified · Amina NayaPay" : "Verified · Posting pending") : row.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>

          {postex.stuckReceivables.length > 0 && (
            <Card title="PostEx ke paas phansa paisa" subtitle={`${settings.receivableStuckAlertDays}+ din se deliver ho chuke orders jin ka settlement abhi nahi hua.`}>
              <Table head={["Order", "Customer", "Delivered", "Amount", "Waiting Days"]} empty="Sab clear hai.">
                {postex.stuckReceivables.slice(0, 30).map((row) => (
                  <tr key={row.id}>
                    <td><b>{row.orderNumber ? `#${row.orderNumber}` : String(row.id).slice(0, 8)}</b></td>
                    <td>{row.customer}</td>
                    <td>{formatDate(row.deliveredAt)}</td>
                    <td><b>{money(row.amountPkr)}</b></td>
                    <td className="expenseAmount font-bold">{row.daysWaiting} days</td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}

          {/* Supplier Payables Grid */}
          <section className="financeGrid financeGridWide">
            <Card title="Supplier payables" subtitle="Paid amount har payment se khud update hoti hai." right={<b style={{ fontSize: "14px", color: "#9a3412" }}>{money(suppliers.payablePkr)} Total Due</b>}>
              <Table head={["Supplier", "Ref", "Due Date", "Total", "Paid", "Remaining", "Action"]} empty="Koi supplier bill nahi.">
                {suppliers.bills.map((bill) => (
                  <tr key={bill.id}>
                    <td><b>{bill.supplier}</b></td>
                    <td>{bill.reference || "—"}</td>
                    <td className={bill.due_date && bill.due_date < new Date().toISOString().slice(0, 10) && Number(bill.remaining_pkr) > 0 ? "expenseAmount font-bold" : ""}>
                      {bill.due_date || "—"}
                    </td>
                    <td>{money(bill.total_pkr)}</td>
                    <td>{money(bill.paid_pkr)}</td>
                    <td><b>{money(bill.remaining_pkr)}</b></td>
                    <td>
                      {Number(bill.remaining_pkr) > 0 && (
                        <PayBillButton
                          bill={bill}
                          accounts={accounts}
                          busy={busy}
                          onPay={(amountPkr, accountId) => post({ action: "pay_supplier_bill", billId: bill.id, amountPkr, accountId }, "Payment record ho gayi.")}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            </Card>

            <SupplierBillForm accounts={accounts} busy={busy} onSubmit={(bill) => post({ action: "add_supplier_bill", bill }, "Supplier bill save ho gaya.")} />
          </section>
        </>
      )}

      {/* =========================================================================
          TAB 5: REPORTS & ANALYTICS
          ========================================================================= */}
      {tab === "reports" && (
        <>
          <section className="financeGrid financeGridWide">
            <Card title="Period summary" subtitle={report.period.label}>
              <div className="financeStatement">
                <StatementRow label="Delivered sales revenue" value={money(pnl.revenuePkr)} />
                <StatementRow label="Product cost (COGS)" value={money(pnl.cogsPkr)} sign="-" />
                <StatementRow label="PostEx charges (GST + 4% + courier)" value={money(pnl.gstPkr + pnl.taxPkr + pnl.courierCostPkr)} sign="-" />
                <StatementRow label="Operating expenses" value={money(pnl.operatingExpensesPkr)} sign="-" />
                <StatementRow label="Net profit" value={money(pnl.netProfitPkr)} strong sign={pnl.netProfitPkr >= 0 ? "+" : "-"} />
              </div>
            </Card>

            <Card title="Tax / GST summary" subtitle="PostEx ne jo GST aur 4% deduction kaata — tax filing ke liye.">
              <div className="financeStatement">
                <StatementRow label="GST deducted by PostEx" value={money(pnl.gstPkr)} />
                <StatementRow label="4% Income Tax deduction" value={money(pnl.taxPkr)} />
                <StatementRow label="Total courier taxes deducted" value={money(pnl.gstPkr + pnl.taxPkr)} strong />
              </div>
            </Card>
          </section>

          <section className="financeGrid financeGridWide">
            <Card title="Marketing ROI" subtitle="Sirf woh sales jo campaign se attribute ki hain.">
              <div className="financeStatement">
                <StatementRow label="Meta Ads / Campaign spend" value={money(marketing.spendPkr)} />
                <StatementRow label="Attributed sales" value={money(marketing.attributedSalesPkr)} />
                <StatementRow label="Return on Ad Spend (ROAS)" value={marketing.roas ? `${marketing.roas}x` : "—"} help="Rs. 1 spend par kitni sales" />
                <StatementRow label="Customer Acquisition Cost (CAC)" value={marketing.cacPkr ? money(marketing.cacPkr) : "—"} strong />
              </div>
            </Card>

            <Card title="Profit allocation plan" subtitle="Sirf target plan hai — cash move nahi hota.">
              <div className="financeStatement">
                <StatementRow label="Allocatable net profit" value={money(pnl.allocation.allocatablePkr)} />
                <StatementRow label={`Marketing budget (${percent(settings.marketingPercent)})`} value={money(pnl.allocation.marketingPkr)} />
                <StatementRow label={`Owner drawing (${percent(settings.ownerPercent)})`} value={money(pnl.allocation.ownerPkr)} />
                <StatementRow label={`Stock reserve (${percent(settings.stockPercent)})`} value={money(pnl.allocation.stockPkr)} strong />
              </div>
            </Card>
          </section>

          <Card title="Last 12 months performance trend" subtitle="Har mahine ka revenue aur net profit — growth saaf dekhein.">
            {trend.length ? <TrendChart rows={trend} /> : <p className="trackingNumber" style={{ padding: "20px" }}>Loading 12-month trend...</p>}
          </Card>

          <Card title="Expense breakdown by category" subtitle="Is period mein paisa kin cheezon par kharch hua.">
            <Table head={["Category", "Amount"]} empty="Koi expense nahi.">
              {cash.expenseByCategory.map((row) => (
                <tr key={row.category}>
                  <td><b>{row.category}</b></td>
                  <td className="expenseAmount font-bold">{money(row.amountPkr)}</td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card title="Downloads & Exports" subtitle="Download clean CSVs for Excel or print financial statements.">
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", padding: "10px 0" }}>
              <button type="button" className="shopifySecondaryButton" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} onClick={() => downloadCsv("orders", orders, report)}>
                <FileSpreadsheet size={15} /> Order Profit CSV
              </button>
              <button type="button" className="shopifySecondaryButton" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} onClick={() => downloadCsv("products", products, report)}>
                <FileSpreadsheet size={15} /> Product Profit CSV
              </button>
              <button type="button" className="shopifySecondaryButton" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} onClick={() => downloadCsv("transactions", report.transactions, report)}>
                <FileSpreadsheet size={15} /> Cash Ledger CSV
              </button>
              <button type="button" className="shopifySecondaryButton" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} onClick={() => window.print()}>
                <ReceiptText size={15} /> Print Monthly Statement
              </button>
            </div>
          </Card>
        </>
      )}

      {/* =========================================================================
          INTERACTIVE QUICK ACTION MODALS
          ========================================================================= */}
      {activeModal === "expense" && (
        <ExpenseModal
          accounts={accounts}
          defaultAccountId={modalDefaultAccount}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={(entry) => post({ action: "add_transaction", entry }, "Expense recorded successfully!")}
        />
      )}

      {activeModal === "income" && (
        <IncomeModal
          accounts={accounts}
          defaultAccountId={modalDefaultAccount}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={(entry) => post({ action: "add_transaction", entry }, "Income recorded successfully!")}
        />
      )}

      {activeModal === "transfer" && (
        <TransferModal
          accounts={accounts}
          defaultFromAccountId={modalDefaultAccount}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={(body) => post({ action: "transfer", ...body }, "Funds transferred successfully!")}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Action Modals
// ---------------------------------------------------------------------------

function ExpenseModal({ accounts, defaultAccountId, busy, onClose, onSubmit }) {
  const [category, setCategory] = useState("Fabric / stock");
  const [otherCategory, setOtherCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(defaultAccountId || accounts[0]?.id || "");
  const [title, setTitle] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="shopifyFinanceModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shopifyFinanceModalCard">
        <div className="shopifyFinanceModalHead">
          <h3>
            <span style={{ fontSize: "18px" }}>💸</span> Record Business Expense
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#667a6e" }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const numAmount = Number(amount || 0);
            if (!(numAmount > 0) || !accountId || !title) return;
            const finalCategory = category === "Other" && otherCategory ? otherCategory : category;
            await onSubmit({
              entryType: "business_expense",
              accountId,
              category: finalCategory,
              title,
              counterparty,
              amountPkr: numAmount,
              occurredOn: date,
              reference,
              note,
            });
          }}
        >
          <div className="shopifyFinanceModalBody">
            <div className="shopifyFinanceModalRow">
              <label>Category
                <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                  <option>Fabric / stock</option>
                  <option>Tailoring / stitching</option>
                  <option>Lace / embellishment</option>
                  <option>Packaging</option>
                  <option>Marketing / Meta Ads</option>
                  <option>Courier / delivery</option>
                  <option>Rent &amp; utilities</option>
                  <option>Salaries &amp; labour</option>
                  <option>Operations</option>
                  <option>Other</option>
                </select>
              </label>

              <label>Amount (PKR)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="e.g. 2500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
            </div>

            {category === "Other" && (
              <label>Custom Category Name
                <input
                  type="text"
                  required
                  placeholder="e.g. Photography, model fee, studio repair"
                  value={otherCategory}
                  onChange={(e) => setOtherCategory(e.target.value)}
                />
              </label>
            )}

            <label>Paid From Account
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                <option value="">Select Account</option>
                <AccountOptions accounts={accounts} />
              </select>
            </label>

            <label>What was it for? (Description)
              <input
                type="text"
                required
                placeholder="e.g. Farshi shalwar stitching 15 suits, Meta Ad receipt #482"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <div className="shopifyFinanceModalRow">
              <label>Paid To (Tailor / Vendor)
                <input
                  type="text"
                  placeholder="e.g. Master Amina, Cloth House"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                />
              </label>

              <label>Payment Date
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>

            <div className="shopifyFinanceModalRow">
              <label>Receipt / Reference
                <input
                  type="text"
                  placeholder="Invoice #, Bank ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>

              <label>Extra Note (Optional)
                <input
                  type="text"
                  placeholder="Any extra detail"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="shopifyFinanceModalFoot">
            <button type="button" className="shopifyModalCancelBtn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="shopifyModalSubmitBtn" disabled={busy || !(Number(amount) > 0) || !accountId || !title}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {busy ? "Recording..." : "Record Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IncomeModal({ accounts, defaultAccountId, busy, onClose, onSubmit }) {
  const [entryType, setEntryType] = useState("other_income");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(defaultAccountId || accounts[0]?.id || "");
  const [title, setTitle] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="shopifyFinanceModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shopifyFinanceModalCard">
        <div className="shopifyFinanceModalHead">
          <h3>
            <span style={{ fontSize: "18px" }}>💰</span> Record Business Income
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#667a6e" }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const numAmount = Number(amount || 0);
            if (!(numAmount > 0) || !accountId || !title) return;
            await onSubmit({
              entryType,
              accountId,
              category: entryType === "owner_investment" ? "Owner capital" : "Business income",
              title,
              counterparty,
              amountPkr: numAmount,
              occurredOn: date,
              reference,
              note,
            });
          }}
        >
          <div className="shopifyFinanceModalBody">
            <div className="shopifyFinanceModalRow">
              <label>Income Type
                <select value={entryType} onChange={(e) => setEntryType(e.target.value)} required>
                  <option value="other_income">Other Business Income</option>
                  <option value="owner_investment">Owner Funds Added (Capital)</option>
                  <option value="postex_bank_receipt">PostEx Bank Payout Receipt</option>
                </select>
              </label>

              <label>Amount (PKR)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="e.g. 10000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
            </div>

            <label>Received In Account
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                <option value="">Select Account</option>
                <AccountOptions accounts={accounts} />
              </select>
            </label>

            <label>Description (Title)
              <input
                type="text"
                required
                placeholder="e.g. Studio exhibition cash sale, Owner working capital"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <div className="shopifyFinanceModalRow">
              <label>Received From (Source)
                <input
                  type="text"
                  placeholder="e.g. Walk-in customer, PostEx COD payout"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                />
              </label>

              <label>Date Received
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>

            <label>Reference (Optional)
              <input
                type="text"
                placeholder="Deposit slip, Bank transfer id"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
          </div>

          <div className="shopifyFinanceModalFoot">
            <button type="button" className="shopifyModalCancelBtn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="shopifyModalSubmitBtn" disabled={busy || !(Number(amount) > 0) || !accountId || !title}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {busy ? "Recording..." : "Record Income"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransferModal({ accounts, defaultFromAccountId, busy, onClose, onSubmit }) {
  const [fromAccountId, setFromAccountId] = useState(defaultFromAccountId || accounts[0]?.id || "");
  const [toAccountId, setToAccountId] = useState(accounts.find((a) => a.id !== defaultFromAccountId)?.id || "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("Account transfer");

  return (
    <div className="shopifyFinanceModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shopifyFinanceModalCard">
        <div className="shopifyFinanceModalHead">
          <h3>
            <ArrowLeftRight size={18} className="text-[#1e40af]" /> Transfer Funds Between Accounts
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#667a6e" }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const numAmount = Number(amount || 0);
            if (!(numAmount > 0) || !fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
            await onSubmit({
              fromAccountId,
              toAccountId,
              amountPkr: numAmount,
              occurredOn: date,
              reference,
              title: title || "Account transfer",
            });
          }}
        >
          <div className="shopifyFinanceModalBody">
            <p style={{ margin: 0, fontSize: "12.5px", color: "#55675c", lineHeight: 1.4 }}>
              PostEx wallet se Bank Alfalah, ya Bank se Cash in Hand — paisa sirf account badalta hai, total available cash waisa hi rehta hai.
            </p>

            <div className="shopifyFinanceModalRow">
              <label>Transfer From
                <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} required>
                  <option value="">Select Account</option>
                  <AccountOptions accounts={accounts} />
                </select>
              </label>

              <label>Transfer To
                <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
                  <option value="">Select Account</option>
                  <AccountOptions accounts={accounts} />
                </select>
              </label>
            </div>

            {fromAccountId && toAccountId && fromAccountId === toAccountId && (
              <div style={{ color: "#b91c1c", fontSize: "12px", fontWeight: "600" }}>
                Transfer From aur Transfer To dono alag accounts hone chahiyen.
              </div>
            )}

            <div className="shopifyFinanceModalRow">
              <label>Transfer Amount (PKR)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>

              <label>Transfer Date
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>

            <div className="shopifyFinanceModalRow">
              <label>Reference
                <input
                  type="text"
                  placeholder="Bank transaction ID / Cheque #"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>

              <label>Transfer Note
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="shopifyFinanceModalFoot">
            <button type="button" className="shopifyModalCancelBtn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              className="shopifyModalSubmitBtn"
              disabled={busy || !(Number(amount) > 0) || !fromAccountId || !toAccountId || fromAccountId === toAccountId}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowLeftRight size={15} />}
              {busy ? "Transferring..." : "Complete Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers & Subcomponents
// ---------------------------------------------------------------------------

function TrendChart({ rows }) {
  const max = Math.max(1, ...rows.map((row) => Math.max(row.revenuePkr, Math.abs(row.netProfitPkr))));
  return (
    <div className="financeTrend">
      {rows.map((row) => (
        <div key={row.month} className="financeTrendMonth">
          <div className="financeTrendBars">
            <span className="financeTrendRevenue" style={{ height: `${(row.revenuePkr / max) * 100}%` }} title={`Revenue ${money(row.revenuePkr)}`} />
            <span
              className={row.netProfitPkr < 0 ? "financeTrendLoss" : "financeTrendProfit"}
              style={{ height: `${(Math.abs(row.netProfitPkr) / max) * 100}%` }}
              title={`Profit ${money(row.netProfitPkr)}`}
            />
          </div>
          <small>{row.month.slice(5)}/{row.month.slice(2, 4)}</small>
        </div>
      ))}
      <div className="financeTrendLegend">
        <span><i className="financeTrendRevenue" /> Revenue</span>
        <span><i className="financeTrendProfit" /> Profit</span>
      </div>
    </div>
  );
}

function VoidButton({ entry, busy, onVoid }) {
  return (
    <button
      type="button"
      className="removeProductButton"
      disabled={busy}
      aria-busy={busy}
      onClick={() => {
        const expectedConfirmation = `VOID ${entry.id}`;
        const confirmation = window.prompt(
          `Ye entry void karne ke liye OK press karein.\nConfirmation: ${expectedConfirmation}`,
          expectedConfirmation
        );
        if (confirmation) onVoid(confirmation.trim());
      }}
    >
      {busy ? "Voiding..." : "Void"}
    </button>
  );
}

function PayBillButton({ bill, accounts, busy, onPay }) {
  const remaining = Number(bill.remaining_pkr || 0);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(remaining));
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    if (!open) {
      setAmount(String(remaining));
      setAccountId("");
    }
  }, [open, remaining]);

  if (open) {
    return (
      <form
        className="financeInlinePay"
        onSubmit={async (event) => {
          event.preventDefault();
          const parsedAmount = Number(amount || 0);
          if (!(parsedAmount > 0) || parsedAmount > remaining || !accountId) return;
          const saved = await onPay(parsedAmount, accountId);
          if (saved) setOpen(false);
        }}
      >
        <input aria-label="Supplier payment amount" type="number" min="0.01" max={remaining} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <select aria-label="Supplier payment account" value={accountId} onChange={(event) => setAccountId(event.target.value)} required>
          <option value="">Account select karein</option>
          <AccountOptions accounts={accounts} />
        </select>
        <div style={{ display: "flex", gap: "6px" }}>
          <button type="submit" disabled={busy || !accountId || !(Number(amount) > 0) || Number(amount) > remaining} aria-busy={busy}>{busy ? "..." : "Save"}</button>
          <button type="button" className="editProductButton" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      className="shopifyPrimaryButton"
      style={{ padding: "4px 10px", fontSize: "11.5px" }}
      disabled={busy}
      aria-busy={busy}
      onClick={() => setOpen(true)}
    >
      {busy ? "..." : "Pay Bill"}
    </button>
  );
}

function SupplierBillForm({ accounts, busy, onSubmit }) {
  const [paidAmount, setPaidAmount] = useState("0");

  return (
    <form
      className="shopifySectionCard"
      style={{ padding: "18px 20px" }}
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const form = event.currentTarget;
        const saved = await onSubmit({
          supplier: data.get("supplier"),
          reference: data.get("reference"),
          totalPkr: Number(data.get("total") || 0),
          paid: Number(data.get("paid") || 0),
          billDate: data.get("date"),
          dueDate: data.get("dueDate"),
          note: data.get("note"),
          accountId: data.get("accountId") || null,
        });
        if (saved) {
          form.reset();
          setPaidAmount("0");
        }
      }}
    >
      <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "750", color: "#122a1e" }}>+ Add Supplier Bill / Payable</h3>
      <p style={{ margin: "0 0 14px", fontSize: "12px", color: "#667a6e" }}>Fabric, stitching ya raw material ka bill add karein. Jo payment pehle de chuke hain woh auto cash ledger se deduct hogi.</p>
      
      <div className="shopifyFinanceModalRow">
        <label>Supplier / Vendor Name
          <input name="supplier" required placeholder="e.g. Master Amina, Farhan Fabric" />
        </label>
        <label>Bill Reference / WhatsApp Ref
          <input name="reference" placeholder="e.g. Inv #849" />
        </label>
      </div>

      <div className="shopifyFinanceModalRow">
        <label>Total Bill (PKR)
          <input name="total" type="number" min="1" required placeholder="0" />
        </label>
        <label>Already Paid (PKR)
          <input name="paid" type="number" min="0" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} />
        </label>
      </div>

      <div className="shopifyFinanceModalRow">
        <label>Bill Date
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label>Due Date
          <input name="dueDate" type="date" />
        </label>
      </div>

      <div className="shopifyFinanceModalRow">
        <AccountSelect accounts={accounts} name="accountId" required={Number(paidAmount) > 0} label="Paid From Account (If already paid)" />
        <label>Bill Note
          <input name="note" placeholder="Fabric details, quantity etc." />
        </label>
      </div>

      <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
        <button
          type="submit"
          className="shopifyPrimaryButton"
          disabled={busy}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {busy ? "Saving Payable..." : "Save Supplier Bill"}
        </button>
      </div>
    </form>
  );
}

function FixedCostForm({ value, busy, onSave }) {
  const [amount, setAmount] = useState(value);
  useEffect(() => { setAmount(value); }, [value]);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
      <label style={{ flex: 1, margin: 0, fontSize: "12.5px", fontWeight: "650", color: "#122a1e" }}>
        Monthly Fixed Operating Costs (Rent, Salaries, Electricity, Internet)
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          style={{ width: "100%", marginTop: "4px", padding: "8px 12px", border: "1.5px solid #d4ded6", borderRadius: "8px", fontSize: "13px" }}
        />
      </label>
      <button
        type="button"
        className="shopifyPrimaryButton"
        disabled={busy}
        onClick={() => onSave(Number(amount || 0))}
        style={{ padding: "8px 16px", height: "38px" }}
      >
        {busy ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function UnassignedFixer({ accounts, transactions, busy, onAssign }) {
  const [selected, setSelected] = useState([]);
  const [accountId, setAccountId] = useState("");
  return (
    <Card
      title="Purani entries ka account set karein"
      subtitle="Ye entries purane system se aayi hain jahan account track nahi hota tha. Total cash sahi hai — sirf account-wise breakdown adhoora hai."
    >
      <div className="financeAssignBar" style={{ display: "flex", gap: "10px", alignItems: "flex-end", marginBottom: "14px", flexWrap: "wrap" }}>
        <div style={{ minWidth: "220px" }}>
          <AccountSelect accounts={accounts} label="Assign to account" value={accountId} onChange={(event) => setAccountId(event.target.value)} />
        </div>
        <button
          type="button"
          className="shopifyPrimaryButton"
          disabled={busy || !accountId || !selected.length}
          aria-busy={busy}
          onClick={() => onAssign(selected, accountId).then?.(() => setSelected([]))}
        >
          {busy ? "Assigning..." : selected.length ? `${selected.length} entries assign karein` : "Entries select karein"}
        </button>
        <button type="button" className="shopifySecondaryButton" onClick={() => setSelected(transactions.map((entry) => entry.id))}>
          Select All
        </button>
      </div>
      <Table head={["", "Date", "Detail", "Amount"]} empty="Sab entries assign ho chuki hain.">
        {transactions.map((entry) => (
          <tr key={entry.id}>
            <td style={{ width: "40px" }}>
              <input
                type="checkbox"
                checked={selected.includes(entry.id)}
                onChange={(event) => setSelected((current) => event.target.checked ? [...current, entry.id] : current.filter((id) => id !== entry.id))}
              />
            </td>
            <td>{formatDate(entry.occurred_on)}</td>
            <td><b>{entry.title}</b></td>
            <td className={entry.cash_direction === "in" ? "incomeAmount font-bold" : "expenseAmount font-bold"}>
              {entry.cash_direction === "in" ? "+" : "-"} {money(entry.amount_pkr)}
            </td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function downloadCsv(kind, rows, report) {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  let header = [];
  let body = [];
  if (kind === "orders") {
    header = ["Order", "Customer", "City", "Delivered", "Units", "Sale", "Product cost", "Courier", "GST", "Tax", "Net profit", "Margin %"];
    body = rows.map((row) => [row.orderNumber || row.id, row.customer, row.city, row.deliveredAt, row.units, row.revenuePkr, row.costPkr, row.courierCostPkr, row.gstPkr, row.taxPkr, row.netProfitPkr, row.marginPercent]);
  } else if (kind === "products") {
    header = ["Product", "SKU", "Category", "Units sold", "Revenue", "Cost", "Profit", "Margin %", "Stock"];
    body = rows.map((row) => [row.name, row.sku, row.category, row.units, row.revenuePkr, row.costPkr, row.profitPkr, row.marginPercent, row.stock]);
  } else {
    const accountNames = new Map((report.accounts || []).map((account) => [String(account.id), account.name]));
    header = ["Date", "Type", "Direction", "Account", "Title", "Counterparty", "Category", "Amount", "Reference", "Voided"];
    body = rows.map((row) => [row.occurred_on, row.entry_type, row.cash_direction, accountNames.get(String(row.account_id)) || "Unassigned", row.title, row.counterparty, row.category, row.amount_pkr, row.reference, row.voided ? "yes" : "no"]);
  }
  const csv = [header, ...body].map((line) => line.map(escape).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = `bustaniya-${kind}-${report.period.from || "all"}-${report.period.to || "time"}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
