import { getSql } from "@/lib/db";
import { failUnexpected, requirePermission } from "@/lib/http";
import {
  money,
  num,
  parseReportFormat,
  parseReportRange,
  parseWarehouseId,
  reportResponse,
} from "@/lib/reports";
import { mapStockStatus } from "@/lib/stock";

export const dynamic = "force-dynamic";

type SalesRow = {
  status: string;
  warehouse_id: string;
  total_amount: number | string;
};

type PurchaseRow = {
  status: string;
  warehouse_id: string;
  total_amount: number | string;
};

type ReturnRow = {
  status: string;
  warehouse_id: string;
  amount: number | string;
};

type ExpenseRow = {
  status: string;
  amount: number | string;
};

type PaymentRow = {
  direction: string;
  amount: number | string;
};

type StockRow = {
  warehouse_id: string;
  quantity_on_hand: number | string;
  reorder_point: number | string;
  critical_point: number | string;
  average_cost: number | string;
};

type CustomerBalanceRow = {
  balance: number | string;
};

type SupplierBalanceRow = {
  balance: number | string;
};

export async function GET(request: Request) {
  try {
    await requirePermission(request, "reports");
    const params = new URL(request.url).searchParams;
    const range = parseReportRange(params);
    const warehouseId = parseWarehouseId(params);
    const format = parseReportFormat(params);
    const sql = getSql();
    const asOf = range.end;

    const [
      salesRows,
      purchaseRows,
      saleReturnRows,
      expenseRows,
      paymentRows,
      stockRows,
      customerRows,
      supplierRows,
    ] = await Promise.all([
      sql`
        select status, warehouse_id, total_amount
        from sales
        where date between ${range.start}::date and ${range.end}::date
          and status = 'Completed'
      `,
      sql`
        select status, warehouse_id, total_amount
        from purchases
        where date between ${range.start}::date and ${range.end}::date
          and status = 'Received'
      `,
      sql`
        select status, warehouse_id, amount
        from sale_returns
        where date between ${range.start}::date and ${range.end}::date
          and status = 'Completed'
      `,
      sql`
        select status, amount
        from expenses
        where date between ${range.start}::date and ${range.end}::date
          and status <> 'Cancelled'
      `,
      sql`
        select direction, amount
        from payments
        where paid_at between ${range.start}::date and ${range.end}::date
      `,
      sql`
        select
          b.warehouse_id,
          b.quantity_on_hand,
          b.reorder_point,
          b.critical_point,
          b.average_cost
        from stock_balances b
        join products p on p.id = b.product_id
        join warehouses w on w.id = b.warehouse_id
        where p.deleted_at is null and w.deleted_at is null
      `,
      sql`
        select
          coalesce(c.opening_balance, 0)
            + coalesce((
              select sum(s.total_amount)
              from sales s
              where s.customer_id = c.id
                and s.status = 'Completed'
                and s.date <= ${asOf}::date
            ), 0)
            - coalesce((
              select sum(p.amount)
              from payments p
              where p.party_type = 'customer'
                and p.party_id = c.id
                and p.direction = 'incoming'
                and p.paid_at <= ${asOf}::date
            ), 0)
            - coalesce((
              select sum(r.amount)
              from sale_returns r
              where r.customer_id = c.id
                and r.status = 'Completed'
                and r.date <= ${asOf}::date
            ), 0) as balance
        from customers c
        where c.deleted_at is null
      `,
      sql`
        select
          coalesce(s.opening_balance, 0)
            + coalesce((
              select sum(p.total_amount)
              from purchases p
              where p.supplier_id = s.id
                and p.status = 'Received'
                and p.date <= ${asOf}::date
            ), 0)
            - coalesce((
              select sum(pay.amount)
              from payments pay
              where pay.party_type = 'supplier'
                and pay.party_id = s.id
                and pay.direction = 'outgoing'
                and pay.paid_at <= ${asOf}::date
            ), 0)
            - coalesce((
              select sum(r.amount)
              from purchase_returns r
              where r.supplier_id = s.id
                and r.status = 'Completed'
                and r.date <= ${asOf}::date
            ), 0) as balance
        from suppliers s
        where s.deleted_at is null
      `,
    ]);

    const matchWarehouse = (row: { warehouse_id: string }) =>
      !warehouseId || row.warehouse_id === warehouseId;

    const sales = money(
      (salesRows as SalesRow[])
        .filter(matchWarehouse)
        .reduce((sum, row) => sum + num(row.total_amount), 0),
    );
    const salesReturns = money(
      (saleReturnRows as ReturnRow[])
        .filter(matchWarehouse)
        .reduce((sum, row) => sum + num(row.amount), 0),
    );
    const purchases = money(
      (purchaseRows as PurchaseRow[])
        .filter(matchWarehouse)
        .reduce((sum, row) => sum + num(row.total_amount), 0),
    );
    const expenses = money(
      (expenseRows as ExpenseRow[]).reduce((sum, row) => sum + num(row.amount), 0),
    );

    let paymentsIn = 0;
    let paymentsOut = 0;
    for (const row of paymentRows as PaymentRow[]) {
      if (row.direction === "incoming") paymentsIn += num(row.amount);
      if (row.direction === "outgoing") paymentsOut += num(row.amount);
    }

    const stockItems = (stockRows as StockRow[]).filter(matchWarehouse);
    let stockValue = 0;
    let lowStockSkus = 0;
    for (const row of stockItems) {
      const qty = num(row.quantity_on_hand);
      stockValue += qty * num(row.average_cost);
      const status = mapStockStatus(
        qty,
        num(row.reorder_point),
        num(row.critical_point),
      );
      if (status === "Low Stock" || status === "Out of Stock") lowStockSkus += 1;
    }

    const debtors = money(
      (customerRows as CustomerBalanceRow[])
        .map((row) => num(row.balance))
        .filter((balance) => balance > 0)
        .reduce((sum, balance) => sum + balance, 0),
    );
    const creditors = money(
      (supplierRows as SupplierBalanceRow[])
        .map((row) => num(row.balance))
        .filter((balance) => balance > 0)
        .reduce((sum, balance) => sum + balance, 0),
    );

    const kpis = {
      sales,
      salesReturns,
      netSales: money(sales - salesReturns),
      purchases,
      expenses,
      paymentsIn: money(paymentsIn),
      paymentsOut: money(paymentsOut),
      stockValue: money(stockValue),
      lowStockSkus,
      debtors,
      creditors,
    };

    return reportResponse(
      {
        range,
        warehouseId: warehouseId ?? null,
        scope: {
          warehouseScoped: warehouseId
            ? ["sales", "salesReturns", "purchases", "stockValue", "lowStockSkus"]
            : [],
          global: ["expenses", "paymentsIn", "paymentsOut", "debtors", "creditors"],
        },
        kpis,
      },
      [kpis] as Record<string, unknown>[],
      "dashboard",
      format,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
