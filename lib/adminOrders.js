import "server-only";
import { supabaseAdminRequest, supabaseAdminRequestWithCount } from "./supabaseRest";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function clampPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeOrdersPagination({ page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  return {
    page: clampPositiveInt(page, 1),
    pageSize: Math.min(clampPositiveInt(pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE),
  };
}

export async function getAdminOrdersPage(options = {}) {
  const { page, pageSize } = normalizeOrdersPagination(options);
  const offset = (page - 1) * pageSize;
  const { data: orders, total } = await supabaseAdminRequestWithCount(
    `orders?select=*&order=created_at.desc,id.desc&limit=${pageSize}&offset=${offset}`
  );
  const orderIds = orders.map((order) => String(order.id)).filter(Boolean);
  const items = orderIds.length
    ? await supabaseAdminRequest(`order_items?select=*&order_id=in.(${orderIds.join(",")})&order=id.asc`)
    : [];
  const itemsByOrderId = new Map();
  for (const item of items || []) {
    const current = itemsByOrderId.get(item.order_id) || [];
    current.push(item);
    itemsByOrderId.set(item.order_id, current);
  }
  return {
    orders: orders.map((order) => ({
      ...order,
      items: itemsByOrderId.get(order.id) || (Array.isArray(order.items) ? order.items : []),
      order_items: itemsByOrderId.get(order.id) || [],
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: total ? Math.ceil(total / pageSize) : 0,
    },
  };
}

export async function getAdminOrdersForDashboard() {
  const { data } = await supabaseAdminRequestWithCount(
    "orders?select=id,total_pkr,status,courier_status,shipping_full_name,guest_name,customer_email,guest_email,created_at&order=created_at.desc,id.desc"
  );
  return data;
}

export async function getAdminOrdersForExport() {
  const firstPage = await getAdminOrdersPage({ page: 1, pageSize: MAX_PAGE_SIZE });
  const orders = [...firstPage.orders];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const result = await getAdminOrdersPage({ page, pageSize: MAX_PAGE_SIZE });
    orders.push(...result.orders);
  }
  return orders;
}
