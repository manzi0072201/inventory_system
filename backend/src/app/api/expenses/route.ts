import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { parseDateRange } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import { badRequest } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { nextDocumentReference } from "@/lib/numbering";
import { paginate, parsePagination } from "@/lib/pagination";
import { mapExpense, type ExpenseRow } from "@/lib/expenses";
import { parseSort, sortRows } from "@/lib/sorting";
import {
  dateString,
  money,
  paymentMethod,
} from "@/lib/transactions";
import { parseJson, parseQuery, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const statusSchema = z.enum(["Paid", "Pending", "Cancelled"]);

const listSchema = z
  .object({
    categoryId: uuid.optional(),
    status: statusSchema.optional(),
  })
  .strict();

const createSchema = z
  .object({
    categoryId: uuid,
    date: dateString.optional(),
    vendor: z.string().trim().max(200).nullish(),
    description: z.string().trim().max(1000).nullish(),
    amount: money,
    paymentMethod,
    status: statusSchema.default("Paid"),
    note: z.string().trim().max(1000).nullish(),
  })
  .strict();

async function assertActiveCategory(
  sql: ReturnType<typeof getSql>,
  categoryId: string,
) {
  const rows = await sql`
    select id from expense_categories
    where id = ${categoryId}::uuid and active = true
  `;
  if (!rows[0]) throw badRequest("The selected expense category does not exist.");
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "expenses");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const range = parseDateRange(params);
    const sort = parseSort(
      params,
      ["date", "reference", "amount", "status", "createdAt"],
      "date",
    );

    const rows = (await sql`
      select
        e.*,
        c.name as category_name
      from expenses e
      left join expense_categories c on c.id = e.category_id
      where e.date::text between ${range.start} and ${range.end}
    `) as ExpenseRow[];

    let items = rows.map(mapExpense);
    if (query.categoryId) {
      items = items.filter((item) => item.categoryId === query.categoryId);
    }
    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }

    const result = paginate(sortRows(items, sort), pagination);
    return ok(result.rows, 200, {
      pagination: result.meta,
      dateRange: range,
    });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, "expenses");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    await assertActiveCategory(sql, input.categoryId);

    const id = crypto.randomUUID();
    const reference = await nextDocumentReference(sql, "expense");
    const date = input.date ?? new Date().toISOString().slice(0, 10);

    const rows = (await sql`
      with inserted as (
        insert into expenses (
          id, reference, date, category_id, vendor, description,
          amount, payment_method, status, note, created_by
        )
        values (
          ${id}::uuid, ${reference}, ${date}::date, ${input.categoryId}::uuid,
          ${input.vendor ?? null}, ${input.description ?? null}, ${input.amount},
          ${input.paymentMethod}, ${input.status}, ${input.note ?? null},
          ${session.appUser.id}::uuid
        )
        returning *
      )
      select
        e.*,
        c.name as category_name
      from inserted e
      join expense_categories c on c.id = e.category_id
    `) as ExpenseRow[];

    const expense = mapExpense(rows[0]);
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "expense.create",
      entityType: "expense",
      entityId: expense.id,
      afterData: expense,
      ...requestMeta(request),
    });
    return ok(expense, 201);
  } catch (error) {
    return failUnexpected(error);
  }
}
