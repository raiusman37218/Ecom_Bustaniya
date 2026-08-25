import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { authorizeAdminSession, adminAuthErrorResponse } from "../../../../lib/adminAuth";
import { getStoreSettings, updateStoreSettings } from "../../../../lib/storeSettings";
import { supabaseAdminRequest } from "../../../../lib/supabaseRest";

const COST_KEYS = ["fabric", "stitching", "stitchingMaterial", "packaging", "travel", "other"];

const CASH_CATEGORY_BY_COST_KEY = {
  fabric: "Fabric / stock",
  stitching: "Tailoring / stitching",
  stitchingMaterial: "Lace / embellishment",
  packaging: "Inventory production",
  travel: "Inventory production",
  other: "Inventory production",
};

const COST_LABEL_BY_KEY = {
  fabric: "Fabric",
  stitching: "Stitching",
  stitchingMaterial: "Lace / material",
  packaging: "Packaging",
  travel: "Travel / transport",
  other: "Other production cost",
};

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

function costBreakdownKey(costKey) {
  return ({ stitchingMaterial: "embellishment", travel: "delivery" })[costKey] || costKey;
}

function batchCostEntries(sharedCosts, items, date) {
  return COST_KEYS.map((costKey) => ({
    id: `initial-${costKey}`,
    costKey,
    amount: Number(sharedCosts[costKey] || 0) + items.reduce((sum, item) => sum + Number(item.directCostBreakdown?.[costKey] || 0), 0),
    date,
    counterparty: "",
    reference: "",
    note: "Initial production cost",
  })).filter((entry) => entry.amount > 0);
}

async function resolveBatchProduct(item) {
  if (item.productId === "__new__") {
    const name = String(item.newProductName || "").trim();
    const articleNumber = String(item.newProductArticleNumber || "").trim();
    if (!name && !articleNumber) throw new Error("Enter a name or Design Code (SKU) for every new product/design.");
    if (articleNumber) {
      const existing = await supabaseAdminRequest(`products?select=id,name,cost_breakdown,article_number&article_number=eq.${encodeURIComponent(articleNumber)}&limit=1`).catch(() => []);
      if (existing?.[0]) {
        return existing[0];
      }
    }
    const finalName = name || `Design ${articleNumber}`;
    const created = await supabaseAdminRequest("products?select=id,name,cost_breakdown", {
      method: "POST", prefer: "return=representation", body: {
        name: finalName, description: "Created from production batch", price: Math.max(0, Number(item.newProductPrice || 0)), category: String(item.newProductCategory || "Uncategorized"), color: "[]", size: "[]", img: JSON.stringify([String(item.newProductImage || "/bustaniya-campaign-hero-v4.png")]), instock: true, new: false, bestsellere: false, article_number: articleNumber || `PB-${Date.now().toString().slice(-8)}`,
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
    if (body.action === "add_cost") {
      const batchId = String(body.batchId || "").trim();
      const costKey = COST_KEYS.includes(body.costKey) ? body.costKey : "other";
      const amount = Math.max(0, Number(body.amount || 0));
      const entryId = String(body.entryId || "").trim();
      if (!batchId || !entryId || !amount) return NextResponse.json({ error: "Batch, cost type and amount are required." }, { status: 400 });
      const settings = await getStoreSettings({ includeFinance: true });
      const batch = (settings.productionBatches || []).find((item) => item.id === batchId);
      if (!batch) return NextResponse.json({ error: "Production batch was not found." }, { status: 404 });
      if (batch.status === "voided") return NextResponse.json({ error: "A voided batch cannot receive a new cost." }, { status: 400 });
      const currentEntries = Array.isArray(batch.costEntries) ? batch.costEntries : [];
      if (currentEntries.some((entry) => entry.id === entryId)) {
        return NextResponse.json({ success: true, batch, batches: settings.productionBatches || [] });
      }
      const batchItems = Array.isArray(batch.items) && batch.items.length ? batch.items : [{ productId: batch.productId, productName: batch.productName, quantity: batch.quantity, totalCost: batch.totalCost, unitCost: batch.unitCost, unitCostBreakdown: batch.unitCostBreakdown || {} }];
      for (const item of batchItems) {
        const linkedOrderItems = await supabaseAdminRequest(`order_items?select=order_id&product_id=eq.${encodeURIComponent(item.productId)}&limit=1`).catch(() => []);
        if (linkedOrderItems.length) return NextResponse.json({ error: "This batch already has a customer order. To keep past order profit correct, add a Finance adjustment instead of changing its production cost." }, { status: 400 });
      }
      const entry = { id: entryId, costKey, amount, date: String(body.date || new Date().toISOString().slice(0, 10)), counterparty: String(body.counterparty || "").trim().slice(0, 160), reference: String(body.reference || "").trim().slice(0, 160), note: String(body.note || "").trim().slice(0, 500) };
      const nextEntries = [...currentEntries, entry];
      const initialTotal = Number((batch.baseTotalCost ?? batch.totalCost) || 0);
      const addedTotal = nextEntries.filter((item) => !String(item.id).startsWith("initial-")).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const nextTotalCost = initialTotal + addedTotal;
      const totalQuantity = batchItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 1;
      const nextItems = [];
      for (const item of batchItems) {
        const itemQuantity = Number(item.quantity || 0) || 1;
        const baseItemTotal = Number((item.baseTotalCost ?? item.totalCost) || 0);
        const baseBreakdown = item.baseUnitCostBreakdown || item.unitCostBreakdown || {};
        const additionPerUnit = nextEntries.filter((cost) => !String(cost.id).startsWith("initial-")).reduce((breakdown, cost) => {
          const key = costBreakdownKey(cost.costKey);
          return { ...breakdown, [key]: Number(breakdown[key] || 0) + (Number(cost.amount || 0) * itemQuantity / totalQuantity / itemQuantity) };
        }, {});
        const unitCostBreakdown = { ...baseBreakdown };
        for (const [key, value] of Object.entries(additionPerUnit)) unitCostBreakdown[key] = Number(unitCostBreakdown[key] || 0) + Number(value || 0);
        const itemTotalCost = baseItemTotal + (addedTotal * itemQuantity / totalQuantity);
        const unitCost = itemTotalCost / itemQuantity;
        const productRows = await supabaseAdminRequest(`products?select=cost_breakdown&id=eq.${encodeURIComponent(item.productId)}&limit=1`).catch(() => []);
        const metadata = parseJsonObject(parseJsonObject(productRows?.[0]?.cost_breakdown).metadata);
        await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(item.productId)}`, { method: "PATCH", prefer: "return=minimal", body: { cost_total_pkr: unitCost, cost_breakdown: { ...unitCostBreakdown, metadata, costSource: "production_batch", productionBatchId: batch.id, productionBatchDate: batch.date, productionBatchQuantity: itemQuantity, productionBatchTotalCost: itemTotalCost, sharedCostAllocation: Number(item.sharedCostAllocation || 0) + (addedTotal * itemQuantity / totalQuantity) } } });
        nextItems.push({ ...item, baseTotalCost: baseItemTotal, baseUnitCostBreakdown: baseBreakdown, totalCost: itemTotalCost, unitCost, unitCostBreakdown });
      }
      const nextBatch = { ...batch, baseTotalCost: initialTotal, totalCost: nextTotalCost, unitCost: nextTotalCost / totalQuantity, items: nextItems, costEntries: nextEntries, updatedAt: new Date().toISOString() };
      const transactions = [{ id: `batch-cost-${entryId}`, type: "business_expense", title: `Production batch ${batch.id}: ${COST_LABEL_BY_KEY[costKey]}`, category: CASH_CATEGORY_BY_COST_KEY[costKey], amount, date: entry.date, counterparty: entry.counterparty, reference: entry.reference, note: entry.note, productionBatchId: batch.id, costEntryId: entryId }, ...(settings.financeTransactions || [])];
      const batches = (settings.productionBatches || []).map((item) => item.id === batch.id ? nextBatch : item);
      const saved = await updateStoreSettings({ ...settings, productionBatches: batches, financeTransactions: transactions });
      return NextResponse.json({ success: true, batch: nextBatch, batches: saved.productionBatches || [] });
    }
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
    const rawItems = Array.isArray(body.items) && body.items.length ? body.items : [{ productId: body.productId, newProductName: body.newProductName, newProductArticleNumber: body.newProductArticleNumber, newProductPrice: body.newProductPrice, newProductCategory: body.newProductCategory, newProductImage: body.newProductImage, quantity: body.quantity, directCostBreakdown: body.costBreakdown }];
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
      savedItems.push({ productId: product.id, productName: product.name, quantity: item.quantity, directCostBreakdown: item.directCostBreakdown, sharedCostAllocation: sumCosts(sharedCostBreakdown) * item.quantity / totalQuantity, baseTotalCost: itemTotalCost, totalCost: itemTotalCost, unitCost, baseUnitCostBreakdown: unitCostBreakdown, unitCostBreakdown });
    }
    const costEntries = batchCostEntries(sharedCostBreakdown, items, batchDate);
    const batch = { id: batchId, productId: savedItems[0].productId, productName: savedItems.length === 1 ? savedItems[0].productName : `${savedItems.length} products`, quantity: totalQuantity, baseTotalCost: totalCost, totalCost, unitCost: totalCost / totalQuantity, costBreakdown: sharedCostBreakdown, sharedCostBreakdown, costEntries, items: savedItems, date: batchDate, note: String(body.note || "").slice(0, 500) };
    const settings = await getStoreSettings({ includeFinance: true });
    const transactions = costEntries.map((entry) => ({ id: `batch-cost-${batch.id}-${entry.id}`, type: "business_expense", title: `Production batch ${batch.id}: ${COST_LABEL_BY_KEY[entry.costKey]}`, category: CASH_CATEGORY_BY_COST_KEY[entry.costKey], amount: entry.amount, date: entry.date, note: batch.note || entry.note, productionBatchId: batch.id, costEntryId: entry.id })).concat(settings.financeTransactions || []);
    const saved = await updateStoreSettings({ ...settings, productionBatches: [batch, ...(settings.productionBatches || [])], financeTransactions: transactions });
    return NextResponse.json({ success: true, batch, batches: saved.productionBatches || [] });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to save production batch." }, { status: 500 });
  }
}
