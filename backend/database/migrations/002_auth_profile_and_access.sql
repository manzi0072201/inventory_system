create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text not null unique,
  email text not null unique,
  name text not null,
  phone text,
  shop_zone text,
  avatar_url text,
  role text not null check (role in ('super_admin', 'admin')),
  status text not null check (status in ('Active', 'Suspended')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists permissions (
  key text primary key,
  label text not null,
  description text
);

create table if not exists role_permissions (
  role text not null check (role in ('super_admin', 'admin')),
  permission_key text not null references permissions (key) on delete restrict,
  allowed boolean not null default false,
  primary key (role, permission_key)
);

create table if not exists user_permissions (
  user_id uuid not null references app_users (id) on delete cascade,
  permission_key text not null references permissions (key) on delete restrict,
  allowed boolean not null default false,
  primary key (user_id, permission_key)
);
