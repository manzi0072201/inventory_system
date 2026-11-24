import { z } from "zod";
import { auditQuery } from "@/lib/audit";
import { parseDateRange } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import { conflict, unprocessable } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { nextDocumentReference } from "@/lib/numbering";
import { paginate, parsePagination } from "@/lib/pagination";
import {
  mapPurchase,
  mapPurchaseItem,
  type PurchaseItemRow,
  type PurchaseRow,
} from "@/lib/purchases";
import { parseSort, sortRows } from "@/lib/sorting";
import {
  assertReferences,
  calculateTotals,
  dateString,
  lineItemSchema,
  money,
  paymentMethod,
  prepareDocumentItems,
  roundMoney,
  runTransaction,
  toStockItemsJson,
} from "@/lib/transactions";
import { parseJson, parseQuery, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const listSchema = z
  .object({
    supplierId: uuid.optional(),
    warehouseId: uuid.optional(),
    status: z.enum(["Received", "Pending", "Ordered", "Cancelled"]).optional(),
  })
  .strict();

const createSchema = z
  .object({
    supplierId: uuid,
    warehouseId: uuid,
    buyerId: uuid.optional(),
    date: dateString.optional(),
    status: z.enum(["Received", "Pending", "Ordered"]).default("Received"),
    currency: z.string().trim().length(3).default("RWF"),
    paymentMethod,
    paidAmount: money.default(0),
    discountAmount: money.default(0),
    taxAmount: money.default(0),
    shippingAmount: money.default(0),
    shippingStatus: z.string().trim().max(100).nullish(),
    note: z.string().trim().max(1000).nullish(),
    items: z.array(lineItemSchema).min(1).max(100),
  })
  .strict();

function hasErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "purchases");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const range = parseDateRange(params);
    const sort = parseSort(
      params,
      ["date", "reference", "status", "totalAmount", "paidAmount", "createdAt"],
      "date",
    );

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
      where p.date::text between ${range.start} and ${range.end}
    `) as PurchaseRow[];

    let items = rows.map(mapPurchase);
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
    const session = await requirePermission(request, "purchases");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    const buyerId = input.buyerId ?? session.appUser.id;
    await assertReferences(sql, {
      supplierId: input.supplierId,
      warehouseId: input.warehouseId,
      userId: buyerId,
    });

    const prepared = await prepareDocumentItems(sql, input.items, "cost_price");
    const totals = calculateTotals(
      prepared,
      input.discountAmount,
      input.taxAmount,
      input.shippingAmount,
    );
    const paidAmount = roundMoney(input.paidAmount);
    if (paidAmount > totals.totalAmount) {
      throw unprocessable("Paid amount cannot exceed the purchase total.");
    }

    const id = crypto.randomUUID();
    const date = input.date ?? new Date().toISOString().slice(0, 10);
    const reference = await nextDocumentReference(sql, "purchase");
    const paymentReference =
      paidAmount > 0 ? await nextDocumentReference(sql, "payment") : null;
    const paymentId = paymentReference ? crypto.randomUUID() : null;
    const now = new Date().toISOString();
    const itemRows = prepared.map((item) => ({
      id: crypto.randomUUID(),
      purchase_id: id,
      ...item,
    }));

    const mappedPurchaseAfter = mapPurchase({
      id,
      reference,
      date,
      supplier_id: input.supplierId,
      buyer_id: buyerId,
      warehouse_id: input.warehouseId,
      status: input.status,
      currency: input.currency,
      subtotal: totals.subtotal,
      discount_amount: totals.discountAmount,
      tax_amount: totals.taxAmount,
      shipping_amount: totals.shippingAmount,
      total_amount: totals.totalAmount,
      paid_amount: paidAmount,
      payment_method: input.paymentMethod,
      shipping_status: input.shippingStatus ?? null,
      note: input.note ?? null,
      created_by: session.appUser.id,
      created_at: now,
      updated_at: now,
    });
    const mappedItemsAfter = itemRows.map((item) =>
      mapPurchaseItem({
        id: item.id,
        purchase_id: item.purchase_id,
        product_id: item.productId,
        name_snapshot: item.nameSnapshot,
        code_snapshot: item.codeSnapshot,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount,
        tax_amount: item.taxAmount,
        line_total: item.lineTotal,
        sort_order: item.sortOrder,
      }),
    );

    let results: any[][] = [];
    try {
      results = await runTransaction(sql, (tx) => {
        const queries: any[] = [];

        queries.push(tx`
          select adjust_stock_for_document(
            ${input.warehouseId}::uuid,
            ${input.status === "Received" ? toStockItemsJson(prepared) : "[]"}::jsonb,
            'purchase',
            'purchase',
            ${id}::uuid,
            ${date}::date,
            ${input.note ?? null},
            ${session.appUser.id}::uuid
          )
        `);

        queries.push(tx`
          with inserted as (
            insert into purchases (
              id, reference, date, supplier_id, buyer_id, warehouse_id,
              status, currency, subtotal, discount_amount, tax_amount,
              shipping_amount, total_amount, paid_amount, payment_method,
              shipping_status, note, created_by
            )
            values (
              ${id}::uuid, ${reference}, ${date}::date, ${input.supplierId}::uuid,
              ${buyerId}::uuid, ${input.warehouseId}::uuid, ${input.status},
              ${input.currency}, ${totals.subtotal}, ${totals.discountAmount},
              ${totals.taxAmount}, ${totals.shippingAmount}, ${totals.totalAmount},
              ${paidAmount}, ${input.paymentMethod}, ${input.shippingStatus ?? null},
              ${input.note ?? null}, ${session.appUser.id}::uuid
            )
            returning *
          )
          select
            i.*,
            s.name as supplier_name,
            w.name as warehouse_name,
            u.name as buyer_name
          from inserted i
          join suppliers s on s.id = i.supplier_id
          join warehouses w on w.id = i.warehouse_id
          join app_users u on u.id = i.buyer_id
        `);

        queries.push(tx`
          insert into purchase_items (
            id, purchase_id, product_id, name_snapshot, code_snapshot,
            quantity, unit_price, discount_amount, tax_amount,
            line_total, sort_order
          )
          select
            (item.value ->> 'id')::uuid,
            ${id}::uuid,
            (item.value ->> 'productId')::uuid,
            item.value ->> 'nameSnapshot',
            item.value ->> 'codeSnapshot',
            (item.value ->> 'quantity')::integer,
            (item.value ->> 'unitPrice')::numeric,
            (item.value ->> 'discountAmount')::numeric,
            (item.value ->> 'taxAmount')::numeric,
            (item.value ->> 'lineTotal')::numeric,
            (item.value ->> 'sortOrder')::integer
          from jsonb_array_elements(${JSON.stringify(itemRows)}::jsonb)
            with ordinality as item(value, ord)
          order by item.ord
          returning *
        `);

        if (paymentReference && paymentId) {
          queries.push(tx`
            insert into payments (
              id, reference, direction, source_type, source_id,
              party_type, party_id, method, amount, paid_at, note, created_by
            )
            values (
              ${paymentId}::uuid, ${paymentReference}, 'outgoing', 'purchase', ${id}::uuid,
              'supplier', ${input.supplierId}::uuid, ${input.paymentMethod},
              ${paidAmount}, ${date}::date, ${input.note ?? null},
              ${session.appUser.id}::uuid
            )
          `);
          queries.push(tx`
            insert into payment_allocations (payment_id, target_type, target_id, amount)
            values (${paymentId}::uuid, 'purchase', ${id}::uuid, ${paidAmount})
          `);
        }

        queries.push(
          auditQuery(tx, {
            actorId: session.appUser.id,
            action: "purchase.create",
            entityType: "purchase",
            entityId: id,
            afterData: { ...mappedPurchaseAfter, items: mappedItemsAfter },
            ...requestMeta(request),
          }),
        );

        return queries;
      });
    } catch (error) {
      if (hasErrorCode(error, "23505")) {
        throw conflict("A purchase with that reference already exists. Please retry.");
      }
      if (hasErrorCode(error, "P0001")) {
        throw unprocessable("Stock could not be updated; the purchase was not recorded.");
      }
      throw error;
    }

    const purchaseRow = results[1][0] as PurchaseRow;
    const insertedItems = results[2] as PurchaseItemRow[];
    return ok(
      { ...mapPurchase(purchaseRow), items: insertedItems.map(mapPurchaseItem) },
      201,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
