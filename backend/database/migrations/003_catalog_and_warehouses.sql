create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  address text,
  city text,
  manager text,
  phone text,
  email text,
  capacity integer check (capacity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  brand_id uuid references brands (id) on delete restrict,
  category_id uuid references product_categories (id) on delete restrict,
  unit text,
  type text,
  image_url text,
  image_bg text,
  blend boolean not null default false,
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  selling_price numeric(14,2) not null default 0 check (selling_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists product_barcodes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  barcode text not null unique,
  is_primary boolean not null default false
);
