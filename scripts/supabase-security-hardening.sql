-- Bustaniya Supabase security hardening
-- Purpose:
-- 1) Keep storefront product/category reads public.
-- 2) Stop public anon/authenticated roles from reading private business costs.
-- 3) Keep order/admin/courier/finance tables server-only.
--
-- Safe to run in Supabase SQL editor. It does not delete data.

-- Public product catalogue: expose only customer-safe columns.
alter table if exists public.products enable row level security;

drop policy if exists "Public active products are readable" on public.products;
create policy "Public active products are readable"
  on public.products
  for select
  to anon, authenticated
  using (
    instock = true
    and coalesce(category, '') <> 'Custom Inventory'
  );

revoke all on table public.products from anon, authenticated;

do $$
declare
  safe_columns text[];
  grant_columns text;
begin
  select array_agg(quote_ident(column_name) order by ordinal_position)
    into safe_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'products'
    and column_name in (
      'id',
      'created_at',
      'name',
      'description',
      'price',
      'compare_at_price',
      'article_number',
      'category',
      'size',
      'color',
      'img',
      'instock',
      'new',
      'bestsellere',
      'delivery_fee_mode',
      'delivery_fee_pkr'
    );

  grant_columns := array_to_string(safe_columns, ', ');
  if grant_columns is not null and grant_columns <> '' then
    execute format('grant select (%s) on table public.products to anon, authenticated', grant_columns);
  end if;
end $$;

-- Inventory stock can be public for storefront availability, but only safe stock fields.
alter table if exists public.inventory enable row level security;

drop policy if exists "Public active product inventory is readable" on public.inventory;
create policy "Public active product inventory is readable"
  on public.inventory
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = inventory.product_id
        and p.instock = true
    )
  );

revoke all on table public.inventory from anon, authenticated;

do $$
declare
  safe_columns text[];
  grant_columns text;
begin
  select array_agg(quote_ident(column_name) order by ordinal_position)
    into safe_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'inventory'
    and column_name in (
      'product_id',
      'stock_quantity',
      'low_stock_threshold',
      'sku'
    );

  grant_columns := array_to_string(safe_columns, ', ');
  if grant_columns is not null and grant_columns <> '' then
    execute format('grant select (%s) on table public.inventory to anon, authenticated', grant_columns);
  end if;
end $$;

-- Storefront category navigation stays public.
alter table if exists public.catalog_categories enable row level security;

drop policy if exists "Public active catalog categories are readable" on public.catalog_categories;
create policy "Public active catalog categories are readable"
  on public.catalog_categories
  for select
  to anon, authenticated
  using (status = 'Active');

-- Server-only operational data. Checkout/admin API routes use service_role on the server.
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.inventory_movements enable row level security;
alter table if exists public.admin_users enable row level security;
alter table if exists public.courier_accounts enable row level security;
alter table if exists public.postex_order_payments enable row level security;
alter table if exists public.postex_cpr_batches enable row level security;
alter table if exists public.postex_cpr_items enable row level security;
alter table if exists public.store_settings enable row level security;
alter table if exists public.order_operations enable row level security;
alter table if exists public.order_operation_events enable row level security;

do $$
declare
  table_name text;
  server_tables text[] := array[
    'orders',
    'order_items',
    'inventory_movements',
    'admin_users',
    'courier_accounts',
    'postex_order_payments',
    'postex_cpr_batches',
    'postex_cpr_items',
    'store_settings',
    'order_operations',
    'order_operation_events'
  ];
begin
  foreach table_name in array server_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', table_name);
      execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    end if;
  end loop;
end $$;

grant select, insert, update, delete on table public.inventory to service_role;
