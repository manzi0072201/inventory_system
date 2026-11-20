drop trigger if exists set_updated_at_app_users on app_users;
create trigger set_updated_at_app_users before update on app_users for each row execute function set_updated_at();

drop trigger if exists set_updated_at_warehouses on warehouses;
create trigger set_updated_at_warehouses before update on warehouses for each row execute function set_updated_at();

drop trigger if exists set_updated_at_products on products;
create trigger set_updated_at_products before update on products for each row execute function set_updated_at();

drop trigger if exists set_updated_at_customers on customers;
create trigger set_updated_at_customers before update on customers for each row execute function set_updated_at();

drop trigger if exists set_updated_at_suppliers on suppliers;
create trigger set_updated_at_suppliers before update on suppliers for each row execute function set_updated_at();

drop trigger if exists set_updated_at_stock_balances on stock_balances;
create trigger set_updated_at_stock_balances before update on stock_balances for each row execute function set_updated_at();

drop trigger if exists set_updated_at_document_sequences on document_sequences;
create trigger set_updated_at_document_sequences before update on document_sequences for each row execute function set_updated_at();

drop trigger if exists set_updated_at_sales on sales;
create trigger set_updated_at_sales before update on sales for each row execute function set_updated_at();

drop trigger if exists set_updated_at_purchases on purchases;
create trigger set_updated_at_purchases before update on purchases for each row execute function set_updated_at();

drop trigger if exists set_updated_at_sale_returns on sale_returns;
create trigger set_updated_at_sale_returns before update on sale_returns for each row execute function set_updated_at();

drop trigger if exists set_updated_at_purchase_returns on purchase_returns;
create trigger set_updated_at_purchase_returns before update on purchase_returns for each row execute function set_updated_at();

drop trigger if exists set_updated_at_expenses on expenses;
create trigger set_updated_at_expenses before update on expenses for each row execute function set_updated_at();

drop trigger if exists set_updated_at_app_settings on app_settings;
create trigger set_updated_at_app_settings before update on app_settings for each row execute function set_updated_at();

drop trigger if exists set_updated_at_announcements on announcements;
create trigger set_updated_at_announcements before update on announcements for each row execute function set_updated_at();

create or replace function enforce_payment_allocation_total()
returns trigger
language plpgsql
as $$
declare
  target_payment_id uuid;
  payment_amount numeric(14,2);
  allocated_amount numeric(14,2);
begin
  if tg_op = 'DELETE' then
    target_payment_id := old.payment_id;
  else
    target_payment_id := new.payment_id;
  end if;

  select amount into payment_amount from payments where id = target_payment_id;
  select coalesce(sum(amount), 0) into allocated_amount
  from payment_allocations
  where payment_id = target_payment_id;

  if allocated_amount > payment_amount then
    raise exception 'payment allocations exceed payment amount';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_payment_allocation_total on payment_allocations;
create trigger enforce_payment_allocation_total
after insert or update or delete on payment_allocations
for each row execute function enforce_payment_allocation_total();

create unique index if not exists product_barcodes_primary_idx
on product_barcodes (product_id) where is_primary;

create index if not exists sales_date_idx on sales (date);
create index if not exists sales_customer_warehouse_status_idx on sales (customer_id, warehouse_id, status);
create index if not exists purchases_date_idx on purchases (date);
create index if not exists purchases_supplier_warehouse_status_idx on purchases (supplier_id, warehouse_id, status);
create index if not exists sales_returns_date_idx on sale_returns (date);
create index if not exists purchase_returns_date_idx on purchase_returns (date);
create index if not exists expenses_date_idx on expenses (date);
create index if not exists stock_movements_occurred_at_idx on stock_movements (occurred_at);
create index if not exists products_category_brand_idx on products (category_id, brand_id);
create index if not exists stock_balances_warehouse_idx on stock_balances (warehouse_id);
create index if not exists stock_movements_product_warehouse_idx on stock_movements (product_id, warehouse_id);
create index if not exists payments_party_paid_at_idx on payments (party_type, party_id, paid_at);
create index if not exists notifications_user_read_idx on notifications (user_id, read_at);
create index if not exists audit_logs_created_at_idx on audit_logs (created_at);
create index if not exists audit_logs_actor_idx on audit_logs (actor_id);
create index if not exists app_users_role_status_idx on app_users (role, status);
