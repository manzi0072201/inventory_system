import { getSql } from "@/lib/db";
import { failUnexpected, requirePermission } from "@/lib/http";
import {
  money,
  num,
  parseLimit,
  parseReportFormat,
  parseReportRange,
  parseWarehouseId,
  reportResponse,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

type SaleItemSourceRow = {
  sale_id: string;
  product_id: string;
  name_snapshot: string;
  code_snapshot: string;
  warehouse_id: string;
  quantity: number | string;
  line_total: number | string;
};

type ProductAggregate = {
  productId: string;
  code: string;
  name: string;
  quantitySold: number;
  revenue: number;
  saleIds: Set<string>;
};

export async function GET(request: Request) {
  try {
    await requirePermission(request, "reports");
    const params = new URL(request.url).searchParams;
    const range = parseReportRange(params);
    const warehouseId = parseWarehouseId(params);
    const format = parseReportFormat(params);
    const limit = parseLimit(params, 10, 100);
    const sql = getSql();

    const rows = (await sql`
      select
        si.sale_id,
        si.product_id,
        si.name_snapshot,
        si.code_snapshot,
        s.warehouse_id,
        si.quantity,
        si.line_total
      from sale_items si
      join sales s on s.id = si.sale_id
      where s.date between ${range.start}::date and ${range.end}::date
        and s.status = 'Completed'
    `) as SaleItemSourceRow[];

    const aggregates = new Map<string, ProductAggregate>();

    for (const raw of rows) {
      if (warehouseId && raw.warehouse_id !== warehouseId) continue;
      const key = `${raw.product_id}\u0000${raw.name_snapshot}\u0000${raw.code_snapshot}`;
      let entry = aggregates.get(key);
      if (!entry) {
        entry = {
          productId: raw.product_id,
          code: raw.code_snapshot,
          name: raw.name_snapshot,
          quantitySold: 0,
          revenue: 0,
          saleIds: new Set<string>(),
        };
        aggregates.set(key, entry);
      }
      entry.quantitySold += num(raw.quantity);
      entry.revenue += num(raw.line_total);
      entry.saleIds.add(raw.sale_id);
    }

    const products = [...aggregates.values()]
      .map((entry) => ({
        productId: entry.productId,
        code: entry.code,
        name: entry.name,
        quantitySold: entry.quantitySold,
        revenue: money(entry.revenue),
        averagePrice: entry.quantitySold ? money(entry.revenue / entry.quantitySold) : 0,
        saleCount: entry.saleIds.size,
      }))
      .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name))
      .slice(0, limit);

    const totals = {
      quantitySold: products.reduce((sum, product) => sum + product.quantitySold, 0),
      revenue: money(products.reduce((sum, product) => sum + product.revenue, 0)),
      products: products.length,
    };

    return reportResponse(
      { range, warehouseId: warehouseId ?? null, limit, products, totals },
      products,
      "top-products",
      format,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
