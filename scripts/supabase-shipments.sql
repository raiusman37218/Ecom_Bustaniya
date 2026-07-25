-- Generic shipment state shared by every courier adapter.
alter table public.orders
  add column if not exists courier_account_id uuid references public.courier_accounts(id) on delete set null,
  add column if not exists courier_service_type text,
  add column if not exists courier_raw_status text,
  add column if not exists courier_sync_error text,
  add column if not exists courier_normalized_status text not null default 'unassigned'
    check (courier_normalized_status in ('unassigned','pending_booking','booked','picked_up','in_transit','out_for_delivery','delivered','attempted','on_hold','returned','cancelled','exception','manual_delivery')),
  add column if not exists courier_last_synced_at timestamptz;

update public.orders
set courier_raw_status = coalesce(nullif(courier_raw_status, ''), nullif(courier_status, ''), nullif(status, '')),
    courier_normalized_status = case
      when lower(coalesce(courier_status, status, '')) like '%deliver%' then 'delivered'
      when lower(coalesce(courier_status, status, '')) like '%return%' then 'returned'
      when lower(coalesce(courier_status, status, '')) like '%cancel%' or lower(coalesce(courier_status, status, '')) like '%expired%' then 'cancelled'
      when lower(coalesce(courier_status, status, '')) like '%out for delivery%' then 'out_for_delivery'
      when lower(coalesce(courier_status, status, '')) like '%attempt%' then 'attempted'
      when lower(coalesce(courier_status, status, '')) like '%hold%' then 'on_hold'
      when courier_tracking_number is not null then 'booked'
      else 'unassigned'
    end
where courier_raw_status is null or courier_normalized_status = 'unassigned';

update public.orders o set courier_account_id = c.id
from lateral (select id from public.courier_accounts where provider = 'postex' and status = 'active' order by is_default desc, updated_at desc limit 1) c
where o.courier_account_id is null and (lower(coalesce(o.courier, '')) like '%postex%' or o.courier_tracking_number ~ '^(CX-)?[0-9A-Z-]{10,30}$');

create index if not exists orders_courier_account_status_idx on public.orders (courier_account_id, courier_normalized_status, created_at desc);
create index if not exists orders_courier_tracking_idx on public.orders (courier_tracking_number) where courier_tracking_number is not null;
create index if not exists orders_courier_sync_error_idx on public.orders (courier_last_synced_at desc) where courier_sync_error is not null;
