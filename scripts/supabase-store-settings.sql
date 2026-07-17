create table if not exists public.store_settings (
  id text primary key default 'main',
  announcement_enabled boolean not null default true,
  announcement_text text not null default 'Rs. 300 advance payment required for order confirmation',
  announcement_link_label text default 'Shop now',
  announcement_link_href text default '#products',
  announcements jsonb not null default '[{"id":"default-advance-payment","text":"Rs. 300 advance payment required for order confirmation","linkLabel":"Shop now","linkHref":"#products","enabled":true}]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_settings
  add column if not exists announcements jsonb not null default '[{"id":"default-advance-payment","text":"Rs. 300 advance payment required for order confirmation","linkLabel":"Shop now","linkHref":"#products","enabled":true}]'::jsonb;

insert into public.store_settings (
  id,
  announcement_enabled,
  announcement_text,
  announcement_link_label,
  announcement_link_href,
  announcements
) values (
  'main',
  true,
  'Rs. 300 advance payment required for order confirmation',
  'Shop now',
  '#products',
  '[{"id":"default-advance-payment","text":"Rs. 300 advance payment required for order confirmation","linkLabel":"Shop now","linkHref":"#products","enabled":true}]'::jsonb
) on conflict (id) do nothing;
