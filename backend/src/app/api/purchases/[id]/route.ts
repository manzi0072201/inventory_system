import { z } from "zod";
import { auditQuery, writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { badRequest, notFound, unprocessable } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import {
  mapPurchase,
  mapPurchaseItem,
  type PurchaseItemRow,
  type PurchaseRow,
} from "@/lib/purchases";
import {
  assertReferences,
  dateString,
  paymentMethod,
  runTransaction,
} from "@/lib/transactions";
import { parseJson, parseUuid, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    supplierId: uuid,
    warehouseId: uuid,
    buyerId: uuid,
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

async function loadPurchase(
  sql: ReturnType<typeof getSql>,
  id: string,
): Promise<PurchaseRow | undefined> {
  const rows = (await sql`
    select
      p.*,
      s.name as supplier_name,
      w.name as warehouse_name,
      u.name as buyer_name
    from purchases p
    join suppliers s on s.id = p.supplier_id
    join warehouses w on w.id = p.warehouse_id
    join app_users u on u.id = p.buyer_id
    where p.id = ${id}::uuid
  `) as PurchaseRow[];
  return rows[0];
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermission(request, "purchases");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const purchase = await loadPurchase(sql, id);
    if (!purchase) throw notFound("Purchase not found.");
    const items = (await sql`
      select * from purchase_items where purchase_id = ${id}::uuid order by sort_order
    `) as PurchaseItemRow[];
    return ok({ ...mapPurchase(purchase), items: items.map(mapPurchaseItem) });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "purchases");
    const id = parseUuid((await context.params).id);
    const input = await parseJson(request, updateSchema);
    const sql = getSql();

    const beforeRow = await loadPurchase(sql, id);
    if (!beforeRow) throw notFound("Purchase not found.");
    if (beforeRow.status === "Received" || beforeRow.status === "Cancelled") {
      throw badRequest("Only pending or ordered purchases can be updated.");
    }

    await assertReferences(sql, {
      supplierId: input.supplierId,
      warehouseId: input.warehouseId,
      userId: input.buyerId,
    });

    const beforeItems = (await sql`
      select * from purchase_items where purchase_id = ${id}::uuid order by sort_order
    `) as PurchaseItemRow[];
    const before = {
      ...mapPurchase(beforeRow),
      items: beforeItems.map(mapPurchaseItem),
    };

    const rows = (await sql`
      with updated as (
        update purchases
        set
          supplier_id = coalesce(${input.supplierId ?? null}::uuid, supplier_id),
          warehouse_id = coalesce(${input.warehouseId ?? null}::uuid, warehouse_id),
          buyer_id = coalesce(${input.buyerId ?? null}::uuid, buyer_id),
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
        s.name as supplier_name,
        w.name as warehouse_name,
        us.name as buyer_name
      from updated u
      join suppliers s on s.id = u.supplier_id
      join warehouses w on w.id = u.warehouse_id
      join app_users us on us.id = u.buyer_id
    `) as PurchaseRow[];
    if (!rows[0]) throw notFound("Purchase not found.");

    const afterItems = (await sql`
      select * from purchase_items where purchase_id = ${id}::uuid order by sort_order
    `) as PurchaseItemRow[];
    const after = {
      ...mapPurchase(rows[0]),
      items: afterItems.map(mapPurchaseItem),
    };

    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "purchase.update",
      entityType: "purchase",
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
    const session = await requirePermission(request, "purchases");
    const id = parseUuid((await context.params).id);
    const sql = getSql();

    const purchase = await loadPurchase(sql, id);
    if (!purchase) throw notFound("Purchase not found.");

    const items = (await sql`
      select * from purchase_items where purchase_id = ${id}::uuid order by sort_order
    `) as PurchaseItemRow[];
    const returns = (await sql`
      select * from purchase_returns where purchase_id = ${id}::uuid order by created_at
    `) as Record<string, unknown>[];
    const returnIds = returns.map((row) => String(row.id));
    const before = {
      ...mapPurchase(purchase),
      items: items.map(mapPurchaseItem),
      returns,
    };
    const shouldRestoreStock = purchase.status === "Received";

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
              where (reference_type = 'purchase' and reference_id = ${id}::uuid)
                or (
                  reference_type = 'purchase_return'
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
          where (reference_type = 'purchase' and reference_id = ${id}::uuid)
            or (
              reference_type = 'purchase_return'
              and reference_id = any(${returnIds}::uuid[])
            )
        `);

        queries.push(tx`
          delete from payment_allocations
          where (target_type = 'purchase' and target_id = ${id}::uuid)
            or (
              target_type = 'purchase_return'
              and target_id = any(${returnIds}::uuid[])
            )
        `);

        queries.push(tx`
          delete from payments p
          where (
              (source_type = 'purchase' and source_id = ${id}::uuid)
              or (
                source_type = 'purchase_return'
                and source_id = any(${returnIds}::uuid[])
              )
            )
            and not exists (
              select 1 from payment_allocations pa where pa.payment_id = p.id
            )
        `);

        queries.push(tx`
          delete from purchase_return_items
          where purchase_return_id = any(${returnIds}::uuid[])
        `);

        queries.push(tx`
          delete from purchase_returns
          where id = any(${returnIds}::uuid[])
        `);

        queries.push(tx`
          delete from purchase_items where purchase_id = ${id}::uuid
        `);

        queries.push(tx`
          delete from purchases where id = ${id}::uuid
        `);

        queries.push(
          auditQuery(tx, {
            actorId: session.appUser.id,
            action: "purchase.delete",
            entityType: "purchase",
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
          "Deleting this purchase would make stock negative; adjust stock first, then retry.",
        );
      }
      throw error;
    }

    return ok({ id, reference: purchase.reference, deleted: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
