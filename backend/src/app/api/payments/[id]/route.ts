import { getSql } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { failUnexpected, ok, requirePermission } from "@/lib/http";
import {
  mapPayment,
  mapPaymentAllocation,
  type PaymentAllocationRow,
  type PaymentRow,
} from "@/lib/payments";
import { parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function loadPayment(
  sql: ReturnType<typeof getSql>,
  id: string,
): Promise<PaymentRow | undefined> {
  const rows = (await sql`
    select
      p.*,
      coalesce(c.name, s.name) as party_name
    from payments p
    left join customers c
      on p.party_type = 'customer'
      and c.id = p.party_id
      and c.deleted_at is null
    left join suppliers s
      on p.party_type = 'supplier'
      and s.id = p.party_id
      and s.deleted_at is null
    where p.id = ${id}::uuid
  `) as PaymentRow[];
  return rows[0];
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermission(request, "payments");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const payment = await loadPayment(sql, id);
    if (!payment) throw notFound("Payment not found.");

    const allocations = (await sql`
      select * from payment_allocations
      where payment_id = ${id}::uuid
      order by target_type, target_id
    `) as PaymentAllocationRow[];

    return ok({
      ...mapPayment(payment),
      allocations: allocations.map(mapPaymentAllocation),
    });
  } catch (error) {
    return failUnexpected(error);
  }
}
