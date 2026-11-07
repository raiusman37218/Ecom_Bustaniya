"use client";

import {
  AlertTriangle, ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, BadgeCheck, Banknote, Boxes,
  CalendarClock, CheckCircle2, CircleDollarSign, Flame, Gauge, Info, Landmark, Lightbulb, Loader2,
  Megaphone, Package, PiggyBank, Plus, RefreshCw, RotateCcw, Settings2, ShieldAlert, ShoppingBag,
  Sparkles, Target, TrendingDown, TrendingUp, Trophy, Truck, WalletCards,
} from "lucide-react";

/* ---------------------------------------------------------------------------
   Formatting helpers
   --------------------------------------------------------------------------- */

function money(value) {
  const n = Math.round(Number(value || 0));
  return `${n < 0 ? "-" : ""}Rs. ${Math.abs(n).toLocaleString()}`;
}

function trimZero(text) {
  return text.replace(/\.0$/, "");
}

// Short Pakistani-style amounts for charts and chips: 12.5k, 3.2 Lac, 1.1 Cr.
function compactMoney(value) {
  const n = Number(value || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}Rs. ${trimZero((abs / 10000000).toFixed(1))} Cr`;
  if (abs >= 100000) return `${sign}Rs. ${trimZero((abs / 100000).toFixed(1))} Lac`;
  if (abs >= 1000) return `${sign}Rs. ${trimZero((abs / 1000).toFixed(1))}k`;
  return `${sign}Rs. ${Math.round(abs)}`;
}

function pct(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(isoMonth) {
  const [, m] = String(isoMonth || "").split("-");
  return MONTHS[Number(m) - 1] || isoMonth;
}

function deltaPercent(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (!p) return c ? null : 0;
  return Math.round(((c - p) / Math.abs(p)) * 100);
}

const LEVEL_RANK = { danger: 0, warning: 1, info: 2 };

/* ---------------------------------------------------------------------------
   Business health score — one number that answers "sab theek hai ya nahi?"
   --------------------------------------------------------------------------- */

function computeHealth({ pnl, sales, cash, suppliers, settings, paymentScenarios }) {
  const threshold = Number(settings?.lowCashThresholdPkr || 0);
  const hasSales = Number(pnl.revenuePkr || 0) > 0;

  const profitScore = !hasSales ? 15 : pnl.netProfitPkr <= 0 ? 0 : pnl.marginPercent >= 20 ? 30 : pnl.marginPercent >= 10 ? 24 : 18;
  const cashScore = cash.availableCashPkr < 0 ? 0 : cash.availableCashPkr < threshold ? 10 : 25;
  const forecastScore = cash.expectedClosingCashPkr < 0 ? 0 : cash.expectedClosingCashPkr < threshold ? 8 : 15;
  const returnScore = sales.returnRatePercent <= 10 ? 15 : sales.returnRatePercent <= 20 ? 8 : 0;
  const billScore = suppliers.overdue.length ? 0 : 10;
  const verifyScore = paymentScenarios.needsVerificationCount ? 2 : 5;

  const score = profitScore + cashScore + forecastScore + returnScore + billScore + verifyScore;
  const status = score >= 75 ? "good" : score >= 50 ? "warn" : "bad";

  const checks = [
    { key: "profit", label: !hasSales ? "Sale ka intezar" : pnl.netProfitPkr > 0 ? "Munafa" : "Nuqsan", ok: !hasSales || pnl.netProfitPkr > 0 },
    { key: "cash", label: cash.availableCashPkr < 0 ? "Cash minus" : cash.availableCashPkr < threshold ? "Cash kam" : "Cash theek", ok: cashScore === 25 },
    { key: "returns", label: `Returns ${pct(sales.returnRatePercent)}`, ok: sales.returnRatePercent <= 10 },
    { key: "bills", label: suppliers.overdue.length ? `${suppliers.overdue.length} bill overdue` : "Bills clear", ok: !suppliers.overdue.length },
  ];

  return { score, status, checks };
}

/* ---------------------------------------------------------------------------
   Small presentational pieces
   --------------------------------------------------------------------------- */

function ScoreRing({ score, status }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamp(score) / 100) * circumference;
  return (
    <div className={`fo-ring fo-ring-${status}`} role="img" aria-label={`Business health score ${score} out of 100`}>
      <svg viewBox="0 0 110 110" width="110" height="110">
        <circle cx="55" cy="55" r={radius} className="fo-ringTrack" />
        <circle
          cx="55"
          cy="55"
          r={radius}
          className="fo-ringValue"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="fo-ringLabel">
        <b>{score}</b>
        <span>/ 100</span>
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, eyebrow, title, subtitle, right }) {
  return (
    <div className="fo-sectionHead">
      <div className="fo-sectionHeadText">
        {eyebrow ? (
          <span className="fo-eyebrow">
            {Icon ? <Icon size={13} /> : null}
            {eyebrow}
          </span>
        ) : null}
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

function LinkButton({ children, onClick }) {
  return (
    <button type="button" className="fo-linkBtn" onClick={onClick}>
      {children} <ArrowRight size={13} />
    </button>
  );
}

function Delta({ value, inverse = false, suffix = "pichle mahine se" }) {
  if (value === null) return <span className="fo-delta fo-delta-neutral">Naya</span>;
  if (!value) return <span className="fo-delta fo-delta-neutral">Barabar · {suffix}</span>;
  const up = value > 0;
  const good = inverse ? !up : up;
  return (
    <span className={`fo-delta ${good ? "fo-delta-up" : "fo-delta-down"}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(value)}% {suffix}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Main Overview
   --------------------------------------------------------------------------- */

export default function FinanceOverview({
  report,
  trend = [],
  trendLoading = false,
  paymentScenarios,
  sortedAccounts = [],
  unassignedCount = 0,
  postexReceiptAccountId = "",
  busy = false,
  onNavigate,
  onOpenModal,
  onBackfill,
}) {
  const { cash, sales, pnl, postex, advances, suppliers, marketing, inventory, alerts = [], products = [], categories = [], orders = [], settings = {} } = report;
  const periodLabel = report.period?.label || "Is period";
  const threshold = Number(settings.lowCashThresholdPkr || 0);
  const hasSales = Number(pnl.revenuePkr || 0) > 0;
  const health = computeHealth({ pnl, sales, cash, suppliers, settings, paymentScenarios });
  const safeToSpend = Math.max(0, Number(cash.expectedClosingCashPkr || 0) - threshold);
  const profitPer100 = hasSales ? Math.round((pnl.netProfitPkr / pnl.revenuePkr) * 100) : 0;

  /* ---------------- Headline (plain-language verdict) ---------------- */
  let headline;
  let subline;
  if (!hasSales) {
    headline = `${periodLabel} mein abhi koi delivered sale nahi.`;
    subline = sales.pipelineOrders
      ? `${sales.pipelineOrders} orders (${money(sales.pipelineValuePkr)}) raste mein hain — deliver hote hi profit yahan dikhega.`
      : "Orders deliver hote hi profit, faislay aur insights yahan dikhne lagenge.";
  } else if (pnl.netProfitPkr >= 0) {
    headline = `Business munafa mein hai — ${money(pnl.netProfitPkr)} bache.`;
    subline = `Har Rs. 100 ki sale par Rs. ${profitPer100} saaf munafa. ${sales.deliveredOrders} orders deliver hue, ${sales.unitsSold} pieces bike.`;
  } else {
    headline = `${periodLabel} mein ${money(Math.abs(pnl.netProfitPkr))} ka nuqsan hai.`;
    subline = "Kharche sale se zyada hain — neeche \"Rs. 100 ki sale ka hisaab\" dekhein ke paisa kahan ja raha hai.";
  }

  const statusText = {
    good: { label: "Business sehatmand hai", icon: CheckCircle2 },
    warn: { label: "Kuch cheezon par dhyaan chahiye", icon: AlertTriangle },
    bad: { label: "Foran action zaroori hai", icon: ShieldAlert },
  }[health.status];
  const StatusIcon = statusText.icon;

  /* ---------------- Action center: "Abhi ye karein" ---------------- */
  const lossOrders = orders.filter((row) => row.netProfitPkr < 0);
  const pendingSync = Number(pnl.estimatedCogsOrderCount || 0) + Number(advances.notInCashCount || 0);
  const actionItems = [];

  if (cash.availableCashPkr < 0) {
    actionItems.push({
      id: "negative_cash", level: "danger", icon: ShieldAlert,
      title: "Cash balance minus mein hai",
      detail: "Koi receipt record nahi hui ya koi expense do baar chal gaya. Cashbook check karein.",
      amount: cash.availableCashPkr, cta: "Cashbook kholein", onClick: () => onNavigate("cash"),
    });
  } else if (threshold && cash.availableCashPkr < threshold) {
    actionItems.push({
      id: "low_cash", level: "danger", icon: ShieldAlert,
      title: "Cash aap ki minimum limit se kam hai",
      detail: `Limit ${money(threshold)} hai. Naye kharche rok kar pehle PostEx aur advances collect karein.`,
      amount: cash.availableCashPkr, cta: "Cashbook kholein", onClick: () => onNavigate("cash"),
    });
  }
  if (suppliers.overdue.length) {
    const overdueTotal = suppliers.overdue.reduce((sum, bill) => sum + Number(bill.remaining_pkr || 0), 0);
    actionItems.push({
      id: "supplier_overdue", level: "danger", icon: CalendarClock,
      title: `${suppliers.overdue.length} supplier bill${suppliers.overdue.length === 1 ? "" : "s"} ki date guzar chuki`,
      detail: suppliers.overdue.slice(0, 3).map((bill) => bill.supplier).filter(Boolean).join(", ") || "Supplier ko waqt par payment se rishta mazboot rehta hai.",
      amount: overdueTotal, cta: "Bills pay karein", onClick: () => onNavigate("bills", { filter: "overdue" }),
    });
  }
  if (paymentScenarios.needsVerificationCount) {
    actionItems.push({
      id: "pending_advance_verification", level: "warning", icon: BadgeCheck,
      title: `${paymentScenarios.needsVerificationCount} customer payment${paymentScenarios.needsVerificationCount === 1 ? "" : "s"} verify karni hain`,
      detail: "Verify hote hi order Packing mein jayega aur paisa cashbook mein aa jayega.",
      amount: paymentScenarios.needsVerificationPkr, cta: "Verify karein", onClick: () => onNavigate("verify"),
    });
  }
  if (postex.stuckReceivables?.length) {
    actionItems.push({
      id: "receivable_stuck", level: "warning", icon: Truck,
      title: `${postex.stuckReceivables.length} delivered order${postex.stuckReceivables.length === 1 ? "" : "s"} ka PostEx paisa ruka hua`,
      detail: `Sab se purana ${postex.stuckReceivables[0]?.daysWaiting || 0} din se pending hai. PostEx se settlement confirm karein.`,
      cta: "PostEx dekhein", onClick: () => onNavigate("payments"),
    });
  }
  if (suppliers.dueSoon?.length) {
    actionItems.push({
      id: "supplier_due_soon", level: "warning", icon: CalendarClock,
      title: `${suppliers.dueSoon.length} supplier bill${suppliers.dueSoon.length === 1 ? "" : "s"} jald due`,
      detail: suppliers.dueSoon.slice(0, 3).map((bill) => `${bill.supplier} (${bill.due_date})`).join(" · "),
      amount: suppliers.dueSoon.reduce((sum, bill) => sum + Number(bill.remaining_pkr || 0), 0),
      cta: "Bills dekhein", onClick: () => onNavigate("bills", { filter: "open" }),
    });
  }
  if (lossOrders.length) {
    actionItems.push({
      id: "loss_orders", level: "warning", icon: TrendingDown,
      title: `${lossOrders.length} order${lossOrders.length === 1 ? "" : "s"} par loss hua`,
      detail: "Inki price, delivery charge ya discount check karein taake aage loss na ho.",
      amount: lossOrders.reduce((sum, row) => sum + row.netProfitPkr, 0),
      cta: "Loss orders dekhein", onClick: () => onNavigate("lossOrders"),
    });
  }
  if (inventory.missingCostCount) {
    actionItems.push({
      id: "missing_cost", level: "warning", icon: Package,
      title: `${inventory.missingCostCount} product${inventory.missingCostCount === 1 ? "" : "s"} ki cost missing hai`,
      detail: "Cost ke baghair profit asal se zyada dikhta hai. Products section mein cost price daalein.",
    });
  }
  if (postex.receivablePkr > 0) {
    actionItems.push({
      id: "postex_receivable", level: "info", icon: Landmark,
      title: "PostEx se paisa aana baqi hai",
      detail: "Jab bank mein paisa aaye to receipt record karein taake cash ka hisaab sahi rahe.",
      amount: postex.receivablePkr, cta: "Receipt record karein",
      onClick: () => onOpenModal("income", { account: postexReceiptAccountId, incomeType: "postex_bank_receipt" }),
    });
  }
  if (pendingSync > 0) {
    actionItems.push({
      id: "estimated_cogs", level: "info", icon: RefreshCw,
      title: `${pendingSync} entr${pendingSync === 1 ? "y" : "ies"} sync & lock karni hain`,
      detail: "Order cost lock aur verified advances cashbook mein post ho jayenge — profit pakka ho jayega.",
      cta: busy ? "Sync ho raha..." : "Sync & Lock", onClick: onBackfill, disabled: busy,
    });
  }
  if (unassignedCount > 0) {
    actionItems.push({
      id: "unassigned_cash", level: "info", icon: WalletCards,
      title: `${unassignedCount} entr${unassignedCount === 1 ? "y" : "ies"} kisi account se linked nahi`,
      detail: "Account assign karein taake har wallet ka balance sahi dikhe.",
      cta: "Assign karein", onClick: () => onNavigate("cash", { account: "unassigned" }),
    });
  }
  // Any server alert we don't explicitly understand still gets surfaced.
  const knownIds = new Set(actionItems.map((item) => item.id).concat(["low_cash", "negative_cash"]));
  alerts.filter((alert) => !knownIds.has(alert.id)).forEach((alert) => {
    actionItems.push({ id: alert.id, level: alert.level === "danger" ? "danger" : alert.level === "warning" ? "warning" : "info", icon: Info, title: alert.title, detail: alert.detail });
  });
  actionItems.sort((a, b) => (LEVEL_RANK[a.level] ?? 3) - (LEVEL_RANK[b.level] ?? 3));
  const urgentCount = actionItems.filter((item) => item.level === "danger").length;

  /* ---------------- Smart decisions ---------------- */
  const decisions = [];

  // 1) Can we buy stock / spend?
  decisions.push(safeToSpend > 0
    ? {
      id: "spend", tone: "good", icon: PiggyBank,
      question: "Naya stock ya kharcha kar sakte hain?",
      verdict: `Haan — ${money(safeToSpend)} tak`,
      detail: threshold
        ? `30 din ke bills aur ${money(threshold)} ki minimum cash limit nikaal kar itna paisa safely laga sakte hain.`
        : "30 din ke supplier bills nikaal kar itna paisa safely laga sakte hain.",
    }
    : {
      id: "spend", tone: "bad", icon: PiggyBank,
      question: "Naya stock ya kharcha kar sakte hain?",
      verdict: "Abhi ruk jayein",
      detail: "Agle 30 din mein cash limit se neeche ja sakta hai. Pehle PostEx paisa aur advances collect karein, phir naya stock lein.",
    });

  // 2) Which product to push?
  const topProduct = products.find((row) => row.profitPkr > 0);
  if (topProduct) {
    const lowStock = Number(topProduct.stock || 0) <= 5;
    decisions.push({
      id: "push", tone: "good", icon: Trophy,
      question: "Kaunsa product push karein?",
      verdict: topProduct.name,
      detail: `${topProduct.units} bike, ${money(topProduct.profitPkr)} profit (${pct(topProduct.marginPercent)} margin). ${lowStock ? `Sirf ${topProduct.stock} stock bacha — jaldi restock karein!` : "Iske ads aur stock barhayein."}`,
      badge: lowStock ? "Restock karein" : "Best seller",
    });
  }

  // 3) Which product needs attention?
  const attention = [...products]
    .filter((row) => row.units > 0 && row !== topProduct)
    .sort((a, b) => a.marginPercent - b.marginPercent)[0];
  if (attention && (attention.marginPercent < 25 || attention.profitPkr < 0)) {
    decisions.push({
      id: "fix", tone: attention.profitPkr < 0 ? "bad" : "warn", icon: Target,
      question: "Kis product par dhyaan dein?",
      verdict: attention.name,
      detail: attention.profitPkr < 0
        ? `Ye product ${money(Math.abs(attention.profitPkr))} ka loss de raha hai. Price barhayein ya cost kam karein.`
        : `Margin sirf ${pct(attention.marginPercent)} hai. Thori price barhane ya cost kam karne se munafa barhega.`,
      badge: attention.profitPkr < 0 ? "Loss" : "Kam margin",
    });
  }

  // 4) Ads — scale or stop?
  if (marketing.spendPkr > 0) {
    const roas = Number(marketing.roas || 0);
    decisions.push({
      id: "ads", tone: roas >= 3 ? "good" : roas >= 1.5 ? "warn" : "bad", icon: Megaphone,
      question: "Ads barhayein ya kam karein?",
      verdict: roas >= 3 ? "Ads barhayein" : roas >= 1.5 ? "Optimize karein" : "Ads kam karein",
      detail: `Rs. 1 ke ad par Rs. ${roas} ki sale (ROAS ${roas}x). ${money(marketing.spendPkr)} kharch, ${money(marketing.attributedSalesPkr)} sale${marketing.cacPkr ? `, naya customer ${money(marketing.cacPkr)} ka` : ""}.`,
      cta: { label: "Campaigns dekhein", onClick: () => onNavigate("reports") },
    });
  } else {
    decisions.push({
      id: "ads", tone: "neutral", icon: Megaphone,
      question: "Ads ka faida ho raha hai?",
      verdict: "Data nahi hai",
      detail: "Meta/Instagram campaign ka kharcha aur sale log karein — phir yahan seedha bataya jayega ke ads barhayein ya band karein.",
      cta: { label: "Campaign log karein", onClick: () => onOpenModal("campaign") },
    });
  }

  // 5) Returns
  if (sales.deliveredOrders + sales.returnedOrders > 0) {
    const rate = Number(sales.returnRatePercent || 0);
    decisions.push({
      id: "returns", tone: rate >= 20 ? "bad" : rate >= 10 ? "warn" : "good", icon: RotateCcw,
      question: "Returns control mein hain?",
      verdict: rate >= 20 ? "Bohat zyada" : rate >= 10 ? "Thore zyada" : "Haan, control mein",
      detail: rate >= 10
        ? `${sales.returnedOrders} orders wapis aaye (${pct(rate)}), ${money(pnl.returnLossPkr)} ka nuqsan. COD orders par phone confirmation ya advance lein.`
        : `Sirf ${pct(rate)} orders wapis aaye. Bohat acha — isi tarah confirmation jaari rakhein.`,
    });
  }

  // 6) Dead stock
  if (inventory.deadStockValuePkr > 0) {
    const names = (inventory.deadStock || []).slice(0, 2).map((row) => row.name).join(", ");
    decisions.push({
      id: "dead", tone: "warn", icon: Boxes,
      question: "Kaunsa maal phansa hua hai?",
      verdict: `${money(inventory.deadStockValuePkr)} ka stock`,
      detail: `${inventory.deadStock.length} products is period mein bilkul nahi bike${names ? ` (jaise ${names})` : ""}. Sale, bundle ya discount laga kar paisa nikaalein.`,
    });
  }

  // 7) Break-even
  if (Number(settings.monthlyFixedCostsPkr || 0) > 0 && pnl.breakEvenOrders > 0) {
    const progress = clamp((sales.deliveredOrders / pnl.breakEvenOrders) * 100);
    decisions.push({
      id: "breakeven", tone: progress >= 100 ? "good" : "warn", icon: Gauge,
      question: "Fixed kharche cover ho gaye?",
      verdict: progress >= 100 ? "Haan, cover ho gaye" : `${Math.max(0, pnl.breakEvenOrders - sales.deliveredOrders)} orders aur chahiye`,
      detail: `Mahine ke ${money(settings.monthlyFixedCostsPkr)} fixed kharche ke liye ${pnl.breakEvenOrders} delivered orders chahiye. Abhi ${sales.deliveredOrders}.`,
      progress,
    });
  }

  // 8) Profit allocation
  if (pnl.allocation?.allocatablePkr > 0) {
    decisions.push({
      id: "allocation", tone: "good", icon: CircleDollarSign,
      question: "Munafe ka kya karein?",
      verdict: "Aise baantein",
      detail: `Marketing ${money(pnl.allocation.marketingPkr)} · Owner ${money(pnl.allocation.ownerPkr)} · Naya stock ${money(pnl.allocation.stockPkr)}`,
      split: [
        { label: "Marketing", value: pnl.allocation.marketingPkr, cls: "fo-split-mkt" },
        { label: "Owner", value: pnl.allocation.ownerPkr, cls: "fo-split-owner" },
        { label: "Stock", value: pnl.allocation.stockPkr, cls: "fo-split-stock" },
      ],
    });
  }

  /* ---------------- Rs. 100 breakdown ---------------- */
  const costParts = [
    { key: "cogs", label: "Product cost", hint: "Kapra, silai, lace", value: Number(pnl.cogsPkr || 0), cls: "fo-seg-cogs" },
    { key: "courier", label: "Courier charges", hint: "PostEx delivery fee", value: Number(pnl.courierCostPkr || 0), cls: "fo-seg-courier" },
    { key: "tax", label: "GST + 4% tax", hint: "PostEx ne kaata", value: Number(pnl.gstPkr || 0) + Number(pnl.taxPkr || 0), cls: "fo-seg-tax" },
    { key: "returns", label: "Returns ka nuqsan", hint: "Wapis aaye orders", value: Number(pnl.returnLossPkr || 0), cls: "fo-seg-returns" },
    { key: "ops", label: "Operating kharche", hint: "Packaging, rent, salary", value: Number(pnl.operatingExpensesPkr || 0), cls: "fo-seg-ops" },
  ];
  const totalCosts = costParts.reduce((sum, part) => sum + part.value, 0);
  const profitPositive = pnl.netProfitPkr > 0;
  const barBase = profitPositive ? Number(pnl.revenuePkr || 0) : Math.max(totalCosts, 1);
  const segments = [
    ...costParts.filter((part) => part.value > 0),
    ...(profitPositive ? [{ key: "profit", label: "Aap ka munafa", hint: "Saaf bacha", value: pnl.netProfitPkr, cls: "fo-seg-profit" }] : []),
  ];

  /* ---------------- Trend ---------------- */
  const trendRows = trend.slice(-6);
  const trendMax = Math.max(1, ...trendRows.map((row) => Math.max(Math.abs(row.revenuePkr || 0), Math.abs(row.netProfitPkr || 0))));
  const thisMonth = trend[trend.length - 1];
  const lastMonth = trend[trend.length - 2];

  /* ---------------- Products & categories ---------------- */
  const winners = products.filter((row) => row.profitPkr > 0).slice(0, 5);
  const winnerSet = new Set(winners);
  const watchList = [...products]
    .filter((row) => row.units > 0 && !winnerSet.has(row))
    .sort((a, b) => a.marginPercent - b.marginPercent)
    .slice(0, 5);
  const categoryProfitTotal = categories.reduce((sum, row) => sum + Math.max(0, row.profitPkr), 0);

  /* ---------------- Pipeline ---------------- */
  const statusTotal = sales.statusBreakdown.reduce((sum, row) => sum + row.count, 0);
  const cashFlowMax = Math.max(1, cash.inPkr, cash.outPkr);

  return (
    <div className="fo-root">
      {/* ================= HERO: Business health verdict ================= */}
      <section className={`fo-hero fo-hero-${health.status}`}>
        <div className="fo-heroTop">
          <div className="fo-heroVerdict">
            <span className={`fo-statusPill fo-statusPill-${health.status}`}>
              <StatusIcon size={14} /> {statusText.label}
            </span>
            <h2>{headline}</h2>
            <p>{subline}</p>
            <div className="fo-checks">
              {health.checks.map((check) => (
                <span key={check.key} className={`fo-check ${check.ok ? "ok" : "bad"}`}>
                  {check.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  {check.label}
                </span>
              ))}
            </div>
          </div>
          <div className="fo-heroScore">
            <ScoreRing score={health.score} status={health.status} />
            <span>Business Health</span>
            <small>{periodLabel}</small>
          </div>
        </div>

        <div className="fo-answerGrid">
          <button type="button" className="fo-answer" onClick={() => onNavigate("pnl")}>
            <span className="fo-answerQ"><TrendingUp size={14} /> Kitna kamaya?</span>
            <b className={pnl.netProfitPkr < 0 ? "neg" : ""}>{money(pnl.netProfitPkr)}</b>
            <small>{hasSales ? `${pct(pnl.marginPercent)} margin · ${money(pnl.revenuePkr)} sale se` : "Abhi koi delivered sale nahi"}</small>
          </button>
          <button type="button" className="fo-answer" onClick={() => onNavigate("cash")}>
            <span className="fo-answerQ"><WalletCards size={14} /> Abhi kitna cash hai?</span>
            <b className={cash.availableCashPkr < 0 ? "neg" : ""}>{money(cash.availableCashPkr)}</b>
            <small>{sortedAccounts.length} accounts / wallets mein</small>
          </button>
          <button type="button" className="fo-answer" onClick={() => onNavigate("payments")}>
            <span className="fo-answerQ"><CalendarClock size={14} /> 30 din baad kitna hoga?</span>
            <b className={cash.expectedClosingCashPkr < 0 ? "neg" : ""}>{money(cash.expectedClosingCashPkr)}</b>
            <small>+{compactMoney(postex.receivablePkr)} PostEx · −{compactMoney(suppliers.dueIn30DaysPkr)} bills</small>
          </button>
          <div className={`fo-answer fo-answerHighlight ${safeToSpend > 0 ? "" : "zero"}`}>
            <span className="fo-answerQ"><PiggyBank size={14} /> Safely kitna laga sakte hain?</span>
            <b>{money(safeToSpend)}</b>
            <small>{threshold ? `${compactMoney(threshold)} minimum cash rakh kar` : "30 din ke bills nikaal kar"}</small>
          </div>
        </div>
      </section>

      {/* ================= Quick numbers ================= */}
      <section className="fo-quickGrid">
        <button type="button" className="fo-quick" onClick={() => onNavigate("pnl")}>
          <span className="fo-quickIcon tone-green"><ShoppingBag size={16} /></span>
          <div><small>Delivered sale</small><b>{money(sales.grossRevenuePkr)}</b><em>{sales.deliveredOrders} orders</em></div>
        </button>
        <div className="fo-quick">
          <span className="fo-quickIcon tone-blue"><Package size={16} /></span>
          <div><small>Pieces bike</small><b>{sales.unitsSold}</b><em>{money(sales.averageOrderValuePkr)} avg order</em></div>
        </div>
        <button type="button" className="fo-quick" onClick={() => onNavigate("payments")}>
          <span className="fo-quickIcon tone-amber"><Truck size={16} /></span>
          <div><small>PostEx se aana hai</small><b>{money(postex.receivablePkr)}</b><em>Delivered, payout baqi</em></div>
        </button>
        <button type="button" className="fo-quick" onClick={() => onNavigate("advances", { filter: "advance_all" })}>
          <span className="fo-quickIcon tone-violet"><Banknote size={16} /></span>
          <div><small>Advance mila</small><b>{money(advances.cashPostedPkr || 0)}</b><em>{paymentScenarios.needsVerificationCount ? `${paymentScenarios.needsVerificationCount} verify baqi` : "Sab verified"}</em></div>
        </button>
        <div className="fo-quick">
          <span className={`fo-quickIcon ${sales.returnedOrders ? "tone-red" : "tone-green"}`}><RotateCcw size={16} /></span>
          <div><small>Returns</small><b>{sales.returnedOrders}</b><em>{pct(sales.returnRatePercent)} · {compactMoney(pnl.returnLossPkr)} loss</em></div>
        </div>
        <button type="button" className="fo-quick" onClick={() => onNavigate("bills", { filter: "open" })}>
          <span className={`fo-quickIcon ${suppliers.overdue.length ? "tone-red" : "tone-slate"}`}><Landmark size={16} /></span>
          <div><small>Supplier ko dena</small><b>{money(suppliers.payablePkr)}</b><em>{suppliers.overdue.length ? `${suppliers.overdue.length} overdue` : "Koi overdue nahi"}</em></div>
        </button>
      </section>

      {/* ================= Action center + Decisions ================= */}
      <section className="fo-twoCol fo-twoCol-actions">
        <div className="fo-card">
          <SectionHead
            icon={Flame}
            eyebrow="Priority list"
            title="Abhi ye karein"
            subtitle={actionItems.length ? `${actionItems.length} kaam pending${urgentCount ? ` · ${urgentCount} urgent` : ""} — sab se zaroori upar hai.` : "Sab kuch up-to-date hai."}
          />
          {actionItems.length === 0 ? (
            <div className="fo-allClear">
              <span><CheckCircle2 size={26} /></span>
              <b>Shabash! Koi pending kaam nahi.</b>
              <p>Saari payments verified, bills clear aur entries linked hain.</p>
            </div>
          ) : (
            <ul className="fo-actionList">
              {actionItems.map((item) => {
                const Icon = item.icon || Info;
                return (
                  <li key={item.id} className={`fo-action fo-action-${item.level}`}>
                    <span className="fo-actionIcon"><Icon size={16} /></span>
                    <div className="fo-actionBody">
                      <div className="fo-actionTitle">
                        <b>{item.title}</b>
                        {item.amount ? <span className={`fo-amountChip ${item.amount < 0 ? "neg" : ""}`}>{money(item.amount)}</span> : null}
                      </div>
                      {item.detail ? <p>{item.detail}</p> : null}
                    </div>
                    {item.cta ? (
                      <button type="button" className="fo-actionBtn" onClick={item.onClick} disabled={item.disabled}>
                        {item.cta} <ArrowRight size={13} />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="fo-card">
          <SectionHead
            icon={Lightbulb}
            eyebrow="Smart faislay"
            title="Data kya keh raha hai?"
            subtitle="Seedhe sawal, seedhe jawab — aap ke numbers se nikaale gaye."
          />
          <div className="fo-decisionGrid">
            {decisions.map((d) => {
              const Icon = d.icon;
              const splitTotal = d.split ? d.split.reduce((sum, s) => sum + Number(s.value || 0), 0) || 1 : 1;
              return (
                <div key={d.id} className={`fo-decision fo-decision-${d.tone}`}>
                  <div className="fo-decisionHead">
                    <span className="fo-decisionIcon"><Icon size={15} /></span>
                    <span className="fo-decisionQ">{d.question}</span>
                    {d.badge ? <span className="fo-decisionBadge">{d.badge}</span> : null}
                  </div>
                  <b className="fo-decisionVerdict">{d.verdict}</b>
                  <p>{d.detail}</p>
                  {typeof d.progress === "number" ? (
                    <div className="fo-progress"><span style={{ width: `${d.progress}%` }} /></div>
                  ) : null}
                  {d.split ? (
                    <div className="fo-split">
                      {d.split.map((s) => (
                        <span key={s.label} className={s.cls} style={{ width: `${(Number(s.value || 0) / splitTotal) * 100}%` }} title={`${s.label}: ${money(s.value)}`} />
                      ))}
                    </div>
                  ) : null}
                  {d.cta ? <LinkButton onClick={d.cta.onClick}>{d.cta.label}</LinkButton> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= Rs.100 breakdown + Trend ================= */}
      <section className="fo-twoCol">
        <div className="fo-card">
          <SectionHead
            icon={Sparkles}
            eyebrow="Paisa kahan gaya"
            title="Rs. 100 ki sale ka hisaab"
            subtitle={hasSales ? "Har Rs. 100 ki delivered sale mein se kitna kis cheez par gaya aur kitna bacha." : "Delivered sale aane par yahan breakdown dikhega."}
            right={<LinkButton onClick={() => onNavigate("pnl")}>Poora P&amp;L</LinkButton>}
          />
          {hasSales ? (
            <>
              <div className="fo-stackBar" role="img" aria-label="Revenue breakdown">
                {segments.map((seg) => (
                  <span
                    key={seg.key}
                    className={seg.cls}
                    style={{ width: `${clamp((seg.value / barBase) * 100)}%` }}
                    title={`${seg.label}: ${money(seg.value)}`}
                  />
                ))}
              </div>
              {!profitPositive ? (
                <div className="fo-lossNote">
                  <AlertTriangle size={14} />
                  Kharche ({money(totalCosts)}) sale ({money(pnl.revenuePkr)}) se {money(totalCosts - pnl.revenuePkr)} zyada hain.
                </div>
              ) : null}
              <ul className="fo-breakList">
                {segments.map((seg) => (
                  <li key={seg.key} className={seg.key === "profit" ? "fo-breakProfit" : ""}>
                    <span className={`fo-dot ${seg.cls}`} />
                    <div className="fo-breakLabel">
                      <b>{seg.label}</b>
                      <small>{seg.hint}</small>
                    </div>
                    <div className="fo-breakValue">
                      <b>Rs. {Math.round((seg.value / pnl.revenuePkr) * 100)}</b>
                      <small>{money(seg.value)}</small>
                    </div>
                  </li>
                ))}
                {!profitPositive ? (
                  <li className="fo-breakLoss">
                    <span className="fo-dot fo-seg-returns" />
                    <div className="fo-breakLabel"><b>Nuqsan</b><small>Sale se zyada kharcha</small></div>
                    <div className="fo-breakValue"><b>−Rs. {Math.abs(profitPer100)}</b><small>{money(pnl.netProfitPkr)}</small></div>
                  </li>
                ) : null}
              </ul>
            </>
          ) : (
            <div className="fo-empty"><ShoppingBag size={22} /> Is period mein koi delivered sale nahi.</div>
          )}
        </div>

        <div className="fo-card">
          <SectionHead
            icon={TrendingUp}
            eyebrow="Growth"
            title="Pichle 6 mahine"
            subtitle="Sale aur munafa barh raha hai ya kam ho raha hai — ek nazar mein."
            right={<LinkButton onClick={() => onNavigate("reports")}>12 mahine</LinkButton>}
          />
          {trendRows.length ? (
            <>
              {thisMonth ? (
                <div className="fo-monthCompare">
                  <div>
                    <small>Is mahine sale (ab tak)</small>
                    <b>{money(thisMonth.revenuePkr)}</b>
                    {lastMonth ? <Delta value={deltaPercent(thisMonth.revenuePkr, lastMonth.revenuePkr)} /> : null}
                  </div>
                  <div>
                    <small>Is mahine munafa</small>
                    <b className={thisMonth.netProfitPkr < 0 ? "neg" : ""}>{money(thisMonth.netProfitPkr)}</b>
                    {lastMonth ? <Delta value={deltaPercent(thisMonth.netProfitPkr, lastMonth.netProfitPkr)} /> : null}
                  </div>
                  <div>
                    <small>Delivered orders</small>
                    <b>{thisMonth.deliveredOrders}</b>
                    {lastMonth ? <Delta value={deltaPercent(thisMonth.deliveredOrders, lastMonth.deliveredOrders)} /> : null}
                  </div>
                </div>
              ) : null}
              <div className="fo-chart">
                {trendRows.map((row, index) => {
                  const isCurrent = index === trendRows.length - 1;
                  return (
                    <div key={row.month} className={`fo-chartCol ${isCurrent ? "current" : ""}`}>
                      <div className="fo-chartBars">
                        <span className="fo-barRevenue" style={{ height: `${(Math.abs(row.revenuePkr) / trendMax) * 100}%` }} title={`Sale: ${money(row.revenuePkr)}`} />
                        <span className={`fo-barProfit ${row.netProfitPkr < 0 ? "neg" : ""}`} style={{ height: `${(Math.abs(row.netProfitPkr) / trendMax) * 100}%` }} title={`Munafa: ${money(row.netProfitPkr)}`} />
                      </div>
                      <small className="fo-chartValue">{compactMoney(row.revenuePkr)}</small>
                      <span className="fo-chartMonth">{monthLabel(row.month)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="fo-legend">
                <span><i className="fo-barRevenue" /> Sale</span>
                <span><i className="fo-barProfit" /> Munafa</span>
                <span><i className="fo-barProfit neg" /> Nuqsan</span>
              </div>
            </>
          ) : (
            <div className="fo-empty">
              {trendLoading ? <><Loader2 size={20} className="fo-spin" /> Mahine ka trend load ho raha hai...</> : <><TrendingUp size={20} /> Trend data abhi available nahi.</>}
            </div>
          )}
        </div>
      </section>

      {/* ================= Cash: accounts + flow ================= */}
      <section className="fo-card">
        <SectionHead
          icon={WalletCards}
          eyebrow="Paisa kahan rakha hai"
          title="Accounts & wallets"
          subtitle="Har account ka live balance — yahin se kharcha, income ya transfer record karein."
          right={<LinkButton onClick={() => onNavigate("cash")}>Poori cashbook</LinkButton>}
        />
        <div className="fo-accountGrid">
          {sortedAccounts.map((acc) => {
            const share = cash.availableCashPkr > 0 ? clamp((acc.balancePkr / cash.availableCashPkr) * 100) : 0;
            return (
              <div key={acc.id} className="fo-account">
                <div className="fo-accountHead">
                  <div>
                    <b>{acc.name}</b>
                    <small>{acc.holder || (acc.kind === "cash" ? "Physical cash" : "Digital account")}</small>
                  </div>
                  <button type="button" className="fo-accountEntries" onClick={() => onNavigate("cash", { account: acc.id })} title="Is account ki entries dekhein">
                    {acc.movementCount} entries <ArrowRight size={11} />
                  </button>
                </div>
                <div className={`fo-accountBalance ${acc.balancePkr < 0 ? "neg" : ""}`}>{money(acc.balancePkr)}</div>
                <div className="fo-accountShare"><span style={{ width: `${share}%` }} /></div>
                <small className="fo-accountShareText">{cash.availableCashPkr > 0 ? `Total cash ka ${pct(share)}` : "—"}</small>
                <div className="fo-accountActions">
                  <button type="button" onClick={() => onOpenModal("expense", { account: acc.id, expenseType: "business_expense" })}><Plus size={12} /> Kharcha</button>
                  <button type="button" onClick={() => onOpenModal("income", { account: acc.id, incomeType: "other_income" })}><Plus size={12} /> Income</button>
                  <button type="button" onClick={() => onOpenModal("transfer", { account: acc.id })}><ArrowLeftRight size={12} /> Transfer</button>
                  <button type="button" onClick={() => onOpenModal("adjust_balance", { balanceAccount: acc })} title="Asal bank/wallet balance se match karein"><Settings2 size={12} /> Balance</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="fo-flowRow">
          <div className="fo-flowBlock">
            <h4>{periodLabel}: paisa aaya vs gaya</h4>
            <div className="fo-flowBar">
              <span className="fo-flowLabel">Aaya</span>
              <div className="fo-flowTrack"><span className="in" style={{ width: `${(cash.inPkr / cashFlowMax) * 100}%` }} /></div>
              <b className="pos">{money(cash.inPkr)}</b>
            </div>
            <div className="fo-flowBar">
              <span className="fo-flowLabel">Gaya</span>
              <div className="fo-flowTrack"><span className="out" style={{ width: `${(cash.outPkr / cashFlowMax) * 100}%` }} /></div>
              <b className="neg">{money(cash.outPkr)}</b>
            </div>
            <div className="fo-flowDetails">
              <div>
                <small>Aaya kahan se</small>
                <p>PostEx {compactMoney(cash.postexReceiptsPkr)} · Advances {compactMoney(cash.advanceReceiptsPkr)} · Other {compactMoney(cash.otherIncomePkr)} · Owner {compactMoney(cash.ownerInvestmentsPkr)}</p>
              </div>
              <div>
                <small>Gaya kahan</small>
                <p>Stock {compactMoney(cash.inventorySpendPkr)} · Kharche {compactMoney(cash.operatingExpensesPkr)} · Supplier {compactMoney(cash.supplierPaymentsPkr)} · Owner {compactMoney(cash.ownerWithdrawalsPkr)}</p>
              </div>
            </div>
            <div className={`fo-netLine ${cash.netPkr < 0 ? "neg" : "pos"}`}>
              {cash.netPkr < 0 ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
              Net: {money(cash.netPkr)} {cash.netPkr < 0 ? "(zyada kharch hua)" : "(cash barha)"}
            </div>
          </div>

          <div className="fo-flowBlock">
            <h4>Agle 30 din ka andaza</h4>
            <div className="fo-forecast">
              <div className="fo-forecastStep">
                <small>Cash abhi</small>
                <b>{compactMoney(cash.availableCashPkr)}</b>
              </div>
              <span className="fo-forecastOp pos">+</span>
              <div className="fo-forecastStep">
                <small>PostEx aayega</small>
                <b className="pos">{compactMoney(postex.receivablePkr)}</b>
              </div>
              <span className="fo-forecastOp neg">−</span>
              <div className="fo-forecastStep">
                <small>Bills dene hain</small>
                <b className="neg">{compactMoney(suppliers.dueIn30DaysPkr)}</b>
              </div>
              <span className="fo-forecastOp">=</span>
              <div className={`fo-forecastStep result ${cash.expectedClosingCashPkr < threshold ? "warn" : ""}`}>
                <small>30 din baad</small>
                <b>{compactMoney(cash.expectedClosingCashPkr)}</b>
              </div>
            </div>
            <p className="fo-forecastNote">
              {cash.expectedClosingCashPkr < 0
                ? "Cash minus mein ja sakta hai — bills ki date aage karwayein ya collection tez karein."
                : cash.expectedClosingCashPkr < threshold
                  ? `Cash limit (${money(threshold)}) se neeche ja sakta hai — bara kharcha abhi na karein.`
                  : "Cash ki position mazboot rahegi."}
            </p>
            <div className="fo-stockMini">
              <div><small>Stock mein laga paisa</small><b>{compactMoney(inventory.costValuePkr)}</b></div>
              <div><small>Bechne par milega</small><b>{compactMoney(inventory.retailValuePkr)}</b></div>
              <div><small>Phansa hua (0 bika)</small><b className={inventory.deadStockValuePkr ? "warn" : ""}>{compactMoney(inventory.deadStockValuePkr)}</b></div>
              <div><small>Low stock products</small><b className={inventory.lowStockCount ? "warn" : ""}>{inventory.lowStockCount}</b></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Products ================= */}
      <section className="fo-twoCol">
        <div className="fo-card">
          <SectionHead icon={Trophy} eyebrow="Winners" title="Sab se zyada kamane wale" subtitle="Inka stock aur ads barhayein." />
          {winners.length ? (
            <ol className="fo-rankList">
              {winners.map((row, index) => (
                <li key={row.productId || row.name}>
                  <span className={`fo-rank r${index + 1}`}>{index + 1}</span>
                  <div className="fo-rankInfo">
                    <b>{row.name}</b>
                    <small>{row.units} bike · {money(row.revenuePkr)} sale{Number(row.stock || 0) <= 5 ? ` · sirf ${row.stock} stock` : ""}</small>
                    <div className="fo-marginBar"><span className="good" style={{ width: `${clamp(row.marginPercent)}%` }} /></div>
                  </div>
                  <div className="fo-rankValue">
                    <b className="pos">{money(row.profitPkr)}</b>
                    <small>{pct(row.marginPercent)} margin</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="fo-empty"><Trophy size={20} /> Abhi koi profitable delivered product nahi.</div>
          )}
        </div>

        <div className="fo-card">
          <SectionHead icon={Target} eyebrow="Dhyaan chahiye" title="Kam margin wale products" subtitle="Price barhayein, cost kam karein ya band karne ka sochein." />
          {watchList.length ? (
            <ol className="fo-rankList">
              {watchList.map((row) => (
                <li key={row.productId || row.name}>
                  <span className={`fo-rank ${row.profitPkr < 0 ? "bad" : "warn"}`}>{row.profitPkr < 0 ? "!" : "↓"}</span>
                  <div className="fo-rankInfo">
                    <b>{row.name}</b>
                    <small>{row.units} bike · {money(row.revenuePkr)} sale{!row.costKnown ? " · cost missing" : ""}</small>
                    <div className="fo-marginBar"><span className={row.profitPkr < 0 ? "bad" : "warn"} style={{ width: `${Math.max(4, clamp(row.marginPercent))}%` }} /></div>
                  </div>
                  <div className="fo-rankValue">
                    <b className={row.profitPkr < 0 ? "neg" : ""}>{money(row.profitPkr)}</b>
                    <small>{pct(row.marginPercent)} margin</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="fo-empty fo-emptyGood"><CheckCircle2 size={20} /> Koi kam margin wala product nahi — zabardast!</div>
          )}
        </div>
      </section>

      {/* ================= Categories + Pipeline ================= */}
      <section className="fo-twoCol">
        <div className="fo-card">
          <SectionHead icon={Boxes} eyebrow="Categories" title="Kaunsi category sab se zyada kamati hai" subtitle="Munafe mein har category ka hissa." />
          {categories.length ? (
            <ul className="fo-shareList">
              {categories.map((row) => {
                const share = categoryProfitTotal ? clamp((Math.max(0, row.profitPkr) / categoryProfitTotal) * 100) : 0;
                return (
                  <li key={row.category}>
                    <div className="fo-shareHead">
                      <b>{row.category}</b>
                      <span><b className={row.profitPkr < 0 ? "neg" : "pos"}>{money(row.profitPkr)}</b> · {pct(share)} hissa · {pct(row.marginPercent)} margin · {row.units} pcs</span>
                    </div>
                    <div className="fo-shareTrack"><span style={{ width: `${share}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="fo-empty"><Boxes size={20} /> Koi category data nahi.</div>
          )}
        </div>

        <div className="fo-card">
          <SectionHead
            icon={Truck}
            eyebrow="Order pipeline"
            title="Orders kis status par hain"
            subtitle="Sale tab ginti hai jab order Delivered ho. Sale kam lage to wajah yahan dikhegi."
          />
          {statusTotal ? (
            <ul className="fo-pipeList">
              {sales.statusBreakdown.map((row) => {
                const share = (row.count / statusTotal) * 100;
                const key = String(row.status || "").toLowerCase();
                const tone = key.includes("deliver") ? "good" : key.includes("return") || key.includes("cancel") ? "bad" : key.includes("transit") || key.includes("dispatch") || key.includes("book") ? "info" : "neutral";
                return (
                  <li key={row.status} className={`fo-pipe-${tone}`}>
                    <div className="fo-pipeHead">
                      <b>{row.status}</b>
                      <span>{row.count} orders · {pct(share)}</span>
                    </div>
                    <div className="fo-pipeTrack"><span style={{ width: `${Math.max(2, share)}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="fo-empty"><Truck size={20} /> Koi order nahi.</div>
          )}
          {sales.pipelineOrders ? (
            <div className="fo-pipeNote">
              <Info size={14} /> {sales.pipelineOrders} orders ({money(sales.pipelineValuePkr)}) abhi raste mein hain — deliver hote hi sale mein judenge.
            </div>
          ) : null}
        </div>
      </section>

      {/* ================= Payment scenarios ================= */}
      <section className="fo-card">
        <SectionHead
          icon={Banknote}
          eyebrow="Customer payments"
          title="Orders ka paisa kaise aa raha hai"
          subtitle="Full advance, advance + COD, aur pure COD — kitna mil gaya aur kitna baqi."
          right={<LinkButton onClick={() => onNavigate("advances", { filter: "all" })}>Saari payments</LinkButton>}
        />
        <div className="fo-payGrid">
          <div className="fo-pay tone-green">
            <span className="fo-payTag">100% Advance</span>
            <b>{money(paymentScenarios.fullAdvanceTotalPkr)}</b>
            <small>{paymentScenarios.fullAdvanceCount} orders</small>
            <div className="fo-payRows">
              <span>Verified <b>{compactMoney(paymentScenarios.fullAdvanceVerifiedPkr)}</b></span>
              <span>Pending <b>{compactMoney(paymentScenarios.fullAdvancePendingPkr)}</b></span>
            </div>
          </div>
          <div className="fo-pay tone-blue">
            <span className="fo-payTag">Advance + COD</span>
            <b>{money(paymentScenarios.deliveryAdvanceVerifiedPkr)}</b>
            <small>{paymentScenarios.deliveryAdvanceCount} orders · advance mila</small>
            <div className="fo-payRows">
              <span>COD baqi <b>{compactMoney(paymentScenarios.deliveryAdvanceCodRemainingPkr)}</b></span>
              <span>Pending <b>{compactMoney(paymentScenarios.deliveryAdvancePendingPkr)}</b></span>
            </div>
          </div>
          <div className="fo-pay tone-slate">
            <span className="fo-payTag">Pure COD</span>
            <b>{money(paymentScenarios.codOnlyTotalPkr)}</b>
            <small>{paymentScenarios.codOnlyCount} orders</small>
            <div className="fo-payRows">
              <span>Delivered <b>{compactMoney(paymentScenarios.codOnlyDeliveredPkr)}</b></span>
              <span>Raste mein <b>{compactMoney(paymentScenarios.codOnlyInPipelinePkr)}</b></span>
            </div>
          </div>
          <button
            type="button"
            className={`fo-pay ${paymentScenarios.needsVerificationCount ? "tone-amber" : "tone-green"} fo-payAction`}
            onClick={() => onNavigate("verify")}
          >
            <span className="fo-payTag">Verification</span>
            <b>{paymentScenarios.needsVerificationCount} orders</b>
            <small>{paymentScenarios.needsVerificationCount ? `${money(paymentScenarios.needsVerificationPkr)} verify karna baqi` : "Saare advances verified"}</small>
            <div className="fo-payRows">
              <span>{paymentScenarios.needsVerificationCount ? "Abhi verify karein" : "Sab theek hai"} <ArrowRight size={12} /></span>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
