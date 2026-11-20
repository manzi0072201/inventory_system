import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { badRequest, conflict, isUniqueViolation, notFound } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { mapExpenseCategory, type ExpenseCategoryRow } from "@/lib/expenses";
import { parseJson, parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    active: z.boolean(),
  })
  .partial()
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

async function loadCategory(
  sql: ReturnType<typeof getSql>,
  id: string,
): Promise<ExpenseCategoryRow | undefined> {
  const rows = (await sql`
    select * from expense_categories where id = ${id}::uuid
  `) as ExpenseCategoryRow[];
  return rows[0];
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "expenses");
    const id = parseUuid((await context.params).id);
    const input = await parseJson(request, updateSchema);
    const sql = getSql();
    const existing = await loadCategory(sql, id);
    if (!existing) throw notFound("Expense category not found.");
    const before = mapExpenseCategory(existing);

    let rows: ExpenseCategoryRow[];
    try {
      rows = (await sql`
        update expense_categories
        set
          name = coalesce(${input.name ?? null}, name),
          active = coalesce(${input.active ?? null}, active)
        where id = ${id}::uuid
        returning *
      `) as ExpenseCategoryRow[];
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict("An expense category with that name already exists.");
      }
      throw error;
    }
    if (!rows[0]) throw notFound("Expense category not found.");

    const after = mapExpenseCategory(rows[0]);
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "expense_category.update",
      entityType: "expense_category",
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
    const existing = await loadCategory(sql, id);
    if (!existing) throw notFound("Expense category not found.");

    const counts = (await sql`
      select count(*)::int as count
      from expenses
      where category_id = ${id}::uuid
    `) as { count: number }[];
    if (counts[0] && counts[0].count > 0) {
      throw badRequest("Category is in use.");
    }

    await sql`
      delete from expense_categories where id = ${id}::uuid
    `;
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "expense_category.delete",
      entityType: "expense_category",
      entityId: id,
      beforeData: mapExpenseCategory(existing),
      ...requestMeta(request),
    });
    return ok({ id, deleted: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
