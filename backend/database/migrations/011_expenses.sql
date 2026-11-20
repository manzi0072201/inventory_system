create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  date date not null default current_date,
  category_id uuid not null references expense_categories (id) on delete restrict,
  vendor text,
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  payment_method text not null check (payment_method in ('Bank Account', 'MTN MoMo', 'Airtel Money', 'Cash')),
  status text not null check (status in ('Paid', 'Pending', 'Cancelled')),
  note text,
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
