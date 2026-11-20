import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { parseDateRange, toDateOnlyString, toIsoString } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import { badRequest, unprocessable } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { nextDocumentReference } from "@/lib/numbering";
import { paginate, parsePagination } from "@/lib/pagination";
import { parseJson, parseQuery, parseUuid, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const reasonEnum = z.enum(["Stock count", "Damaged", "Returned", "Transfer", "Other"]);

const createSchema = z
  .object({
    productId: uuid,
    warehouseId: uuid,
    quantityDelta: z
      .number()
      .int()
      .refine((value) => value !== 0, "Quantity delta cannot be zero."),
    reason: reasonEnum,
    date: dateString.optional(),
    note: z.string().trim().max(1000).nullish(),
  })
  .strict();

const listSchema = z
  .object({
    productId: uuid.optional(),
    warehouseId: uuid.optional(),
    reason: reasonEnum.optional(),
  })
  .strict();

type AdjustmentRow = {
  id: string;
  reference: string;
  date: unknown;
  product_id: string;
  warehouse_id: string;
  quantity_delta: number | string;
  reason: string;
  note: string | null;
  created_by: string | null;
  created_at: unknown;
  product_code: string;
  product_name: string;
  warehouse_code: string;
  warehouse_name: string;
  balance_after: number | string;
};

function mapAdjustment(row: AdjustmentRow) {
  return {
    id: row.id,
    reference: row.reference,
    date: toDateOnlyString(row.date),
    productId: row.product_id,
    productCode: row.product_code,
    productName: row.product_name,
    warehouseId: row.warehouse_id,
    warehouseCode: row.warehouse_code,
    warehouseName: row.warehouse_name,
    quantityDelta: Number(row.quantity_delta),
    balanceAfter: Number(row.balance_after),
    reason: row.reason,
    note: row.note,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
  };
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "stock");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const range = parseDateRange(params);

    const rows = (await sql`
      select
        a.*,
        p.code as product_code,
        p.name as product_name,
        w.code as warehouse_code,
        w.name as warehouse_name,
        coalesce(mv.balance_after, 0) as balance_after
      from stock_adjustments a
      join products p on p.id = a.product_id
      join warehouses w on w.id = a.warehouse_id
      left join stock_movements mv
        on mv.reference_id = a.id and mv.reference_type = 'stock_adjustment'
      where a.date::text between ${range.start} and ${range.end}
        and p.deleted_at is null and w.deleted_at is null
      order by a.date desc, a.created_at desc
    `) as AdjustmentRow[];

    let items = rows.map(mapAdjustment);
    if (query.productId) items = items.filter((item) => item.productId === query.productId);
    if (query.warehouseId) items = items.filter((item) => item.warehouseId === query.warehouseId);
    if (query.reason) items = items.filter((item) => item.reason === query.reason);

    const result = paginate(items, pagination);
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
    const session = await requirePermission(request, "stock");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    const products = (await sql`
      select id from products
      where id = ${input.productId}::uuid and deleted_at is null
    `) as { id: string }[];
    if (!products[0]) throw badRequest("The selected product does not exist.");

    const warehouses = (await sql`
      select id from warehouses
      where id = ${input.warehouseId}::uuid and deleted_at is null
    `) as { id: string }[];
    if (!warehouses[0]) throw badRequest("The selected warehouse does not exist.");

    const id = crypto.randomUUID();
    const date = input.date ?? new Date().toISOString().slice(0, 10);
    const reference = await nextDocumentReference(sql, "stock_adjustment");

    const rows = (await sql`
      with balance_update as (
        update stock_balances
        set quantity_on_hand = quantity_on_hand + ${input.quantityDelta}, updated_at = now()
        where product_id = ${input.productId}::uuid
          and warehouse_id = ${input.warehouseId}::uuid
          and quantity_on_hand + ${input.quantityDelta} >= 0
        returning quantity_on_hand
      ),
      balance_insert as (
        insert into stock_balances (product_id, warehouse_id, quantity_on_hand)
        select ${input.productId}::uuid, ${input.warehouseId}::uuid, ${input.quantityDelta}
        where not exists (
          select 1 from stock_balances
          where product_id = ${input.productId}::uuid
            and warehouse_id = ${input.warehouseId}::uuid
        )
          and ${input.quantityDelta} > 0
        returning quantity_on_hand
      ),
      final_balance as (
        select quantity_on_hand from balance_update
        union all
        select quantity_on_hand from balance_insert
        limit 1
      ),
      movement as (
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
        select
          ${input.productId}::uuid,
          ${input.warehouseId}::uuid,
          'adjustment',
          ${input.quantityDelta},
          (select quantity_on_hand from final_balance),
          'stock_adjustment',
          ${id}::uuid,
          ${date}::date,
          ${input.note ?? null},
          ${session.appUser.id}::uuid
        where exists (select 1 from final_balance)
        returning id
      ),
      adjustment as (
        insert into stock_adjustments (
          id,
          reference,
          date,
          product_id,
          warehouse_id,
          quantity_delta,
          reason,
          note,
          created_by
        )
        select
          ${id}::uuid,
          ${reference},
          ${date}::date,
          ${input.productId}::uuid,
          ${input.warehouseId}::uuid,
          ${input.quantityDelta},
          ${input.reason},
          ${input.note ?? null},
          ${session.appUser.id}::uuid
        where exists (select 1 from final_balance)
        returning *
      )
      select
        a.*,
        p.code as product_code,
        p.name as product_name,
        w.code as warehouse_code,
        w.name as warehouse_name,
        fb.quantity_on_hand as balance_after
      from adjustment a
      join products p on p.id = a.product_id
      join warehouses w on w.id = a.warehouse_id
      cross join final_balance fb
    `) as AdjustmentRow[];

    if (!rows[0]) {
      throw unprocessable(
        "Insufficient stock; the adjustment was not recorded.",
      );
    }

    const adjustment = mapAdjustment(rows[0]);
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "stock.adjustment.create",
      entityType: "stock_adjustment",
      entityId: adjustment.id,
      afterData: adjustment,
      ...requestMeta(request),
    });
    return ok(adjustment, 201);
  } catch (error) {
    return failUnexpected(error);
  }
}
