create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users (id) on delete cascade,
  kind text not null check (kind in ('alert', 'activity')),
  category text not null check (category in ('stock', 'sales', 'purchase', 'sales-return', 'purchase-return', 'customer', 'supplier', 'expense')),
  tone text not null check (tone in ('danger', 'warning', 'success', 'info')),
  title text not null,
  description text,
  href text,
  occurred_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text,
  date date not null default current_date,
  tone text not null check (tone in ('danger', 'warning', 'success', 'info')),
  icon text,
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists announcement_reads (
  announcement_id uuid not null references announcements (id) on delete cascade,
  user_id uuid not null references app_users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);
