create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('Individual', 'Business')),
  email text unique,
  phone text,
  country text,
  city text,
  address text,
  tax_number text,
  opening_balance numeric(14,2) not null default 0,
  credit_limit numeric(14,2) not null default 0 check (credit_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  email text unique,
  phone text,
  country text,
  city text,
  address text,
  category text,
  tax_number text,
  opening_balance numeric(14,2) not null default 0,
  credit_limit numeric(14,2) not null default 0 check (credit_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
