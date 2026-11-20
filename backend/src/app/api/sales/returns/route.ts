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
import {
  mapReturnItem,
  mapSaleReturn,
  type ReturnItemRow,
  type SaleReturnRow,
} from "@/lib/returns";
import type { SaleRow } from "@/lib/sales";
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
    saleId: uuid.optional(),
    customerId: uuid.optional(),
    warehouseId: uuid.optional(),
    status: z.enum(["Pending", "Approved", "Completed", "Rejected"]).optional(),
  })
  .strict();

const createSchema = z
  .object({
    saleId: uuid,
    date: dateString.optional(),
    reason: z.enum([
      "Damaged item",
      "Defective item",
      "Wrong item delivered",
      "Customer changed mind",
      "Late delivery",
      "Other",
    ]),
    resolution: z.enum(["Refund", "Store Credit", "Replacement"]),
    status: z
      .enum(["Pending", "Approved", "Completed", "Rejected"])
      .default("Completed"),
    refundMethod: paymentMethod,
    note: z.string().trim().max(1000).nullish(),
    restock: z.boolean().default(true),
    items: z
      .array(
        z
          .object({
            saleItemId: uuid,
            quantity: z.number().int().positive().max(100000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

type SaleItemSelection = {
  id: string;
  sale_id: string;
  product_id: string;
  name_snapshot: string;
  code_snapshot: string;
  quantity: number | string;
  unit_price: number | string;
  unit_cost?: number | string | null;
};

export async function GET(request: Request) {
  try {
    await requirePermission(request, "sales_returns");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const range = parseDateRange(params);
    const sort = parseSort(params, ["date", "reference", "amount", "status"], "date");

    const rows = (await sql`
      select
        sr.*,
        s.reference as sale_reference,
        c.name as customer_name,
        w.name as warehouse_name
      from sale_returns sr
      join sales s on s.id = sr.sale_id
      join customers c on c.id = sr.customer_id
      join warehouses w on w.id = sr.warehouse_id
      where sr.date::text between ${range.start} and ${range.end}
    `) as SaleReturnRow[];

    let items = rows.map(mapSaleReturn);
    if (query.saleId) {
      items = items.filter((item) => item.saleId === query.saleId);
    }
    if (query.customerId) {
      items = items.filter((item) => item.customerId === query.customerId);
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
    const session = await requirePermission(request, "sales_returns");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    const saleRows = (await sql`
      select
        s.*,
        c.name as customer_name,
        w.name as warehouse_name
      from sales s
      join customers c on c.id = s.customer_id
      join warehouses w on w.id = s.warehouse_id
      where s.id = ${input.saleId}::uuid
    `) as SaleRow[];
    const sale = saleRows[0];
    if (!sale) throw notFound("Sale not found.");
    if (sale.status === "Cancelled") {
      throw badRequest("Cannot return items from a cancelled sale.");
    }

    const saleItemIds = input.items.map((item) => item.saleItemId);
    if (new Set(saleItemIds).size !== saleItemIds.length) {
      throw badRequest("Duplicate sale items are not allowed in a return.");
    }

    const selectedRows = (await sql`
      select
        id, sale_id, product_id, name_snapshot, code_snapshot,
        quantity, unit_price, unit_cost
      from sale_items
      where sale_id = ${input.saleId}::uuid
        and id = any(${saleItemIds}::uuid[])
    `) as SaleItemSelection[];
    if (selectedRows.length !== saleItemIds.length) {
      throw badRequest("One or more selected sale items do not exist.");
    }
    const soldById = new Map(selectedRows.map((row) => [row.id, row]));
    const productIds = [...new Set(selectedRows.map((row) => row.product_id))];

    const soldRows = (await sql`
      select product_id, sum(quantity)::integer as sold_quantity
      from sale_items
      where sale_id = ${input.saleId}::uuid
        and product_id = any(${productIds}::uuid[])
      group by product_id
    `) as { product_id: string; sold_quantity: number | string }[];
    const returnedRows = (await sql`
      select
        ri.product_id,
        coalesce(sum(ri.quantity), 0)::integer as returned_quantity
      from sale_returns sr
      join sale_return_items ri on ri.sale_return_id = sr.id
      where sr.sale_id = ${input.saleId}::uuid
        and ri.product_id = any(${productIds}::uuid[])
        and sr.status <> 'Rejected'
      group by ri.product_id
    `) as { product_id: string; returned_quantity: number | string }[];
    const soldByProduct = new Map(
      soldRows.map((row) => [row.product_id, Number(row.sold_quantity)]),
    );
    const returnedByProduct = new Map(
      returnedRows.map((row) => [row.product_id, Number(row.returned_quantity)]),
    );
    const requestedByProduct = new Map<string, number>();
    for (const item of input.items) {
      const sold = soldById.get(item.saleItemId);
      if (!sold) throw badRequest("One or more selected sale items do not exist.");
      requestedByProduct.set(
        sold.product_id,
        (requestedByProduct.get(sold.product_id) ?? 0) + item.quantity,
      );
    }
    for (const [productId, requested] of requestedByProduct) {
      const remaining =
        (soldByProduct.get(productId) ?? 0) - (returnedByProduct.get(productId) ?? 0);
      if (requested > remaining) {
        throw unprocessable(
          "Return quantity exceeds the remaining sold quantity.",
        );
      }
    }

    let amount = 0;
    const preparedItems = input.items.map((item) => {
      const sold = soldById.get(item.saleItemId);
      if (!sold) throw badRequest("One or more selected sale items do not exist.");
      const unitPrice = roundMoney(Number(sold.unit_price));
      const lineTotal = roundMoney(item.quantity * unitPrice);
      amount = roundMoney(amount + lineTotal);
      return {
        id: crypto.randomUUID(),
        saleItemId: sold.id,
        productId: sold.product_id,
        nameSnapshot: sold.name_snapshot,
        codeSnapshot: sold.code_snapshot,
        quantity: item.quantity,
        unitPrice,
        unitCost: roundMoney(Number(sold.unit_cost ?? 0)),
        lineTotal,
      };
    });

    const id = crypto.randomUUID();
    const date = input.date ?? new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const reference = await nextDocumentReference(sql, "sale_return");
    const shouldRefund =
      input.resolution === "Refund" && input.status === "Completed" && amount > 0;
    const paymentReference = shouldRefund
      ? await nextDocumentReference(sql, "payment")
      : null;
    const paymentId = paymentReference ? crypto.randomUUID() : null;
    const shouldRestock = input.restock && input.status === "Completed";

    const mappedAfter = {
      ...mapSaleReturn({
        id,
        reference,
        date,
        sale_id: input.saleId,
        customer_id: sale.customer_id,
        warehouse_id: sale.warehouse_id,
        reason: input.reason,
        resolution: input.resolution,
        status: input.status,
        refund_method: input.refundMethod,
        amount,
        restock: input.restock,
        note: input.note ?? null,
        created_by: session.appUser.id,
        created_at: now,
        updated_at: now,
        sale_reference: sale.reference,
        customer_name: sale.customer_name ?? null,
        warehouse_name: sale.warehouse_name ?? null,
      }),
      items: preparedItems.map((item) =>
        mapReturnItem({
          id: item.id,
          sale_return_id: id,
          product_id: item.productId,
          name_snapshot: item.nameSnapshot,
          code_snapshot: item.codeSnapshot,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          line_total: item.lineTotal,
          sale_item_id: item.saleItemId,
          unit_cost: item.unitCost,
        }),
      ),
    };

    let results: any[][] = [];
    try {
      results = await runTransaction(sql, (tx) => {
        const queries: any[] = [];

        queries.push(tx`
          with inserted as (
            insert into sale_returns (
              id, reference, date, sale_id, customer_id, warehouse_id,
              reason, resolution, status, refund_method, amount,
              restock, note, created_by
            )
            values (
              ${id}::uuid, ${reference}, ${date}::date, ${input.saleId}::uuid,
              ${sale.customer_id}::uuid, ${sale.warehouse_id}::uuid,
              ${input.reason}, ${input.resolution}, ${input.status},
              ${input.refundMethod}, ${amount}, ${input.restock},
              ${input.note ?? null}, ${session.appUser.id}::uuid
            )
            returning *
          )
          select
            i.*,
            s.reference as sale_reference,
            c.name as customer_name,
            w.name as warehouse_name
          from inserted i
          join sales s on s.id = i.sale_id
          join customers c on c.id = i.customer_id
          join warehouses w on w.id = i.warehouse_id
        `);

        queries.push(tx`
          insert into sale_return_items (
            id, sale_return_id, sale_item_id, product_id, name_snapshot, code_snapshot,
            quantity, unit_price, unit_cost, line_total
          )
          select
            (item.value ->> 'id')::uuid,
            ${id}::uuid,
            (item.value ->> 'saleItemId')::uuid,
            (item.value ->> 'productId')::uuid,
            item.value ->> 'nameSnapshot',
            item.value ->> 'codeSnapshot',
            (item.value ->> 'quantity')::integer,
            (item.value ->> 'unitPrice')::numeric,
            (item.value ->> 'unitCost')::numeric,
            (item.value ->> 'lineTotal')::numeric
          from jsonb_array_elements(${JSON.stringify(preparedItems)}::jsonb)
            with ordinality as item(value, ord)
          order by item.ord
          returning *
        `);

        if (shouldRestock) {
          queries.push(tx`
            select adjust_stock_for_document(
              ${sale.warehouse_id}::uuid,
              ${toStockItemsJson(preparedItems)}::jsonb,
              'sale_return',
              'sale_return',
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
              ${paymentId}::uuid, ${paymentReference}, 'outgoing', 'sale_return',
              ${id}::uuid, 'customer', ${sale.customer_id}::uuid,
              ${input.refundMethod}, ${amount}, ${date}::date,
              ${input.note ?? null}, ${session.appUser.id}::uuid
            )
          `);
          queries.push(tx`
            insert into payment_allocations (payment_id, target_type, target_id, amount)
            values (${paymentId}::uuid, 'sale_return', ${id}::uuid, ${amount})
          `);
          queries.push(tx`
            update sales
            set
              paid_amount = greatest(0, paid_amount - ${amount}::numeric),
              updated_at = now()
            where id = ${input.saleId}::uuid
          `);
        }

        queries.push(
          auditQuery(tx, {
            actorId: session.appUser.id,
            action: "sale_return.create",
            entityType: "sale_return",
            entityId: id,
            afterData: mappedAfter,
            ...requestMeta(request),
          }),
        );

        return queries;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict("A sale return with that reference already exists. Please retry.");
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P0001"
      ) {
        throw unprocessable(
          "Stock could not be updated; the sale return was not recorded.",
        );
      }
      throw error;
    }

    const returnRow = results[0][0] as SaleReturnRow;
    const insertedItems = results[1] as ReturnItemRow[];
    return ok(
      { ...mapSaleReturn(returnRow), items: insertedItems.map(mapReturnItem) },
      201,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
