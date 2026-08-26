"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeftRight, CircleDollarSign, Landmark, Package,
  ReceiptText, RefreshCw, ShoppingBag, TrendingUp, WalletCards,
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
  ["payments", "Payments"],
  ["reports", "Reports"],
];

function money(value) {
  return `Rs. ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function percent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** A number with the plain-language line that explains where it came from. */
function Kpi({ icon: Icon, label, value, help, tone = "" }) {
  return (
    <article className={`financeKpi ${tone}`}>
      <Icon />
      <span>
        <b>{value}</b>
        {label}
        {help ? <small>{help}</small> : null}
      </span>
    </article>
  );
}

function StatementRow({ label, value, help, strong = false, sign = "" }) {
  return (
    <div className={strong ? "statementTotal" : ""}>
      <span>
        {label}
        {help ? <small className="financeRowHelp">{help}</small> : null}
      </span>
      <b>{sign}{sign ? " " : ""}{value}</b>
    </div>
  );
}

function Card({ title, subtitle, right, children, className = "" }) {
  return (
    <div className={`adminCard financeSummaryCard ${className}`}>
      <div className="cardHeading">
        <div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
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

  const query = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (period === "custom") {
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    return params;
  }, [period, customFrom, customTo]);

  const load = useCallback(async ({ withTrend = false } = {}) => {
    if (period === "custom" && (!customFrom || !customTo)) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(query);
      if (withTrend) params.set("trend", "1");
      const response = await fetch(`/api/admin/finance?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Finance report load nahi ho saka.");
      setReport(result.report);
      if (result.trend) setTrend(result.trend);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [query, period, customFrom, customTo]);

  useEffect(() => { load({ withTrend: tab === "reports" && !trend.length }); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

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
      return result;
    } catch (actionError) {
      setError(actionError.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (!isOwner) {
    return <div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Finance</h2><p>Ye section sirf Owner ke liye hai.</p></div></div></div>;
  }

  if (loading && !report) {
    return <div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Finance</h2><p>Numbers load ho rahe hain...</p></div></div></div>;
  }

  if (error && !report) {
    return (
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Finance</h2><p>{error}</p></div></div>
        <button type="button" onClick={() => load()}>Dobara koshish karein</button>
      </div>
    );
  }

  if (!report) return null;

  const { cash, sales, pnl, postex, advances, suppliers, marketing, inventory, accounts, alerts, products, categories, orders, settings } = report;

  return (
    <div className="financeWorkspace">
      {showTitle && (
        <div className="adminTitle">
          <div>
            <p>FINANCE MANAGER</p>
            <h1>Finances</h1>
            <span>{report.period.label} — har number isi period ka hai: sales, expenses, cashbook, suppliers, sab.</span>
          </div>
          <button type="button" onClick={() => load({ withTrend: true })} disabled={loading}>
            <RefreshCw /> {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      )}

      <div className="financePeriodBar">
        <div className="orderTabs">
          {PERIODS.map(([value, label]) => (
            <button type="button" key={value} className={period === value ? "active" : ""} onClick={() => setPeriod(value)}>{label}</button>
          ))}
        </div>
        {period === "custom" && (
          <div className="financeRangePicker">
            <label>From<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label>
            <label>To<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label>
          </div>
        )}
      </div>

      <nav className="financeSectionTabs orderTabs" aria-label="Finance sections">
        {TABS.map(([value, label]) => (
          <button type="button" key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}</button>
        ))}
      </nav>

      {error && <div className="adminErrorBanner financeErrorBanner">{error}</div>}
      {notice && <div className="financeSetupBanner financeSetupBannerDone"><div><b>Ho gaya</b><span>{notice}</span></div></div>}

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

      {tab === "overview" && (
        <>
          <div className="miniMetricGrid financeMetrics">
            <Kpi icon={WalletCards} label="Available cash" value={money(cash.availableCashPkr)} help="Jo paisa abhi kharch kar sakte hain" tone={cash.availableCashPkr < 0 ? "alertMetric" : ""} />
            <Kpi icon={CircleDollarSign} label="Sales (delivered)" value={money(sales.grossRevenuePkr)} help={`${sales.deliveredOrders} orders`} />
            <Kpi icon={TrendingUp} label="Net profit" value={money(pnl.netProfitPkr)} help={`${percent(pnl.marginPercent)} margin`} tone={pnl.netProfitPkr < 0 ? "alertMetric" : ""} />
            <Kpi icon={Landmark} label="PostEx receivable" value={money(postex.receivablePkr)} help="Deliver ho chuka, bank mein abhi nahi aaya" tone={postex.receivablePkr ? "alertMetric" : ""} />
            <Kpi icon={CircleDollarSign} label="Advance received" value={money(advances.verifiedPkr)} help={`${money(advances.pendingPkr)} abhi unverified`} />
            <Kpi icon={Package} label="Units sold" value={sales.unitsSold} help={`${money(sales.averageOrderValuePkr)} average order`} />
            <Kpi icon={ShoppingBag} label="Returned orders" value={sales.returnedOrders} help={`${percent(sales.returnRatePercent)} return rate`} tone={sales.returnedOrders ? "alertMetric" : ""} />
            <Kpi icon={Landmark} label="Supplier payable" value={money(suppliers.payablePkr)} help={suppliers.overdue.length ? `${suppliers.overdue.length} overdue` : "Koi overdue nahi"} tone={suppliers.overdue.length ? "alertMetric" : ""} />
          </div>

          <section className="financeGrid financeGridWide">
            <Card title="Money in" subtitle="Sirf woh paisa jo asal mein mila — is period mein.">
              <div className="financeStatement">
                <StatementRow label="PostEx bank receipts" value={money(cash.postexReceiptsPkr)} sign="+" help="Aap ne bank mein confirm kiye" />
                <StatementRow label="Customer advances" value={money(cash.advanceReceiptsPkr)} sign="+" help="Verified advance, NayaPay mein" />
                <StatementRow label="Other income" value={money(cash.otherIncomePkr)} sign="+" />
                <StatementRow label="Owner funds added" value={money(cash.ownerInvestmentsPkr)} sign="+" />
                <StatementRow label="Total in" value={money(cash.inPkr)} strong />
              </div>
            </Card>
            <Card title="Money out" subtitle="Stock ka kharcha abhi cash kam karta hai; profit mein tab ginta hai jab woh maal bikta hai.">
              <div className="financeStatement">
                <StatementRow label="Stock / production" value={money(cash.inventorySpendPkr)} sign="-" help="Fabric, stitching, lace" />
                <StatementRow label="Operating expenses" value={money(cash.operatingExpensesPkr)} sign="-" />
                <StatementRow label="Supplier payments" value={money(cash.supplierPaymentsPkr)} sign="-" />
                <StatementRow label="Owner withdrawals" value={money(cash.ownerWithdrawalsPkr)} sign="-" />
                <StatementRow label="Total out" value={money(cash.outPkr)} strong />
              </div>
            </Card>
          </section>

          <section className="financeGrid financeGridWide">
            <Card title="Best & worst products" subtitle="Delivered units par profit — cost sale ke waqt wali use hoti hai.">
              <Table head={["Product", "Units", "Revenue", "Profit", "Margin"]} empty="Is period mein koi delivered sale nahi." >
                {products.slice(0, 8).map((row) => (
                  <tr key={row.productId || row.name}>
                    <td><b>{row.name}</b>{row.sku ? <small className="trackingNumber"><br />{row.sku}</small> : null}</td>
                    <td>{row.units}</td>
                    <td>{money(row.revenuePkr)}</td>
                    <td className={row.profitPkr < 0 ? "expenseAmount" : "incomeAmount"}>{money(row.profitPkr)}</td>
                    <td>{percent(row.marginPercent)}</td>
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
                    <td className={row.profitPkr < 0 ? "expenseAmount" : "incomeAmount"}>{money(row.profitPkr)}</td>
                    <td>{percent(row.marginPercent)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </section>

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
        </>
      )}

      {tab === "cash" && (
        <>
          <div className="miniMetricGrid financeMetrics">
            {accounts.map((account) => (
              <Kpi
                key={account.id}
                icon={account.kind === "cash" ? WalletCards : Landmark}
                label={account.name}
                value={money(account.balancePkr)}
                help={`${account.movementCount} movements${account.holder ? ` · ${account.holder}` : ""}`}
                tone={account.balancePkr < 0 ? "alertMetric" : ""}
              />
            ))}
            {cash.unassignedBalancePkr !== 0 && (
              <Kpi icon={AlertTriangle} label="Unassigned" value={money(cash.unassignedBalancePkr)} help="Purani entries — account set karna baaki hai" tone="alertMetric" />
            )}
            <Kpi icon={WalletCards} label="Total available cash" value={money(cash.availableCashPkr)} help="Sab accounts ka jor" />
          </div>

          <section className="financeGrid financeGridWide">
            <AddMovementForm accounts={accounts} busy={busy} onSubmit={(entry) => post({ action: "add_transaction", entry }, "Cash movement save ho gaya.")} />
            <TransferForm accounts={accounts} busy={busy} onSubmit={(body) => post({ action: "transfer", ...body }, "Transfer record ho gaya.")} />
          </section>

          <Card title="Cash ledger" subtitle={`${report.transactions.length} movements is period mein. Voided entries ka cash par koi asar nahi hota.`} className="managementCard">
            <Table head={["Date", "Type", "Detail", "Account", "Amount", ""]} empty="Is period mein koi cash movement nahi.">
              {report.transactions.map((entry) => {
                const account = accounts.find((row) => row.id === entry.account_id);
                return (
                  <tr key={entry.id} className={entry.voided ? "financeVoidedRow" : ""}>
                    <td>{formatDate(entry.occurred_on)}</td>
                    <td>{entry.entry_type.replaceAll("_", " ")}</td>
                    <td><b>{entry.title}</b>{entry.counterparty ? <small className="trackingNumber"><br />{entry.counterparty}</small> : null}</td>
                    <td>{account?.name || <span className="expenseAmount">Unassigned</span>}</td>
                    <td className={entry.cash_direction === "in" ? "incomeAmount" : "expenseAmount"}>
                      {entry.cash_direction === "in" ? "+" : "-"} {money(entry.amount_pkr)}
                    </td>
                    <td>
                      {entry.voided
                        ? <small className="trackingNumber">Voided</small>
                        : entry.production_batch_id
                          ? <small className="trackingNumber">Use batch</small>
                          : <VoidButton entry={entry} busy={busy} onVoid={(confirmation) => post({ action: "void_transaction", transactionId: entry.id, confirmation }, "Entry void ho gayi.")} />}
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

      {tab === "pnl" && (
        <>
          <section className="financeGrid financeGridWide">
            <Card title="Profit & Loss" subtitle="Sirf delivered orders. Product cost woh use hoti hai jo delivery ke waqt lock hui thi." right={<b>{percent(pnl.marginPercent)} margin</b>}>
              <div className="financeStatement">
                <StatementRow label="Sales revenue" value={money(pnl.revenuePkr)} sign="+" help={`${sales.deliveredOrders} delivered orders`} />
                <StatementRow label="Less: cost of goods sold" value={money(pnl.cogsPkr)} sign="-" help={pnl.estimatedCogsOrderCount ? `${pnl.estimatedCogsOrderCount} orders ki cost abhi estimate hai` : "Sab orders ki cost locked hai"} />
                <StatementRow label="Gross profit" value={money(pnl.grossProfitPkr)} />
                <StatementRow label="Less: PostEx GST" value={money(pnl.gstPkr)} sign="-" />
                <StatementRow label="Less: PostEx 4% deduction" value={money(pnl.taxPkr)} sign="-" />
                <StatementRow label="Less: courier delivery cost" value={money(pnl.courierCostPkr)} sign="-" />
                <StatementRow label="Less: return loss" value={money(pnl.returnLossPkr)} sign="-" help="Actual PostEx return charges" />
                <StatementRow label="Less: operating expenses" value={money(pnl.operatingExpensesPkr)} sign="-" />
                <StatementRow label="Net profit" value={money(pnl.netProfitPkr)} strong />
              </div>
            </Card>
            <Card title="Break-even" subtitle="Har delivered order kitna contribute karta hai, aur fixed costs cover karne ke liye kitne orders chahiyen.">
              <div className="financeStatement">
                <StatementRow label="Contribution per order" value={money(pnl.contributionPerOrderPkr)} help="Sale − product cost − courier − GST/tax" />
                <StatementRow label="Monthly fixed costs" value={money(settings.monthlyFixedCostsPkr)} help="Rent, salaries, utilities" />
                <StatementRow label="Break-even orders" value={pnl.breakEvenOrders || "—"} strong />
              </div>
              <FixedCostForm value={settings.monthlyFixedCostsPkr} busy={busy} onSave={(monthly) => post({ action: "save_settings", settings: { monthly_fixed_costs_pkr: monthly } }, "Fixed costs save ho gaye.")} />
            </Card>
          </section>

          <Card title="Order-wise profit" subtitle="Har delivered order par asal profit. Loss wale orders laal hain." className="managementCard">
            <Table head={["Order", "Customer", "Delivered", "Sale", "Cost", "Courier+Tax", "Profit"]} empty="Is period mein koi delivered order nahi.">
              {orders.slice(0, 60).map((row) => (
                <tr key={row.id} className={row.netProfitPkr < 0 ? "financeLossRow" : ""}>
                  <td><b>{row.orderNumber ? `#${row.orderNumber}` : String(row.id).slice(0, 8)}</b></td>
                  <td>{row.customer}{row.city ? <small className="trackingNumber"><br />{row.city}</small> : null}</td>
                  <td>{formatDate(row.deliveredAt)}</td>
                  <td>{money(row.revenuePkr)}</td>
                  <td>{money(row.costPkr)}{row.costEstimated ? <small className="trackingNumber"><br />estimate</small> : null}</td>
                  <td>{money(row.courierCostPkr + row.gstPkr + row.taxPkr)}</td>
                  <td className={row.netProfitPkr < 0 ? "expenseAmount" : "incomeAmount"}>{money(row.netProfitPkr)}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {tab === "payments" && (
        <>
          <div className="miniMetricGrid financeMetrics">
            <Kpi icon={Landmark} label="PostEx expected (all time)" value={money(postex.expectedNetAllTimePkr)} help="Delivered orders ka net, deductions ke baad" />
            <Kpi icon={WalletCards} label="Bank mein confirm hua" value={money(postex.receivedPkr)} help="Aap ne khud verify kiya" />
            <Kpi icon={AlertTriangle} label="Abhi milna baaki" value={money(postex.receivablePkr)} tone={postex.receivablePkr ? "alertMetric" : ""} />
            <Kpi icon={CircleDollarSign} label="Advance verified" value={money(advances.verifiedPkr)} help={`${money(advances.pendingPkr)} pending verification`} />
          </div>

          {(advances.notInCashCount > 0 || pnl.estimatedCogsOrderCount > 0) && (
            <div className="financeSetupBanner">
              <div>
                <b>Purane orders ka finance data adhoora hai</b>
                <span>
                  {pnl.estimatedCogsOrderCount ? `${pnl.estimatedCogsOrderCount} delivered orders ki product cost abhi lock nahi hui. ` : ""}
                  {advances.notInCashCount ? `${advances.notInCashCount} verified advance abhi cash mein nahi gaya. ` : ""}
                  Backfill chalane se ye sab ek baar mein theek ho jayega — dobara chalane se kuch double nahi hoga.
                </span>
              </div>
              <button type="button" onClick={() => post({ action: "backfill" }, (result) => `${result.cogs?.snapshotted || 0} orders ki cost lock hui, ${result.advances?.recorded || 0} advance cash mein aaye.`)} disabled={busy}>
                {busy ? "Chal raha hai..." : "Run backfill"}
              </button>
            </div>
          )}

          <Card title="Customer advance receipts" subtitle="Verified advance NayaPay account mein cash ban jata hai. Unverified sirf pending dikhta hai." className="managementCard">
            <Table head={["Customer", "Order", "City", "Advance", "COD baqi", "Status"]} empty="Is period mein koi advance nahi.">
              {advances.rows.map((row) => (
                <tr key={row.id}>
                  <td><b>{row.customer}</b>{row.phone ? <small className="trackingNumber"><br />{row.phone}</small> : null}</td>
                  <td>{row.orderNumber ? `#${row.orderNumber}` : String(row.id).slice(0, 8)}</td>
                  <td>{row.city || "—"}</td>
                  <td className="incomeAmount"><b>+ {money(row.advancePkr)}</b></td>
                  <td>{row.codRemainingPkr === 0 ? "Rs. 0 (prepaid)" : money(row.codRemainingPkr)}</td>
                  <td><span className={`statusBadge ${row.verified ? "verified" : "pending"}`}>{row.verified ? "Verified — cash" : row.paymentStatus}</span></td>
                </tr>
              ))}
            </Table>
          </Card>

          {postex.stuckReceivables.length > 0 && (
            <Card title="PostEx ke paas phansa paisa" subtitle={`${settings.receivableStuckAlertDays}+ din se deliver ho chuke orders jin ka settlement abhi nahi hua.`} className="managementCard">
              <Table head={["Order", "Customer", "Delivered", "Amount", "Din"]} empty="Sab clear hai.">
                {postex.stuckReceivables.slice(0, 30).map((row) => (
                  <tr key={row.id}>
                    <td><b>{row.orderNumber ? `#${row.orderNumber}` : String(row.id).slice(0, 8)}</b></td>
                    <td>{row.customer}</td>
                    <td>{formatDate(row.deliveredAt)}</td>
                    <td>{money(row.amountPkr)}</td>
                    <td className="expenseAmount"><b>{row.daysWaiting}</b></td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}

          <section className="financeGrid financeGridWide">
            <Card title="Supplier payables" subtitle="Paid amount har payment se khud update hoti hai — manually theek karne ki zaroorat nahi." className="managementCard" right={<b>{money(suppliers.payablePkr)} due</b>}>
              <Table head={["Supplier", "Reference", "Due", "Bill", "Paid", "Baqi", ""]} empty="Koi supplier bill nahi.">
                {suppliers.bills.map((bill) => (
                  <tr key={bill.id}>
                    <td><b>{bill.supplier}</b></td>
                    <td>{bill.reference || "—"}</td>
                    <td className={bill.due_date && bill.due_date < new Date().toISOString().slice(0, 10) && Number(bill.remaining_pkr) > 0 ? "expenseAmount" : ""}>{bill.due_date || "—"}</td>
                    <td>{money(bill.total_pkr)}</td>
                    <td>{money(bill.paid_pkr)}</td>
                    <td>{money(bill.remaining_pkr)}</td>
                    <td>
                      {Number(bill.remaining_pkr) > 0 && (
                        <PayBillButton bill={bill} accounts={accounts} busy={busy} onPay={(amountPkr, accountId) => post({ action: "pay_supplier_bill", billId: bill.id, amountPkr, accountId }, "Payment record ho gayi.")} />
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

      {tab === "reports" && (
        <>
          <section className="financeGrid financeGridWide">
            <Card title="Period summary" subtitle={report.period.label}>
              <div className="financeStatement">
                <StatementRow label="Delivered sales" value={money(pnl.revenuePkr)} />
                <StatementRow label="Product cost" value={money(pnl.cogsPkr)} sign="-" />
                <StatementRow label="PostEx charges (GST + 4% + courier)" value={money(pnl.gstPkr + pnl.taxPkr + pnl.courierCostPkr)} sign="-" />
                <StatementRow label="Operating expenses" value={money(pnl.operatingExpensesPkr)} sign="-" />
                <StatementRow label="Net profit" value={money(pnl.netProfitPkr)} strong />
              </div>
            </Card>
            <Card title="Tax / GST summary" subtitle="PostEx ne jo GST aur 4% deduction kaata — filing ke liye.">
              <div className="financeStatement">
                <StatementRow label="GST deducted" value={money(pnl.gstPkr)} />
                <StatementRow label="4% deduction" value={money(pnl.taxPkr)} />
                <StatementRow label="Total deducted" value={money(pnl.gstPkr + pnl.taxPkr)} strong />
              </div>
            </Card>
          </section>

          <section className="financeGrid financeGridWide">
            <Card title="Marketing ROI" subtitle="Sirf woh sales jo aap ne campaign se attribute ki hain.">
              <div className="financeStatement">
                <StatementRow label="Campaign spend" value={money(marketing.spendPkr)} />
                <StatementRow label="Attributed sales" value={money(marketing.attributedSalesPkr)} />
                <StatementRow label="ROAS" value={marketing.roas ? `${marketing.roas}x` : "—"} help="1 rupee spend par kitni sale" />
                <StatementRow label="Customer acquisition cost" value={marketing.cacPkr ? money(marketing.cacPkr) : "—"} strong />
              </div>
            </Card>
            <Card title="Profit allocation plan" subtitle="Sirf plan hai — is se koi cash move nahi hota.">
              <div className="financeStatement">
                <StatementRow label="Allocatable net profit" value={money(pnl.allocation.allocatablePkr)} />
                <StatementRow label={`Marketing (${percent(settings.marketingPercent)})`} value={money(pnl.allocation.marketingPkr)} />
                <StatementRow label={`Owner / family (${percent(settings.ownerPercent)})`} value={money(pnl.allocation.ownerPkr)} />
                <StatementRow label={`New stock (${percent(settings.stockPercent)})`} value={money(pnl.allocation.stockPkr)} strong />
              </div>
            </Card>
          </section>

          <Card title="Last 12 months" subtitle="Har mahine ka sales aur profit — growth ya girawat saaf dekhein." className="managementCard">
            {trend.length ? <TrendChart rows={trend} /> : <p className="trackingNumber">Trend load ho raha hai...</p>}
          </Card>

          <Card title="Expense breakdown" subtitle="Is period mein paisa kis cheez par gaya." className="managementCard">
            <Table head={["Category", "Amount"]} empty="Koi expense nahi.">
              {cash.expenseByCategory.map((row) => (
                <tr key={row.category}><td><b>{row.category}</b></td><td className="expenseAmount">{money(row.amountPkr)}</td></tr>
              ))}
            </Table>
          </Card>

          <Card title="Downloads" subtitle="CSV Excel mein khul jayegi.">
            <div className="financeExportRow">
              <button type="button" onClick={() => downloadCsv("orders", orders, report)}><ReceiptText /> Order profit CSV</button>
              <button type="button" onClick={() => downloadCsv("products", products, report)}><ReceiptText /> Product profit CSV</button>
              <button type="button" onClick={() => downloadCsv("transactions", report.transactions, report)}><ReceiptText /> Cash ledger CSV</button>
              <button type="button" onClick={() => window.print()}><ReceiptText /> Monthly statement (print / PDF)</button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
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
      onClick={() => {
        const confirmation = window.prompt(`Ye entry void karne ke liye likhein:\nVOID ${entry.id}`, "");
        if (confirmation) onVoid(confirmation.trim());
      }}
    >
      Void
    </button>
  );
}

function PayBillButton({ bill, accounts, busy, onPay }) {
  return (
    <button
      type="button"
      className="editProductButton"
      disabled={busy}
      onClick={() => {
        const remaining = Number(bill.remaining_pkr || 0);
        const amount = Number(window.prompt(`${bill.supplier} ko payment. Baqi: Rs. ${remaining.toLocaleString()}`, String(remaining)) || 0);
        if (!amount) return;
        const accountName = window.prompt(`Kis account se? (${accounts.map((row) => row.name).join(" / ")})`, accounts[0]?.name || "");
        const account = accounts.find((row) => row.name.toLowerCase() === String(accountName || "").trim().toLowerCase());
        onPay(amount, account?.id || null);
      }}
    >
      Pay
    </button>
  );
}

function AddMovementForm({ accounts, busy, onSubmit }) {
  return (
    <form
      className="adminCard financeExpenseForm"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const form = event.currentTarget;
        onSubmit({
          entryType: data.get("entryType"),
          accountId: data.get("accountId") || null,
          category: data.get("category"),
          title: data.get("title"),
          counterparty: data.get("counterparty"),
          amountPkr: Number(data.get("amount") || 0),
          occurredOn: data.get("date"),
          reference: data.get("reference"),
          note: data.get("note"),
        });
        form.reset();
      }}
    >
      <h2>Add cash movement</h2>
      <p className="trackingNumber">Har asli cash movement yahan likhein. Expense, supplier payment aur withdrawal cash kam karte hain; income aur owner funds barhate hain.</p>
      <div className="formRow">
        <label>Money direction
          <select name="entryType">
            <option value="business_expense">Money paid / expense</option>
            <option value="other_income">Other business income</option>
            <option value="owner_investment">Owner funds added</option>
            <option value="owner_withdrawal">Owner withdrawal</option>
            <option value="postex_bank_receipt">PostEx bank receipt</option>
          </select>
        </label>
        <label>Account
          <select name="accountId">
            <option value="">Select account</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
      </div>
      <div className="formRow">
        <label>Category
          <select name="category">
            <option>Fabric / stock</option>
            <option>Tailoring / stitching</option>
            <option>Lace / embellishment</option>
            <option>Packaging</option>
            <option>Marketing</option>
            <option>Courier / delivery</option>
            <option>Rent &amp; utilities</option>
            <option>Salaries &amp; labour</option>
            <option>Operations</option>
            <option>Other</option>
          </select>
        </label>
        <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0" /></label>
      </div>
      <label>What was it for?<input name="title" required placeholder="e.g. Stitching payment for Farshi suits" /></label>
      <div className="formRow">
        <label>Tailor / supplier / source<input name="counterparty" placeholder="e.g. Amina Tailors" /></label>
        <label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
      </div>
      <div className="formRow">
        <label>Reference<input name="reference" placeholder="Invoice, bank ref, CPR" /></label>
        <label>Note<input name="note" placeholder="Extra detail" /></label>
      </div>
      <button disabled={busy}>{busy ? "Saving..." : "Save cash movement"}</button>
    </form>
  );
}

function TransferForm({ accounts, busy, onSubmit }) {
  return (
    <form
      className="adminCard financeExpenseForm"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const form = event.currentTarget;
        onSubmit({
          fromAccountId: data.get("fromAccountId"),
          toAccountId: data.get("toAccountId"),
          amountPkr: Number(data.get("amount") || 0),
          occurredOn: data.get("date"),
          reference: data.get("reference"),
          title: data.get("title") || "Account transfer",
        });
        form.reset();
      }}
    >
      <h2><ArrowLeftRight size={16} /> Transfer between accounts</h2>
      <p className="trackingNumber">PostEx wallet se bank, ya bank se cash — paisa sirf jagah badalta hai, total cash waisa hi rehta hai.</p>
      <div className="formRow">
        <label>From
          <select name="fromAccountId" required>
            <option value="">Select</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <label>To
          <select name="toAccountId" required>
            <option value="">Select</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
      </div>
      <div className="formRow">
        <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required /></label>
        <label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
      </div>
      <label>Reference<input name="reference" placeholder="Bank ref / screenshot id" /></label>
      <button disabled={busy}>{busy ? "Saving..." : "Record transfer"}</button>
    </form>
  );
}

function SupplierBillForm({ accounts, busy, onSubmit }) {
  return (
    <form
      className="adminCard financeExpenseForm"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const form = event.currentTarget;
        onSubmit({
          supplier: data.get("supplier"),
          reference: data.get("reference"),
          totalPkr: Number(data.get("total") || 0),
          paid: Number(data.get("paid") || 0),
          billDate: data.get("date"),
          dueDate: data.get("dueDate"),
          note: data.get("note"),
          accountId: data.get("accountId") || null,
        });
        form.reset();
      }}
    >
      <h2>Add supplier bill</h2>
      <p className="trackingNumber">Poora bill likhein aur jitna already de chuke hain woh bhi. Jo diya hua hai woh khud cash se minus ho jayega.</p>
      <label>Supplier<input name="supplier" required placeholder="e.g. Main fabric supplier" /></label>
      <div className="formRow">
        <label>Reference<input name="reference" placeholder="Invoice / WhatsApp ref" /></label>
        <label>Bill date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
      </div>
      <div className="formRow">
        <label>Total bill<input name="total" type="number" min="1" required /></label>
        <label>Already paid<input name="paid" type="number" min="0" defaultValue="0" /></label>
      </div>
      <div className="formRow">
        <label>Due date<input name="dueDate" type="date" /></label>
        <label>Paid from
          <select name="accountId">
            <option value="">Select account</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
      </div>
      <label>Note<input name="note" placeholder="Kya khareeda" /></label>
      <button disabled={busy}>{busy ? "Saving..." : "Save payable"}</button>
    </form>
  );
}

function FixedCostForm({ value, busy, onSave }) {
  const [amount, setAmount] = useState(value);
  useEffect(() => { setAmount(value); }, [value]);
  return (
    <div className="financeControls">
      <label>Monthly fixed costs
        <input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>
      <button type="button" disabled={busy} onClick={() => onSave(Number(amount || 0))}>{busy ? "Saving..." : "Save"}</button>
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
      className="managementCard"
    >
      <div className="financeAssignBar">
        <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
          <option value="">Account chunein</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
        <button
          type="button"
          disabled={busy || !accountId || !selected.length}
          onClick={() => onAssign(selected, accountId).then?.(() => setSelected([]))}
        >
          {selected.length ? `${selected.length} entries assign karein` : "Entries select karein"}
        </button>
        <button type="button" className="editProductButton" onClick={() => setSelected(transactions.map((entry) => entry.id))}>Sab select</button>
      </div>
      <Table head={["", "Date", "Detail", "Amount"]} empty="Sab entries assign ho chuki hain.">
        {transactions.map((entry) => (
          <tr key={entry.id}>
            <td>
              <input
                type="checkbox"
                checked={selected.includes(entry.id)}
                onChange={(event) => setSelected((current) => event.target.checked ? [...current, entry.id] : current.filter((id) => id !== entry.id))}
              />
            </td>
            <td>{formatDate(entry.occurred_on)}</td>
            <td><b>{entry.title}</b></td>
            <td className={entry.cash_direction === "in" ? "incomeAmount" : "expenseAmount"}>{entry.cash_direction === "in" ? "+" : "-"} {money(entry.amount_pkr)}</td>
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
    header = ["Date", "Type", "Direction", "Title", "Counterparty", "Category", "Amount", "Reference", "Voided"];
    body = rows.map((row) => [row.occurred_on, row.entry_type, row.cash_direction, row.title, row.counterparty, row.category, row.amount_pkr, row.reference, row.voided ? "yes" : "no"]);
  }
  const csv = [header, ...body].map((line) => line.map(escape).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = `bustaniya-${kind}-${report.period.from || "all"}-${report.period.to || "time"}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
