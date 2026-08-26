-- Bustaniya finance, phase 2: recognise revenue on the day an order was
-- actually delivered.
--
-- Revenue used to be filtered by order creation date, so an order placed on
-- 30 January and delivered on 2 February landed in January's profit. These
-- columns record when the order actually completed, which is the date a sale
-- (and its return loss) belongs to.
--
-- The Supabase SQL editor runs a whole script as one transaction, so the
-- backfill below is wrapped in its own exception handler: if it cannot run
-- (for example the PostEx tables are absent), the columns must still survive.
-- Backfilling can then be redone later from the admin, or by re-running this.

-- Step 1 — the columns. This is the part the application actually needs.
alter table public.orders
  add column if not exists delivered_at timestamptz,
  add column if not exists returned_at timestamptz;

create index if not exists orders_delivered_at_idx
  on public.orders (delivered_at desc) where delivered_at is not null;
create index if not exists orders_returned_at_idx
  on public.orders (returned_at desc) where returned_at is not null;

-- Step 2 — best-effort backfill of existing rows. Evidence, in order:
--   1. the PostEx settlement date for that order
--   2. the row's own updated_at (when the status was last changed)
--   3. the order date, as a last resort
-- Only rows with no date yet are touched, so this is safe to re-run.
do $$
declare
  updated_at_expression text := 'null::timestamptz';
  settlement_expression text := 'null::timestamptz';
  delivered_rows integer := 0;
  returned_rows integer := 0;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'updated_at'
  ) then
    updated_at_expression := 'o.updated_at';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'postex_order_payments'
  ) then
    settlement_expression :=
      '(select p.settlement_date from public.postex_order_payments p where p.order_id = o.id)';
  end if;

  execute format($fmt$
    update public.orders o
    set delivered_at = coalesce(%s, %s, o.created_at)
    where o.delivered_at is null
      and (
        lower(replace(replace(coalesce(o.courier_status, ''), '_', ' '), '-', ' ')) like '%%deliver%%'
        or lower(replace(replace(coalesce(o.status, ''), '_', ' '), '-', ' ')) like '%%deliver%%'
        or lower(replace(replace(coalesce(o.courier_status, ''), '_', ' '), '-', ' ')) like '%%complete%%'
        or lower(replace(replace(coalesce(o.status, ''), '_', ' '), '-', ' ')) like '%%complete%%'
      )
  $fmt$, settlement_expression, updated_at_expression);
  get diagnostics delivered_rows = row_count;

  execute format($fmt$
    update public.orders o
    set returned_at = coalesce(%s, o.created_at)
    where o.returned_at is null
      and (
        lower(replace(replace(coalesce(o.courier_status, ''), '_', ' '), '-', ' ')) like '%%return%%'
        or lower(replace(replace(coalesce(o.status, ''), '_', ' '), '-', ' ')) like '%%return%%'
      )
  $fmt$, updated_at_expression);
  get diagnostics returned_rows = row_count;

  raise notice 'Finance phase 2 backfill: % delivered, % returned.', delivered_rows, returned_rows;
exception when others then
  raise warning 'Finance phase 2 backfill skipped: %', sqlerrm;
end $$;

-- Step 3 — tell PostgREST about the new columns straight away, instead of
-- waiting for its schema cache to expire.
notify pgrst, 'reload schema';

-- Step 4 — verification. Every column below must report 1.
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='delivered_at') as orders_delivered_at,
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='returned_at') as orders_returned_at,
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='cogs_snapshot_pkr') as orders_cogs_snapshot,
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name='finance_transactions') as finance_transactions,
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name='finance_accounts') as finance_accounts,
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name='finance_settings') as finance_settings,
  (select count(*) from information_schema.views
    where table_schema='public' and table_name='finance_supplier_bill_balances') as supplier_bill_view;
