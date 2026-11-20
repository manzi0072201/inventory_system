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

type CustomerSourceRow = {
  customer_id: string;
  name: string | null;
  warehouse_id?: string;
  total_amount?: number | string;
  amount?: number | string;
};

type CustomerAggregate = {
  customerId: string;
  name: string;
  sales: number;
  returns: number;
  payments: number;
  saleCount: number;
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

    const [salesRows, returnRows, paymentRows] = await Promise.all([
      sql`
        select s.customer_id, c.name, s.warehouse_id, s.total_amount
        from sales s
        join customers c on c.id = s.customer_id
        where s.date between ${range.start}::date and ${range.end}::date
          and s.status = 'Completed'
          and c.deleted_at is null
      `,
      sql`
        select r.customer_id, c.name, r.warehouse_id, r.amount
        from sale_returns r
        join customers c on c.id = r.customer_id
        where r.date between ${range.start}::date and ${range.end}::date
          and r.status = 'Completed'
          and c.deleted_at is null
      `,
      sql`
        select p.party_id, c.name, p.amount
        from payments p
        left join customers c on c.id = p.party_id and c.deleted_at is null
        where p.party_type = 'customer'
          and p.direction = 'incoming'
          and p.paid_at::date between ${range.start}::date and ${range.end}::date
          and c.id is not null
      `,
    ]);

    const aggregates = new Map<string, CustomerAggregate>();

    const getOrCreate = (id: string, name: string | null): CustomerAggregate => {
      let entry = aggregates.get(id);
      if (!entry) {
        entry = {
          customerId: id,
          name: name ?? "",
          sales: 0,
          returns: 0,
          payments: 0,
          saleCount: 0,
        };
        aggregates.set(id, entry);
      } else if (!entry.name && name) {
        entry.name = name;
      }
      return entry;
    };

    for (const raw of salesRows as CustomerSourceRow[]) {
      if (warehouseId && raw.warehouse_id !== warehouseId) continue;
      const entry = getOrCreate(raw.customer_id, raw.name);
      entry.sales += num(raw.total_amount);
      entry.saleCount += 1;
    }
    for (const raw of returnRows as CustomerSourceRow[]) {
      if (warehouseId && raw.warehouse_id !== warehouseId) continue;
      const entry = getOrCreate(raw.customer_id, raw.name);
      entry.returns += num(raw.amount);
    }
    if (!warehouseId) {
      for (const raw of paymentRows as { party_id: string; name: string | null; amount: number | string }[]) {
        const entry = getOrCreate(raw.party_id, raw.name);
        entry.payments += num(raw.amount);
      }
    }

    const customers = [...aggregates.values()]
      .map((entry) => ({
        customerId: entry.customerId,
        name: entry.name,
        sales: money(entry.sales),
        returns: money(entry.returns),
        payments: money(entry.payments),
        balance: money(entry.sales - entry.returns - entry.payments),
        saleCount: entry.saleCount,
      }))
      .sort((a, b) => b.sales - a.sales || a.name.localeCompare(b.name))
      .slice(0, limit);

    const totals = {
      sales: money(customers.reduce((sum, customer) => sum + customer.sales, 0)),
      returns: money(customers.reduce((sum, customer) => sum + customer.returns, 0)),
      payments: money(customers.reduce((sum, customer) => sum + customer.payments, 0)),
      balance: money(customers.reduce((sum, customer) => sum + customer.balance, 0)),
      customers: customers.length,
    };

    return reportResponse(
      {
        range,
        warehouseId: warehouseId ?? null,
        limit,
        paymentScope: warehouseId ? "excluded" : "range",
        customers,
        totals,
      },
      customers,
      "top-customers",
      format,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
