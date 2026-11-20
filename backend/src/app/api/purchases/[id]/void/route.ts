import { z } from "zod";
import { auditQuery } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { conflict, notFound, unprocessable } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import {
  mapPurchase,
  mapPurchaseItem,
  type PurchaseItemRow,
  type PurchaseRow,
} from "@/lib/purchases";
import { nextDocumentReference } from "@/lib/numbering";
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
    const session = await requirePermission(request, "purchases");
    const id = parseUuid((await context.params).id);
    const raw = await request.clone().text();
    const input: z.infer<typeof voidSchema> = raw.trim()
      ? await parseJson(request, voidSchema)
      : {};
    const sql = getSql();

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
    const purchase = rows[0];
    if (!purchase) throw notFound("Purchase not found.");
    if (purchase.status === "Cancelled") throw conflict("Purchase is already cancelled.");

    const items = (await sql`
      select * from purchase_items where purchase_id = ${id}::uuid order by sort_order
    `) as PurchaseItemRow[];
    const mappedItems = items.map(mapPurchaseItem);
    const before = { ...mapPurchase(purchase), items: mappedItems };
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
      purchase.status === "Received" &&
      Number(purchase.paid_amount) > 0 &&
      Boolean(purchase.payment_method);
    const reversalPaymentId = shouldReversePayment ? crypto.randomUUID() : null;
    const reversalReference = shouldReversePayment
      ? await nextDocumentReference(sql, "payment")
      : null;
    let updatedIndex = 0;
    const results = await runTransaction(sql, (tx) => {
      const queries: any[] = [];
      updatedIndex = 0;

      if (purchase.status === "Received") {
        queries.push(tx`
          select adjust_stock_for_document(
            ${purchase.warehouse_id}::uuid,
            ${stockItems}::jsonb,
            'purchase_return',
            'purchase',
            ${id}::uuid,
            ${today}::date,
            ${input.note ?? purchase.note ?? null},
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
            ${reversalPaymentId}::uuid, ${reversalReference}, 'incoming', 'purchase', ${id}::uuid,
            'supplier', ${purchase.supplier_id}::uuid, ${purchase.payment_method},
            ${Number(purchase.paid_amount)}, ${today}::date, ${input.note ?? purchase.note ?? null},
            ${session.appUser.id}::uuid
          )
        `);
        updatedIndex += 1;
        queries.push(tx`
          insert into payment_allocations (payment_id, target_type, target_id, amount)
          values (${reversalPaymentId}::uuid, 'purchase', ${id}::uuid, ${Number(purchase.paid_amount)})
        `);
        updatedIndex += 1;
      }

      queries.push(tx`
        with updated as (
          update purchases
          set status = 'Cancelled', paid_amount = 0, updated_at = now()
          where id = ${id}::uuid
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
      `);

      queries.push(
        auditQuery(tx, {
          actorId: session.appUser.id,
          action: "purchase.void",
          entityType: "purchase",
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
        throw unprocessable("Stock could not be restored; the purchase was not voided.");
      }
      throw error;
    });

    const cancelledRow = results[updatedIndex][0] as PurchaseRow;
    return ok({ ...mapPurchase(cancelledRow), items: mappedItems });
  } catch (error) {
    return failUnexpected(error);
  }
}
