"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowLeftRight, CheckCircle2, CircleDollarSign,
  Download, Edit3, FileSpreadsheet, Filter, Landmark, Loader2, Package,
  Plus, ReceiptText, RefreshCw, Search, Settings2, ShoppingBag, SlidersHorizontal,
  Trash2, TrendingUp, WalletCards, X,
} from "lucide-react";
import FinanceOverview from "./finance/FinanceOverview";
import "../app/finance-overview.css";

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
  ["payments", "Courier, Advances & Bills"],
  ["reports", "Reports & Marketing"],
];

const EXPENSE_CATEGORIES = [
  "Fabric / stock",
  "Tailoring / stitching",
  "Lace / embellishment",
  "Packaging",
  "Marketing / Meta Ads",
  "Courier / delivery",
  "Rent & utilities",
  "Salaries & labour",
  "Operations",
  "Other",
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
    <div className={`shopifyStatementRow ${strong ? "strongRow font-bold" : ""}`}>
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
        <thead><tr>{head.map((label, idx) => <th key={label || idx}>{label}</th>)}</tr></thead>
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
  const [postexSyncing, setPostexSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Modals state
  const [activeModal, setActiveModal] = useState(null);
  // "expense" | "income" | "transfer" | "supplier_bill" | "campaign" | "adjust_balance" | "edit_tx" | "void_tx" | null
  const [modalDefaultAccount, setModalDefaultAccount] = useState("");
  const [modalDefaultIncomeType, setModalDefaultIncomeType] = useState("other_income");
  const [modalDefaultExpenseType, setModalDefaultExpenseType] = useState("business_expense");
  const [selectedAccountForBalance, setSelectedAccountForBalance] = useState(null);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState(null);
  const [selectedTxForVoid, setSelectedTxForVoid] = useState(null);

  // Cash Ledger filters
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerAccountFilter, setLedgerAccountFilter] = useState("all");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all");
  const [showVoidedLedger, setShowVoidedLedger] = useState(false);

  // Profit & Loss order filter
  const [orderProfitFilter, setOrderProfitFilter] = useState("all"); // "all" | "loss" | "estimated"
  const [orderProfitSearch, setOrderProfitSearch] = useState("");

  // Advances / Order Payment Scenarios & Supplier Bill filters
  const [advanceFilter, setAdvanceFilter] = useState("advance_all"); // "needs_action" | "advance_all" | "full_advance" | "delivery_advance" | "cod" | "posted" | "all"
  const [advanceSearch, setAdvanceSearch] = useState("");
  const [verifyAccountByOrder, setVerifyAccountByOrder] = useState({});
  const [billFilter, setBillFilter] = useState("open"); // "open" | "overdue" | "paid" | "all"

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

  // Overview shows a 6-month growth chart. Fetch the trend quietly in the
  // background so the main numbers never wait on it.
  const trendRequestedRef = useRef(false);
  const [trendLoading, setTrendLoading] = useState(false);
  useEffect(() => {
    if (tab !== "overview" || !report || trend.length || trendRequestedRef.current) return;
    trendRequestedRef.current = true;
    setTrendLoading(true);
    fetch("/api/admin/finance?period=all&trend=1", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => { if (result?.trend) setTrend(result.trend); })
      .catch(() => {})
      .finally(() => setTrendLoading(false));
  }, [tab, report, trend.length]);

  function goTo(target, options = {}) {
    if (target === "cash") {
      setLedgerAccountFilter(options.account || "all");
      setTab("cash");
    } else if (target === "verify") {
      setAdvanceFilter("needs_action");
      setTab("payments");
    } else if (target === "advances") {
      setAdvanceFilter(options.filter || "all");
      setTab("payments");
    } else if (target === "bills") {
      setBillFilter(options.filter || "open");
      setTab("payments");
    } else if (target === "lossOrders") {
      setOrderProfitFilter("loss");
      setTab("pnl");
    } else if (target === "pnl") {
      setOrderProfitFilter("all");
      setTab("pnl");
    } else {
      setTab(target);
    }
    if (typeof document !== "undefined") {
      document.querySelector(".shopifyFinanceWorkspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function openModal(modal, { account = "", incomeType, expenseType, balanceAccount } = {}) {
    setModalDefaultAccount(account);
    if (incomeType) setModalDefaultIncomeType(incomeType);
    if (expenseType) setModalDefaultExpenseType(expenseType);
    if (balanceAccount) setSelectedAccountForBalance(balanceAccount);
    setActiveModal(modal);
  }

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
      await load({ withTrend: tab === "reports" });
      setActiveModal(null);
      setSelectedTxForEdit(null);
      setSelectedTxForVoid(null);
      setSelectedAccountForBalance(null);
      return result;
    } catch (actionError) {
      setError(actionError.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function syncPostexNow() {
    setPostexSyncing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/postex-settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "PostEx sync pura nahi ho saka.");
      setNotice(
        result.failed?.length
          ? `PostEx Sync: ${result.synced || 0} orders synced (${result.failed.length} skipped).`
          : `PostEx Sync complete: ${result.synced || 0} orders refreshed.`
      );
      await load();
    } catch (syncError) {
      setError(syncError.message);
    } finally {
      setPostexSyncing(false);
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
  const paymentScenarios = report.paymentScenarios || {
    totalOrdersCount: advances.rows.length,
    needsVerificationCount: advances.rows.filter((r) => !r.verified).length,
    needsVerificationPkr: advances.pendingPkr || 0,
    fullAdvanceCount: 0,
    fullAdvanceTotalPkr: 0,
    fullAdvanceVerifiedPkr: 0,
    fullAdvancePendingPkr: 0,
    deliveryAdvanceCount: 0,
    deliveryAdvanceVerifiedPkr: 0,
    deliveryAdvancePendingPkr: 0,
    deliveryAdvanceCodRemainingPkr: 0,
    codOnlyCount: 0,
    codOnlyTotalPkr: 0,
    codOnlyDeliveredPkr: 0,
    codOnlyInPipelinePkr: 0,
    verifiedAdvanceInPipelinePkr: 0,
    totalConfirmedRevenuePkr: sales.grossRevenuePkr || 0,
    rows: advances.rows,
  };
  const sortedAccounts = sortFinanceAccounts(accounts);
  const alfalahAccount = sortedAccounts.find((a) => a.slug === "alfalah_owner") || sortedAccounts[0];
  const nayapayAccount = sortedAccounts.find((a) => a.slug === "nayapay_amina") || sortedAccounts[0];

  // Filtered Cash Ledger rows
  const filteredTransactions = report.transactions.filter((entry) => {
    if (!showVoidedLedger && entry.voided) return false;
    if (ledgerAccountFilter === "unassigned") {
      if (entry.account_id) return false;
    } else if (ledgerAccountFilter !== "all") {
      if (String(entry.account_id) !== String(ledgerAccountFilter)) return false;
    }
    if (ledgerTypeFilter === "in") {
      if (entry.cash_direction !== "in") return false;
    } else if (ledgerTypeFilter === "out") {
      if (entry.cash_direction !== "out") return false;
    } else if (ledgerTypeFilter === "transfer") {
      if (entry.entry_type !== "transfer_in" && entry.entry_type !== "transfer_out") return false;
    } else if (ledgerTypeFilter !== "all") {
      if (entry.entry_type !== ledgerTypeFilter) return false;
    }
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.trim().toLowerCase();
      const hay = `${entry.title || ""} ${entry.counterparty || ""} ${entry.category || ""} ${entry.reference || ""} ${entry.note || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredInSum = filteredTransactions
    .filter((t) => !t.voided && t.cash_direction === "in")
    .reduce((sum, t) => sum + Number(t.amount_pkr || 0), 0);
  const filteredOutSum = filteredTransactions
    .filter((t) => !t.voided && t.cash_direction === "out")
    .reduce((sum, t) => sum + Number(t.amount_pkr || 0), 0);

  // Filtered Order Profit rows
  const filteredOrders = orders.filter((row) => {
    if (orderProfitFilter === "loss" && !(row.netProfitPkr < 0)) return false;
    if (orderProfitFilter === "estimated" && !row.costEstimated) return false;
    if (orderProfitSearch.trim()) {
      const q = orderProfitSearch.trim().toLowerCase();
      const hay = `${row.orderNumber || ""} ${row.customer || ""} ${row.city || ""} ${row.trackingNumber || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Filtered Order Payment Scenario rows
  const scenarioRowsSource = paymentScenarios.rows?.length ? paymentScenarios.rows : advances.rows;
  const pendingAdvanceActions = scenarioRowsSource.filter(
    (r) => r.needsVerification || (Number(r.advancePkr || 0) > 0 && (!r.verified || !r.cashPosted) && !r.isRejected && !r.isCancelled)
  ).length;
  const filteredAdvances = scenarioRowsSource.filter((row) => {
    if (advanceFilter === "needs_action") {
      if (!(row.needsVerification || (Number(row.advancePkr || 0) > 0 && (!row.verified || !row.cashPosted) && !row.isRejected && !row.isCancelled))) return false;
    } else if (advanceFilter === "advance_all") {
      if (!(Number(row.advancePkr || 0) > 0 || row.scenario === "full_advance" || row.scenario === "delivery_advance" || row.scenario === "partial_advance")) return false;
    } else if (advanceFilter === "full_advance") {
      if (row.scenario !== "full_advance") return false;
    } else if (advanceFilter === "delivery_advance") {
      if (row.scenario !== "delivery_advance" && row.scenario !== "partial_advance") return false;
    } else if (advanceFilter === "cod") {
      if (row.scenario !== "cod") return false;
    } else if (advanceFilter === "posted") {
      if (!(row.verified && row.cashPosted)) return false;
    }
    if (advanceSearch.trim()) {
      const q = advanceSearch.trim().toLowerCase();
      const hay = `${row.orderNumber || ""} ${row.customer || ""} ${row.phone || ""} ${row.city || ""} ${row.scenarioLabel || ""} ${row.paymentStatus || ""} ${row.orderStage || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Filtered Supplier Bills
  const todayIso = new Date().toISOString().slice(0, 10);
  const activeSupplierBills = (suppliers.bills || []).filter((b) => b.status !== "voided");
  const filteredBills = activeSupplierBills.filter((bill) => {
    const remaining = Number(bill.remaining_pkr || 0);
    if (billFilter === "open") return bill.status !== "paid" && remaining > 0;
    if (billFilter === "overdue") return bill.status !== "paid" && remaining > 0 && bill.due_date && bill.due_date < todayIso;
    if (billFilter === "paid") return bill.status === "paid" || remaining <= 0;
    return true;
  });

  // PostEx Bank Receipts from transactions
  const postexReceiptRows = report.transactions.filter((t) => t.entry_type === "postex_bank_receipt");

  // Pending Action Count for Quick Action Strip
  const unassignedCount = report.transactions.filter((t) => !t.account_id && !t.voided).length;

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
              Easy Multi-Account Cashbook, Real-time P&amp;L, PostEx Payouts, Customer Advances &amp; Supplier Bills.
            </p>
          </div>
          <div className="shopifyFinanceHeaderActions">
            <button
              type="button"
              className="shopifyFinanceActionBtn expense"
              onClick={() => {
                setModalDefaultAccount("");
                setModalDefaultExpenseType("business_expense");
                setActiveModal("expense");
              }}
            >
              <Plus size={15} /> Expense / Withdrawal
            </button>
            <button
              type="button"
              className="shopifyFinanceActionBtn income"
              onClick={() => {
                setModalDefaultAccount("");
                setModalDefaultIncomeType("other_income");
                setActiveModal("income");
              }}
            >
              <Plus size={15} /> Add Income / Receipt
            </button>
            <button
              type="button"
              className="shopifyFinanceActionBtn transfer"
              onClick={() => {
                setModalDefaultAccount("");
                setActiveModal("transfer");
              }}
            >
              <ArrowLeftRight size={15} /> Transfer Funds
            </button>
            <button
              type="button"
              className="shopifySecondaryButton"
              onClick={() => setActiveModal("supplier_bill")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
            >
              <Plus size={14} /> Supplier Bill
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
        <div className="adminErrorBanner financeErrorBanner" style={{ borderRadius: "10px", margin: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", padding: "12px 18px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", color: "#166534" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: "13.5px", fontWeight: "650" }}>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#166534" }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Critical Alerts (Overview shows these inside its own "Abhi ye karein" list) */}
      {alerts.length > 0 && tab !== "overview" && (
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
        <FinanceOverview
          report={report}
          trend={trend}
          trendLoading={trendLoading}
          paymentScenarios={paymentScenarios}
          sortedAccounts={sortedAccounts}
          unassignedCount={unassignedCount}
          postexReceiptAccountId={alfalahAccount?.id || ""}
          busy={busy}
          onNavigate={goTo}
          onOpenModal={openModal}
          onBackfill={() => post(
            { action: "backfill" },
            (res) => `Synced: ${res.cogs?.snapshotted || 0} order costs locked, ${res.advances?.recorded || 0} advances posted to NayaPay.`
          )}
        />
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
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#667a6e" }}>
                  Total liquid funds: <b>{money(cash.availableCashPkr)}</b>
                  {cash.unassignedBalancePkr !== 0 ? ` (includes ${money(cash.unassignedBalancePkr)} unassigned)` : ""}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="shopifyFinanceActionBtn expense"
                  onClick={() => { setModalDefaultAccount(""); setModalDefaultExpenseType("business_expense"); setActiveModal("expense"); }}
                >
                  <Plus size={14} /> Add Expense / Withdrawal
                </button>
                <button
                  type="button"
                  className="shopifyFinanceActionBtn income"
                  onClick={() => { setModalDefaultAccount(""); setModalDefaultIncomeType("other_income"); setActiveModal("income"); }}
                >
                  <Plus size={14} /> Add Income
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
              {sortedAccounts.map((acc) => {
                const isSelectedFilter = String(ledgerAccountFilter) === String(acc.id);
                return (
                  <div
                    key={acc.id}
                    className="shopifyAccountCard"
                    style={isSelectedFilter ? { borderColor: "#173d29", background: "#f8fbf9" } : undefined}
                  >
                    <div className="shopifyAccountCardHead">
                      <div>
                        <b>{acc.name}</b>
                        <div style={{ fontSize: "11px", color: "#667a6e" }}>
                          {acc.holder || (acc.kind === "cash" ? "Cash" : "Bank")}
                          {acc.openingBalancePkr ? ` · Opening: ${money(acc.openingBalancePkr)}` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLedgerAccountFilter(isSelectedFilter ? "all" : acc.id)}
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: isSelectedFilter ? "#173d29" : "#f0fdf4",
                          color: isSelectedFilter ? "#fff" : "#166534",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {isSelectedFilter ? "Filtered ✓" : `${acc.movementCount} entries`}
                      </button>
                    </div>
                    <div className="shopifyAccountBalance">
                      {money(acc.balancePkr)}
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", borderTop: "1px solid #f1f5f2", paddingTop: "10px" }}>
                      <button
                        type="button"
                        className="shopifyAccountQuickBtn"
                        onClick={() => { setModalDefaultAccount(acc.id); setModalDefaultExpenseType("business_expense"); setActiveModal("expense"); }}
                      >
                        <Plus size={12} /> Expense
                      </button>
                      <button
                        type="button"
                        className="shopifyAccountQuickBtn"
                        onClick={() => { setModalDefaultAccount(acc.id); setModalDefaultIncomeType("other_income"); setActiveModal("income"); }}
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
                      <button
                        type="button"
                        className="shopifyAccountQuickBtn"
                        onClick={() => { setSelectedAccountForBalance(acc); setActiveModal("adjust_balance"); }}
                      >
                        <Settings2 size={12} /> Balance
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {unassignedCount > 0 && (
            <UnassignedFixer
              accounts={accounts}
              transactions={report.transactions.filter((entry) => !entry.account_id && !entry.voided)}
              busy={busy}
              onAssign={(transactionIds, accountId) => post({ action: "assign_account", transactionIds, accountId }, "Selected entries ko account assign ho gaya.")}
            />
          )}

          <Card
            title="Cash Ledger"
            subtitle={`Showing ${filteredTransactions.length} of ${report.transactions.length} entries · In: ${money(filteredInSum)} · Out: ${money(filteredOutSum)}`}
            right={
              <button
                type="button"
                className="shopifySecondaryButton"
                style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => downloadCsv("transactions", filteredTransactions, report)}
              >
                <Download size={13} /> Export CSV
              </button>
            }
          >
            {/* Ledger Filter Bar */}
            <div className="shopifyCardFilterBar">
              <div style={{ position: "relative", flex: "1 1 220px", minWidth: "200px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#728578" }} />
                <input
                  type="text"
                  placeholder="Search title, vendor, reference, category..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px 7px 32px", border: "1.5px solid #d4ded6", borderRadius: "8px", fontSize: "13px" }}
                />
              </div>

              <select
                className="shopifyFinancePeriodSelect"
                value={ledgerAccountFilter}
                onChange={(e) => setLedgerAccountFilter(e.target.value)}
                aria-label="Filter ledger by account"
              >
                <option value="all">All Accounts</option>
                {sortedAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
                <option value="unassigned">Unassigned Only ({unassignedCount})</option>
              </select>

              <select
                className="shopifyFinancePeriodSelect"
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                aria-label="Filter ledger by entry type"
              >
                <option value="all">All Entry Types</option>
                <option value="in">Money In (+)</option>
                <option value="out">Money Out (-)</option>
                <option value="business_expense">Business Expenses</option>
                <option value="supplier_payment">Supplier Payments</option>
                <option value="postex_bank_receipt">PostEx Bank Receipts</option>
                <option value="customer_advance">Customer Advances</option>
                <option value="owner_withdrawal">Owner Withdrawals</option>
                <option value="owner_investment">Owner Capital Added</option>
                <option value="transfer">Account Transfers</option>
                <option value="cash_reset">Balance Adjustments</option>
              </select>

              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#4b5d52", cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={showVoidedLedger}
                  onChange={(e) => setShowVoidedLedger(e.target.checked)}
                />
                Show voided
              </label>

              {(ledgerSearch || ledgerAccountFilter !== "all" || ledgerTypeFilter !== "all") && (
                <button
                  type="button"
                  className="shopifyAccountQuickBtn"
                  onClick={() => {
                    setLedgerSearch("");
                    setLedgerAccountFilter("all");
                    setLedgerTypeFilter("all");
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>

            <Table head={["Date", "Type", "Detail & Category", "Account", "Amount", "Actions"]} empty="Is filter/period mein koi cash movement nahi.">
              {filteredTransactions.map((entry) => {
                const account = accounts.find((row) => row.id === entry.account_id);
                return (
                  <tr key={entry.id} className={entry.voided ? "isVoided opacity-40 line-through bg-gray-50" : ""}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(entry.occurred_on)}</td>
                    <td>
                      <span className="shopifyStatusBadge" style={{ textTransform: "capitalize" }}>
                        {entry.entry_type.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td style={{ minWidth: "220px", maxWidth: "380px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <b>{entry.title}</b>
                        <small style={{ display: "block", fontSize: "11px", color: "#667a6e", wordBreak: "break-word" }}>
                          {[entry.category, entry.counterparty, entry.reference ? `Ref: ${entry.reference}` : ""].filter(Boolean).join(" · ")}
                        </small>
                        {entry.note ? <small style={{ display: "block", fontSize: "11px", color: "#85968b", wordBreak: "break-word" }}>{entry.note}</small> : null}
                      </div>
                    </td>
                    <td>{account?.name || <span className="expenseAmount font-semibold">Unassigned</span>}</td>
                    <td style={{ whiteSpace: "nowrap" }} className={entry.cash_direction === "in" ? "incomeAmount font-bold" : "expenseAmount font-bold"}>
                      {entry.cash_direction === "in" ? "+" : "-"} {money(entry.amount_pkr)}
                    </td>
                    <td>
                      {entry.voided ? (
                        <small className="text-xs text-gray-500 font-semibold">Voided</small>
                      ) : entry.production_batch_id ? (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            className="shopifyAccountQuickBtn"
                            onClick={() => { setSelectedTxForEdit(entry); setActiveModal("edit_tx"); }}
                            title="Change account or note"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                          <small className="text-xs text-gray-500">Batch entry</small>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            className="shopifyAccountQuickBtn"
                            onClick={() => { setSelectedTxForEdit(entry); setActiveModal("edit_tx"); }}
                            disabled={busy}
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            className="removeProductButton"
                            style={{ padding: "4px 8px", fontSize: "11.5px" }}
                            disabled={busy}
                            onClick={() => { setSelectedTxForVoid(entry); setActiveModal("void_tx"); }}
                          >
                            Void
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          </Card>
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

            <Card title="Break-even & Cost Settings" subtitle="Har delivered order kitna contribute karta hai aur fixed costs cover karne ke orders.">
              <div className="financeStatement">
                <StatementRow label="Contribution per order" value={money(pnl.contributionPerOrderPkr)} help="Sale − cost − courier − GST/tax" />
                <StatementRow label="Monthly fixed costs" value={money(settings.monthlyFixedCostsPkr)} help="Rent, salaries, utilities" />
                <StatementRow label="Break-even orders needed" value={pnl.breakEvenOrders || "—"} strong />
              </div>
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #edf2ee" }}>
                <PnlSettingsForm
                  settings={settings}
                  busy={busy}
                  onSave={(patch) => post({ action: "save_settings", settings: patch }, "Finance cost & alert settings save ho gaye.")}
                />
              </div>
            </Card>
          </section>

          <Card
            title="Order-wise profit"
            subtitle={`Showing ${filteredOrders.length} of ${orders.length} delivered orders. Loss wale orders light red hain.`}
            right={
              <button
                type="button"
                className="shopifySecondaryButton"
                style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => downloadCsv("orders", filteredOrders, report)}
              >
                <Download size={13} /> Export Order Profit CSV
              </button>
            }
          >
            <div className="shopifyCardFilterBar">
              <div style={{ position: "relative", flex: "1 1 220px", maxWidth: "340px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#728578" }} />
                <input
                  type="text"
                  placeholder="Search order #, customer, city..."
                  value={orderProfitSearch}
                  onChange={(e) => setOrderProfitSearch(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px 7px 32px", border: "1.5px solid #d4ded6", borderRadius: "8px", fontSize: "13px" }}
                />
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  ["all", `All (${orders.length})`],
                  ["loss", `Loss Making (${orders.filter((o) => o.netProfitPkr < 0).length})`],
                  ["estimated", `Estimated Cost (${orders.filter((o) => o.costEstimated).length})`],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className="shopifyAccountQuickBtn"
                    style={orderProfitFilter === val ? { background: "#173d29", color: "#fff", borderColor: "#173d29" } : undefined}
                    onClick={() => setOrderProfitFilter(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Table head={["Order", "Customer", "Delivered", "Sale", "Cost", "Courier+Tax", "Net Profit", "Margin"]} empty="Is filter/period mein koi delivered order nahi.">
              {filteredOrders.slice(0, 80).map((row) => (
                <tr key={row.id} className={row.netProfitPkr < 0 ? "bg-[#fef2f2]" : ""}>
                  <td><b>{row.orderNumber ? `#${row.orderNumber}` : String(row.id).slice(0, 8)}</b></td>
                  <td style={{ minWidth: "160px", maxWidth: "260px" }}><div style={{ display: "flex", flexDirection: "column" }}><b>{row.customer}</b>{row.city ? <small style={{ display: "block", fontSize: "11px", color: "#667a6e" }}>{row.city}</small> : null}</div></td>
                  <td>{formatDate(row.deliveredAt)}</td>
                  <td>{money(row.revenuePkr)}</td>
                  <td>{money(row.costPkr)}{row.costEstimated ? <small className="block text-xs text-amber-700">estimate</small> : null}</td>
                  <td>{money(row.courierCostPkr + row.gstPkr + row.taxPkr)}</td>
                  <td className={row.netProfitPkr < 0 ? "expenseAmount font-bold" : "incomeAmount font-bold"}>
                    {money(row.netProfitPkr)}
                  </td>
                  <td><span className="shopifyStatusBadge">{percent(row.marginPercent)}</span></td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* =========================================================================
          TAB 4: COURIER, ADVANCES & SUPPLIER BILLS
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
                <span className="shopifyFinanceKpiLabel">In Amina NayaPay</span>
                <span className="shopifyFinanceKpiValue">{money(advances.cashPostedPkr || 0)}</span>
                <span className="shopifyFinanceKpiHelp">{advances.notInCashPkr ? `${money(advances.notInCashPkr)} posting pending` : "All verified advances posted"}</span>
              </div>
            </div>

            <div className="shopifyFinanceKpiCard">
              <div className="shopifyFinanceKpiIcon returns"><Landmark size={20} /></div>
              <div className="shopifyFinanceKpiInfo">
                <span className="shopifyFinanceKpiLabel">Supplier Payable Due</span>
                <span className={`shopifyFinanceKpiValue ${suppliers.payablePkr > 0 ? "text-orange-700" : ""}`}>{money(suppliers.payablePkr)}</span>
                <span className="shopifyFinanceKpiHelp">{suppliers.overdue.length ? `${suppliers.overdue.length} overdue` : "All on schedule"}</span>
              </div>
            </div>
          </div>

          {/* PostEx Settlement Actions & Bank Payout History */}
          <Card
            title="PostEx Courier Settlements & Bank Payouts"
            subtitle="Step 1: Sync PostEx status. Step 2: Jab PostEx ki payment aapke bank mein aaye, 'Record PostEx Bank Receipt' click karein."
            right={
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="shopifySecondaryButton"
                  style={{ fontSize: "12.5px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  onClick={syncPostexNow}
                  disabled={postexSyncing}
                >
                  <RefreshCw size={14} className={postexSyncing ? "animate-spin" : ""} />
                  {postexSyncing ? "Syncing PostEx..." : "Sync PostEx Status"}
                </button>
                <button
                  type="button"
                  className="shopifyPrimaryButton"
                  style={{ fontSize: "12.5px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  onClick={() => {
                    setModalDefaultAccount(alfalahAccount?.id || "");
                    setModalDefaultIncomeType("postex_bank_receipt");
                    setActiveModal("income");
                  }}
                >
                  <Plus size={14} /> Record PostEx Bank Receipt
                </button>
              </div>
            }
          >
            <Table head={["Date", "CPR / Bank Reference", "Account", "Amount Received", "Note", "Actions"]} empty="Is period mein koi PostEx bank receipt record nahi hui.">
              {postexReceiptRows.map((entry) => {
                const account = accounts.find((a) => a.id === entry.account_id);
                return (
                  <tr key={entry.id} className={entry.voided ? "isVoided opacity-40 line-through bg-gray-50" : ""}>
                    <td>{formatDate(entry.occurred_on)}</td>
                    <td><b>{entry.reference || entry.title}</b></td>
                    <td>{account?.name || "Unassigned"}</td>
                    <td className="incomeAmount font-bold">+ {money(entry.amount_pkr)}</td>
                    <td>{entry.note || "—"}</td>
                    <td>
                      {entry.voided ? (
                        <small className="text-xs text-gray-500">Voided</small>
                      ) : (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="shopifyAccountQuickBtn"
                            onClick={() => { setSelectedTxForEdit(entry); setActiveModal("edit_tx"); }}
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            className="removeProductButton"
                            style={{ padding: "4px 8px", fontSize: "11.5px" }}
                            onClick={() => { setSelectedTxForVoid(entry); setActiveModal("void_tx"); }}
                          >
                            Void
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
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

          <Card
            title="Order Payments & Manual Verification Hub"
            subtitle="Full Advance (100%), Delivery Advance + COD, aur Pure COD orders ko yahan se manually verify karein. Har verified payment foran Finance account mein cash ban jati hai."
            right={
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                {[
                  ["needs_action", `Needs Action (${pendingAdvanceActions})`],
                  ["advance_all", `All Advances (${scenarioRowsSource.filter((r) => Number(r.advancePkr || 0) > 0).length})`],
                  ["full_advance", `Full Advance (${paymentScenarios.fullAdvanceCount || 0})`],
                  ["delivery_advance", `Delivery Adv (${paymentScenarios.deliveryAdvanceCount || 0})`],
                  ["cod", `Pure COD (${paymentScenarios.codOnlyCount || 0})`],
                  ["posted", `Finance Posted`],
                  ["all", `All Orders (${scenarioRowsSource.length})`],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className="shopifyAccountQuickBtn"
                    style={advanceFilter === val ? { background: "#173d29", color: "#fff", borderColor: "#173d29" } : undefined}
                    onClick={() => setAdvanceFilter(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="shopifyCardFilterBar" style={{ marginBottom: "12px" }}>
              <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "380px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#728578" }} />
                <input
                  type="text"
                  placeholder="Search order #, customer, phone, city..."
                  value={advanceSearch}
                  onChange={(e) => setAdvanceSearch(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px 7px 32px", border: "1.5px solid #d4ded6", borderRadius: "8px", fontSize: "13px" }}
                />
              </div>
              {advanceSearch && (
                <button
                  type="button"
                  className="shopifySecondaryButton"
                  style={{ fontSize: "12px", padding: "6px 10px" }}
                  onClick={() => setAdvanceSearch("")}
                >
                  Clear Search
                </button>
              )}
            </div>

            <Table head={["Customer & Contact", "Order & Stage", "Scenario & Total", "Advance", "COD Baqi", "Status", "Manual Verification & Receiving Account"]} empty="Is filter/period mein koi order payment nahi mila.">
              {filteredAdvances.map((row) => {
                const targetAccountId = verifyAccountByOrder[row.id] || row.postedAccountId || nayapayAccount?.id;
                const isPrepaidFull = row.scenario === "full_advance";
                return (
                  <tr key={row.id}>
                    <td style={{ minWidth: "160px", maxWidth: "240px" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <b>{row.customer}</b>
                        {row.phone ? <small style={{ display: "block", fontSize: "11px", color: "#667a6e" }}>{row.phone}</small> : null}
                        {row.city ? <small style={{ display: "block", fontSize: "11px", color: "#85968b" }}>{row.city}</small> : null}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <b>{row.orderNumber ? `#${row.orderNumber}` : String(row.id).slice(0, 8)}</b>
                        <span className="shopifyStatusBadge" style={{ fontSize: "10.5px", padding: "1px 6px", alignSelf: "flex-start" }}>
                          {row.orderStage}
                        </span>
                        {row.fulfillmentStatus && row.fulfillmentStatus !== "Unfulfilled" && (
                          <small style={{ fontSize: "10px", color: "#475569" }}>{row.fulfillmentStatus}</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span
                          className="shopifyStatusBadge"
                          style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            alignSelf: "flex-start",
                            background: isPrepaidFull ? "#dcfce7" : row.scenario === "delivery_advance" ? "#e0f2fe" : "#f1f5f9",
                            color: isPrepaidFull ? "#166534" : row.scenario === "delivery_advance" ? "#0369a1" : "#475569",
                            borderColor: isPrepaidFull ? "#bbf7d0" : row.scenario === "delivery_advance" ? "#bae6fd" : "#cbd5e1",
                          }}
                        >
                          {row.scenarioLabel}
                        </span>
                        <b>{money(row.totalPkr)}</b>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span className={Number(row.advancePkr) > 0 ? "incomeAmount font-bold" : "text-gray-400"}>
                          {Number(row.advancePkr) > 0 ? `+ ${money(row.advancePkr)}` : "Rs. 0"}
                        </span>
                        {row.cashPosted ? (
                          <small style={{ fontSize: "10px", color: "#166534", fontWeight: 600 }}>
                            in {row.postedAccountName || "Finance"}
                          </small>
                        ) : Number(row.advancePkr) > 0 && row.verified ? (
                          <small style={{ fontSize: "10px", color: "#b45309" }}>posting pending</small>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <b>{row.codRemainingPkr === 0 ? "Rs. 0 (Prepaid)" : money(row.codRemainingPkr)}</b>
                        {row.isDelivered ? (
                          <small style={{ fontSize: "10px", color: "#166534" }}>Delivered</small>
                        ) : (
                          <small style={{ fontSize: "10px", color: "#64748b" }}>On delivery</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`shopifyStatusBadge ${row.verified && (row.cashPosted || row.advancePkr === 0) ? "active" : row.needsVerification ? "pending" : ""}`}>
                        {row.paymentStatus}
                      </span>
                      {row.paymentReference && (
                        <small style={{ display: "block", fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                          Ref: {row.paymentReference}
                        </small>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {(!row.verified || !row.cashPosted) ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <select
                              value={targetAccountId}
                              onChange={(e) => setVerifyAccountByOrder({ ...verifyAccountByOrder, [row.id]: e.target.value })}
                              className="shopifyFinancePeriodSelect"
                              style={{ padding: "4px 6px", fontSize: "11px", maxWidth: "130px" }}
                              title="Select receiving account"
                              disabled={busy}
                            >
                              {sortedAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="shopifyPrimaryButton"
                              style={{ padding: "4px 10px", fontSize: "11.5px", whiteSpace: "nowrap" }}
                              disabled={busy}
                              onClick={() => post(
                                {
                                  action: "update_order_payment",
                                  orderId: row.id,
                                  mode: "verify",
                                  paymentStatus: isPrepaidFull ? "Paid" : "Payment Verified",
                                  accountId: targetAccountId,
                                },
                                `Order ${row.orderNumber ? `#${row.orderNumber}` : ""} payment verified & posted to Finance!`
                              )}
                            >
                              {row.verified ? "Post to Finance" : "Verify & Post"}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "11.5px", color: "#166534", fontWeight: 700 }}>
                              ✓ Verified &amp; Posted
                            </span>
                            <button
                              type="button"
                              className="removeProductButton"
                              style={{ padding: "2px 6px", fontSize: "10.5px" }}
                              disabled={busy}
                              onClick={() => post(
                                { action: "update_order_payment", orderId: row.id, mode: "unverify" },
                                `Order #${row.orderNumber || row.id} payment unverified.`
                              )}
                              title="Reset payment to unverified"
                            >
                              Unverify
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </Card>

          {/* Supplier Payables Grid */}
          <section className="financeGrid financeGridWide">
            <Card
              title="Supplier payables"
              subtitle="Paid amount har payment se khud update hoti hai."
              right={
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ fontSize: "14px", color: "#9a3412" }}>{money(suppliers.payablePkr)} Total Due</b>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {[
                      ["open", "Open"],
                      ["overdue", `Overdue (${suppliers.overdue.length})`],
                      ["paid", "Paid"],
                      ["all", "All"],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className="shopifyAccountQuickBtn"
                        style={billFilter === val ? { background: "#173d29", color: "#fff", borderColor: "#173d29" } : undefined}
                        onClick={() => setBillFilter(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              }
            >
              <Table head={["Supplier", "Ref", "Due Date", "Total", "Paid", "Remaining", "Action"]} empty="Is filter mein koi supplier bill nahi.">
                {filteredBills.map((bill) => {
                  const isOverdue = bill.due_date && bill.due_date < todayIso && Number(bill.remaining_pkr) > 0;
                  return (
                    <tr key={bill.id}>
                      <td style={{ minWidth: "160px", maxWidth: "260px" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <b>{bill.supplier}</b>
                          {bill.note ? <small style={{ fontSize: "11px", color: "#667a6e" }}>{bill.note}</small> : null}
                        </div>
                      </td>
                      <td>{bill.reference || "—"}</td>
                      <td className={isOverdue ? "expenseAmount font-bold" : ""}>
                        {bill.due_date || "—"}
                        {isOverdue ? <small className="block text-xs">Overdue</small> : null}
                      </td>
                      <td>{money(bill.total_pkr)}</td>
                      <td>{money(bill.paid_pkr)}</td>
                      <td><b>{money(bill.remaining_pkr)}</b></td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          {Number(bill.remaining_pkr) > 0 && (
                            <PayBillButton
                              bill={bill}
                              accounts={accounts}
                              busy={busy}
                              onPay={(amountPkr, accountId) => post({ action: "pay_supplier_bill", billId: bill.id, amountPkr, accountId }, "Supplier payment record ho gayi.")}
                            />
                          )}
                          <button
                            type="button"
                            className="removeProductButton"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            disabled={busy}
                            onClick={() => {
                              if (window.confirm(`Void supplier bill from "${bill.supplier}" (${money(bill.total_pkr)})? Linked payments will also be reversed.`)) {
                                post({ action: "void_supplier_bill", billId: bill.id }, "Supplier bill void ho gaya.");
                              }
                            }}
                            title="Void this supplier bill"
                          >
                            Void
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            </Card>

            <SupplierBillForm accounts={accounts} busy={busy} onSubmit={(bill) => post({ action: "add_supplier_bill", bill }, "Supplier bill save ho gaya.")} />
          </section>
        </>
      )}

      {/* =========================================================================
          TAB 5: REPORTS & MARKETING
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
            <Card
              title="Marketing ROI & Ad Campaigns"
              subtitle="Meta Ads / Instagram campaigns ka spend aur attributed sales track karein."
              right={
                <button
                  type="button"
                  className="shopifyPrimaryButton"
                  style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  onClick={() => setActiveModal("campaign")}
                >
                  <Plus size={14} /> Log Campaign
                </button>
              }
            >
              <div className="financeStatement" style={{ marginBottom: "14px" }}>
                <StatementRow label="Meta Ads / Campaign spend" value={money(marketing.spendPkr)} />
                <StatementRow label="Attributed sales" value={money(marketing.attributedSalesPkr)} />
                <StatementRow label="Return on Ad Spend (ROAS)" value={marketing.roas ? `${marketing.roas}x` : "—"} help="Rs. 1 spend par kitni sales" />
                <StatementRow label="Customer Acquisition Cost (CAC)" value={marketing.cacPkr ? money(marketing.cacPkr) : "—"} strong />
              </div>
              {marketing.campaigns?.length > 0 && (
                <Table head={["Date", "Campaign", "Platform", "Spend", "Sales", "ROAS"]} empty="">
                  {marketing.campaigns.slice(0, 10).map((c) => (
                    <tr key={c.id}>
                      <td>{formatDate(c.occurred_on)}</td>
                      <td><b>{c.name}</b></td>
                      <td>{c.platform}</td>
                      <td>{money(c.spend_pkr)}</td>
                      <td>{money(c.attributed_sales_pkr)}</td>
                      <td><span className="shopifyStatusBadge active">{Number(c.spend_pkr) > 0 ? `${(Number(c.attributed_sales_pkr || 0) / Number(c.spend_pkr)).toFixed(2)}x` : "—"}</span></td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>

            <Card title="Profit allocation planner" subtitle="Net profit ko Marketing, Owner drawing aur New Stock mein divide karne ka target plan.">
              <div className="financeStatement">
                <StatementRow label="Allocatable net profit" value={money(pnl.allocation.allocatablePkr)} />
                <StatementRow label={`Marketing budget (${percent(settings.marketingPercent)})`} value={money(pnl.allocation.marketingPkr)} />
                <StatementRow label={`Owner drawing (${percent(settings.ownerPercent)})`} value={money(pnl.allocation.ownerPkr)} />
                <StatementRow label={`Stock reserve (${percent(settings.stockPercent)})`} value={money(pnl.allocation.stockPkr)} strong />
              </div>
              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #edf2ee" }}>
                <AllocationForm
                  settings={settings}
                  busy={busy}
                  onSave={(patch) => post({ action: "save_settings", settings: patch }, "Profit allocation percentages save ho gaye.")}
                />
              </div>
            </Card>
          </section>

          <Card title="Last 12 months performance trend" subtitle="Har mahine ka revenue aur net profit — growth saaf dekhein.">
            {trend.length ? <TrendChart rows={trend} /> : <p className="trackingNumber" style={{ padding: "20px" }}>Loading 12-month trend...</p>}
          </Card>

          <Card title="Expense breakdown by category" subtitle="Is period mein paisa kin cheezon par kharch hua.">
            <Table head={["Category", "Amount", "Share of Spend"]} empty="Koi expense nahi.">
              {cash.expenseByCategory.map((row) => {
                const share = cash.outPkr > 0 ? Math.round((row.amountPkr / cash.outPkr) * 100) : 0;
                return (
                  <tr key={row.category}>
                    <td><b>{row.category}</b></td>
                    <td className="expenseAmount font-bold">{money(row.amountPkr)}</td>
                    <td><span className="shopifyStatusBadge">{share}%</span></td>
                  </tr>
                );
              })}
            </Table>
          </Card>

          <Card title="Downloads & Exports" subtitle="Download clean CSVs for Excel or print financial statements.">
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", padding: "18px 20px" }}>
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
          defaultEntryType={modalDefaultExpenseType}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={(entry) => post({ action: "add_transaction", entry }, entry.entryType === "owner_withdrawal" ? "Owner withdrawal recorded!" : "Expense recorded successfully!")}
        />
      )}

      {activeModal === "income" && (
        <IncomeModal
          accounts={accounts}
          defaultAccountId={modalDefaultAccount}
          defaultEntryType={modalDefaultIncomeType}
          postexReceivablePkr={postex.receivablePkr}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={(entry) => post({ action: "add_transaction", entry }, "Income / receipt recorded successfully!")}
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

      {activeModal === "supplier_bill" && (
        <SupplierBillModal
          accounts={accounts}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={(bill) => post({ action: "add_supplier_bill", bill }, "Supplier bill saved!")}
        />
      )}

      {activeModal === "campaign" && (
        <CampaignModal
          accounts={accounts}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={(campaign) => post({ action: "add_campaign", campaign }, "Marketing campaign saved!")}
        />
      )}

      {activeModal === "adjust_balance" && selectedAccountForBalance && (
        <AdjustBalanceModal
          account={selectedAccountForBalance}
          busy={busy}
          onClose={() => { setActiveModal(null); setSelectedAccountForBalance(null); }}
          onSubmit={(payload) => post({ action: "adjust_account_balance", ...payload }, "Account balance updated!")}
        />
      )}

      {activeModal === "edit_tx" && selectedTxForEdit && (
        <EditTransactionModal
          entry={selectedTxForEdit}
          accounts={accounts}
          busy={busy}
          onClose={() => { setActiveModal(null); setSelectedTxForEdit(null); }}
          onSubmit={(patch) => post({ action: "edit_transaction", transactionId: selectedTxForEdit.id, patch }, "Entry updated successfully!")}
        />
      )}

      {activeModal === "void_tx" && selectedTxForVoid && (
        <VoidConfirmModal
          entry={selectedTxForVoid}
          busy={busy}
          onClose={() => { setActiveModal(null); setSelectedTxForVoid(null); }}
          onConfirm={() => post({ action: "void_transaction", transactionId: selectedTxForVoid.id, confirmation: "VOID" }, "Entry void ho gayi aur balance adjust ho gaya.")}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Action Modals
// ---------------------------------------------------------------------------

function ExpenseModal({ accounts, defaultAccountId, defaultEntryType = "business_expense", busy, onClose, onSubmit }) {
  const sorted = sortFinanceAccounts(accounts);
  const [entryType, setEntryType] = useState(defaultEntryType);
  const [category, setCategory] = useState("Fabric / stock");
  const [otherCategory, setOtherCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(defaultAccountId || sorted[0]?.id || "");
  const [title, setTitle] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const isWithdrawal = entryType === "owner_withdrawal";

  return (
    <div className="shopifyFinanceModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shopifyFinanceModalCard">
        <div className="shopifyFinanceModalHead">
          <h3>
            <WalletCards size={18} className="text-[#991b1b]" /> {isWithdrawal ? "Record Owner / Personal Withdrawal" : "Record Business Expense"}
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#667a6e" }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const numAmount = Number(amount || 0);
            if (!(numAmount > 0) || !accountId) return;
            const finalCategory = isWithdrawal
              ? "Owner withdrawal"
              : (category === "Other" && otherCategory ? otherCategory : category);
            const finalTitle = title.trim() || (isWithdrawal ? "Owner personal withdrawal" : finalCategory);
            await onSubmit({
              entryType,
              accountId,
              category: finalCategory,
              title: finalTitle,
              counterparty,
              amountPkr: numAmount,
              occurredOn: date,
              reference,
              note,
            });
          }}
        >
          <div className="shopifyFinanceModalBody">
            {/* Mode Toggle: Business Expense vs Owner Withdrawal */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f4f7f5", padding: "4px", borderRadius: "8px" }}>
              <button
                type="button"
                onClick={() => setEntryType("business_expense")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: !isWithdrawal ? "#173d29" : "transparent",
                  color: !isWithdrawal ? "#fff" : "#4b5d52",
                }}
              >
                <WalletCards size={14} /> Business Expense
              </button>
              <button
                type="button"
                onClick={() => setEntryType("owner_withdrawal")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: isWithdrawal ? "#173d29" : "transparent",
                  color: isWithdrawal ? "#fff" : "#4b5d52",
                }}
              >
                <CircleDollarSign size={14} /> Owner Withdrawal
              </button>
            </div>

            {!isWithdrawal && (
              <div>
                <span style={{ fontSize: "11.5px", fontWeight: 650, color: "#55675c", display: "block", marginBottom: "6px" }}>Quick Category Select:</span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className="shopifyAccountQuickBtn"
                      style={category === cat ? { background: "#173d29", color: "#fff", borderColor: "#173d29" } : undefined}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="shopifyFinanceModalRow">
              <label>Amount (PKR)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="e.g. 2500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>

              <label>Paid From Account
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                  <option value="">Select Account</option>
                  <AccountOptions accounts={accounts} />
                </select>
              </label>
            </div>

            {!isWithdrawal && category === "Other" && (
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

            <label>What was it for? (Description)
              <input
                type="text"
                required={!isWithdrawal}
                placeholder={isWithdrawal ? "e.g. Personal / family drawing" : "e.g. Farshi shalwar stitching 15 suits, Meta Ad receipt #482"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <div className="shopifyFinanceModalRow">
              <label>{isWithdrawal ? "Withdrawn By" : "Paid To (Tailor / Vendor)"}
                <input
                  type="text"
                  placeholder={isWithdrawal ? "e.g. Owner" : "e.g. Master Amina, Cloth House"}
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
              <label>Receipt / Reference (Optional)
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
            <button type="submit" className="shopifyModalSubmitBtn" disabled={busy || !(Number(amount) > 0) || !accountId}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {busy ? "Recording..." : isWithdrawal ? "Record Withdrawal" : "Record Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IncomeModal({ accounts, defaultAccountId, defaultEntryType = "other_income", postexReceivablePkr = 0, busy, onClose, onSubmit }) {
  const sorted = sortFinanceAccounts(accounts);
  const alfalah = sorted.find((a) => a.slug === "alfalah_owner") || sorted[0];
  const [entryType, setEntryType] = useState(defaultEntryType);
  const [amount, setAmount] = useState(defaultEntryType === "postex_bank_receipt" && postexReceivablePkr > 0 ? String(Math.round(postexReceivablePkr)) : "");
  const [accountId, setAccountId] = useState(
    defaultAccountId || (defaultEntryType === "postex_bank_receipt" ? alfalah?.id : sorted[0]?.id) || ""
  );
  const [title, setTitle] = useState(defaultEntryType === "postex_bank_receipt" ? "PostEx bank payout receipt" : "");
  const [counterparty, setCounterparty] = useState(defaultEntryType === "postex_bank_receipt" ? "PostEx COD Payout" : "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  function handleTypeChange(nextType) {
    setEntryType(nextType);
    if (nextType === "postex_bank_receipt") {
      if (alfalah) setAccountId(alfalah.id);
      if (!title) setTitle("PostEx bank payout receipt");
      setCounterparty("PostEx COD Payout");
      if (!amount && postexReceivablePkr > 0) setAmount(String(Math.round(postexReceivablePkr)));
    }
  }

  return (
    <div className="shopifyFinanceModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shopifyFinanceModalCard">
        <div className="shopifyFinanceModalHead">
          <h3>
            <CircleDollarSign size={18} className="text-[#166534]" /> Record Income / Bank Receipt
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#667a6e" }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const numAmount = Number(amount || 0);
            if (!(numAmount > 0) || !accountId) return;
            const finalTitle = title.trim() || (
              entryType === "postex_bank_receipt"
                ? `PostEx bank receipt${reference ? `: ${reference}` : ""}`
                : entryType === "owner_investment"
                  ? "Owner funds added"
                  : "Business income"
            );
            await onSubmit({
              entryType,
              accountId,
              category:
                entryType === "owner_investment"
                  ? "Owner capital"
                  : entryType === "postex_bank_receipt"
                    ? "PostEx payout"
                    : "Business income",
              title: finalTitle,
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
              <label>Receipt / Income Type
                <select value={entryType} onChange={(e) => handleTypeChange(e.target.value)} required>
                  <option value="postex_bank_receipt">PostEx Bank Payout Receipt</option>
                  <option value="owner_investment">Owner Funds Added (Capital)</option>
                  <option value="other_income">Other Business Income</option>
                </select>
              </label>

              <label>Amount Received (PKR)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="e.g. 18500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
            </div>

            {entryType === "postex_bank_receipt" && (
              <div style={{ padding: "10px 12px", borderRadius: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: "12px", color: "#166534" }}>
                <b>PostEx Receivable: {money(postexReceivablePkr)}</b> — Jab PostEx ki payment aapke bank mein aaye, uska CPR / Bank Reference neeche likhein taake Available Cash barh jaye aur PostEx Receivable kam ho jaye.
              </div>
            )}

            <label>Received In Account
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                <option value="">Select Account</option>
                <AccountOptions accounts={accounts} />
              </select>
            </label>

            <div className="shopifyFinanceModalRow">
              <label>{entryType === "postex_bank_receipt" ? "CPR Number / Bank Ref *" : "Reference (Optional)"}
                <input
                  type="text"
                  required={entryType === "postex_bank_receipt"}
                  placeholder={entryType === "postex_bank_receipt" ? "e.g. CPR-2026-W42 or Bank Ref" : "Deposit slip, Bank transfer id"}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
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

            <div className="shopifyFinanceModalRow">
              <label>Description (Title)
                <input
                  type="text"
                  placeholder="e.g. PostEx payout, Exhibition sale"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              <label>Received From (Source)
                <input
                  type="text"
                  placeholder="e.g. PostEx, Walk-in customer"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                />
              </label>
            </div>

            <label>Extra Note (Optional)
              <input
                type="text"
                placeholder="Any extra note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>

          <div className="shopifyFinanceModalFoot">
            <button type="button" className="shopifyModalCancelBtn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="shopifyModalSubmitBtn" disabled={busy || !(Number(amount) > 0) || !accountId}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {busy ? "Recording..." : "Save Receipt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransferModal({ accounts, defaultFromAccountId, busy, onClose, onSubmit }) {
  const sorted = sortFinanceAccounts(accounts);
  const [fromAccountId, setFromAccountId] = useState(defaultFromAccountId || sorted[0]?.id || "");
  const [toAccountId, setToAccountId] = useState(sorted.find((a) => a.id !== (defaultFromAccountId || sorted[0]?.id))?.id || "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("Account transfer");

  const fromAcc = sorted.find((a) => String(a.id) === String(fromAccountId));
  const toAcc = sorted.find((a) => String(a.id) === String(toAccountId));
  const numAmount = Number(amount || 0);

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
              NayaPay ya Bank Alfalah se Cash in Hand — paisa sirf account badalta hai, total business cash aur P&amp;L par koi farq nahi parta.
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

            {fromAcc && toAcc && fromAccountId !== toAccountId && numAmount > 0 && (
              <div style={{ padding: "10px 12px", borderRadius: "8px", background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: "12px", color: "#1e3a8a", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <span><b>{fromAcc.name}:</b> {money(fromAcc.balancePkr)} → <b>{money(fromAcc.balancePkr - numAmount)}</b></span>
                <span><b>{toAcc.name}:</b> {money(toAcc.balancePkr)} → <b>{money(toAcc.balancePkr + numAmount)}</b></span>
              </div>
            )}

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
                  autoFocus
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
                  placeholder="Bank transaction ID / ATM withdrawal"
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
              disabled={busy || !(numAmount > 0) || !fromAccountId || !toAccountId || fromAccountId === toAccountId}
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

function AdjustBalanceModal({ account, busy, onClose, onSubmit }) {
  const [mode, setMode] = useState("reconcile"); // "reconcile" | "opening"
  const [targetBalance, setTargetBalance] = useState(String(Math.round(Number(account.balancePkr || 0))));
  const [openingBalance, setOpeningBalance] = useState(String(Math.round(Number(account.openingBalancePkr || 0))));
  const [holder, setHolder] = useState(account.holder || "");
  const [note, setNote] = useState("");

  const diff = Math.round((Number(targetBalance || 0) - Number(account.balancePkr || 0)) * 100) / 100;

  return (
    <div className="shopifyFinanceModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shopifyFinanceModalCard">
        <div className="shopifyFinanceModalHead">
          <h3>
            <Settings2 size={18} className="text-[#173d29]" /> Adjust Balance — {account.name}
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#667a6e" }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (mode === "reconcile") {
              await onSubmit({
                accountId: account.id,
                mode: "reconcile",
                targetBalancePkr: Number(targetBalance || 0),
                note: note || `Reconciled ${account.name} to actual balance`,
              });
            } else {
              await onSubmit({
                accountId: account.id,
                mode: "opening",
                openingBalancePkr: Number(openingBalance || 0),
                holder,
                note: note || account.note,
              });
            }
          }}
        >
          <div className="shopifyFinanceModalBody">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f4f7f5", padding: "4px", borderRadius: "8px" }}>
              <button
                type="button"
                onClick={() => setMode("reconcile")}
                style={{
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: mode === "reconcile" ? "#173d29" : "transparent",
                  color: mode === "reconcile" ? "#fff" : "#4b5d52",
                }}
              >
                Match Actual Balance Today
              </button>
              <button
                type="button"
                onClick={() => setMode("opening")}
                style={{
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: mode === "opening" ? "#173d29" : "transparent",
                  color: mode === "opening" ? "#fff" : "#4b5d52",
                }}
              >
                Set Opening Balance
              </button>
            </div>

            {mode === "reconcile" ? (
              <>
                <p style={{ margin: 0, fontSize: "12.5px", color: "#55675c" }}>
                  Apne bank ya wallet app mein is waqt jo asal balance hai woh enter karein. System farq ({diff >= 0 ? `+${money(diff)}` : money(diff)}) ki adjustment entry khud bana dega.
                </p>
                <div className="shopifyFinanceModalRow">
                  <label>System Balance Right Now
                    <input type="text" readOnly value={money(account.balancePkr)} style={{ background: "#f8faf9" }} />
                  </label>
                  <label>Actual Real Balance Today (PKR)
                    <input
                      type="number"
                      step="0.01"
                      required
                      autoFocus
                      value={targetBalance}
                      onChange={(e) => setTargetBalance(e.target.value)}
                    />
                  </label>
                </div>
                <label>Reason / Note (Optional)
                  <input
                    type="text"
                    placeholder="e.g. Matched with Bank Alfalah app balance"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: "12.5px", color: "#55675c" }}>
                  Is account ka starting (opening) balance set karein jiske upar saari entries plus/minus hoti hain.
                </p>
                <div className="shopifyFinanceModalRow">
                  <label>Opening Balance (PKR)
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                    />
                  </label>
                  <label>Account Holder Name
                    <input
                      type="text"
                      value={holder}
                      onChange={(e) => setHolder(e.target.value)}
                      placeholder="e.g. Amina, Owner"
                    />
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="shopifyFinanceModalFoot">
            <button type="button" className="shopifyModalCancelBtn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="shopifyModalSubmitBtn" disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {busy ? "Saving..." : "Update Balance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTransactionModal({ entry, accounts, busy, onClose, onSubmit }) {
  const [accountId, setAccountId] = useState(entry.account_id || "");
  const [title, setTitle] = useState(entry.title || "");
  const [category, setCategory] = useState(entry.category || "Other");
  const [amountPkr, setAmountPkr] = useState(String(entry.amount_pkr || ""));
  const [occurredOn, setOccurredOn] = useState(String(entry.occurred_on || "").slice(0, 10));
  const [counterparty, setCounterparty] = useState(entry.counterparty || "");
  const [reference, setReference] = useState(entry.reference || "");
  const [note, setNote] = useState(entry.note || "");

  return (
    <div className="shopifyFinanceModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shopifyFinanceModalCard">
        <div className="shopifyFinanceModalHead">
          <h3>
            <Edit3 size={18} className="text-[#173d29]" /> Edit Finance Entry
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#667a6e" }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit({
              accountId: accountId || null,
              title,
              category,
              amountPkr: Number(amountPkr || 0),
              occurredOn,
              counterparty,
              reference,
              note,
            });
          }}
        >
          <div className="shopifyFinanceModalBody">
            <div className="shopifyFinanceModalRow">
              <label>Account
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                  <option value="">Select Account</option>
                  <AccountOptions accounts={accounts} />
                </select>
              </label>
              <label>Amount (PKR)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={amountPkr}
                  onChange={(e) => setAmountPkr(e.target.value)}
                />
              </label>
            </div>

            <div className="shopifyFinanceModalRow">
              <label>Category
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </label>
              <label>Date
                <input
                  type="date"
                  required
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                />
              </label>
            </div>

            <label>Title / Description
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <div className="shopifyFinanceModalRow">
              <label>Counterparty / Vendor
                <input
                  type="text"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                />
              </label>
              <label>Reference
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
            </div>

            <label>Note
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>

          <div className="shopifyFinanceModalFoot">
            <button type="button" className="shopifyModalCancelBtn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="shopifyModalSubmitBtn" disabled={busy || !accountId || !(Number(amountPkr) > 0)}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {busy ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VoidConfirmModal({ entry, busy, onClose, onConfirm }) {
  return (
    <div className="shopifyFinanceModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shopifyFinanceModalCard" style={{ maxWidth: "440px" }}>
        <div className="shopifyFinanceModalHead">
          <h3 style={{ color: "#991b1b" }}>
            <AlertTriangle size={18} /> Void Finance Entry?
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#667a6e" }}>
            <X size={18} />
          </button>
        </div>

        <div className="shopifyFinanceModalBody">
          <p style={{ margin: 0, fontSize: "13px", color: "#4b5d52", lineHeight: 1.5 }}>
            Kya aap waqai is entry ko <b>Void</b> karna chahte hain? Void karne se iska cash effect reverse ho jayega aur audit ke liye record strike-through rahega.
          </p>
          <div style={{ padding: "12px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", fontSize: "13px" }}>
            <div><b>{entry.title}</b></div>
            <div style={{ color: "#991b1b", fontWeight: 700, marginTop: "4px" }}>
              {entry.cash_direction === "in" ? "+" : "-"} {money(entry.amount_pkr)} · {formatDate(entry.occurred_on)}
            </div>
          </div>
        </div>

        <div className="shopifyFinanceModalFoot">
          <button type="button" className="shopifyModalCancelBtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="shopifyModalSubmitBtn"
            style={{ background: "#b91c1c" }}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            {busy ? "Voiding..." : "Yes, Void Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SupplierBillModal({ accounts, busy, onClose, onSubmit }) {
  const sorted = sortFinanceAccounts(accounts);
  const [paidAmount, setPaidAmount] = useState("0");
  const [accountId, setAccountId] = useState(sorted[0]?.id || "");

  return (
    <div className="shopifyFinanceModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shopifyFinanceModalCard">
        <div className="shopifyFinanceModalHead">
          <h3>
            <Landmark size={18} className="text-[#9a3412]" /> Add Supplier Bill / Payable
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#667a6e" }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            await onSubmit({
              supplier: data.get("supplier"),
              reference: data.get("reference"),
              totalPkr: Number(data.get("total") || 0),
              paid: Number(data.get("paid") || 0),
              billDate: data.get("date"),
              dueDate: data.get("dueDate"),
              note: data.get("note"),
              accountId: Number(data.get("paid") || 0) > 0 ? accountId : null,
            });
          }}
        >
          <div className="shopifyFinanceModalBody">
            <div className="shopifyFinanceModalRow">
              <label>Supplier / Vendor Name
                <input name="supplier" required autoFocus placeholder="e.g. Master Amina, Farhan Fabric" />
              </label>
              <label>Bill Reference / WhatsApp Ref
                <input name="reference" placeholder="e.g. Inv #849" />
              </label>
            </div>

            <div className="shopifyFinanceModalRow">
              <label>Total Bill (PKR)
                <input name="total" type="number" min="1" required placeholder="0" />
              </label>
              <label>Already Paid Now (PKR)
                <input name="paid" type="number" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              </label>
            </div>

            {Number(paidAmount) > 0 && (
              <label>Paid From Account
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                  <option value="">Select Account</option>
                  <AccountOptions accounts={accounts} />
                </select>
              </label>
            )}

            <div className="shopifyFinanceModalRow">
              <label>Bill Date
                <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
              <label>Due Date
                <input name="dueDate" type="date" />
              </label>
            </div>

            <label>Bill Note
              <input name="note" placeholder="Fabric details, quantity etc." />
            </label>
          </div>

          <div className="shopifyFinanceModalFoot">
            <button type="button" className="shopifyModalCancelBtn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="shopifyModalSubmitBtn" disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {busy ? "Saving..." : "Save Supplier Bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CampaignModal({ accounts, busy, onClose, onSubmit }) {
  const sorted = sortFinanceAccounts(accounts);
  const [recordExpense, setRecordExpense] = useState(true);
  const [accountId, setAccountId] = useState(sorted[0]?.id || "");

  return (
    <div className="shopifyFinanceModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shopifyFinanceModalCard">
        <div className="shopifyFinanceModalHead">
          <h3>
            <TrendingUp size={18} className="text-[#173d29]" /> Log Marketing Campaign / Ad Spend
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#667a6e" }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            await onSubmit({
              name: data.get("name"),
              platform: data.get("platform"),
              spendPkr: Number(data.get("spend") || 0),
              salesPkr: Number(data.get("sales") || 0),
              customers: Number(data.get("customers") || 0),
              occurredOn: data.get("date"),
              note: data.get("note"),
              recordExpense,
              accountId: recordExpense ? accountId : null,
            });
          }}
        >
          <div className="shopifyFinanceModalBody">
            <div className="shopifyFinanceModalRow">
              <label>Campaign Name
                <input name="name" required autoFocus placeholder="e.g. Summer Lawn Meta Ads" />
              </label>
              <label>Platform
                <select name="platform" defaultValue="Meta Ads">
                  <option>Meta Ads</option>
                  <option>Instagram</option>
                  <option>TikTok</option>
                  <option>Google Ads</option>
                  <option>Influencer / PR</option>
                  <option>Other</option>
                </select>
              </label>
            </div>

            <div className="shopifyFinanceModalRow">
              <label>Ad Spend (PKR)
                <input name="spend" type="number" min="0" required placeholder="e.g. 15000" />
              </label>
              <label>Attributed Sales (PKR)
                <input name="sales" type="number" min="0" defaultValue="0" placeholder="e.g. 65000" />
              </label>
            </div>

            <div className="shopifyFinanceModalRow">
              <label>New Customers Acquired
                <input name="customers" type="number" min="0" defaultValue="0" />
              </label>
              <label>Date
                <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
            </div>

            <label style={{ flexDirection: "row", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={recordExpense}
                onChange={(e) => setRecordExpense(e.target.checked)}
                style={{ width: "auto" }}
              />
              <span>Also deduct this Ad Spend from Cash Ledger automatically</span>
            </label>

            {recordExpense && (
              <label>Paid From Account
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                  <option value="">Select Account</option>
                  <AccountOptions accounts={accounts} />
                </select>
              </label>
            )}

            <label>Note (Optional)
              <input name="note" placeholder="Target audience, ROAS note..." />
            </label>
          </div>

          <div className="shopifyFinanceModalFoot">
            <button type="button" className="shopifyModalCancelBtn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="shopifyModalSubmitBtn" disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {busy ? "Saving..." : "Save Campaign"}
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
    <div style={{ padding: "16px 20px" }}>
      <div className="financeTrendLegend">
        <span><i className="financeTrendRevenue" /> Revenue</span>
        <span><i className="financeTrendProfit" /> Profit</span>
      </div>
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
      </div>
    </div>
  );
}

function PayBillButton({ bill, accounts, busy, onPay }) {
  const sorted = sortFinanceAccounts(accounts);
  const remaining = Number(bill.remaining_pkr || 0);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(remaining));
  const [accountId, setAccountId] = useState(sorted[0]?.id || "");

  useEffect(() => {
    if (!open) {
      setAmount(String(remaining));
      setAccountId(sorted[0]?.id || "");
    }
  }, [open, remaining]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <button type="submit" disabled={busy || !accountId || !(Number(amount) > 0) || Number(amount) > remaining} aria-busy={busy}>{busy ? "..." : "Confirm Pay"}</button>
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
  const sorted = sortFinanceAccounts(accounts);
  const [paidAmount, setPaidAmount] = useState("0");
  const [defaultAcc] = useState(sorted[0]?.id || "");

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
        <AccountSelect accounts={accounts} name="accountId" defaultValue={defaultAcc} required={Number(paidAmount) > 0} label="Paid From Account (If already paid)" />
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

function PnlSettingsForm({ settings, busy, onSave }) {
  const [monthlyFixed, setMonthlyFixed] = useState(settings.monthlyFixedCostsPkr || 0);
  const [lowCash, setLowCash] = useState(settings.lowCashThresholdPkr || 0);

  useEffect(() => {
    setMonthlyFixed(settings.monthlyFixedCostsPkr || 0);
    setLowCash(settings.lowCashThresholdPkr || 0);
  }, [settings.monthlyFixedCostsPkr, settings.lowCashThresholdPkr]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          monthly_fixed_costs_pkr: Math.max(0, Number(monthlyFixed || 0)),
          low_cash_threshold_pkr: Math.max(0, Number(lowCash || 0)),
        });
      }}
      style={{ display: "flex", flexDirection: "column", gap: "10px" }}
    >
      <div className="shopifyFinanceModalRow">
        <label style={{ margin: 0, fontSize: "12px", fontWeight: "650", color: "#122a1e" }}>
          Monthly Fixed Costs (Rent, Salaries)
          <input
            type="number"
            min="0"
            value={monthlyFixed}
            onChange={(e) => setMonthlyFixed(e.target.value)}
            style={{ width: "100%", marginTop: "4px", padding: "7px 10px", border: "1.5px solid #d4ded6", borderRadius: "8px", fontSize: "13px" }}
          />
        </label>
        <label style={{ margin: 0, fontSize: "12px", fontWeight: "650", color: "#122a1e" }}>
          Low Cash Alert Threshold (PKR)
          <input
            type="number"
            min="0"
            value={lowCash}
            onChange={(e) => setLowCash(e.target.value)}
            style={{ width: "100%", marginTop: "4px", padding: "7px 10px", border: "1.5px solid #d4ded6", borderRadius: "8px", fontSize: "13px" }}
          />
        </label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="shopifyPrimaryButton" disabled={busy} style={{ padding: "6px 14px", fontSize: "12.5px" }}>
          {busy ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}

function AllocationForm({ settings, busy, onSave }) {
  const [marketingPct, setMarketingPct] = useState(settings.marketingPercent ?? 25);
  const [ownerPct, setOwnerPct] = useState(settings.ownerPercent ?? 30);

  useEffect(() => {
    setMarketingPct(settings.marketingPercent ?? 25);
    setOwnerPct(settings.ownerPercent ?? 30);
  }, [settings.marketingPercent, settings.ownerPercent]);

  const stockPct = Math.max(0, 100 - Number(marketingPct || 0) - Number(ownerPct || 0));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const m = Math.min(100, Math.max(0, Number(marketingPct || 0)));
        const o = Math.min(100 - m, Math.max(0, Number(ownerPct || 0)));
        onSave({ marketing_percent: m, owner_percent: o });
      }}
      style={{ display: "flex", flexDirection: "column", gap: "10px" }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
        <label style={{ fontSize: "12px", fontWeight: 650, color: "#122a1e" }}>
          Marketing %
          <input
            type="number"
            min="0"
            max="100"
            value={marketingPct}
            onChange={(e) => setMarketingPct(e.target.value)}
            style={{ width: "100%", marginTop: "4px", padding: "6px 8px", border: "1.5px solid #d4ded6", borderRadius: "8px", fontSize: "13px" }}
          />
        </label>
        <label style={{ fontSize: "12px", fontWeight: 650, color: "#122a1e" }}>
          Owner %
          <input
            type="number"
            min="0"
            max="100"
            value={ownerPct}
            onChange={(e) => setOwnerPct(e.target.value)}
            style={{ width: "100%", marginTop: "4px", padding: "6px 8px", border: "1.5px solid #d4ded6", borderRadius: "8px", fontSize: "13px" }}
          />
        </label>
        <label style={{ fontSize: "12px", fontWeight: 650, color: "#667a6e" }}>
          Stock Reserve %
          <input
            type="text"
            readOnly
            value={`${stockPct}%`}
            style={{ width: "100%", marginTop: "4px", padding: "6px 8px", border: "1.5px solid #e2e8e5", borderRadius: "8px", fontSize: "13px", background: "#f8faf9" }}
          />
        </label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="shopifyPrimaryButton" disabled={busy} style={{ padding: "6px 14px", fontSize: "12.5px" }}>
          {busy ? "Saving..." : "Update Allocation Plan"}
        </button>
      </div>
    </form>
  );
}

function UnassignedFixer({ accounts, transactions, busy, onAssign }) {
  const sorted = sortFinanceAccounts(accounts);
  const [selected, setSelected] = useState(() => transactions.map((t) => t.id));
  const [accountId, setAccountId] = useState(sorted[0]?.id || "");

  return (
    <Card
      title="Unassigned Entries — 1-Click Account Link"
      subtitle="Ye entries kisi account se linked nahi hain. Account select kar ke 1 click mein assign kar dein."
    >
      <div className="financeAssignBar" style={{ display: "flex", gap: "10px", alignItems: "flex-end", marginBottom: "14px", flexWrap: "wrap", padding: "16px 20px 0" }}>
        <div style={{ minWidth: "240px" }}>
          <AccountSelect accounts={accounts} label="Assign to account" value={accountId} onChange={(event) => setAccountId(event.target.value)} />
        </div>
        <button
          type="button"
          className="shopifyPrimaryButton"
          disabled={busy || !accountId || !selected.length}
          aria-busy={busy}
          onClick={() => onAssign(selected, accountId).then?.(() => setSelected([]))}
        >
          {busy ? "Assigning..." : selected.length ? `Assign ${selected.length} Entries Now` : "Select entries"}
        </button>
        <button
          type="button"
          className="shopifySecondaryButton"
          onClick={() => setSelected(selected.length === transactions.length ? [] : transactions.map((entry) => entry.id))}
        >
          {selected.length === transactions.length ? "Deselect All" : "Select All"}
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
            <td><b>{entry.title}</b> <small style={{ color: "#667a6e" }}>({entry.category})</small></td>
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
