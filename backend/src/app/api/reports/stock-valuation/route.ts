import { getSql } from "@/lib/db";
import { failUnexpected, requirePermission } from "@/lib/http";
import {
  money,
  num,
  parseReportFormat,
  parseWarehouseId,
  reportResponse,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

type Row = {
  warehouse_id: string;
  warehouse_name: string;
  quantity_on_hand: number | string;
  average_cost: number | string;
  selling_price: number | string;
};

export async function GET(request: Request) {
  try {
    await requirePermission(request, "reports");
    const params = new URL(request.url).searchParams;
    const warehouseId = parseWarehouseId(params);
    const format = parseReportFormat(params);
    const sql = getSql();

    const rows = (await sql`
      select
        b.warehouse_id,
        w.name as warehouse_name,
        b.quantity_on_hand,
        b.average_cost,
        p.selling_price
      from stock_balances b
      join products p on p.id = b.product_id
      join warehouses w on w.id = b.warehouse_id
      where p.deleted_at is null and w.deleted_at is null
    `) as Row[];

    const filtered = warehouseId
      ? rows.filter((row) => row.warehouse_id === warehouseId)
      : rows;

    const byWarehouse = new Map<
      string,
      {
        warehouseId: string;
        warehouseName: string;
        skuCount: number;
        quantityOnHand: number;
        costValue: number;
        retailValue: number;
      }
    >();

    for (const row of filtered) {
      const current = byWarehouse.get(row.warehouse_id) ?? {
        warehouseId: row.warehouse_id,
        warehouseName: row.warehouse_name,
        skuCount: 0,
        quantityOnHand: 0,
        costValue: 0,
        retailValue: 0,
      };
      const qty = num(row.quantity_on_hand);
      current.skuCount += 1;
      current.quantityOnHand += qty;
      current.costValue = money(current.costValue + qty * num(row.average_cost));
      current.retailValue = money(current.retailValue + qty * num(row.selling_price));
      byWarehouse.set(row.warehouse_id, current);
    }

    const warehouses = [...byWarehouse.values()].sort((a, b) => b.costValue - a.costValue);
    const totals = warehouses.reduce(
      (acc, row) => ({
        skuCount: acc.skuCount + row.skuCount,
        quantityOnHand: acc.quantityOnHand + row.quantityOnHand,
        costValue: money(acc.costValue + row.costValue),
        retailValue: money(acc.retailValue + row.retailValue),
      }),
      { skuCount: 0, quantityOnHand: 0, costValue: 0, retailValue: 0 },
    );

    return reportResponse(
      { warehouseId: warehouseId ?? null, totals, warehouses },
      warehouses as unknown as Record<string, unknown>[],
      "stock-valuation",
      format,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
