-- Multi-courier configuration. API credentials are server-only: anon and
-- authenticated database roles receive no access to this table.
create table if not exists public.courier_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9_-]{1,48}$'),
  name text not null check (char_length(name) between 2 and 100),
  provider text not null check (provider in ('postex','leopards','tcs','mnp','trax','callcourier','blueex','manual','custom')),
  status text not null default 'active' check (status in ('active','paused','disconnected')),
  is_default boolean not null default false,
  api_base_url text,
  merchant_id text,
  pickup_address_code text,
  settings jsonb not null default '{}'::jsonb,
  credentials jsonb not null default '{}'::jsonb,
  capabilities jsonb not null default '{"booking":false,"tracking":false,"settlements":false,"cities":false,"webhooks":false}'::jsonb,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists courier_accounts_one_default_idx
  on public.courier_accounts ((is_default)) where is_default;
create index if not exists courier_accounts_status_idx on public.courier_accounts (status, name);

create or replace function public.bustaniya_set_courier_account_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists bustaniya_courier_accounts_updated_at on public.courier_accounts;
create trigger bustaniya_courier_accounts_updated_at before update on public.courier_accounts
for each row execute function public.bustaniya_set_courier_account_updated_at();

alter table public.courier_accounts enable row level security;
revoke all on public.courier_accounts from anon, authenticated;
revoke all on function public.bustaniya_set_courier_account_updated_at() from public;
grant select, insert, update, delete on public.courier_accounts to service_role;
