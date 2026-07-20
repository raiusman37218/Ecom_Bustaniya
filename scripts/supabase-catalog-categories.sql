create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image text not null default '',
  parent_slug text,
  status text not null default 'Active' check (status in ('Active', 'Draft', 'Archived')),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catalog_categories
  add column if not exists show_in_header boolean not null default true,
  add column if not exists show_on_homepage boolean not null default true,
  add column if not exists show_in_footer boolean not null default false,
  add column if not exists show_in_search boolean not null default true,
  add column if not exists seo_title text not null default '',
  add column if not exists seo_description text not null default '',
  add column if not exists image_alt text not null default '';

create index if not exists catalog_categories_parent_slug_idx on public.catalog_categories (parent_slug);
create index if not exists catalog_categories_status_sort_idx on public.catalog_categories (status, sort_order);

alter table public.catalog_categories enable row level security;

drop policy if exists "Public active catalog categories are readable" on public.catalog_categories;
create policy "Public active catalog categories are readable"
  on public.catalog_categories
  for select
  using (status = 'Active');

insert into public.catalog_categories (name, slug, description, image, parent_slug, sort_order)
values
  ('Kurtis', 'kurtis', 'Shop Pakistani kurtis for women, including simple kurtis, corset kurtis and jacket kurtis for everyday eastern wear.', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85', null, 10),
  ('Bottoms', 'bottoms', 'Shop women''s bottoms in Pakistan, including trousers and pants that complete kurtis, co-ord sets and eastern outfits.', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1600&q=85', null, 20),
  ('Co-ord Sets', 'coord-sets', 'Shop women''s co-ord sets online in Pakistan for easy matching outfits, casual plans and polished everyday dressing.', 'https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=1600&q=85', null, 30),
  ('3 Piece Suits', '3-piece-suits', 'Shop Pakistani 3 piece suits for women with complete eastern outfits for festive, semi-formal and everyday occasions.', '/bustaniya-campaign-hero-v4.png', null, 40),
  ('Corset Kurti', 'corset-kurti', 'Shop corset kurtis in Pakistan for a modern eastern wear look with defined shape and feminine styling.', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1400&q=85', 'kurtis', 10),
  ('Jacket Kurti', 'jacket-kurti', 'Shop jacket kurtis online in Pakistan for layered eastern wear styling and statement everyday outfits.', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1400&q=85', 'kurtis', 20),
  ('Simple Kurti', 'simple-kurti', 'Shop simple kurtis for women in Pakistan, made for everyday styling, university looks and casual eastern wear.', 'https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=1400&q=85', 'kurtis', 30)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image = excluded.image,
  parent_slug = excluded.parent_slug,
  sort_order = excluded.sort_order,
  updated_at = now();
