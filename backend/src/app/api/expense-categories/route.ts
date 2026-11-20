import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { conflict, isUniqueViolation, notFound } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { paginate, parsePagination } from "@/lib/pagination";
import {
  mapExpenseCategory,
  type ExpenseCategoryRow,
} from "@/lib/expenses";
import { parseSort, sortRows } from "@/lib/sorting";
import { parseJson, parseQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

const listSchema = z
  .object({
    active: z.enum(["true", "false"]).optional(),
  })
  .strict();

const createSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    active: z.boolean().default(true),
  })
  .strict();

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    active: z.boolean(),
  })
  .partial()
  .strict();

export async function GET(request: Request) {
  try {
    await requirePermission(request, "expenses");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const sort = parseSort(params, ["name", "createdAt"], "name", "asc");

    const rows = (await sql`
      select * from expense_categories
    `) as ExpenseCategoryRow[];

    let items = rows.map(mapExpenseCategory);
    if (query.active !== undefined) {
      const active = query.active === "true";
      items = items.filter((item) => item.active === active);
    }

    const result = paginate(sortRows(items, sort), pagination);
    return ok(result.rows, 200, { pagination: result.meta });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, "expenses");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    let rows: ExpenseCategoryRow[];
    try {
      rows = (await sql`
        insert into expense_categories (name, active)
        values (${input.name}, ${input.active})
        returning *
      `) as ExpenseCategoryRow[];
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict("An expense category with that name already exists.");
      }
      throw error;
    }

    const category = mapExpenseCategory(rows[0]);
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "expense_category.create",
      entityType: "expense_category",
      entityId: category.id,
      afterData: category,
      ...requestMeta(request),
    });
    return ok(category, 201);
  } catch (error) {
    return failUnexpected(error);
  }
}
