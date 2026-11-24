alter table sales
  add column if not exists shipping_amount numeric(14,2) not null default 0 check (shipping_amount >= 0);

alter table purchases
  add column if not exists shipping_amount numeric(14,2) not null default 0 check (shipping_amount >= 0);
