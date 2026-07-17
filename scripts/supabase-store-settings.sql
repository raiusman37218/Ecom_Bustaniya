create table if not exists public.store_settings (
  id integer primary key default 1,
  hero_product_id uuid references public.products(id) on delete set null,
  announcement_enabled boolean not null default true,
  announcement_text text not null default 'Rs. 300 advance payment required for order confirmation',
  announcement_link_label text default 'Shop now',
  announcement_link_href text default '#products',
  announcements jsonb not null default '[{"id":"default-advance-payment","text":"Rs. 300 advance payment required for order confirmation","linkLabel":"Shop now","linkHref":"#products","enabled":true}]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_settings
  add column if not exists hero_product_id uuid references public.products(id) on delete set null,
  add column if not exists announcement_enabled boolean not null default true,
  add column if not exists announcement_text text not null default 'Rs. 300 advance payment required for order confirmation',
  add column if not exists announcement_link_label text default 'Shop now',
  add column if not exists announcement_link_href text default '#products',
  add column if not exists announcements jsonb not null default '[{"id":"default-advance-payment","text":"Rs. 300 advance payment required for order confirmation","linkLabel":"Shop now","linkHref":"#products","enabled":true}]'::jsonb;

create index if not exists store_settings_hero_product_id_idx
  on public.store_settings(hero_product_id);

insert into public.store_settings (
  id,
  announcement_enabled,
  announcement_text,
  announcement_link_label,
  announcement_link_href,
  announcements
) values (
  1,
  true,
  'Rs. 300 advance payment required for order confirmation',
  'Shop now',
  '#products',
  '[{"id":"default-advance-payment","text":"Rs. 300 advance payment required for order confirmation","linkLabel":"Shop now","linkHref":"#products","enabled":true}]'::jsonb
) on conflict (id) do nothing;
