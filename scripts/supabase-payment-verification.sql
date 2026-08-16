-- Bustaniya checkout payment verification.
-- Run once in Supabase SQL Editor before deploying this payment flow.
-- These immutable order-level snapshots prevent later price/settings changes
-- from changing what a customer was asked to pay.

begin;

alter table public.orders
  add column if not exists payment_status text not null default 'Awaiting Payment',
  add column if not exists product_subtotal_pkr numeric(12,2),
  add column if not exists delivery_charges_pkr numeric(12,2),
  add column if not exists total_order_value_pkr numeric(12,2),
  add column if not exists amount_payable_in_advance_pkr numeric(12,2),
  add column if not exists amount_payable_on_delivery_pkr numeric(12,2),
  add column if not exists payment_reference text,
  add column if not exists payment_proof_status text not null default 'Awaiting Payment',
  add column if not exists order_confirmation_status text not null default 'Awaiting payment verification',
  add column if not exists payment_details_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists fulfillment_status text not null default 'On hold';

-- Preserve sensible values for historical orders without changing their totals.
update public.orders
set
  product_subtotal_pkr = coalesce(product_subtotal_pkr, subtotal_pkr, total_pkr, 0),
  delivery_charges_pkr = coalesce(delivery_charges_pkr, shipping_fee_pkr, 0),
  total_order_value_pkr = coalesce(total_order_value_pkr, total_pkr, 0),
  amount_payable_in_advance_pkr = coalesce(amount_payable_in_advance_pkr, 0),
  amount_payable_on_delivery_pkr = coalesce(amount_payable_on_delivery_pkr, total_pkr, 0),
  payment_status = coalesce(nullif(payment_status, ''), 'Awaiting Payment'),
  payment_proof_status = coalesce(nullif(payment_proof_status, ''), 'Awaiting Payment'),
  order_confirmation_status = coalesce(nullif(order_confirmation_status, ''), 'Awaiting payment verification'),
  fulfillment_status = coalesce(nullif(fulfillment_status, ''), 'On hold')
where product_subtotal_pkr is null
   or delivery_charges_pkr is null
   or total_order_value_pkr is null
   or amount_payable_in_advance_pkr is null
   or amount_payable_on_delivery_pkr is null
   or payment_status is null
   or payment_proof_status is null
   or order_confirmation_status is null
   or fulfillment_status is null;

create index if not exists orders_payment_proof_status_idx
  on public.orders (payment_proof_status, created_at desc);

create index if not exists orders_payment_status_idx
  on public.orders (payment_status, created_at desc);

create index if not exists orders_confirmation_status_idx
  on public.orders (order_confirmation_status, created_at desc);

commit;
