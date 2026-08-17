-- Server-side log of every Meta Pixel / Conversions API (CAPI) event this
-- store attempts to send, so the admin dashboard can show real-time event
-- activity without needing to open Meta Events Manager. Service-role only;
-- anon/authenticated database roles get no access (matches the pattern used
-- for courier_accounts / order_operation_events).
create table if not exists public.pixel_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in ('PageView','ViewContent','AddToCart','InitiateCheckout','Purchase')),
  event_id text,
  source text not null default 'server' check (source in ('browser','server')),
  success boolean not null default false,
  http_status integer,
  fbtrace_id text,
  events_received integer,
  event_source_url text,
  value numeric(12,2),
  currency text default 'PKR',
  content_ids text[],
  em_hash boolean not null default false,
  ph_hash boolean not null default false,
  error_message text,
  client_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists pixel_events_created_at_idx on public.pixel_events (created_at desc);
create index if not exists pixel_events_event_name_idx on public.pixel_events (event_name, created_at desc);

alter table public.pixel_events enable row level security;
revoke all on public.pixel_events from anon, authenticated;
grant select, insert on public.pixel_events to service_role;

-- Optional: keep the table from growing forever. Safe to run manually or on
-- a schedule; not wired to a cron job automatically.
-- delete from public.pixel_events where created_at < now() - interval '90 days';
