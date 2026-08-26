-- Bustaniya finance, phase 2: recognise revenue on the day an order was
-- actually delivered.
--
-- Revenue used to be filtered by order creation date, so an order placed on
-- 30 January and delivered on 2 February landed in January's profit. These
-- columns record when the order actually completed, which is the date a sale
-- (and its return loss) belongs to.

alter table public.orders
  add column if not exists delivered_at timestamptz,
  add column if not exists returned_at timestamptz;

create index if not exists orders_delivered_at_idx
  on public.orders (delivered_at desc) where delivered_at is not null;
create index if not exists orders_returned_at_idx
  on public.orders (returned_at desc) where returned_at is not null;

-- Backfill existing rows. The best available evidence, in order:
--   1. the PostEx settlement date for that order
--   2. the row's own updated_at (when the status was last changed)
--   3. the order date, as a last resort
-- Only rows that have no delivered_at yet are touched, so this is re-runnable.
do $$
declare
  has_updated_at boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'updated_at'
  ) into has_updated_at;

  execute format($fmt$
    update public.orders o
    set delivered_at = coalesce(
      (select p.settlement_date from public.postex_order_payments p where p.order_id = o.id),
      %s,
      o.created_at
    )
    where o.delivered_at is null
      and (
        lower(replace(replace(coalesce(o.courier_status, ''), '_', ' '), '-', ' ')) like '%%deliver%%'
        or lower(replace(replace(coalesce(o.status, ''), '_', ' '), '-', ' ')) like '%%deliver%%'
        or lower(replace(replace(coalesce(o.courier_status, ''), '_', ' '), '-', ' ')) like '%%complete%%'
        or lower(replace(replace(coalesce(o.status, ''), '_', ' '), '-', ' ')) like '%%complete%%'
      )
  $fmt$, case when has_updated_at then 'o.updated_at' else 'null::timestamptz' end);

  execute format($fmt$
    update public.orders o
    set returned_at = coalesce(%s, o.created_at)
    where o.returned_at is null
      and (
        lower(replace(replace(coalesce(o.courier_status, ''), '_', ' '), '-', ' ')) like '%%return%%'
        or lower(replace(replace(coalesce(o.status, ''), '_', ' '), '-', ' ')) like '%%return%%'
      )
  $fmt$, case when has_updated_at then 'o.updated_at' else 'null::timestamptz' end);
end $$;
