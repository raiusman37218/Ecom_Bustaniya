import { supabaseAdminRequest } from "./supabaseRest";

const ORDER_STAGES = new Set(["Un-Assigned By Me", "Unbooked", "Booked", "PostEx Warehouse", "Out For Delivery", "Delivered", "Attempted", "Out For Return", "Returned", "Delivery Under Review", "Transferred", "Rider Assigned", "Ready For Pickup", "Customer Pickup", "Manual Delivery", "On Hold", "Cancelled"]);
const PAYMENT_STATUSES = new Set(["COD pending", "Advance pending", "Verification due", "Paid", "Refunded"]);
const FULFILLMENT_STATUSES = new Set(["Unfulfilled", "Packing", "Booked with PostEx", "Shipped", "Delivered", "On hold"]);
const RETURN_STATUSES = new Set(["No return", "Return requested", "Return approved", "Return received", "Exchange requested", "Exchange approved", "Refund requested", "Refund approved", "Refund processed", "Closed"]);
const REFUND_METHODS = new Set(["Bank transfer", "Easypaisa", "JazzCash", "Card reversal", "Cash", "Other"]);
const MAX_REQUEST_BYTES = 16 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value, max = 500) { return String(value || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max); }
function money(value) { const amount = Number(value || 0); return Number.isFinite(amount) && amount >= 0 && amount <= 10000000 ? Math.round(amount * 100) / 100 : null; }
function tags(value) { return [...new Set((Array.isArray(value) ? value : []).map((item) => text(item, 40)).filter(Boolean))].slice(0, 20); }
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function missingTable(error, table) { const message = `${error?.message || ""} ${JSON.stringify(error?.details || {})}`.toLowerCase(); return error?.status === 404 || message.includes(table) || message.includes("schema cache"); }

export async function parseOrderUpdateRequest(request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_BYTES) throw Object.assign(new Error("Request is too large."), { status: 413 });
  let body;
  try { body = JSON.parse(raw || "{}"); } catch { throw Object.assign(new Error("Invalid JSON request."), { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw Object.assign(new Error("Invalid order update."), { status: 400 });
  const allowed = new Set(["orderId", "orderStage", "paymentStatus", "fulfillmentStatus", "tracking", "notes", "tags", "operation"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw Object.assign(new Error("Unsupported order update field."), { status: 400 });
  return body;
}

export function normalizeOperation(row = {}) { return { returnStatus: RETURN_STATUSES.has(row.return_status) ? row.return_status : "No return", returnReason: text(row.return_reason, 500), returnResolution: text(row.return_resolution, 500), refundAmount: Number(row.refund_amount_pkr || 0), refundMethod: REFUND_METHODS.has(row.refund_method) ? row.refund_method : "", updatedAt: row.updated_at || "" }; }
export async function getOrderOperations(orderIds = []) {
  const ids = orderIds.map(String).filter(Boolean); if (!ids.length) return { operations: new Map(), available: true };
  try { const rows = await supabaseAdminRequest(`order_operations?select=*&order_id=in.(${ids.join(",")})`); return { operations: new Map((rows || []).map((row) => [String(row.order_id), normalizeOperation(row)])), available: true }; }
  catch (error) { if (missingTable(error, "order_operations")) return { operations: new Map(), available: false }; throw error; }
}
export async function getOrderOperationEvents(orderIds = []) {
  const ids = orderIds.map(String).filter(Boolean); if (!ids.length) return { events: new Map(), available: true };
  try { const rows = await supabaseAdminRequest(`order_operation_events?select=order_id,event_type,previous_value,new_value,safe_note,actor_id,actor_role,request_id,created_at&order_id=in.(${ids.join(",")})&order=created_at.desc`); const events = new Map(); for (const row of rows || []) events.set(String(row.order_id), [...(events.get(String(row.order_id)) || []), row]); return { events, available: true }; }
  catch (error) { if (missingTable(error, "order_operation_events")) return { events: new Map(), available: false }; throw error; }
}

function validateOperation(input, previous, orderTotal, actor) {
  const next = { returnStatus: RETURN_STATUSES.has(input?.returnStatus) ? input.returnStatus : previous.returnStatus, returnReason: text(input?.returnReason ?? previous.returnReason, 500), returnResolution: text(input?.returnResolution ?? previous.returnResolution, 500), refundAmount: input?.refundAmount === undefined ? previous.refundAmount : money(input.refundAmount), refundMethod: input?.refundMethod === undefined ? previous.refundMethod : text(input.refundMethod, 80) };
  if (next.refundAmount === null || next.refundAmount > orderTotal) throw Object.assign(new Error("Refund amount must be between zero and the order total."), { status: 400 });
  if (next.refundMethod && !REFUND_METHODS.has(next.refundMethod)) throw Object.assign(new Error("Choose a supported refund method."), { status: 400 });
  const refundChange = next.returnStatus.startsWith("Refund") || next.refundAmount > 0 || next.refundMethod;
  if (refundChange && actor?.role !== "Owner") throw Object.assign(new Error("Only an Owner can approve or record refund details."), { status: 403 });
  const transitions = { "No return": ["No return", "Return requested", "Exchange requested", "Refund requested"], "Return requested": ["Return requested", "Return approved"], "Return approved": ["Return approved", "Return received"], "Return received": ["Return received", "Exchange requested", "Refund requested", "Closed"], "Exchange requested": ["Exchange requested", "Exchange approved"], "Exchange approved": ["Exchange approved", "Closed"], "Refund requested": ["Refund requested", "Refund approved"], "Refund approved": ["Refund approved", "Refund processed"], "Refund processed": ["Refund processed", "Closed"], "Closed": ["Closed"] };
  if (!transitions[previous.returnStatus]?.includes(next.returnStatus)) throw Object.assign(new Error("This return workflow transition is not allowed."), { status: 422 });
  if (["Return requested", "Exchange requested", "Refund requested"].includes(next.returnStatus) && !next.returnReason) throw Object.assign(new Error("A return reason is required when opening a request."), { status: 422 });
  if (["Exchange approved", "Refund processed", "Closed"].includes(next.returnStatus) && !next.returnResolution) throw Object.assign(new Error("A resolution is required before completing this workflow step."), { status: 422 });
  if (["Refund approved", "Refund processed"].includes(next.returnStatus) && (!next.refundAmount || !next.refundMethod)) throw Object.assign(new Error("Refund approval requires a positive amount and method."), { status: 422 });
  return next;
}

async function getOrder(orderId) { const rows = await supabaseAdminRequest(`orders?select=id,total_pkr,status,courier_status,payment_status,fulfillment_status,courier_tracking_number,tracking_number,internal_notes,tags&id=eq.${encodeURIComponent(orderId)}&limit=1`); if (!rows?.[0]) throw Object.assign(new Error("Order was not found."), { status: 404 }); return rows[0]; }
async function patchOrder(orderId, body) { const rows = await supabaseAdminRequest(`orders?id=eq.${encodeURIComponent(orderId)}&select=*`, { method: "PATCH", prefer: "return=representation", body }); return rows?.[0] || null; }

export async function updateAdminOrder({ orderId, input = {}, actor }) {
  const id = text(orderId, 120); if (!UUID.test(id)) throw Object.assign(new Error("Order ID is invalid."), { status: 400 });
  const current = await getOrder(id);
  const invalid = [["orderStage", ORDER_STAGES], ["paymentStatus", PAYMENT_STATUSES], ["fulfillmentStatus", FULFILLMENT_STATUSES]].find(([key, allowed]) => input[key] !== undefined && !allowed.has(input[key]));
  if (invalid) throw Object.assign(new Error(`Invalid ${invalid[0]}.`), { status: 400 });
  const previousOperationResult = await getOrderOperations([id]); const previousOperation = previousOperationResult.operations.get(id) || normalizeOperation();
  const operationProvided = input.operation && typeof input.operation === "object" && !Array.isArray(input.operation);
  if (input.operation !== undefined && !operationProvided) throw Object.assign(new Error("Invalid workflow data."), { status: 400 });
  const nextOperation = operationProvided ? validateOperation(input.operation, previousOperation, Number(current.total_pkr || 0), actor) : previousOperation;
  if (input.paymentStatus === "Refunded" && (actor?.role !== "Owner" || nextOperation.returnStatus !== "Refund processed" || nextOperation.refundAmount !== Number(current.total_pkr || 0))) throw Object.assign(new Error("Mark an order refunded only after a full refund has been processed."), { status: 422 });
  const tracking = input.tracking === undefined ? undefined : text(input.tracking, 120); if (tracking !== undefined && !tracking) throw Object.assign(new Error("Tracking number cannot be empty."), { status: 400 });
  const updates = { ...(input.orderStage !== undefined ? { status: input.orderStage, courier_status: input.orderStage } : {}), ...(input.paymentStatus !== undefined ? { payment_status: input.paymentStatus } : {}), ...(input.fulfillmentStatus !== undefined ? { fulfillment_status: input.fulfillmentStatus } : {}), ...(tracking !== undefined ? { courier_tracking_number: tracking, tracking_number: tracking } : {}), ...(input.notes !== undefined ? { internal_notes: text(input.notes, 2000) } : {}), ...(input.tags !== undefined ? { tags: tags(input.tags) } : {}) };
  if (!Object.keys(updates).length && !operationProvided) throw Object.assign(new Error("No order changes were supplied."), { status: 400 });
  const order = Object.keys(updates).length ? await patchOrder(id, updates) : current;
  const corePrevious = { status: current.courier_status || current.status || "", paymentStatus: current.payment_status || "", fulfillmentStatus: current.fulfillment_status || "", tracking: current.courier_tracking_number || current.tracking_number || "", notes: current.internal_notes || "", tags: current.tags || [] };
  const coreNext = { status: updates.courier_status ?? corePrevious.status, paymentStatus: updates.payment_status ?? corePrevious.paymentStatus, fulfillmentStatus: updates.fulfillment_status ?? corePrevious.fulfillmentStatus, tracking: updates.courier_tracking_number ?? corePrevious.tracking, notes: updates.internal_notes ?? corePrevious.notes, tags: updates.tags ?? corePrevious.tags };
  const operationChanged = operationProvided && !same(previousOperation, nextOperation); const coreChanged = !same(corePrevious, coreNext);
  if (!operationProvided && !previousOperationResult.available) return { order, coreOrderUpdated: true, operationPersistence: "not_requested" };
  if (!previousOperationResult.available) return { order, coreOrderUpdated: true, operationPersistence: operationChanged ? "unavailable" : "not_requested", operationError: operationChanged ? "Return and refund data was not saved because the migration has not been applied." : "" };
  try {
    if (operationChanged) await supabaseAdminRequest("order_operations?on_conflict=order_id&select=*", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: { order_id: id, return_status: nextOperation.returnStatus, return_reason: nextOperation.returnReason || null, return_resolution: nextOperation.returnResolution || null, refund_amount_pkr: nextOperation.refundAmount, refund_method: nextOperation.refundMethod || null, updated_by: text(actor?.id, 120) || null, updated_at: new Date().toISOString() } });
    if (coreChanged || operationChanged) await supabaseAdminRequest("order_operation_events", { method: "POST", prefer: "return=minimal", body: { order_id: id, event_type: operationChanged ? "order_operation_updated" : "order_updated", previous_value: { order: corePrevious, operation: previousOperation }, new_value: { order: coreNext, operation: nextOperation }, safe_note: text(nextOperation.returnResolution || nextOperation.returnReason, 500) || null, actor_id: text(actor?.id, 120) || null, actor_role: text(actor?.role, 20) || null, request_id: crypto.randomUUID() } });
    return { order, operation: nextOperation, coreOrderUpdated: true, operationPersistence: "saved", auditPersistence: "saved" };
  } catch (error) { console.error("Order workflow persistence failed", { message: error?.message, status: error?.status }); return { order, coreOrderUpdated: true, operationPersistence: "failed", operationError: "Core order changes were saved, but return/refund workflow data was not saved. Retry after resolving the server issue." }; }
}
