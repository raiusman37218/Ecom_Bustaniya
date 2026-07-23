-- Additive operational metadata and immutable audit history. Existing orders are untouched.
create table if not exists public.order_operations (
  order_id uuid primary key references public.orders(id) on delete cascade,
  return_status text not null default 'No return' check (return_status in ('No return','Return requested','Return approved','Return received','Exchange requested','Exchange approved','Refund requested','Refund approved','Refund processed','Closed')),
  return_reason text,
  return_resolution text,
  refund_amount_pkr numeric(12,2) not null default 0 check (refund_amount_pkr >= 0 and refund_amount_pkr <= 10000000),
  refund_method text check (refund_method is null or refund_method in ('Bank transfer','Easypaisa','JazzCash','Card reversal','Cash','Other')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (return_status not in ('Refund approved','Refund processed') or (refund_amount_pkr > 0 and refund_method is not null))
);

create table if not exists public.order_operation_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in ('order_updated','order_operation_updated')),
  previous_value jsonb not null default '{}'::jsonb,
  new_value jsonb not null default '{}'::jsonb,
  safe_note text,
  actor_id text not null,
  actor_role text not null check (actor_role in ('Owner','Staff')),
  request_id uuid not null unique,
  created_at timestamptz not null default now()
);

create index if not exists order_operation_events_order_created_idx on public.order_operation_events (order_id, created_at desc);

create or replace function public.bustaniya_set_order_operation_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists bustaniya_order_operations_updated_at on public.order_operations;
create trigger bustaniya_order_operations_updated_at before update on public.order_operations for each row execute function public.bustaniya_set_order_operation_updated_at();

create or replace function public.bustaniya_prevent_order_operation_event_mutation() returns trigger language plpgsql as $$ begin raise exception 'order operation events are append-only'; end; $$;
drop trigger if exists bustaniya_order_operation_events_immutable on public.order_operation_events;
create trigger bustaniya_order_operation_events_immutable before update or delete on public.order_operation_events for each row execute function public.bustaniya_prevent_order_operation_event_mutation();

alter table public.order_operations enable row level security;
alter table public.order_operation_events enable row level security;
revoke all on public.order_operations, public.order_operation_events from anon, authenticated;
revoke all on function public.bustaniya_set_order_operation_updated_at(), public.bustaniya_prevent_order_operation_event_mutation() from public;
