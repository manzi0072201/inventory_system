create table if not exists sale_returns (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  date date not null default current_date,
  sale_id uuid not null references sales (id) on delete restrict,
  customer_id uuid not null references customers (id) on delete restrict,
  warehouse_id uuid not null references warehouses (id) on delete restrict,
  reason text not null check (reason in ('Damaged item', 'Defective item', 'Wrong item delivered', 'Customer changed mind', 'Late delivery', 'Other')),
  resolution text not null check (resolution in ('Refund', 'Store Credit', 'Replacement')),
  status text not null check (status in ('Pending', 'Approved', 'Completed', 'Rejected')),
  refund_method text not null check (refund_method in ('Bank Account', 'MTN MoMo', 'Airtel Money', 'Cash')),
  amount numeric(14,2) not null check (amount >= 0),
  restock boolean not null default true,
  note text,
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sale_return_items (
  id uuid primary key default gen_random_uuid(),
  sale_return_id uuid not null references sale_returns (id) on delete restrict,
  product_id uuid not null references products (id) on delete restrict,
  name_snapshot text not null,
  code_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) not null check (line_total >= 0)
);

create table if not exists purchase_returns (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  date date not null default current_date,
  purchase_id uuid not null references purchases (id) on delete restrict,
  supplier_id uuid not null references suppliers (id) on delete restrict,
  warehouse_id uuid not null references warehouses (id) on delete restrict,
  reason text not null check (reason in ('Damaged goods', 'Defective goods', 'Wrong item received', 'Overstock', 'Supplier error', 'Other')),
  resolution text not null check (resolution in ('Refund', 'Replacement', 'Credit Note')),
  status text not null check (status in ('Pending', 'Approved', 'Completed', 'Rejected')),
  refund_method text not null check (refund_method in ('Bank Account', 'MTN MoMo', 'Airtel Money', 'Cash')),
  amount numeric(14,2) not null check (amount >= 0),
  deduct_stock boolean not null default true,
  note text,
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists purchase_return_items (
  id uuid primary key default gen_random_uuid(),
  purchase_return_id uuid not null references purchase_returns (id) on delete restrict,
  product_id uuid not null references products (id) on delete restrict,
  name_snapshot text not null,
  code_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) not null check (line_total >= 0)
);
