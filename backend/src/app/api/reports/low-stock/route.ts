import { getSql } from "@/lib/db";
import { failUnexpected, requirePermission } from "@/lib/http";
import {
  money,
  num,
  parseReportFormat,
  parseWarehouseId,
  reportResponse,
} from "@/lib/reports";
import { mapStockStatus } from "@/lib/stock";

export const dynamic = "force-dynamic";

type Row = {
  product_id: string;
  product_code: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity_on_hand: number | string;
  reorder_point: number | string;
  critical_point: number | string;
  average_cost: number | string;
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
        b.product_id,
        p.code as product_code,
        p.name as product_name,
        b.warehouse_id,
        w.name as warehouse_name,
        b.quantity_on_hand,
        b.reorder_point,
        b.critical_point,
        b.average_cost
      from stock_balances b
      join products p on p.id = b.product_id
      join warehouses w on w.id = b.warehouse_id
      where p.deleted_at is null and w.deleted_at is null
    `) as Row[];

    const items = rows
      .filter((row) => !warehouseId || row.warehouse_id === warehouseId)
      .map((row) => {
        const quantityOnHand = num(row.quantity_on_hand);
        const reorderPoint = num(row.reorder_point);
        const criticalPoint = num(row.critical_point);
        const status = mapStockStatus(quantityOnHand, reorderPoint, criticalPoint);
        return {
          productId: row.product_id,
          productCode: row.product_code,
          productName: row.product_name,
          warehouseId: row.warehouse_id,
          warehouseName: row.warehouse_name,
          quantityOnHand,
          reorderPoint,
          criticalPoint,
          status,
          stockValue: money(quantityOnHand * num(row.average_cost)),
        };
      })
      .filter((item) => item.status === "Low Stock" || item.status === "Out of Stock")
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "Out of Stock" ? -1 : 1;
        if (a.quantityOnHand !== b.quantityOnHand) return a.quantityOnHand - b.quantityOnHand;
        return a.productName.localeCompare(b.productName);
      });

    const summary = items.reduce(
      (acc, item) => {
        acc.totalSkus += 1;
        if (item.status === "Low Stock") acc.lowStockSkus += 1;
        if (item.status === "Out of Stock") acc.outOfStockSkus += 1;
        acc.stockValue = money(acc.stockValue + item.stockValue);
        return acc;
      },
      { totalSkus: 0, lowStockSkus: 0, outOfStockSkus: 0, stockValue: 0 },
    );

    return reportResponse(
      { warehouseId: warehouseId ?? null, summary, items },
      items as unknown as Record<string, unknown>[],
      "low-stock",
      format,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
