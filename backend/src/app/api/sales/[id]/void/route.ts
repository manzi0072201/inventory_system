import { z } from "zod";
import { auditQuery } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { conflict, notFound, unprocessable } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { nextDocumentReference } from "@/lib/numbering";
import { mapSale, mapSaleItem, type SaleItemRow, type SaleRow } from "@/lib/sales";
import { runTransaction, toStockItemsJson } from "@/lib/transactions";
import { parseJson, parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const voidSchema = z
  .object({
    note: z.string().trim().max(1000).nullish(),
  })
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "sales");
    const id = parseUuid((await context.params).id);
    const raw = await request.clone().text();
    const input: z.infer<typeof voidSchema> = raw.trim()
      ? await parseJson(request, voidSchema)
      : {};
    const sql = getSql();

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
    const sale = rows[0];
    if (!sale) throw notFound("Sale not found.");
    if (sale.status === "Cancelled") throw conflict("Sale is already cancelled.");

    const items = (await sql`
      select * from sale_items where sale_id = ${id}::uuid order by sort_order
    `) as SaleItemRow[];
    const mappedItems = items.map(mapSaleItem);
    const before = { ...mapSale(sale), items: mappedItems };
    const after = {
      ...before,
      status: "Cancelled",
      updatedAt: new Date().toISOString(),
    };
    const today = new Date().toISOString().slice(0, 10);
    const stockItems = toStockItemsJson(
      items.map((item) => ({
        productId: item.product_id,
        quantity: Number(item.quantity),
      })),
    );

    const shouldReversePayment =
      sale.status === "Completed" && Number(sale.paid_amount) > 0 && Boolean(sale.payment_method);
    const reversalPaymentId = shouldReversePayment ? crypto.randomUUID() : null;
    const reversalReference = shouldReversePayment
      ? await nextDocumentReference(sql, "payment")
      : null;
    let updatedIndex = 0;
    const results = await runTransaction(sql, (tx) => {
      const queries: any[] = [];
      updatedIndex = 0;

      if (sale.status === "Completed") {
        queries.push(tx`
          select adjust_stock_for_document(
            ${sale.warehouse_id}::uuid,
            ${stockItems}::jsonb,
            'sale_return',
            'sale',
            ${id}::uuid,
            ${today}::date,
            ${input.note ?? sale.note ?? null},
            ${session.appUser.id}::uuid
          )
        `);
        updatedIndex += 1;
      }

      if (reversalPaymentId && reversalReference) {
        queries.push(tx`
          insert into payments (
            id, reference, direction, source_type, source_id,
            party_type, party_id, method, amount, paid_at, note, created_by
          )
          values (
            ${reversalPaymentId}::uuid, ${reversalReference}, 'outgoing', 'sale', ${id}::uuid,
            'customer', ${sale.customer_id}::uuid, ${sale.payment_method},
            ${Number(sale.paid_amount)}, ${today}::date, ${input.note ?? sale.note ?? null},
            ${session.appUser.id}::uuid
          )
        `);
        updatedIndex += 1;
        queries.push(tx`
          insert into payment_allocations (payment_id, target_type, target_id, amount)
          values (${reversalPaymentId}::uuid, 'sale', ${id}::uuid, ${Number(sale.paid_amount)})
        `);
        updatedIndex += 1;
      }

      queries.push(tx`
        with updated as (
          update sales
          set status = 'Cancelled', paid_amount = 0, updated_at = now()
          where id = ${id}::uuid
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
      `);

      queries.push(
        auditQuery(tx, {
          actorId: session.appUser.id,
          action: "sale.void",
          entityType: "sale",
          entityId: id,
          beforeData: before,
          afterData: after,
          ...requestMeta(request),
        }),
      );

      return queries;
    }).catch((error) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P0001"
      ) {
        throw unprocessable("Stock could not be restored; the sale was not voided.");
      }
      throw error;
    });

    const cancelledRow = results[updatedIndex][0] as SaleRow;
    return ok({ ...mapSale(cancelledRow), items: mappedItems });
  } catch (error) {
    return failUnexpected(error);
  }
}
