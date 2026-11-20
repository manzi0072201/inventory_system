import { getSql } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { failUnexpected, ok, requirePermission } from "@/lib/http";
import {
  mapPurchaseReturn,
  mapReturnItem,
  type PurchaseReturnRow,
  type ReturnItemRow,
} from "@/lib/returns";
import { parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermission(request, "purchase_returns");
    const id = parseUuid((await context.params).id);
    const sql = getSql();

    const rows = (await sql`
      select
        pr.*,
        p.reference as purchase_reference,
        s.name as supplier_name,
        w.name as warehouse_name
      from purchase_returns pr
      join purchases p on p.id = pr.purchase_id
      join suppliers s on s.id = pr.supplier_id
      join warehouses w on w.id = pr.warehouse_id
      where pr.id = ${id}::uuid
    `) as PurchaseReturnRow[];
    const row = rows[0];
    if (!row) throw notFound("Purchase return not found.");

    const items = (await sql`
      select * from purchase_return_items
      where purchase_return_id = ${id}::uuid
      order by id
    `) as ReturnItemRow[];

    return ok({ ...mapPurchaseReturn(row), items: items.map(mapReturnItem) });
  } catch (error) {
    return failUnexpected(error);
  }
}
