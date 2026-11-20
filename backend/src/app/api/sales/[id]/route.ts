import { z } from "zod";
import { auditQuery, writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { badRequest, notFound, unprocessable } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { mapSale, mapSaleItem, type SaleItemRow, type SaleRow } from "@/lib/sales";
import {
  assertReferences,
  dateString,
  getUnitCostMap,
  paymentMethod,
  runTransaction,
} from "@/lib/transactions";
import { parseJson, parseUuid, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    customerId: uuid,
    warehouseId: uuid,
    sellerId: uuid,
    date: dateString,
    status: z.enum(["Pending", "Ordered"]),
    currency: z.string().trim().length(3),
    paymentMethod,
    shippingStatus: z.string().trim().max(100).nullish(),
    note: z.string().trim().max(1000).nullish(),
  })
  .partial()
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

async function loadSale(
  sql: ReturnType<typeof getSql>,
  id: string,
): Promise<SaleRow | undefined> {
  const rows = (await sql`
    select
      s.*,
      c.name as customer_name,
      w.name as warehouse_name,
      u.name as seller_name
    from sales s
    join customers c on c.id = s.customer_id
    join warehouses w on w.id = s.warehouse_id
    join app_users u on u.id = s.seller_id
    where s.id = ${id}::uuid
  `) as SaleRow[];
  return rows[0];
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermission(request, "sales");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const sale = await loadSale(sql, id);
    if (!sale) throw notFound("Sale not found.");
    const items = (await sql`
      select * from sale_items where sale_id = ${id}::uuid order by sort_order
    `) as SaleItemRow[];
    return ok({ ...mapSale(sale), items: items.map(mapSaleItem) });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "sales");
    const id = parseUuid((await context.params).id);
    const input = await parseJson(request, updateSchema);
    const sql = getSql();

    const beforeRow = await loadSale(sql, id);
    if (!beforeRow) throw notFound("Sale not found.");
    if (beforeRow.status === "Completed" || beforeRow.status === "Cancelled") {
      throw badRequest("Only pending or ordered sales can be updated.");
    }

    await assertReferences(sql, {
      customerId: input.customerId,
      warehouseId: input.warehouseId,
      userId: input.sellerId,
    });

    const beforeItems = (await sql`
      select * from sale_items where sale_id = ${id}::uuid order by sort_order
    `) as SaleItemRow[];
    const before = {
      ...mapSale(beforeRow),
      items: beforeItems.map(mapSaleItem),
    };

    const rows = (await sql`
      with updated as (
        update sales
        set
          customer_id = coalesce(${input.customerId ?? null}::uuid, customer_id),
          warehouse_id = coalesce(${input.warehouseId ?? null}::uuid, warehouse_id),
          seller_id = coalesce(${input.sellerId ?? null}::uuid, seller_id),
          date = case when ${input.date !== undefined} then ${input.date ?? null}::date else date end,
          status = coalesce(${input.status ?? null}, status),
          currency = coalesce(${input.currency ?? null}, currency),
          payment_method = coalesce(${input.paymentMethod ?? null}, payment_method),
          shipping_status = case when ${input.shippingStatus !== undefined} then ${input.shippingStatus ?? null} else shipping_status end,
          note = case when ${input.note !== undefined} then ${input.note ?? null} else note end,
          updated_at = now()
        where id = ${id}::uuid and status in ('Pending', 'Ordered')
        returning *
      )
      select
        u.*,
        c.name as customer_name,
        w.name as warehouse_name,
        us.name as seller_name
      from updated u
      join customers c on c.id = u.customer_id
      join warehouses w on w.id = u.warehouse_id
      join app_users us on us.id = u.seller_id
    `) as SaleRow[];
    if (!rows[0]) throw notFound("Sale not found.");

    if (input.warehouseId && input.warehouseId !== beforeRow.warehouse_id) {
      const unitCosts = await getUnitCostMap(
        sql,
        beforeItems.map((item) => item.product_id),
        input.warehouseId,
      );
      await runTransaction(sql, (tx) =>
        beforeItems.map((item) => tx`
          update sale_items
          set unit_cost = ${unitCosts.get(item.product_id) ?? 0}
          where id = ${item.id}::uuid
        `),
      );
    }

    const afterItems = (await sql`
      select * from sale_items where sale_id = ${id}::uuid order by sort_order
    `) as SaleItemRow[];
    const after = {
      ...mapSale(rows[0]),
      items: afterItems.map(mapSaleItem),
    };

    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "sale.update",
      entityType: "sale",
      entityId: id,
      beforeData: before,
      afterData: after,
      ...requestMeta(request),
    });

    return ok(after);
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "sales");
    const id = parseUuid((await context.params).id);
    const sql = getSql();

    const sale = await loadSale(sql, id);
    if (!sale) throw notFound("Sale not found.");

    const items = (await sql`
      select * from sale_items where sale_id = ${id}::uuid order by sort_order
    `) as SaleItemRow[];
    const returns = (await sql`
      select * from sale_returns where sale_id = ${id}::uuid order by created_at
    `) as Record<string, unknown>[];
    const returnIds = returns.map((row) => String(row.id));
    const before = {
      ...mapSale(sale),
      items: items.map(mapSaleItem),
      returns,
    };
    const shouldRestoreStock = sale.status === "Completed";

    try {
      await runTransaction(sql, (tx) => {
        const queries: any[] = [];

        if (shouldRestoreStock) {
          queries.push(tx`
            with totals as (
              select
                product_id,
                warehouse_id,
                sum(quantity_delta)::integer as quantity_delta
              from stock_movements
              where (reference_type = 'sale' and reference_id = ${id}::uuid)
                or (
                  reference_type = 'sale_return'
                  and reference_id = any(${returnIds}::uuid[])
                )
              group by product_id, warehouse_id
            ),
            guard as (
              select
                1 / case
                  when count(*) filter (
                    where b.product_id is null
                      or b.quantity_on_hand - t.quantity_delta < 0
                  ) = 0 then 1
                  else 0
                end as ok
              from totals t
              left join stock_balances b
                on b.product_id = t.product_id
                and b.warehouse_id = t.warehouse_id
            )
            update stock_balances b
            set
              quantity_on_hand = b.quantity_on_hand - t.quantity_delta,
              updated_at = now()
            from totals t
            cross join guard g
            where b.product_id = t.product_id
              and b.warehouse_id = t.warehouse_id
              and g.ok = 1
          `);
        }

        queries.push(tx`
          delete from stock_movements
          where (reference_type = 'sale' and reference_id = ${id}::uuid)
            or (
              reference_type = 'sale_return'
              and reference_id = any(${returnIds}::uuid[])
            )
        `);

        queries.push(tx`
          delete from payment_allocations
          where (target_type = 'sale' and target_id = ${id}::uuid)
            or (
              target_type = 'sale_return'
              and target_id = any(${returnIds}::uuid[])
            )
        `);

        queries.push(tx`
          delete from payments p
          where (
              (source_type = 'sale' and source_id = ${id}::uuid)
              or (
                source_type = 'sale_return'
                and source_id = any(${returnIds}::uuid[])
              )
            )
            and not exists (
              select 1 from payment_allocations pa where pa.payment_id = p.id
            )
        `);

        queries.push(tx`
          delete from sale_return_items
          where sale_return_id = any(${returnIds}::uuid[])
        `);

        queries.push(tx`
          delete from sale_returns
          where id = any(${returnIds}::uuid[])
        `);

        queries.push(tx`
          delete from sale_items where sale_id = ${id}::uuid
        `);

        queries.push(tx`
          delete from sales where id = ${id}::uuid
        `);

        queries.push(
          auditQuery(tx, {
            actorId: session.appUser.id,
            action: "sale.delete",
            entityType: "sale",
            entityId: id,
            beforeData: before,
            ...requestMeta(request),
          }),
        );

        return queries;
      });
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code)
          : "";
      if (code === "22012" || code === "P0001") {
        throw unprocessable(
          "Deleting this sale would make stock negative; adjust stock first, then retry.",
        );
      }
      throw error;
    }

    return ok({ id, reference: sale.reference, deleted: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
