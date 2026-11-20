import { z } from "zod";
import { auditQuery } from "@/lib/audit";
import { parseDateRange } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import {
  badRequest,
  conflict,
  isUniqueViolation,
  notFound,
  unprocessable,
} from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { nextDocumentReference } from "@/lib/numbering";
import { paginate, parsePagination } from "@/lib/pagination";
import type { PurchaseRow } from "@/lib/purchases";
import {
  mapPurchaseReturn,
  mapReturnItem,
  type PurchaseReturnRow,
  type ReturnItemRow,
} from "@/lib/returns";
import { parseSort, sortRows } from "@/lib/sorting";
import {
  dateString,
  paymentMethod,
  roundMoney,
  runTransaction,
  toStockItemsJson,
} from "@/lib/transactions";
import { parseJson, parseQuery, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const listSchema = z
  .object({
    purchaseId: uuid.optional(),
    supplierId: uuid.optional(),
    warehouseId: uuid.optional(),
    status: z.enum(["Pending", "Approved", "Completed", "Rejected"]).optional(),
  })
  .strict();

const createSchema = z
  .object({
    purchaseId: uuid,
    date: dateString.optional(),
    reason: z.enum([
      "Damaged goods",
      "Defective goods",
      "Wrong item received",
      "Overstock",
      "Supplier error",
      "Other",
    ]),
    resolution: z.enum(["Refund", "Replacement", "Credit Note"]),
    status: z
      .enum(["Pending", "Approved", "Completed", "Rejected"])
      .default("Completed"),
    refundMethod: paymentMethod,
    note: z.string().trim().max(1000).nullish(),
    deductStock: z.boolean().default(true),
    items: z
      .array(
        z
          .object({
            purchaseItemId: uuid,
            quantity: z.number().int().positive().max(100000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

type PurchaseItemSelection = {
  id: string;
  purchase_id: string;
  product_id: string;
  name_snapshot: string;
  code_snapshot: string;
  quantity: number | string;
  unit_price: number | string;
};

export async function GET(request: Request) {
  try {
    await requirePermission(request, "purchase_returns");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const range = parseDateRange(params);
    const sort = parseSort(params, ["date", "reference", "amount", "status"], "date");

    const rows = (await sql`
      select
        pr.*,
        p.reference as purchase_reference,
        s.name as supplier_name,
        w.name as warehouse_name
      from purchase_returns pr
      join purchases p on p.id = pr.purchase_id
      join suppliers s on s.id = pr.supplier_id
      join warehouses w on w.id = pr.warehouse_id
      where pr.date::text between ${range.start} and ${range.end}
    `) as PurchaseReturnRow[];

    let items = rows.map(mapPurchaseReturn);
    if (query.purchaseId) {
      items = items.filter((item) => item.purchaseId === query.purchaseId);
    }
    if (query.supplierId) {
      items = items.filter((item) => item.supplierId === query.supplierId);
    }
    if (query.warehouseId) {
      items = items.filter((item) => item.warehouseId === query.warehouseId);
    }
    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }

    const result = paginate(sortRows(items, sort), pagination);
    return ok(result.rows, 200, {
      pagination: result.meta,
      dateRange: range,
    });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, "purchase_returns");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    const purchaseRows = (await sql`
      select
        p.*,
        s.name as supplier_name,
        w.name as warehouse_name
      from purchases p
      join suppliers s on s.id = p.supplier_id
      join warehouses w on w.id = p.warehouse_id
      where p.id = ${input.purchaseId}::uuid
    `) as PurchaseRow[];
    const purchase = purchaseRows[0];
    if (!purchase) throw notFound("Purchase not found.");
    if (purchase.status === "Cancelled") {
      throw badRequest("Cannot return items from a cancelled purchase.");
    }

    const purchaseItemIds = input.items.map((item) => item.purchaseItemId);
    if (new Set(purchaseItemIds).size !== purchaseItemIds.length) {
      throw badRequest("Duplicate purchase items are not allowed in a return.");
    }

    const selectedRows = (await sql`
      select
        id, purchase_id, product_id, name_snapshot, code_snapshot,
        quantity, unit_price
      from purchase_items
      where purchase_id = ${input.purchaseId}::uuid
        and id = any(${purchaseItemIds}::uuid[])
    `) as PurchaseItemSelection[];
    if (selectedRows.length !== purchaseItemIds.length) {
      throw badRequest("One or more selected purchase items do not exist.");
    }
    const purchasedById = new Map(selectedRows.map((row) => [row.id, row]));
    const productIds = [...new Set(selectedRows.map((row) => row.product_id))];

    const purchasedRows = (await sql`
      select product_id, sum(quantity)::integer as purchased_quantity
      from purchase_items
      where purchase_id = ${input.purchaseId}::uuid
        and product_id = any(${productIds}::uuid[])
      group by product_id
    `) as { product_id: string; purchased_quantity: number | string }[];
    const returnedRows = (await sql`
      select
        pri.product_id,
        coalesce(sum(pri.quantity), 0)::integer as returned_quantity
      from purchase_returns pr
      join purchase_return_items pri on pri.purchase_return_id = pr.id
      where pr.purchase_id = ${input.purchaseId}::uuid
        and pri.product_id = any(${productIds}::uuid[])
        and pr.status <> 'Rejected'
      group by pri.product_id
    `) as { product_id: string; returned_quantity: number | string }[];
    const purchasedByProduct = new Map(
      purchasedRows.map((row) => [row.product_id, Number(row.purchased_quantity)]),
    );
    const returnedByProduct = new Map(
      returnedRows.map((row) => [row.product_id, Number(row.returned_quantity)]),
    );
    const requestedByProduct = new Map<string, number>();
    for (const item of input.items) {
      const purchased = purchasedById.get(item.purchaseItemId);
      if (!purchased) {
        throw badRequest("One or more selected purchase items do not exist.");
      }
      requestedByProduct.set(
        purchased.product_id,
        (requestedByProduct.get(purchased.product_id) ?? 0) + item.quantity,
      );
    }
    for (const [productId, requested] of requestedByProduct) {
      const remaining =
        (purchasedByProduct.get(productId) ?? 0) -
        (returnedByProduct.get(productId) ?? 0);
      if (requested > remaining) {
        throw unprocessable(
          "Return quantity exceeds the remaining purchased quantity.",
        );
      }
    }

    let amount = 0;
    const preparedItems = input.items.map((item) => {
      const purchased = purchasedById.get(item.purchaseItemId);
      if (!purchased) {
        throw badRequest("One or more selected purchase items do not exist.");
      }
      const unitPrice = roundMoney(Number(purchased.unit_price));
      const lineTotal = roundMoney(item.quantity * unitPrice);
      amount = roundMoney(amount + lineTotal);
      return {
        id: crypto.randomUUID(),
        productId: purchased.product_id,
        nameSnapshot: purchased.name_snapshot,
        codeSnapshot: purchased.code_snapshot,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const id = crypto.randomUUID();
    const date = input.date ?? new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const reference = await nextDocumentReference(sql, "purchase_return");
    const shouldRefund =
      input.resolution === "Refund" && input.status === "Completed" && amount > 0;
    const paymentReference = shouldRefund
      ? await nextDocumentReference(sql, "payment")
      : null;
    const paymentId = paymentReference ? crypto.randomUUID() : null;
    const shouldDeductStock = input.deductStock && input.status === "Completed";

    const mappedAfter = {
      ...mapPurchaseReturn({
        id,
        reference,
        date,
        purchase_id: input.purchaseId,
        supplier_id: purchase.supplier_id,
        warehouse_id: purchase.warehouse_id,
        reason: input.reason,
        resolution: input.resolution,
        status: input.status,
        refund_method: input.refundMethod,
        amount,
        deduct_stock: input.deductStock,
        note: input.note ?? null,
        created_by: session.appUser.id,
        created_at: now,
        updated_at: now,
        purchase_reference: purchase.reference,
        supplier_name: purchase.supplier_name ?? null,
        warehouse_name: purchase.warehouse_name ?? null,
      }),
      items: preparedItems.map((item) =>
        mapReturnItem({
          id: item.id,
          purchase_return_id: id,
          product_id: item.productId,
          name_snapshot: item.nameSnapshot,
          code_snapshot: item.codeSnapshot,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          line_total: item.lineTotal,
        }),
      ),
    };

    let results: any[][] = [];
    try {
      results = await runTransaction(sql, (tx) => {
        const queries: any[] = [];

        queries.push(tx`
          with inserted as (
            insert into purchase_returns (
              id, reference, date, purchase_id, supplier_id, warehouse_id,
              reason, resolution, status, refund_method, amount,
              deduct_stock, note, created_by
            )
            values (
              ${id}::uuid, ${reference}, ${date}::date, ${input.purchaseId}::uuid,
              ${purchase.supplier_id}::uuid, ${purchase.warehouse_id}::uuid,
              ${input.reason}, ${input.resolution}, ${input.status},
              ${input.refundMethod}, ${amount}, ${input.deductStock},
              ${input.note ?? null}, ${session.appUser.id}::uuid
            )
            returning *
          )
          select
            i.*,
            p.reference as purchase_reference,
            s.name as supplier_name,
            w.name as warehouse_name
          from inserted i
          join purchases p on p.id = i.purchase_id
          join suppliers s on s.id = i.supplier_id
          join warehouses w on w.id = i.warehouse_id
        `);

        queries.push(tx`
          insert into purchase_return_items (
            id, purchase_return_id, product_id, name_snapshot, code_snapshot,
            quantity, unit_price, line_total
          )
          select
            (item.value ->> 'id')::uuid,
            ${id}::uuid,
            (item.value ->> 'productId')::uuid,
            item.value ->> 'nameSnapshot',
            item.value ->> 'codeSnapshot',
            (item.value ->> 'quantity')::integer,
            (item.value ->> 'unitPrice')::numeric,
            (item.value ->> 'lineTotal')::numeric
          from jsonb_array_elements(${JSON.stringify(preparedItems)}::jsonb)
            with ordinality as item(value, ord)
          order by item.ord
          returning *
        `);

        if (shouldDeductStock) {
          queries.push(tx`
            select adjust_stock_for_document(
              ${purchase.warehouse_id}::uuid,
              ${toStockItemsJson(preparedItems)}::jsonb,
              'purchase_return',
              'purchase_return',
              ${id}::uuid,
              ${date}::date,
              ${input.note ?? null},
              ${session.appUser.id}::uuid
            )
          `);
        }

        if (paymentReference && paymentId) {
          queries.push(tx`
            insert into payments (
              id, reference, direction, source_type, source_id,
              party_type, party_id, method, amount, paid_at, note, created_by
            )
            values (
              ${paymentId}::uuid, ${paymentReference}, 'incoming', 'purchase_return',
              ${id}::uuid, 'supplier', ${purchase.supplier_id}::uuid,
              ${input.refundMethod}, ${amount}, ${date}::date,
              ${input.note ?? null}, ${session.appUser.id}::uuid
            )
          `);
          queries.push(tx`
            insert into payment_allocations (payment_id, target_type, target_id, amount)
            values (${paymentId}::uuid, 'purchase_return', ${id}::uuid, ${amount})
          `);
          queries.push(tx`
            update purchases
            set
              paid_amount = greatest(0, paid_amount - ${amount}::numeric),
              updated_at = now()
            where id = ${input.purchaseId}::uuid
          `);
        }

        queries.push(
          auditQuery(tx, {
            actorId: session.appUser.id,
            action: "purchase_return.create",
            entityType: "purchase_return",
            entityId: id,
            afterData: mappedAfter,
            ...requestMeta(request),
          }),
        );

        return queries;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict(
          "A purchase return with that reference already exists. Please retry.",
        );
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P0001"
      ) {
        throw unprocessable(
          "Stock could not be updated; the purchase return was not recorded.",
        );
      }
      throw error;
    }

    const returnRow = results[0][0] as PurchaseReturnRow;
    const insertedItems = results[1] as ReturnItemRow[];
    return ok(
      { ...mapPurchaseReturn(returnRow), items: insertedItems.map(mapReturnItem) },
      201,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
