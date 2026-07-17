create table if not exists public.store_settings (
  id integer primary key default 1,
  hero_enabled boolean not null default true,
  hero_desktop_image text not null default '/bustaniya-campaign-hero-v5.png',
  hero_mobile_image text not null default '/bustaniya-campaign-hero-mobile-v1.png',
  hero_eyebrow text not null default 'NEW SEASON',
  hero_heading text not null default 'Elevated Eastern Wear',
  hero_supporting_text text not null default 'Thoughtfully designed kurtis for everyday elegance.',
  hero_primary_button_text text not null default 'Shop the collection',
  hero_primary_button_link text not null default '#products',
  hero_secondary_button_text text not null default '',
  hero_secondary_button_link text not null default '',
  hero_text_alignment text not null default 'left' check (hero_text_alignment in ('left','center','right')),
  hero_text_position text not null default 'left' check (hero_text_position in ('left','center','right')),
  hero_overlay_intensity integer not null default 34 check (hero_overlay_intensity between 0 and 80),
  announcement_enabled boolean not null default true,
  announcement_text text not null default 'Rs. 300 advance payment required for order confirmation',
  announcement_link_label text default 'Shop now',
  announcement_link_href text default '#products',
  announcements jsonb not null default '[{"id":"default-advance-payment","text":"Rs. 300 advance payment required for order confirmation","linkLabel":"Shop now","linkHref":"#products","enabled":true}]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_settings
  add column if not exists hero_enabled boolean not null default true,
  add column if not exists hero_desktop_image text not null default '/bustaniya-campaign-hero-v5.png',
  add column if not exists hero_mobile_image text not null default '/bustaniya-campaign-hero-mobile-v1.png',
  add column if not exists hero_eyebrow text not null default 'NEW SEASON',
  add column if not exists hero_heading text not null default 'Elevated Eastern Wear',
  add column if not exists hero_supporting_text text not null default 'Thoughtfully designed kurtis for everyday elegance.',
  add column if not exists hero_primary_button_text text not null default 'Shop the collection',
  add column if not exists hero_primary_button_link text not null default '#products',
  add column if not exists hero_secondary_button_text text not null default '',
  add column if not exists hero_secondary_button_link text not null default '',
  add column if not exists hero_text_alignment text not null default 'left',
  add column if not exists hero_text_position text not null default 'left',
  add column if not exists hero_overlay_intensity integer not null default 34,
  add column if not exists announcement_enabled boolean not null default true,
  add column if not exists announcement_text text not null default 'Rs. 300 advance payment required for order confirmation',
  add column if not exists announcement_link_label text default 'Shop now',
  add column if not exists announcement_link_href text default '#products',
  add column if not exists announcements jsonb not null default '[{"id":"default-advance-payment","text":"Rs. 300 advance payment required for order confirmation","linkLabel":"Shop now","linkHref":"#products","enabled":true}]'::jsonb;

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
