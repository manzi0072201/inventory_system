import { getSql } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { failUnexpected, ok, requirePermission } from "@/lib/http";
import { mapReturnItem, mapSaleReturn, type ReturnItemRow, type SaleReturnRow } from "@/lib/returns";
import { parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermission(request, "sales_returns");
    const id = parseUuid((await context.params).id);
    const sql = getSql();

    const rows = (await sql`
      select
        sr.*,
        s.reference as sale_reference,
        c.name as customer_name,
        w.name as warehouse_name
      from sale_returns sr
      join sales s on s.id = sr.sale_id
      join customers c on c.id = sr.customer_id
      join warehouses w on w.id = sr.warehouse_id
      where sr.id = ${id}::uuid
    `) as SaleReturnRow[];
    const row = rows[0];
    if (!row) throw notFound("Sale return not found.");

    const items = (await sql`
      select * from sale_return_items
      where sale_return_id = ${id}::uuid
      order by id
    `) as ReturnItemRow[];

    return ok({ ...mapSaleReturn(row), items: items.map(mapReturnItem) });
  } catch (error) {
    return failUnexpected(error);
  }
}
