alter table sale_items
  add column if not exists unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0);

alter table sale_return_items
  add column if not exists sale_item_id uuid references sale_items (id) on delete set null,
  add column if not exists unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0);

update sale_items si
set unit_cost = coalesce(
  nullif(
    (
      select sb.average_cost
      from sales s
      left join stock_balances sb
        on sb.product_id = si.product_id
       and sb.warehouse_id = s.warehouse_id
      where s.id = si.sale_id
      limit 1
    ),
    0
  ),
  nullif((select p.cost_price from products p where p.id = si.product_id), 0),
  0
)
where si.unit_cost = 0;

with sale_item_ranked as (
  select
    si.id,
    si.sale_id,
    si.product_id,
    si.quantity,
    si.unit_cost,
    sum(si.quantity) over (
      partition by si.sale_id, si.product_id
      order by si.sort_order, si.id
      rows between unbounded preceding and current row
    ) as cumulative_quantity
  from sale_items si
),
return_item_ranked as (
  select
    ri.id,
    sr.sale_id,
    ri.product_id,
    ri.quantity,
    sum(ri.quantity) over (
      partition by ri.sale_return_id, ri.product_id
      order by ri.id
      rows between unbounded preceding and current row
    ) as cumulative_quantity
  from sale_return_items ri
  join sale_returns sr on sr.id = ri.sale_return_id
)
update sale_return_items ri
set sale_item_id = matches.sale_item_id,
    unit_cost = matches.unit_cost
from (
  select
    r.id as return_item_id,
    s.id as sale_item_id,
    s.unit_cost
  from return_item_ranked r
  join sale_item_ranked s
    on s.sale_id = r.sale_id
   and s.product_id = r.product_id
   and s.cumulative_quantity >= r.cumulative_quantity - r.quantity + 1
   and s.cumulative_quantity - s.quantity < r.cumulative_quantity
) matches
where ri.id = matches.return_item_id
  and ri.sale_item_id is null;

create index if not exists sale_return_items_sale_item_id_idx
  on sale_return_items (sale_item_id);
