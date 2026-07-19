import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getStoreSettings, updateStoreSettings } from "../../../../lib/storeSettings";
import { supabaseAdminRequest } from "../../../../lib/supabaseRest";

const COST_KEYS = ["fabric", "stitching", "stitchingMaterial", "packaging", "travel", "other"];

function normalizedCosts(value = {}) {
  return Object.fromEntries(COST_KEYS.map((key) => [key, Math.max(0, Number(value[key] || 0))]));
}

function sumCosts(costs) {
  return COST_KEYS.reduce((sum, key) => sum + Number(costs[key] || 0), 0);
}

function parseJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function productCostBreakdown(directCosts, sharedCosts, quantity, totalQuantity) {
  return {
    fabric: (directCosts.fabric / quantity) + (sharedCosts.fabric / totalQuantity),
    stitching: (directCosts.stitching / quantity) + (sharedCosts.stitching / totalQuantity),
    embellishment: (directCosts.stitchingMaterial / quantity) + (sharedCosts.stitchingMaterial / totalQuantity),
    packaging: (directCosts.packaging / quantity) + (sharedCosts.packaging / totalQuantity),
    delivery: (directCosts.travel / quantity) + (sharedCosts.travel / totalQuantity),
    other: (directCosts.other / quantity) + (sharedCosts.other / totalQuantity),
  };
}

async function resolveBatchProduct(item) {
  if (item.productId === "__new__") {
    const name = String(item.newProductName || "").trim();
    if (!name) throw new Error("Enter a name for every new product/design.");
    const created = await supabaseAdminRequest("products?select=id,name,cost_breakdown", {
      method: "POST", prefer: "return=representation", body: {
        name, description: "Created from production batch", price: Math.max(0, Number(item.newProductPrice || 0)), category: String(item.newProductCategory || "Uncategorized"), color: "[]", size: "[]", img: JSON.stringify([String(item.newProductImage || "/bustaniya-campaign-hero-v4.png")]), instock: true, new: false, bestsellere: false, article_number: `PB-${Date.now().toString().slice(-8)}`,
      },
    });
    return created?.[0];
  }
  const products = await supabaseAdminRequest(`products?select=id,name,cost_breakdown&id=eq.${encodeURIComponent(item.productId)}&limit=1`);
  return products?.[0];
}

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
    const { user } = await authorizeAdminSession(request, "inventory");
    const body = await request.json();
    if (body.action === "void") {
      const batchId = String(body.batchId || "").trim();
      if (user.role !== "Owner") {
        return NextResponse.json({ error: "Only an Owner can void a production batch." }, { status: 403 });
      }
      if (String(body.confirmation || "").trim() !== `VOID ${batchId}`) {
        return NextResponse.json({ error: `Type VOID ${batchId} exactly to confirm this action.` }, { status: 400 });
      }
      const settings = await getStoreSettings({ includeFinance: true });
      const batch = (settings.productionBatches || []).find((item) => item.id === batchId);
      if (!batch) return NextResponse.json({ error: "Production batch was not found." }, { status: 404 });
      if (batch.status === "voided") return NextResponse.json({ error: "This production batch is already voided." }, { status: 400 });
      const batchItems = Array.isArray(batch.items) && batch.items.length ? batch.items : [{ productId: batch.productId, quantity: batch.quantity }];
      for (const item of batchItems) {
        const linkedOrderItems = await supabaseAdminRequest(`order_items?select=order_id&product_id=eq.${encodeURIComponent(item.productId)}&limit=1`).catch(() => []);
        if (linkedOrderItems.length) return NextResponse.json({ error: "This batch cannot be voided because one of its products appears in an order. Use a finance adjustment instead." }, { status: 400 });
      }
      for (const item of batchItems) {
        const inventory = await supabaseAdminRequest(`inventory?select=stock_quantity,sku&product_id=eq.${encodeURIComponent(item.productId)}&limit=1`).catch(() => []);
        const before = Number(inventory?.[0]?.stock_quantity || 0);
        const after = Math.max(0, before - Number(item.quantity || 0));
        if (inventory?.[0]) {
          await supabaseAdminRequest(`inventory?product_id=eq.${encodeURIComponent(item.productId)}`, { method: "PATCH", prefer: "return=minimal", body: { stock_quantity: after } });
          await supabaseAdminRequest("inventory_movements", { method: "POST", prefer: "return=minimal", body: { product_id: item.productId, quantity_change: after - before, reason: `Voided production batch ${batch.id}`, stock_before: before, stock_after: after } }).catch(() => {});
        }
      }
      const batches = (settings.productionBatches || []).map((item) => item.id === batch.id ? {
        ...item,
        status: "voided",
        voidedAt: new Date().toISOString(),
        voidedBy: { id: user.id, name: user.name, email: user.email },
      } : item);
      const transactions = (settings.financeTransactions || []).filter((item) => item.productionBatchId !== batch.id && !String(item.title || "").startsWith(`Production batch ${batch.id}:`));
      const saved = await updateStoreSettings({ ...settings, productionBatches: batches, financeTransactions: transactions });
      return NextResponse.json({ success: true, batches: saved.productionBatches || [] });
    }
    const rawItems = Array.isArray(body.items) && body.items.length ? body.items : [{ productId: body.productId, newProductName: body.newProductName, newProductPrice: body.newProductPrice, newProductCategory: body.newProductCategory, newProductImage: body.newProductImage, quantity: body.quantity, directCostBreakdown: body.costBreakdown }];
    if (!rawItems.length) return NextResponse.json({ error: "Add at least one product/design to this production batch." }, { status: 400 });
    const sharedCostBreakdown = normalizedCosts(body.sharedCostBreakdown || {});
    const items = rawItems.map((item) => ({ ...item, quantity: Math.max(1, Number(item.quantity || 0)), directCostBreakdown: normalizedCosts(item.directCostBreakdown || {}) }));
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalCost = sumCosts(sharedCostBreakdown) + items.reduce((sum, item) => sum + sumCosts(item.directCostBreakdown), 0);
    if (!totalCost) return NextResponse.json({ error: "Enter a direct or shared production cost before saving." }, { status: 400 });
    const batchId = `PB-${randomUUID().slice(0, 8).toUpperCase()}`;
    const batchDate = String(body.date || new Date().toISOString().slice(0, 10));
    const savedItems = [];
    for (const item of items) {
      const product = await resolveBatchProduct(item);
      if (!product) return NextResponse.json({ error: "A selected product was not found." }, { status: 404 });
      const unitCostBreakdown = productCostBreakdown(item.directCostBreakdown, sharedCostBreakdown, item.quantity, totalQuantity);
      const itemTotalCost = sumCosts(item.directCostBreakdown) + (sumCosts(sharedCostBreakdown) * item.quantity / totalQuantity);
      const unitCost = itemTotalCost / item.quantity;
      const inventory = await supabaseAdminRequest(`inventory?select=stock_quantity,sku&product_id=eq.${encodeURIComponent(product.id)}&limit=1`).catch(() => []);
      const before = Number(inventory?.[0]?.stock_quantity || 0);
      const after = before + item.quantity;
      await supabaseAdminRequest("inventory?on_conflict=product_id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: { product_id: product.id, stock_quantity: after, sku: inventory?.[0]?.sku || "" } });
      const existingMetadata = parseJsonObject(parseJsonObject(product.cost_breakdown).metadata);
      await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(product.id)}`, { method: "PATCH", prefer: "return=minimal", body: { cost_total_pkr: unitCost, cost_breakdown: { ...unitCostBreakdown, metadata: existingMetadata, costSource: "production_batch", productionBatchId: batchId, productionBatchDate: batchDate, productionBatchQuantity: item.quantity, productionBatchTotalCost: itemTotalCost, sharedCostAllocation: sumCosts(sharedCostBreakdown) * item.quantity / totalQuantity } } });
      await supabaseAdminRequest("inventory_movements", { method: "POST", prefer: "return=minimal", body: { product_id: product.id, quantity_change: item.quantity, reason: `Production batch ${batchId}`, stock_before: before, stock_after: after } }).catch(() => {});
      savedItems.push({ productId: product.id, productName: product.name, quantity: item.quantity, directCostBreakdown: item.directCostBreakdown, sharedCostAllocation: sumCosts(sharedCostBreakdown) * item.quantity / totalQuantity, totalCost: itemTotalCost, unitCost, unitCostBreakdown });
    }
    const batch = { id: batchId, productId: savedItems[0].productId, productName: savedItems.length === 1 ? savedItems[0].productName : `${savedItems.length} products`, quantity: totalQuantity, totalCost, unitCost: totalCost / totalQuantity, costBreakdown: sharedCostBreakdown, sharedCostBreakdown, items: savedItems, date: batchDate, note: String(body.note || "").slice(0, 500) };
    const settings = await getStoreSettings({ includeFinance: true });
    const transactions = [{ id: `cash-${Date.now()}`, type: "business_expense", title: `Production batch ${batch.id}: ${batch.productName}`, category: "Inventory production", amount: totalCost, date: batch.date, note: batch.note, productionBatchId: batch.id }, ...(settings.financeTransactions || [])];
    const saved = await updateStoreSettings({ ...settings, productionBatches: [batch, ...(settings.productionBatches || [])], financeTransactions: transactions });
    return NextResponse.json({ success: true, batch, batches: saved.productionBatches || [] });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to save production batch." }, { status: 500 });
  }
}
