-- Bustaniya finance tables.
--
-- Finance data previously lived inside the store_settings JSON blob, so every
-- save rewrote the whole array (last write wins) and no date filtering could
-- happen in the database. These tables replace that blob. Legacy rows are
-- migrated once and keyed by legacy_id so the migration can safely re-run.

-- ---------------------------------------------------------------------------
-- Accounts: where money physically sits (PostEx wallet, NayaPay, bank, cash)
-- ---------------------------------------------------------------------------
create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default 'bank'
    check (kind in ('courier_wallet','mobile_wallet','bank','cash')),
  holder text not null default '',
  opening_balance_pkr numeric(14,2) not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.finance_accounts (slug, name, kind, holder, sort_order, note)
values
  ('postex_wallet', 'PostEx Wallet', 'courier_wallet', '', 1,
   'COD collections sit here until PostEx releases them.'),
  ('nayapay_amina', 'NayaPay — Amina', 'mobile_wallet', 'Amina', 2,
   'Customer advance payments are received here.'),
  ('alfalah_owner', 'Bank Alfalah — Owner', 'bank', 'Owner', 3,
   'Owner bank account.'),
  ('cash_in_hand', 'Cash in hand', 'cash', '', 4,
   'Physical cash used for fabric, tailoring and local payments.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Transactions: every real cash movement, one row each
-- ---------------------------------------------------------------------------
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  account_id uuid references public.finance_accounts(id) on delete restrict,
  entry_type text not null
    check (entry_type in (
      'business_expense','owner_withdrawal','owner_investment','supplier_payment',
      'postex_bank_receipt','customer_advance','other_income','cash_reset',
      'transfer_in','transfer_out'
    )),
  -- Derived from entry_type but stored so cash maths never has to branch.
  cash_direction text not null check (cash_direction in ('in','out')),
  title text not null default 'Finance entry',
  category text not null default 'Other',
  amount_pkr numeric(14,2) not null check (amount_pkr > 0),
  occurred_on date not null default current_date,
  reference text not null default '',
  counterparty text not null default '',
  note text not null default '',
  -- Links back to whatever created this movement.
  source text not null default 'manual'
    check (source in ('manual','order_advance','production_batch','supplier_bill','postex_receipt','transfer','migration')),
  order_id uuid references public.orders(id) on delete set null,
  supplier_bill_id uuid,
  production_batch_id text not null default '',
  transfer_group_id uuid,
  voided boolean not null default false,
  voided_at timestamptz,
  voided_by text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One advance receipt per order: re-verifying an order must never double-count.
create unique index if not exists finance_transactions_order_advance_key
  on public.finance_transactions (order_id)
  where source = 'order_advance' and voided = false;

-- A PostEx bank reference / CPR may only be active once.
create unique index if not exists finance_transactions_postex_reference_key
  on public.finance_transactions (lower(reference))
  where entry_type = 'postex_bank_receipt' and voided = false and reference <> '';

create index if not exists finance_transactions_occurred_on_idx
  on public.finance_transactions (occurred_on desc) where voided = false;
create index if not exists finance_transactions_account_idx
  on public.finance_transactions (account_id, occurred_on desc);
create index if not exists finance_transactions_type_idx
  on public.finance_transactions (entry_type, occurred_on desc);
create index if not exists finance_transactions_supplier_bill_idx
  on public.finance_transactions (supplier_bill_id) where supplier_bill_id is not null;

-- ---------------------------------------------------------------------------
-- Supplier bills: a payable. Paid amount is derived from transactions.
-- ---------------------------------------------------------------------------
create table if not exists public.finance_supplier_bills (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  supplier text not null,
  reference text not null default '',
  total_pkr numeric(14,2) not null check (total_pkr > 0),
  bill_date date not null default current_date,
  due_date date,
  note text not null default '',
  status text not null default 'open' check (status in ('open','paid','voided')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_supplier_bills_due_idx
  on public.finance_supplier_bills (due_date) where status = 'open';

alter table public.finance_transactions
  drop constraint if exists finance_transactions_supplier_bill_fk;
alter table public.finance_transactions
  add constraint finance_transactions_supplier_bill_fk
  foreign key (supplier_bill_id) references public.finance_supplier_bills(id) on delete set null;

create or replace view public.finance_supplier_bill_balances as
select
  bill.id,
  bill.legacy_id,
  bill.supplier,
  bill.reference,
  bill.total_pkr,
  bill.bill_date,
  bill.due_date,
  bill.note,
  bill.status,
  coalesce(paid.paid_pkr, 0) as paid_pkr,
  greatest(bill.total_pkr - coalesce(paid.paid_pkr, 0), 0) as remaining_pkr,
  bill.created_at,
  bill.updated_at
from public.finance_supplier_bills bill
left join lateral (
  select sum(txn.amount_pkr) as paid_pkr
  from public.finance_transactions txn
  where txn.supplier_bill_id = bill.id and txn.voided = false
) paid on true;

-- ---------------------------------------------------------------------------
-- Marketing campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.finance_marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  platform text not null default 'Other',
  spend_pkr numeric(14,2) not null default 0 check (spend_pkr >= 0),
  attributed_sales_pkr numeric(14,2) not null default 0 check (attributed_sales_pkr >= 0),
  new_customers integer not null default 0 check (new_customers >= 0),
  occurred_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_marketing_campaigns_date_idx
  on public.finance_marketing_campaigns (occurred_on desc);

-- ---------------------------------------------------------------------------
-- Settings: single row holding planner values and alert thresholds
-- ---------------------------------------------------------------------------
create table if not exists public.finance_settings (
  id boolean primary key default true check (id),
  marketing_percent numeric(5,2) not null default 25 check (marketing_percent between 0 and 100),
  owner_percent numeric(5,2) not null default 30 check (owner_percent between 0 and 100),
  monthly_fixed_costs_pkr numeric(14,2) not null default 0 check (monthly_fixed_costs_pkr >= 0),
  packaging_expense_pkr numeric(14,2) not null default 0 check (packaging_expense_pkr >= 0),
  delivery_expense_pkr numeric(14,2) not null default 0 check (delivery_expense_pkr >= 0),
  low_cash_threshold_pkr numeric(14,2) not null default 0 check (low_cash_threshold_pkr >= 0),
  supplier_due_alert_days integer not null default 3 check (supplier_due_alert_days >= 0),
  receivable_stuck_alert_days integer not null default 15 check (receivable_stuck_alert_days >= 0),
  legacy_migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.finance_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Order-level cost snapshot: product cost is frozen when the order is
-- delivered, so editing a product cost later never restates past profit.
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists cogs_snapshot_pkr numeric(14,2),
  add column if not exists cogs_snapshot_at timestamptz,
  add column if not exists cogs_snapshot_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists advance_verified_at timestamptz,
  add column if not exists returned_restocked_at timestamptz;

create index if not exists orders_cogs_snapshot_idx
  on public.orders (cogs_snapshot_at) where cogs_snapshot_at is not null;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.finance_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  target text;
begin
  foreach target in array array[
    'finance_accounts','finance_transactions','finance_supplier_bills',
    'finance_marketing_campaigns','finance_settings'
  ] loop
    execute format('drop trigger if exists %I_touch on public.%I', target, target);
    execute format(
      'create trigger %I_touch before update on public.%I for each row execute function public.finance_touch_updated_at()',
      target, target
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Security: finance is service-role only. No anon/authenticated access.
-- ---------------------------------------------------------------------------
alter table public.finance_accounts enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_supplier_bills enable row level security;
alter table public.finance_marketing_campaigns enable row level security;
alter table public.finance_settings enable row level security;

revoke all on table public.finance_accounts from anon, authenticated;
revoke all on table public.finance_transactions from anon, authenticated;
revoke all on table public.finance_supplier_bills from anon, authenticated;
revoke all on table public.finance_marketing_campaigns from anon, authenticated;
revoke all on table public.finance_settings from anon, authenticated;
revoke all on table public.finance_supplier_bill_balances from anon, authenticated;

grant select, insert, update, delete on table public.finance_accounts to service_role;
grant select, insert, update, delete on table public.finance_transactions to service_role;
grant select, insert, update, delete on table public.finance_supplier_bills to service_role;
grant select, insert, update, delete on table public.finance_marketing_campaigns to service_role;
grant select, insert, update, delete on table public.finance_settings to service_role;
grant select on table public.finance_supplier_bill_balances to service_role;
