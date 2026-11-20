import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { badRequest, notFound } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { mapExpense, type ExpenseRow } from "@/lib/expenses";
import { dateString, money, paymentMethod } from "@/lib/transactions";
import { parseJson, parseUuid, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    categoryId: uuid,
    date: dateString,
    vendor: z.string().trim().max(200).nullish(),
    description: z.string().trim().max(1000).nullish(),
    amount: money,
    paymentMethod,
    status: z.enum(["Paid", "Pending", "Cancelled"]),
    note: z.string().trim().max(1000).nullish(),
  })
  .partial()
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

async function loadExpense(
  sql: ReturnType<typeof getSql>,
  id: string,
): Promise<ExpenseRow | undefined> {
  const rows = (await sql`
    select
      e.*,
      c.name as category_name
    from expenses e
    left join expense_categories c on c.id = e.category_id
    where e.id = ${id}::uuid
  `) as ExpenseRow[];
  return rows[0];
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermission(request, "expenses");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const expense = await loadExpense(sql, id);
    if (!expense) throw notFound("Expense not found.");
    return ok(mapExpense(expense));
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "expenses");
    const id = parseUuid((await context.params).id);
    const input = await parseJson(request, updateSchema);
    const sql = getSql();

    const existing = await loadExpense(sql, id);
    if (!existing) throw notFound("Expense not found.");
    const before = mapExpense(existing);

    if (input.categoryId) {
      const categories = await sql`
        select id from expense_categories
        where id = ${input.categoryId}::uuid and active = true
      `;
      if (!categories[0]) throw badRequest("The selected expense category does not exist.");
    }

    const rows = (await sql`
      with updated as (
        update expenses
        set
          category_id = coalesce(${input.categoryId ?? null}::uuid, category_id),
          date = case when ${input.date !== undefined} then ${input.date ?? null}::date else date end,
          vendor = case when ${input.vendor !== undefined} then ${input.vendor ?? null} else vendor end,
          description = case when ${input.description !== undefined} then ${input.description ?? null} else description end,
          amount = coalesce(${input.amount ?? null}, amount),
          payment_method = coalesce(${input.paymentMethod ?? null}, payment_method),
          status = coalesce(${input.status ?? null}, status),
          note = case when ${input.note !== undefined} then ${input.note ?? null} else note end,
          updated_at = now()
        where id = ${id}::uuid
        returning *
      )
      select
        e.*,
        c.name as category_name
      from updated e
      join expense_categories c on c.id = e.category_id
    `) as ExpenseRow[];
    if (!rows[0]) throw notFound("Expense not found.");

    const after = mapExpense(rows[0]);
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "expense.update",
      entityType: "expense",
      entityId: id,
      beforeData: before,
      afterData: after,
      ...requestMeta(request),
    });
    return ok(after);
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "expenses");
    const id = parseUuid((await context.params).id);
    const sql = getSql();

    const existing = await loadExpense(sql, id);
    if (!existing) throw notFound("Expense not found.");

    const rows = (await sql`
      update expenses
      set status = 'Cancelled', updated_at = now()
      where id = ${id}::uuid
      returning *
    `) as ExpenseRow[];
    if (!rows[0]) throw notFound("Expense not found.");

    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "expense.delete",
      entityType: "expense",
      entityId: id,
      beforeData: mapExpense(existing),
      afterData: mapExpense(rows[0]),
      ...requestMeta(request),
    });
    return ok({ id, status: "Cancelled" });
  } catch (error) {
    return failUnexpected(error);
  }
}
