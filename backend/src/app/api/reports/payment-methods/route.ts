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
import { paymentMethod } from "@/lib/transactions";

export const dynamic = "force-dynamic";

type PaymentRow = {
  method: string;
  direction: string;
  amount: number | string;
  count: number | string;
};

export async function GET(request: Request) {
  try {
    await requirePermission(request, "reports");
    const params = new URL(request.url).searchParams;
    const range = parseReportRange(params);
    const format = parseReportFormat(params);
    const warehouseId = parseWarehouseId(params);
    const sql = getSql();

    const rows = (warehouseId
      ? await sql`
          select
            p.method,
            p.direction,
            count(distinct p.id)::int as count,
            coalesce(sum(pa.amount), 0) as amount
          from payment_allocations pa
          join payments p on p.id = pa.payment_id
          left join sales s on pa.target_type = 'sale' and s.id = pa.target_id
          left join purchases pu on pa.target_type = 'purchase' and pu.id = pa.target_id
          left join sale_returns sr on pa.target_type = 'sale_return' and sr.id = pa.target_id
          left join purchase_returns pr on pa.target_type = 'purchase_return' and pr.id = pa.target_id
          where p.paid_at::date between ${range.start}::date and ${range.end}::date
            and coalesce(s.warehouse_id, pu.warehouse_id, sr.warehouse_id, pr.warehouse_id) = ${warehouseId}::uuid
          group by p.method, p.direction
        `
      : await sql`
          select
            method,
            direction,
            count(*)::int as count,
            coalesce(sum(amount), 0) as amount
          from payments
          where paid_at::date between ${range.start}::date and ${range.end}::date
          group by method, direction
        `) as PaymentRow[];

    const byMethod = new Map<
      string,
      { method: string; incoming: number; outgoing: number; total: number; net: number; count: number }
    >();

    for (const option of paymentMethod.options) {
      byMethod.set(option, {
        method: option,
        incoming: 0,
        outgoing: 0,
        total: 0,
        net: 0,
        count: 0,
      });
    }

    for (const row of rows) {
      const method = String(row.method);
      const current =
        byMethod.get(method) ?? {
          method,
          incoming: 0,
          outgoing: 0,
          total: 0,
          net: 0,
          count: 0,
        };
      const amount = num(row.amount);
      const count = num(row.count);
      if (row.direction === "incoming") {
        current.incoming += amount;
      } else if (row.direction === "outgoing") {
        current.outgoing += amount;
      }
      current.count += count;
      byMethod.set(method, current);
    }

    const methods = [...byMethod.values()]
      .map((item) => {
        const incoming = money(item.incoming);
        const outgoing = money(item.outgoing);
        return {
          method: item.method,
          incoming,
          outgoing,
          total: money(incoming + outgoing),
          net: money(incoming - outgoing),
          count: Math.trunc(item.count),
        };
      })
      .sort((a, b) => b.total - a.total || a.method.localeCompare(b.method));

    const totals = methods.reduce(
      (acc, item) => ({
        incoming: money(acc.incoming + item.incoming),
        outgoing: money(acc.outgoing + item.outgoing),
        net: money(acc.net + item.net),
        count: acc.count + item.count,
      }),
      { incoming: 0, outgoing: 0, net: 0, count: 0 },
    );

    return reportResponse(
      {
        range,
        warehouseId: warehouseId ?? null,
        scope: warehouseId ? "allocated" : "all",
        methods,
        totals,
      },
      methods,
      "payment-methods",
      format,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
