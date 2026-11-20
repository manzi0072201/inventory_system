import { z } from "zod";
import { getSql } from "@/lib/db";
import { failUnexpected, ok, requirePermission } from "@/lib/http";
import { paginate, parsePagination } from "@/lib/pagination";
import { mapStockStatus, type StockStatus } from "@/lib/stock";
import { parseSort, sortRows } from "@/lib/sorting";
import { parseQuery, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const listSchema = z
  .object({
    productId: uuid.optional(),
    warehouseId: uuid.optional(),
    status: z
      .enum(["In Stock", "Low Stock", "Out of Stock", "Not Stocked"])
      .optional(),
  })
  .strict();

type BalanceRow = {
  product_id: string;
  warehouse_id: string;
  quantity_on_hand: number | string;
  reorder_point: number | string;
  critical_point: number | string;
  average_cost: number | string;
  product_code: string;
  product_name: string;
  warehouse_code: string;
  warehouse_name: string;
};

function mapBalance(row: BalanceRow) {
  const quantityOnHand = Number(row.quantity_on_hand);
  const reorderPoint = Number(row.reorder_point);
  const criticalPoint = Number(row.critical_point);
  return {
    productId: row.product_id,
    productCode: row.product_code,
    productName: row.product_name,
    warehouseId: row.warehouse_id,
    warehouseCode: row.warehouse_code,
    warehouseName: row.warehouse_name,
    quantityOnHand,
    reorderPoint,
    criticalPoint,
    averageCost: Number(row.average_cost),
    status: mapStockStatus(quantityOnHand, reorderPoint, criticalPoint) as StockStatus,
  };
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "stock");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const sort = parseSort(
      params,
      ["productName", "warehouseName", "quantityOnHand", "reorderPoint", "status"],
      "productName",
      "asc",
    );

    const rows = (await sql`
      select
        b.product_id,
        b.warehouse_id,
        b.quantity_on_hand,
        b.reorder_point,
        b.critical_point,
        b.average_cost,
        p.code as product_code,
        p.name as product_name,
        w.code as warehouse_code,
        w.name as warehouse_name
      from stock_balances b
      join products p on p.id = b.product_id
      join warehouses w on w.id = b.warehouse_id
      where p.deleted_at is null and w.deleted_at is null
    `) as BalanceRow[];

    let items = rows.map(mapBalance);
    if (query.productId) items = items.filter((item) => item.productId === query.productId);
    if (query.warehouseId) items = items.filter((item) => item.warehouseId === query.warehouseId);
    if (query.status) items = items.filter((item) => item.status === query.status);

    const result = paginate(sortRows(items, sort), pagination);
    return ok(result.rows, 200, { pagination: result.meta });
  } catch (error) {
    return failUnexpected(error);
  }
}
