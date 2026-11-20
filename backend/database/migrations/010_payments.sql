create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  direction text not null check (direction in ('incoming', 'outgoing')),
  source_type text not null check (source_type in ('sale', 'purchase', 'sale_return', 'purchase_return', 'expense')),
  source_id uuid,
  party_type text not null check (party_type in ('customer', 'supplier')),
  party_id uuid,
  method text not null check (method in ('Bank Account', 'MTN MoMo', 'Airtel Money', 'Cash')),
  amount numeric(14,2) not null check (amount > 0),
  paid_at date not null default current_date,
  note text,
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists payment_allocations (
  payment_id uuid not null references payments (id) on delete restrict,
  target_type text not null check (target_type in ('sale', 'purchase', 'sale_return', 'purchase_return', 'expense')),
  target_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  primary key (payment_id, target_type, target_id)
);
