import { getSql } from "@/lib/db";
import { failUnexpected, requirePermission } from "@/lib/http";
import {
  money,
  num,
  parseAsOfDate,
  parseLimit,
  parseReportFormat,
  reportResponse,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

type CustomerRow = {
  id: string;
  name: string;
  credit_limit: number | string | null;
  opening_balance: number | string;
  balance: number | string;
};

type SupplierRow = {
  id: string;
  name: string;
  credit_limit: number | string | null;
  opening_balance: number | string;
  balance: number | string;
};

export async function GET(request: Request) {
  try {
    await requirePermission(request, "reports");
    const params = new URL(request.url).searchParams;
    const format = parseReportFormat(params);
    const limit = parseLimit(params, 50, 200);
    const asOf = parseAsOfDate(params, new Date().toISOString().slice(0, 10));
    const sql = getSql();

    const [customerRows, supplierRows] = await Promise.all([
      sql`
        select
          c.id,
          c.name,
          c.credit_limit,
          c.opening_balance,
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
          s.id,
          s.name,
          s.credit_limit,
          s.opening_balance,
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

    const debtors = (customerRows as CustomerRow[])
      .map((row) => {
        const balance = money(num(row.balance));
        return {
          type: "customer" as const,
          partyId: row.id,
          name: row.name,
          balance,
          dueAmount: balance,
          creditLimit: num(row.credit_limit),
        };
      })
      .filter((row) => row.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);

    const creditors = (supplierRows as SupplierRow[])
      .map((row) => {
        const balance = money(num(row.balance));
        return {
          type: "supplier" as const,
          partyId: row.id,
          name: row.name,
          balance,
          dueAmount: balance,
          creditLimit: num(row.credit_limit),
        };
      })
      .filter((row) => row.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);

    const totals = {
      debtors: money(debtors.reduce((sum, row) => sum + row.balance, 0)),
      creditors: money(creditors.reduce((sum, row) => sum + row.balance, 0)),
      debtorCount: debtors.length,
      creditorCount: creditors.length,
    };

    return reportResponse(
      { asOf, limit, debtors, creditors, totals },
      [...debtors, ...creditors] as unknown as Record<string, unknown>[],
      "debtors-creditors",
      format,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
