import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { buildFinanceReport, buildMonthlyTrend, loadFinanceData, computeFinanceReport, resolvePeriod } from "../../../../lib/financeReport";
import {
  insertFinanceTransactions,
  voidFinanceTransaction,
  getFinanceTransaction,
  insertSupplierBill,
  updateSupplierBillStatus,
  insertMarketingCampaign,
  updateFinanceSettings,
  listFinanceAccounts,
  listSupplierBills,
  isMissingTableError,
} from "../../../../lib/financeStore";
import { backfillDeliveredOrderCogs, backfillVerifiedAdvances } from "../../../../lib/financeOrders";
import { supabaseAdminRequest } from "../../../../lib/supabaseRest";

const SETUP_HINT = "Run scripts/supabase-finance.sql and scripts/supabase-finance-phase2.sql in Supabase, then reload.";

/**
 * Account ids come from the browser, so never write one until it has been
 * checked against the active finance accounts. The FK protects the database,
 * while this gives the owner a useful validation message and prevents an
 * inactive account being used for a new movement.
 */
async function findActiveFinanceAccount(accountId) {
  const requestedId = String(accountId || "").trim();
  if (!requestedId) return null;
  const accounts = await listFinanceAccounts();
  return accounts.find((account) => String(account.id) === requestedId && account.is_active !== false) || null;
}

async function validateFinanceAccounts(accountIds) {
  const requestedIds = [...new Set((Array.isArray(accountIds) ? accountIds : [accountIds])
    .map((value) => String(value || "").trim())
    .filter(Boolean))];
  if (!requestedIds.length) return false;
  const accounts = await listFinanceAccounts();
  const activeIds = new Set(accounts.filter((account) => account.is_active !== false).map((account) => String(account.id)));
  return requestedIds.every((id) => activeIds.has(id));
}

async function refreshSupplierBillStatus(billId) {
  const bills = await listSupplierBills();
  const bill = bills.find((row) => String(row.id) === String(billId));
  if (!bill) return null;
  const status = Number(bill.remaining_pkr || 0) > 0 ? "open" : "paid";
  return updateSupplierBillStatus(billId, status);
}

function failure(error) {
  if (error?.status === 401 || error?.status === 403) {
    const authError = adminAuthErrorResponse(error);
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }
  if (error?.setupRequired || isMissingTableError(error)) {
    // Carry the database's own words through: "table X not found" and
    // "column Y does not exist" need very different fixes, and a generic
    // hint sends people back to SQL they have already run.
    console.error("Finance setup incomplete", { message: error?.message, details: error?.details });
    return NextResponse.json({
      error: SETUP_HINT,
      detail: error?.message || "",
      hint: error?.details?.hint || "",
      setupRequired: true,
    }, { status: 409 });
  }
  return null;
}

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "finance");
    const params = request.nextUrl.searchParams;
    const wantsTrend = params.get("trend") === "1";
    if (!wantsTrend) {
      const report = await buildFinanceReport({
        period: params.get("period") || "all",
        from: params.get("from") || "",
        to: params.get("to") || "",
      });
      return NextResponse.json({ report });
    }
    // One load feeds both the report and the twelve-month trend.
    const data = await loadFinanceData();
    const report = computeFinanceReport(data, resolvePeriod({
      period: params.get("period") || "all",
      from: params.get("from") || "",
      to: params.get("to") || "",
    }));
    const trend = await buildMonthlyTrend({ data });
    return NextResponse.json({ report, trend });
  } catch (error) {
    const handled = failure(error);
    if (handled) return handled;
    console.error("Finance report error", { message: error?.message });
    return NextResponse.json({ error: "Unable to build the finance report." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user } = await authorizeAdminSession(request, "finance");
    const body = await request.json().catch(() => ({}));
    const actorName = user.name || user.email || "";

    switch (body.action) {
      case "add_transaction": {
        const entry = body.entry || {};
        const accountId = String(entry.accountId || "").trim();
        if (!accountId) return NextResponse.json({ error: "Paisa kis account mein hai, woh select karein." }, { status: 422 });
        if (!(await findActiveFinanceAccount(accountId))) {
          return NextResponse.json({ error: "Selected finance account valid ya active nahi hai. Account dobara select karein." }, { status: 422 });
        }
        if (!(Number(entry.amountPkr || 0) > 0)) return NextResponse.json({ error: "Amount 0 se zyada hona chahiye." }, { status: 422 });
        const [created] = await insertFinanceTransactions([{ ...entry, accountId, createdBy: actorName, source: "manual" }]);
        if (!created) return NextResponse.json({ error: "Amount zaroori hai." }, { status: 422 });
        return NextResponse.json({ success: true, transaction: created });
      }

      case "transfer": {
        const amount = Number(body.amountPkr || 0);
        const fromAccountId = String(body.fromAccountId || "");
        const toAccountId = String(body.toAccountId || "");
        if (!(amount > 0)) return NextResponse.json({ error: "Transfer amount zaroori hai." }, { status: 422 });
        if (!fromAccountId || !toAccountId) return NextResponse.json({ error: "Dono accounts select karein." }, { status: 422 });
        if (fromAccountId === toAccountId) return NextResponse.json({ error: "Ek hi account mein transfer nahi ho sakta." }, { status: 422 });
        if (!(await validateFinanceAccounts([fromAccountId, toAccountId]))) {
          return NextResponse.json({ error: "From aur To dono active finance accounts hone chahiye." }, { status: 422 });
        }
        // Both legs share a group id so a transfer always reverses as a pair.
        const transferGroupId = randomUUID();
        const shared = {
          amountPkr: amount,
          occurredOn: body.occurredOn,
          category: "Account transfer",
          reference: body.reference || "",
          note: body.note || "",
          source: "transfer",
          transferGroupId,
          createdBy: actorName,
        };
        const created = await insertFinanceTransactions([
          { ...shared, entryType: "transfer_out", accountId: fromAccountId, title: body.title || "Transfer out" },
          { ...shared, entryType: "transfer_in", accountId: toAccountId, title: body.title || "Transfer in" },
        ]);
        return NextResponse.json({ success: true, transactions: created });
      }

      case "void_transaction": {
        if (user.role !== "Owner") {
          return NextResponse.json({ error: "Sirf Owner koi entry void kar sakta hai." }, { status: 403 });
        }
        const transaction = await getFinanceTransaction(body.transactionId);
        if (!transaction) return NextResponse.json({ error: "Entry nahi mili." }, { status: 404 });
        if (transaction.voided) return NextResponse.json({ error: "Ye entry pehle hi void hai." }, { status: 422 });
        if (body.confirmation !== `VOID ${transaction.id}`) {
          return NextResponse.json({ error: "Void confirmation match nahi hui." }, { status: 422 });
        }
        if (transaction.production_batch_id) {
          return NextResponse.json({ error: "Is entry ko us ke production batch se void karein taake stock aur cost saath reverse hon." }, { status: 422 });
        }
        // A transfer must reverse as a pair or the two accounts drift apart.
        const targets = transaction.transfer_group_id
          ? await supabaseAdminRequest(`finance_transactions?select=id&transfer_group_id=eq.${encodeURIComponent(transaction.transfer_group_id)}&voided=is.false`)
          : [{ id: transaction.id }];
        for (const target of targets) await voidFinanceTransaction(target.id, { voidedBy: actorName });
        if (transaction.supplier_bill_id) {
          // Recalculate from the remaining non-voided payments. A bill that
          // still has another payment remains paid; otherwise it reopens.
          await refreshSupplierBillStatus(transaction.supplier_bill_id).catch(() => {});
        }
        return NextResponse.json({ success: true, voided: targets.length });
      }

      case "add_supplier_bill": {
        const billInput = body.bill || {};
        const total = Number(billInput.totalPkr || 0);
        const paid = Number(billInput.paid || 0);
        if (!Number.isFinite(total) || !(total > 0)) return NextResponse.json({ error: "Bill amount 0 se zyada hona chahiye." }, { status: 422 });
        if (!Number.isFinite(paid) || paid < 0 || paid > total) return NextResponse.json({ error: "Already paid amount bill total se zyada nahi ho sakta." }, { status: 422 });
        if (paid > 0 && !billInput.accountId) return NextResponse.json({ error: "Already paid amount ke liye account select karein." }, { status: 422 });
        if (paid > 0 && !(await findActiveFinanceAccount(billInput.accountId))) {
          return NextResponse.json({ error: "Already paid amount ke liye selected account valid ya active nahi hai." }, { status: 422 });
        }
        const bill = await insertSupplierBill(billInput);
        if (!bill) return NextResponse.json({ error: "Supplier aur bill amount zaroori hain." }, { status: 422 });
        // Money already handed over is a real cash movement, not just a payable.
        let payment = null;
        if (paid > 0) {
          [payment] = await insertFinanceTransactions([{
            accountId: body.bill?.accountId || null,
            entryType: "supplier_payment",
            title: `Supplier payment: ${bill.supplier}`,
            category: "Supplier payable",
            amountPkr: paid,
            occurredOn: bill.bill_date,
            reference: bill.reference,
            counterparty: bill.supplier,
            note: "Opening payment recorded with the supplier bill.",
            source: "supplier_bill",
            supplierBillId: bill.id,
            createdBy: actorName,
          }]);
          if (paid >= Number(bill.total_pkr)) await updateSupplierBillStatus(bill.id, "paid");
        }
        return NextResponse.json({ success: true, bill, payment });
      }

      case "pay_supplier_bill": {
        const bills = await listSupplierBills();
        const bill = bills.find((row) => String(row.id) === String(body.billId));
        if (!bill) return NextResponse.json({ error: "Bill nahi mila." }, { status: 404 });
        const remaining = Number(bill.remaining_pkr || 0);
        const amount = Number(body.amountPkr || 0);
        if (!body.accountId) return NextResponse.json({ error: "Payment account select karein." }, { status: 422 });
        if (!(await findActiveFinanceAccount(body.accountId))) {
          return NextResponse.json({ error: "Selected payment account valid ya active nahi hai." }, { status: 422 });
        }
        if (!(amount > 0) || amount > remaining) {
          return NextResponse.json({ error: `Amount 1 se Rs. ${remaining.toLocaleString()} ke darmiyan hona chahiye.` }, { status: 422 });
        }
        const [payment] = await insertFinanceTransactions([{
          accountId: body.accountId || null,
          entryType: "supplier_payment",
          title: `Supplier payment: ${bill.supplier}`,
          category: "Supplier payable",
          amountPkr: amount,
          occurredOn: body.occurredOn,
          reference: bill.reference,
          counterparty: bill.supplier,
          note: body.note || "",
          source: "supplier_bill",
          supplierBillId: bill.id,
          createdBy: actorName,
        }]);
        if (amount >= remaining) await updateSupplierBillStatus(bill.id, "paid");
        return NextResponse.json({ success: true, payment });
      }

      case "add_campaign": {
        const campaign = await insertMarketingCampaign(body.campaign || {});
        if (!campaign) return NextResponse.json({ error: "Campaign ka naam zaroori hai." }, { status: 422 });
        return NextResponse.json({ success: true, campaign });
      }

      case "save_settings": {
        const settings = await updateFinanceSettings(body.settings || {});
        return NextResponse.json({ success: true, settings });
      }

      case "assign_account": {
        const ids = (Array.isArray(body.transactionIds) ? body.transactionIds : []).map(String).filter(Boolean);
        if (!ids.length || !body.accountId) {
          return NextResponse.json({ error: "Entries aur account dono select karein." }, { status: 422 });
        }
        if (!(await findActiveFinanceAccount(body.accountId))) {
          return NextResponse.json({ error: "Selected account valid ya active nahi hai." }, { status: 422 });
        }
        const updated = await supabaseAdminRequest(
          `finance_transactions?id=in.(${ids.map((id) => `"${id}"`).join(",")})`,
          { method: "PATCH", body: { account_id: body.accountId }, prefer: "return=representation" }
        );
        return NextResponse.json({ success: true, updated: updated?.length || 0 });
      }

      case "backfill": {
        if (user.role !== "Owner") {
          return NextResponse.json({ error: "Sirf Owner backfill chala sakta hai." }, { status: 403 });
        }
        const [cogs, advances] = await Promise.all([
          backfillDeliveredOrderCogs(),
          backfillVerifiedAdvances(),
        ]);
        return NextResponse.json({ success: true, cogs, advances });
      }

      default:
        return NextResponse.json({ error: "Unknown finance action." }, { status: 400 });
    }
  } catch (error) {
    const handled = failure(error);
    if (handled) return handled;
    console.error("Finance action error", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Ye action pura nahi ho saka." }, { status: 500 });
  }
}
