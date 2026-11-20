create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  date date not null default current_date,
  supplier_id uuid not null references suppliers (id) on delete restrict,
  buyer_id uuid not null references app_users (id) on delete restrict,
  warehouse_id uuid not null references warehouses (id) on delete restrict,
  status text not null check (status in ('Received', 'Pending', 'Ordered')),
  currency char(3) not null default 'RWF',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  payment_method text not null check (payment_method in ('Bank Account', 'MTN MoMo', 'Airtel Money', 'Cash')),
  shipping_status text,
  note text,
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (paid_amount <= total_amount)
);

create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases (id) on delete restrict,
  product_id uuid not null references products (id) on delete restrict,
  name_snapshot text not null,
  code_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  sort_order integer not null default 0
);
