import { z } from "zod";
import { parseDateRange, toIsoString } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import { failUnexpected, ok, requirePermission } from "@/lib/http";
import { paginate, parsePagination } from "@/lib/pagination";
import { parseSort, sortRows } from "@/lib/sorting";
import { parseQuery, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const listSchema = z
  .object({
    productId: uuid.optional(),
    warehouseId: uuid.optional(),
    movementType: z
      .enum(["purchase", "sale", "adjustment", "transfer", "sale_return", "purchase_return"])
      .optional(),
  })
  .strict();

type MovementRow = {
  id: string;
  product_id: string;
  warehouse_id: string;
  product_code: string;
  product_name: string;
  warehouse_code: string;
  warehouse_name: string;
  movement_type: string;
  quantity_delta: number | string;
  balance_after: number | string | null;
  reference_type: string | null;
  reference_id: string | null;
  occurred_at: unknown;
  note: string | null;
  created_at: unknown;
};

function mapMovement(row: MovementRow) {
  return {
    id: row.id,
    productId: row.product_id,
    productCode: row.product_code,
    productName: row.product_name,
    warehouseId: row.warehouse_id,
    warehouseCode: row.warehouse_code,
    warehouseName: row.warehouse_name,
    movementType: row.movement_type,
    quantityDelta: Number(row.quantity_delta),
    balanceAfter: row.balance_after === null ? null : Number(row.balance_after),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    occurredAt: toIsoString(row.occurred_at),
    note: row.note,
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
    const sort = parseSort(
      params,
      ["occurredAt", "productName", "warehouseName", "movementType", "quantityDelta"],
      "occurredAt",
      "desc",
    );

    const rows = (await sql`
      select
        m.id,
        m.product_id,
        m.warehouse_id,
        p.code as product_code,
        p.name as product_name,
        w.code as warehouse_code,
        w.name as warehouse_name,
        m.movement_type,
        m.quantity_delta,
        m.balance_after,
        m.reference_type,
        m.reference_id,
        m.occurred_at::text as occurred_at,
        m.note,
        m.created_at
      from stock_movements m
      join products p on p.id = m.product_id
      join warehouses w on w.id = m.warehouse_id
      where m.occurred_at::text between ${range.start} and ${range.end}
        and p.deleted_at is null and w.deleted_at is null
    `) as MovementRow[];

    let items = rows.map(mapMovement);
    if (query.productId) items = items.filter((item) => item.productId === query.productId);
    if (query.warehouseId) items = items.filter((item) => item.warehouseId === query.warehouseId);
    if (query.movementType) items = items.filter((item) => item.movementType === query.movementType);

    const result = paginate(sortRows(items, sort), pagination);
    return ok(result.rows, 200, {
      pagination: result.meta,
      dateRange: range,
    });
  } catch (error) {
    return failUnexpected(error);
  }
}
