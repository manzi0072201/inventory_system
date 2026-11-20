alter table sales drop constraint if exists sales_status_check;
alter table sales add constraint sales_status_check
  check (status in ('Completed', 'Pending', 'Ordered', 'Cancelled'));

alter table purchases drop constraint if exists purchases_status_check;
alter table purchases add constraint purchases_status_check
  check (status in ('Received', 'Pending', 'Ordered', 'Cancelled'));

insert into document_sequences (key, prefix, next_number)
values ('payment', 'PAY_', 3)
on conflict (key) do nothing;

create or replace function adjust_stock_for_document(
  p_warehouse_id uuid,
  p_items jsonb,
  p_movement_type text,
  p_reference_type text,
  p_reference_id uuid,
  p_occurred_at date,
  p_note text,
  p_created_by uuid
) returns void
language plpgsql
as $$
declare
  line_record record;
  signed_quantity integer;
  next_balance integer;
begin
  for line_record in
    select
      (item ->> 'productId')::uuid as product_id,
      sum((item ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item
    group by 1
  loop
    signed_quantity := case
      when p_movement_type in ('sale', 'purchase_return') then -line_record.quantity
      else line_record.quantity
    end;

    insert into stock_balances (product_id, warehouse_id, quantity_on_hand)
    values (line_record.product_id, p_warehouse_id, 0)
    on conflict (product_id, warehouse_id) do nothing;

    update stock_balances
    set quantity_on_hand = quantity_on_hand + signed_quantity, updated_at = now()
    where product_id = line_record.product_id
      and warehouse_id = p_warehouse_id
      and quantity_on_hand + signed_quantity >= 0
    returning quantity_on_hand into next_balance;

    if not found then
      raise exception 'Insufficient stock for product %', line_record.product_id
        using errcode = 'P0001';
    end if;

    insert into stock_movements (
      product_id,
      warehouse_id,
      movement_type,
      quantity_delta,
      balance_after,
      reference_type,
      reference_id,
      occurred_at,
      note,
      created_by
    )
    values (
      line_record.product_id,
      p_warehouse_id,
      p_movement_type,
      signed_quantity,
      next_balance,
      p_reference_type,
      p_reference_id,
      p_occurred_at,
      p_note,
      p_created_by
    );
  end loop;
end;
$$;
