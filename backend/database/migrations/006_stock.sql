create table if not exists stock_balances (
  product_id uuid not null references products (id) on delete restrict,
  warehouse_id uuid not null references warehouses (id) on delete restrict,
  quantity_on_hand integer not null default 0,
  reorder_point integer not null default 0 check (reorder_point >= 0),
  critical_point integer not null default 0 check (critical_point >= 0),
  average_cost numeric(14,2) not null default 0 check (average_cost >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, warehouse_id)
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete restrict,
  warehouse_id uuid not null references warehouses (id) on delete restrict,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'adjustment', 'transfer', 'sale_return', 'purchase_return')),
  quantity_delta integer not null check (quantity_delta <> 0),
  balance_after integer,
  reference_type text,
  reference_id uuid,
  occurred_at date not null default current_date,
  note text,
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  date date not null default current_date,
  product_id uuid not null references products (id) on delete restrict,
  warehouse_id uuid not null references warehouses (id) on delete restrict,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null check (reason in ('Stock count', 'Damaged', 'Returned', 'Transfer', 'Other')),
  note text,
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists stock_transfers (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  from_warehouse_id uuid not null references warehouses (id) on delete restrict,
  to_warehouse_id uuid not null references warehouses (id) on delete restrict,
  product_id uuid not null references products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  date date not null default current_date,
  note text,
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (from_warehouse_id <> to_warehouse_id)
);
