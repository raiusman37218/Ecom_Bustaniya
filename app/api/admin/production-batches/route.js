import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getStoreSettings, updateStoreSettings } from "../../../../lib/storeSettings";
import { supabaseAdminRequest } from "../../../../lib/supabaseRest";

export async function GET(request) {
  try {
    await authorizeAdminSession(request, "inventory");
    const settings = await getStoreSettings({ includeFinance: true });
    return NextResponse.json({ batches: settings.productionBatches || [] });
  } catch (error) {
    const auth = adminAuthErrorResponse(error);
    return NextResponse.json({ error: "Unable to load production batches." }, { status: error?.status === 401 || error?.status === 403 ? auth.status : 500 });
  }
}

export async function POST(request) {
  try {
    await authorizeAdminSession(request, "inventory");
    const body = await request.json();
    const quantity = Math.max(1, Number(body.quantity || 0));
    const costs = Object.fromEntries(Object.entries(body.costBreakdown || {}).map(([key, value]) => [key, Math.max(0, Number(value || 0))]));
    const totalCost = Object.values(costs).reduce((sum, value) => sum + value, 0);
    if (!body.productId || !totalCost) return NextResponse.json({ error: "Choose a product and enter its production costs." }, { status: 400 });
    const products = await supabaseAdminRequest(`products?select=id,name&id=eq.${encodeURIComponent(body.productId)}&limit=1`);
    const product = products?.[0];
    if (!product) return NextResponse.json({ error: "Selected product was not found." }, { status: 404 });
    const batch = { id: `PB-${randomUUID().slice(0, 8).toUpperCase()}`, productId: product.id, productName: product.name, quantity, totalCost, unitCost: totalCost / quantity, costBreakdown: costs, date: String(body.date || new Date().toISOString().slice(0, 10)), note: String(body.note || "").slice(0, 500) };
    const inventory = await supabaseAdminRequest(`inventory?select=stock_quantity,sku&product_id=eq.${encodeURIComponent(product.id)}&limit=1`).catch(() => []);
    const before = Number(inventory?.[0]?.stock_quantity || 0);
    const after = before + quantity;
    await supabaseAdminRequest("inventory?on_conflict=product_id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: { product_id: product.id, stock_quantity: after, sku: inventory?.[0]?.sku || "" } });
    await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(product.id)}`, { method: "PATCH", prefer: "return=minimal", body: { cost_total_pkr: batch.unitCost, cost_breakdown: costs } });
    await supabaseAdminRequest("inventory_movements", { method: "POST", prefer: "return=minimal", body: { product_id: product.id, quantity_change: quantity, reason: `Production batch ${batch.id}`, stock_before: before, stock_after: after } }).catch(() => {});
    const settings = await getStoreSettings({ includeFinance: true });
    const transactions = [{ id: `cash-${Date.now()}`, type: "business_expense", title: `Production batch ${batch.id}: ${product.name}`, category: "Inventory production", amount: totalCost, date: batch.date, note: batch.note }, ...(settings.financeTransactions || [])];
    const saved = await updateStoreSettings({ ...settings, productionBatches: [batch, ...(settings.productionBatches || [])], financeTransactions: transactions });
    return NextResponse.json({ success: true, batch, batches: saved.productionBatches || [] });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to save production batch." }, { status: 500 });
  }
}
