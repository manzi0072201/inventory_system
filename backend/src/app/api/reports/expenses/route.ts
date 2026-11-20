import { getSql } from "@/lib/db";
import { failUnexpected, requirePermission } from "@/lib/http";
import {
  money,
  num,
  parseGroupBy,
  parseReportFormat,
  parseReportRange,
  reportResponse,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

type ExpenseRow = {
  key: string | null;
  amount: number | string;
  count: number | string;
};

export async function GET(request: Request) {
  try {
    await requirePermission(request, "reports");
    const params = new URL(request.url).searchParams;
    const range = parseReportRange(params);
    const format = parseReportFormat(params);
    const groupBy = parseGroupBy(params, ["category", "method", "status"] as const, "category");
    const sql = getSql();

    const rows = (await sql`
      select
        case ${groupBy}
          when 'category' then c.name
          when 'method' then e.payment_method
          else e.status
        end as key,
        count(*)::int as count,
        coalesce(sum(e.amount), 0) as amount
      from expenses e
      join expense_categories c on c.id = e.category_id
      where e.date between ${range.start}::date and ${range.end}::date
        and e.status <> 'Cancelled'
      group by 1
    `) as ExpenseRow[];

    const groups = rows
      .map((row) => ({
        key: String(row.key ?? ""),
        amount: money(num(row.amount)),
        count: Math.trunc(num(row.count)),
      }))
      .sort((a, b) => b.amount - a.amount || a.key.localeCompare(b.key));

    const total = money(groups.reduce((sum, group) => sum + group.amount, 0));
    const totalCount = groups.reduce((sum, group) => sum + group.count, 0);

    return reportResponse(
      { range, groupBy, groups, total, totalCount },
      groups,
      "expenses",
      format,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
