import { getSql } from "@/lib/db";
import { failUnexpected, requirePermission } from "@/lib/http";
import {
  addAmount,
  bucketDate,
  buildBuckets,
  dateText,
  money,
  num,
  parseGranularity,
  parseReportFormat,
  parseReportRange,
  parseWarehouseId,
  reportResponse,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

type AmountRow = {
  date: string | Date;
  status: string;
  warehouse_id?: string;
  total_amount?: number | string;
  amount?: number | string;
};

function sumValues(map: Map<string, number>): number {
  return money([...map.values()].reduce((sum, value) => sum + value, 0));
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "reports");
    const params = new URL(request.url).searchParams;
    const range = parseReportRange(params);
    const warehouseId = parseWarehouseId(params);
    const format = parseReportFormat(params);
    const granularity = parseGranularity(params);
    const sql = getSql();

    const [salesRows, purchaseRows, saleReturnRows, purchaseReturnRows] =
      await Promise.all([
        sql`
          select date::text as date, status, warehouse_id, total_amount
          from sales
          where date between ${range.start}::date and ${range.end}::date
            and status = 'Completed'
        `,
        sql`
          select date::text as date, status, warehouse_id, total_amount
          from purchases
          where date between ${range.start}::date and ${range.end}::date
            and status = 'Received'
        `,
        sql`
          select date::text as date, status, warehouse_id, amount
          from sale_returns
          where date between ${range.start}::date and ${range.end}::date
            and status = 'Completed'
        `,
        sql`
          select date::text as date, status, warehouse_id, amount
          from purchase_returns
          where date between ${range.start}::date and ${range.end}::date
            and status = 'Completed'
        `,
      ]);

    const sales = new Map<string, number>();
    const purchases = new Map<string, number>();
    const saleReturns = new Map<string, number>();
    const purchaseReturns = new Map<string, number>();

    const included = (row: AmountRow) =>
      !warehouseId || row.warehouse_id === warehouseId;

    for (const raw of salesRows as AmountRow[]) {
      if (!included(raw)) continue;
      addAmount(sales, bucketDate(dateText(raw.date), granularity), num(raw.total_amount));
    }
    for (const raw of purchaseRows as AmountRow[]) {
      if (!included(raw)) continue;
      addAmount(
        purchases,
        bucketDate(dateText(raw.date), granularity),
        num(raw.total_amount),
      );
    }
    for (const raw of saleReturnRows as AmountRow[]) {
      if (!included(raw)) continue;
      addAmount(saleReturns, bucketDate(dateText(raw.date), granularity), num(raw.amount));
    }
    for (const raw of purchaseReturnRows as AmountRow[]) {
      if (!included(raw)) continue;
      addAmount(
        purchaseReturns,
        bucketDate(dateText(raw.date), granularity),
        num(raw.amount),
      );
    }

    const series = buildBuckets(range, granularity).map((bucket) => {
      const saleValue = money(sales.get(bucket) ?? 0);
      const purchaseValue = money(purchases.get(bucket) ?? 0);
      const saleReturnValue = money(saleReturns.get(bucket) ?? 0);
      const purchaseReturnValue = money(purchaseReturns.get(bucket) ?? 0);
      return {
        bucket,
        sales: saleValue,
        purchases: purchaseValue,
        salesReturns: saleReturnValue,
        purchaseReturns: purchaseReturnValue,
        netSales: money(saleValue - saleReturnValue),
        netPurchases: money(purchaseValue - purchaseReturnValue),
      };
    });

    const totals = {
      sales: sumValues(sales),
      purchases: sumValues(purchases),
      salesReturns: sumValues(saleReturns),
      purchaseReturns: sumValues(purchaseReturns),
      netSales: money(sumValues(sales) - sumValues(saleReturns)),
      netPurchases: money(sumValues(purchases) - sumValues(purchaseReturns)),
    };

    return reportResponse(
      { range, granularity, warehouseId: warehouseId ?? null, series, totals },
      series,
      "sales-purchases-trends",
      format,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
