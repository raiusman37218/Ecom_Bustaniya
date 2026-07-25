create table if not exists public.postex_order_payments (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_number text not null,
  tracking_number text not null,
  courier_status text not null default '',
  invoice_payment_pkr numeric(14,2) not null default 0 check (invoice_payment_pkr >= 0),
  transaction_tax_pkr numeric(14,2) not null default 0 check (transaction_tax_pkr >= 0),
  transaction_fee_pkr numeric(14,2) not null default 0 check (transaction_fee_pkr >= 0),
  reversal_tax_pkr numeric(14,2) not null default 0 check (reversal_tax_pkr >= 0),
  reversal_fee_pkr numeric(14,2) not null default 0 check (reversal_fee_pkr >= 0),
  expected_net_pkr numeric(14,2) generated always as (
    greatest(
      invoice_payment_pkr
      - transaction_tax_pkr
      - transaction_fee_pkr
      - reversal_tax_pkr
      - reversal_fee_pkr,
      0
    )
  ) stored,
  postex_settled boolean not null default false,
  settlement_date timestamptz,
  cpr_number_1 text,
  cpr_date_1 timestamptz,
  cpr_number_2 text,
  cpr_date_2 timestamptz,
  payment_status text not null default 'awaiting'
    check (payment_status in ('in_transit','awaiting','settled','returned','cancelled','error')),
  last_synced_at timestamptz,
  last_error text,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint postex_order_payments_order_id_key unique (order_id),
  constraint postex_order_payments_tracking_number_key unique (tracking_number)
);

create table if not exists public.postex_cpr_batches (
  id bigint generated always as identity primary key,
  cpr_number text not null unique,
  cpr_date date,
  period_start date,
  period_end date,
  expected_gross_pkr numeric(14,2) not null default 0 check (expected_gross_pkr >= 0),
  postex_deductions_pkr numeric(14,2) not null default 0 check (postex_deductions_pkr >= 0),
  additional_deductions_pkr numeric(14,2) not null default 0 check (additional_deductions_pkr >= 0),
  expected_bank_pkr numeric(14,2) not null default 0 check (expected_bank_pkr >= 0),
  bank_received_pkr numeric(14,2) not null default 0 check (bank_received_pkr >= 0),
  bank_received_date date,
  carried_forward_pkr numeric(14,2) not null default 0 check (carried_forward_pkr >= 0),
  status text not null default 'open'
    check (status in ('open','partial','reconciled','disputed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.postex_cpr_items (
  id bigint generated always as identity primary key,
  batch_id bigint not null references public.postex_cpr_batches(id) on delete cascade,
  order_payment_id bigint not null references public.postex_order_payments(id) on delete cascade,
  expected_net_pkr numeric(14,2) not null default 0 check (expected_net_pkr >= 0),
  allocated_received_pkr numeric(14,2) not null default 0 check (allocated_received_pkr >= 0),
  carried_forward_pkr numeric(14,2) not null default 0 check (carried_forward_pkr >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint postex_cpr_items_batch_order_key unique (batch_id, order_payment_id)
);

create index if not exists postex_order_payments_status_sync_idx
  on public.postex_order_payments (payment_status, last_synced_at desc);
create index if not exists postex_order_payments_settlement_date_idx
  on public.postex_order_payments (settlement_date desc)
  where settlement_date is not null;
create index if not exists postex_cpr_batches_status_date_idx
  on public.postex_cpr_batches (status, cpr_date desc);
create index if not exists postex_cpr_items_order_payment_id_idx
  on public.postex_cpr_items (order_payment_id);

alter table public.postex_order_payments enable row level security;
alter table public.postex_cpr_batches enable row level security;
alter table public.postex_cpr_items enable row level security;

revoke all on table public.postex_order_payments from anon, authenticated;
revoke all on table public.postex_cpr_batches from anon, authenticated;
revoke all on table public.postex_cpr_items from anon, authenticated;
revoke all on sequence public.postex_order_payments_id_seq from anon, authenticated;
revoke all on sequence public.postex_cpr_batches_id_seq from anon, authenticated;
revoke all on sequence public.postex_cpr_items_id_seq from anon, authenticated;

grant select, insert, update, delete on table public.postex_order_payments to service_role;
grant select, insert, update, delete on table public.postex_cpr_batches to service_role;
grant select, insert, update, delete on table public.postex_cpr_items to service_role;
grant usage, select on sequence public.postex_order_payments_id_seq to service_role;
grant usage, select on sequence public.postex_cpr_batches_id_seq to service_role;
grant usage, select on sequence public.postex_cpr_items_id_seq to service_role;
