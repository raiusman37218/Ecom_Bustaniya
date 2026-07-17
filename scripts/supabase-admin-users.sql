create table if not exists public.admin_users (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null default 'Staff' check (role in ('Owner', 'Staff')),
  permissions jsonb not null default '[]'::jsonb,
  password_hash text not null,
  status text not null default 'Active' check (status in ('Active', 'Disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists admin_users_email_idx on public.admin_users (email);
create index if not exists admin_users_role_status_idx on public.admin_users (role, status);

alter table public.admin_users enable row level security;

revoke all on public.admin_users from anon;
revoke all on public.admin_users from authenticated;
