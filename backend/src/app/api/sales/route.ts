import { z } from "zod";
import { auditQuery } from "@/lib/audit";
import { parseDateRange } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import { conflict, isUniqueViolation, unprocessable } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { nextDocumentReference } from "@/lib/numbering";
import { paginate, parsePagination } from "@/lib/pagination";
import { mapSale, mapSaleItem, type SaleItemRow, type SaleRow } from "@/lib/sales";
import { parseSort, sortRows } from "@/lib/sorting";
import {
  assertReferences,
  calculateTotals,
  dateString,
  getUnitCostMap,
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
    customerId: uuid.optional(),
    warehouseId: uuid.optional(),
    status: z.enum(["Completed", "Pending", "Ordered", "Cancelled"]).optional(),
  })
  .strict();

const createSchema = z
  .object({
    customerId: uuid,
    warehouseId: uuid,
    sellerId: uuid.optional(),
    date: dateString.optional(),
    status: z.enum(["Completed", "Pending", "Ordered"]).default("Completed"),
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

export async function GET(request: Request) {
  try {
    await requirePermission(request, "sales");
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
        s.*,
        c.name as customer_name,
        w.name as warehouse_name,
        u.name as seller_name,
        (
          select coalesce(
            json_agg(
              json_build_object(
                'id', si.id,
                'sale_id', si.sale_id,
                'product_id', si.product_id,
                'name_snapshot', si.name_snapshot,
                'code_snapshot', si.code_snapshot,
                'quantity', si.quantity,
                'unit_price', si.unit_price,
                'discount_amount', si.discount_amount,
                'tax_amount', si.tax_amount,
                'line_total', si.line_total,
                'sort_order', si.sort_order,
                'unit_cost', si.unit_cost
              )
              order by si.sort_order
            ),
            '[]'::json
          )
          from sale_items si
          where si.sale_id = s.id
        ) as items
      from sales s
      join customers c on c.id = s.customer_id
      join warehouses w on w.id = s.warehouse_id
      join app_users u on u.id = s.seller_id
      where s.date::text between ${range.start} and ${range.end}
    `) as SaleRow[];

    let items = rows.map(mapSale);
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
    const session = await requirePermission(request, "sales");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    await assertReferences(sql, {
      customerId: input.customerId,
      warehouseId: input.warehouseId,
      userId: input.sellerId ?? session.appUser.id,
    });

    const prepared = await prepareDocumentItems(sql, input.items, "selling_price");
    const belowCost = prepared.find((item) => item.unitPrice < item.costPrice);
    if (belowCost) {
      throw unprocessable(
        `Selling price for ${belowCost.nameSnapshot} cannot be below the cost price.`,
      );
    }
    const unitCosts = await getUnitCostMap(
      sql,
      prepared.map((item) => item.productId),
      input.warehouseId,
    );
    const totals = calculateTotals(
      prepared,
      input.discountAmount,
      input.taxAmount,
      input.shippingAmount,
    );
    const paidAmount = roundMoney(input.paidAmount);
    if (paidAmount > totals.totalAmount) {
      throw unprocessable("Paid amount cannot exceed the sale total.");
    }

    const sellerId = input.sellerId ?? session.appUser.id;
    const id = crypto.randomUUID();
    const date = input.date ?? new Date().toISOString().slice(0, 10);
    const reference = await nextDocumentReference(sql, "sale");
    const paymentReference =
      paidAmount > 0 ? await nextDocumentReference(sql, "payment") : null;
    const paymentId = paymentReference ? crypto.randomUUID() : null;
    const now = new Date().toISOString();
    const itemRows = prepared.map((item) => ({
      id: crypto.randomUUID(),
      sale_id: id,
      ...item,
      unitCost: unitCosts.get(item.productId) ?? 0,
    }));

    const mappedSaleAfter = mapSale({
      id,
      reference,
      date,
      customer_id: input.customerId,
      warehouse_id: input.warehouseId,
      seller_id: sellerId,
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
      mapSaleItem({
        id: item.id,
        sale_id: item.sale_id,
        product_id: item.productId,
        name_snapshot: item.nameSnapshot,
        code_snapshot: item.codeSnapshot,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount,
        tax_amount: item.taxAmount,
        line_total: item.lineTotal,
        sort_order: item.sortOrder,
        unit_cost: item.unitCost,
      }),
    );

    let results: any[][] = [];
    try {
      results = await runTransaction(sql, (tx) => {
        const queries: any[] = [];

        queries.push(tx`
          select adjust_stock_for_document(
            ${input.warehouseId}::uuid,
            ${input.status === "Completed" ? toStockItemsJson(prepared) : "[]"}::jsonb,
            'sale',
            'sale',
            ${id}::uuid,
            ${date}::date,
            ${input.note ?? null},
            ${session.appUser.id}::uuid
          )
        `);

        queries.push(tx`
          with inserted as (
            insert into sales (
              id, reference, date, customer_id, warehouse_id, seller_id,
              status, currency, subtotal, discount_amount, tax_amount,
              shipping_amount, total_amount, paid_amount, payment_method,
              shipping_status, note, created_by
            )
            values (
              ${id}::uuid, ${reference}, ${date}::date, ${input.customerId}::uuid,
              ${input.warehouseId}::uuid, ${sellerId}::uuid, ${input.status},
              ${input.currency}, ${totals.subtotal}, ${totals.discountAmount},
              ${totals.taxAmount}, ${totals.shippingAmount}, ${totals.totalAmount},
              ${paidAmount}, ${input.paymentMethod}, ${input.shippingStatus ?? null},
              ${input.note ?? null}, ${session.appUser.id}::uuid
            )
            returning *
          )
          select
            i.*,
            c.name as customer_name,
            w.name as warehouse_name,
            u.name as seller_name
          from inserted i
          join customers c on c.id = i.customer_id
          join warehouses w on w.id = i.warehouse_id
          join app_users u on u.id = i.seller_id
        `);

        queries.push(tx`
          insert into sale_items (
            id, sale_id, product_id, name_snapshot, code_snapshot,
            quantity, unit_price, discount_amount, tax_amount,
            line_total, sort_order, unit_cost
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
            (item.value ->> 'sortOrder')::integer,
            (item.value ->> 'unitCost')::numeric
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
              ${paymentId}::uuid, ${paymentReference}, 'incoming', 'sale', ${id}::uuid,
              'customer', ${input.customerId}::uuid, ${input.paymentMethod},
              ${paidAmount}, ${date}::date, ${input.note ?? null},
              ${session.appUser.id}::uuid
            )
          `);
          queries.push(tx`
            insert into payment_allocations (payment_id, target_type, target_id, amount)
            values (${paymentId}::uuid, 'sale', ${id}::uuid, ${paidAmount})
          `);
        }

        queries.push(
          auditQuery(tx, {
            actorId: session.appUser.id,
            action: "sale.create",
            entityType: "sale",
            entityId: id,
            afterData: { ...mappedSaleAfter, items: mappedItemsAfter },
            ...requestMeta(request),
          }),
        );

        return queries;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict("A sale with that reference already exists. Please retry.");
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P0001"
      ) {
        throw unprocessable("Insufficient stock; the sale was not recorded.");
      }
      throw error;
    }

    const saleRow = results[1][0] as SaleRow;
    const insertedItems = results[2] as SaleItemRow[];
    return ok(
      { ...mapSale(saleRow), items: insertedItems.map(mapSaleItem) },
      201,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
