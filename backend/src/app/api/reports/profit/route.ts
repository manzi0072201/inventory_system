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

type SaleRow = {
  date: string | Date;
  warehouse_id: string;
  total_amount: number | string;
  cogs: number | string | null;
};

type SaleReturnRow = {
  date: string | Date;
  warehouse_id: string;
  amount: number | string;
  restock: boolean;
  cogs: number | string | null;
};

type ExpenseRow = {
  date: string | Date;
  amount: number | string;
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

    const [saleRows, returnRows, expenseRows, unpricedRows] = await Promise.all([
      sql`
        select
          s.date::text as date,
          s.warehouse_id,
          s.total_amount,
          (
            select coalesce(sum(si.quantity * si.unit_cost), 0)
            from sale_items si
            where si.sale_id = s.id
          ) as cogs
        from sales s
        where s.date between ${range.start}::date and ${range.end}::date
          and s.status = 'Completed'
      `,
      sql`
        select
          sr.date::text as date,
          sr.warehouse_id,
          sr.amount,
          sr.restock,
          (
            select coalesce(sum(ri.quantity * ri.unit_cost), 0)
            from sale_return_items ri
            where ri.sale_return_id = sr.id
          ) as cogs
        from sale_returns sr
        where sr.date between ${range.start}::date and ${range.end}::date
          and sr.status <> 'Rejected'
      `,
      sql`
        select date::text as date, amount
        from expenses
        where date between ${range.start}::date and ${range.end}::date
          and status <> 'Cancelled'
      `,
      sql`
        select
          (select count(*)::int from sale_items si join sales s on s.id = si.sale_id where s.date between ${range.start}::date and ${range.end}::date and s.status = 'Completed' and si.unit_cost = 0) as sale_items,
          (select count(*)::int from sale_return_items ri join sale_returns sr on sr.id = ri.sale_return_id where sr.date between ${range.start}::date and ${range.end}::date and sr.status <> 'Rejected' and ri.unit_cost = 0) as return_items
      `,
    ]);

    const included = (row: { warehouse_id: string }) =>
      !warehouseId || row.warehouse_id === warehouseId;

    const sales = new Map<string, number>();
    const salesReturns = new Map<string, number>();
    const cogs = new Map<string, number>();
    const returnedCogs = new Map<string, number>();
    const expenses = new Map<string, number>();

    for (const raw of saleRows as SaleRow[]) {
      if (!included(raw)) continue;
      const key = bucketDate(dateText(raw.date), granularity);
      addAmount(sales, key, num(raw.total_amount));
      addAmount(cogs, key, num(raw.cogs));
    }
    for (const raw of returnRows as SaleReturnRow[]) {
      if (!included(raw)) continue;
      const key = bucketDate(dateText(raw.date), granularity);
      addAmount(salesReturns, key, num(raw.amount));
      if (raw.restock) addAmount(returnedCogs, key, num(raw.cogs));
    }
    for (const raw of expenseRows as ExpenseRow[]) {
      addAmount(expenses, bucketDate(dateText(raw.date), granularity), num(raw.amount));
    }

    const series = buildBuckets(range, granularity).map((bucket) => {
      const saleValue = money(sales.get(bucket) ?? 0);
      const returnValue = money(salesReturns.get(bucket) ?? 0);
      const cogsValue = money(cogs.get(bucket) ?? 0);
      const returnedCogsValue = money(returnedCogs.get(bucket) ?? 0);
      const expenseValue = money(expenses.get(bucket) ?? 0);
      const netSales = money(saleValue - returnValue);
      const netCogs = money(cogsValue - returnedCogsValue);
      const grossProfit = money(netSales - netCogs);
      return {
        bucket,
        sales: saleValue,
        salesReturns: returnValue,
        cogs: cogsValue,
        returnedCogs: returnedCogsValue,
        netCogs,
        expenses: expenseValue,
        netSales,
        grossProfit,
        netProfit: money(grossProfit - expenseValue),
      };
    });

    const totalSales = sumValues(sales);
    const totalSalesReturns = sumValues(salesReturns);
    const totalCogs = sumValues(cogs);
    const totalReturnedCogs = sumValues(returnedCogs);
    const totalExpenses = sumValues(expenses);
    const netSales = money(totalSales - totalSalesReturns);
    const netCogs = money(totalCogs - totalReturnedCogs);
    const grossProfit = money(netSales - netCogs);
    const netProfit = money(grossProfit - totalExpenses);
    const unpriced = (unpricedRows as { sale_items: number; return_items: number }[])[0];

    const totals = {
      sales: totalSales,
      salesReturns: totalSalesReturns,
      netSales,
      cogs: totalCogs,
      returnedCogs: totalReturnedCogs,
      netCogs,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      grossMargin: netSales === 0 ? 0 : money((grossProfit / netSales) * 10000) / 10000,
      netMargin: netSales === 0 ? 0 : money((netProfit / netSales) * 10000) / 10000,
    };

    return reportResponse(
      {
        range,
        granularity,
        warehouseId: warehouseId ?? null,
        basis: "sale_item_cost_snapshots",
        unpricedSaleItems: unpriced?.sale_items ?? 0,
        unpricedReturnItems: unpriced?.return_items ?? 0,
        series,
        totals,
      },
      series.map((row) => ({
        bucket: row.bucket,
        sales: row.sales,
        salesReturns: row.salesReturns,
        cogs: row.cogs,
        returnedCogs: row.returnedCogs,
        netCogs: row.netCogs,
        grossProfit: row.grossProfit,
        expenses: row.expenses,
        netProfit: row.netProfit,
      })),
      "profit",
      format,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
