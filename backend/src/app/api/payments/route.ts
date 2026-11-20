import { z } from "zod";
import { auditQuery } from "@/lib/audit";
import { parseDateRange } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import {
  badRequest,
  conflict,
  isUniqueViolation,
  unprocessable,
} from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { nextDocumentReference } from "@/lib/numbering";
import { paginate, parsePagination } from "@/lib/pagination";
import {
  mapPayment,
  mapPaymentAllocation,
  type PaymentAllocationRow,
  type PaymentRow,
} from "@/lib/payments";
import { parseSort, sortRows } from "@/lib/sorting";
import {
  dateString,
  money,
  paymentMethod,
  roundMoney,
  runTransaction,
} from "@/lib/transactions";
import { parseJson, parseQuery, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const partyTypeSchema = z.enum(["customer", "supplier"]);
const directionSchema = z.enum(["incoming", "outgoing"]);
const sortDirectionSchema = z.enum(["asc", "desc"]);
const sourceTypeSchema = z.enum([
  "sale",
  "purchase",
  "sale_return",
  "purchase_return",
  "expense",
]);

const listSchema = z
  .object({
    partyType: partyTypeSchema.optional(),
    partyId: uuid.optional(),
    method: paymentMethod.optional(),
    sourceType: sourceTypeSchema.optional(),
  })
  .strict();

const allocationSchema = z
  .object({
    targetType: sourceTypeSchema,
    targetId: uuid,
    amount: money.refine(
      (value) => roundMoney(value) > 0,
      "Amount must be greater than zero.",
    ),
  })
  .strict();

const createSchema = z
  .object({
    partyType: partyTypeSchema,
    partyId: uuid,
    method: paymentMethod,
    amount: money.refine(
      (value) => roundMoney(value) > 0,
      "Amount must be greater than zero.",
    ),
    paidAt: dateString.optional(),
    note: z.string().trim().max(1000).nullish(),
    direction: directionSchema.optional(),
    sourceType: sourceTypeSchema.optional(),
    sourceId: uuid.optional(),
    allocations: z.array(allocationSchema).max(20).optional(),
  })
  .strict();

type SourceType = z.infer<typeof sourceTypeSchema>;

type GroupedAllocation = {
  targetType: SourceType;
  targetId: string;
  amount: number;
};

function parsePaymentFilters(params: URLSearchParams) {
  const filterParams = new URLSearchParams(params);
  filterParams.delete("direction");
  const query = parseQuery(filterParams, listSchema);

  const rawDirection = params.get("direction");
  let direction: z.infer<typeof directionSchema> | undefined;
  let sortParams = params;
  if (rawDirection) {
    const parsedDirection = directionSchema.safeParse(rawDirection);
    if (parsedDirection.success) {
      direction = parsedDirection.data;
      sortParams = new URLSearchParams(params);
      sortParams.delete("direction");
    } else if (!sortDirectionSchema.safeParse(rawDirection).success) {
      throw unprocessable("Query validation failed.");
    }
  }

  const sort = parseSort(
    sortParams,
    ["paidAt", "reference", "amount", "createdAt"],
    "paidAt",
  );
  return { query, direction, sort };
}

async function validateAllocationTarget(
  sql: ReturnType<typeof getSql>,
  allocation: GroupedAllocation,
  partyType: "customer" | "supplier",
  partyId: string,
) {
  const allowed: SourceType[] =
    partyType === "customer"
      ? ["sale", "sale_return"]
      : ["purchase", "purchase_return", "expense"];
  if (!allowed.includes(allocation.targetType)) {
    throw unprocessable("Allocation target does not match the selected party.");
  }

  if (allocation.targetType === "sale") {
    const rows = (await sql`
      select customer_id, total_amount::numeric as total_amount, paid_amount::numeric as paid_amount
      from sales
      where id = ${allocation.targetId}::uuid
    `) as { customer_id: string; total_amount: string; paid_amount: string }[];
    if (!rows[0]) throw badRequest("One or more allocation targets do not exist.");
    if (rows[0].customer_id !== partyId) {
      throw unprocessable("Allocation target belongs to another party.");
    }
    const available = roundMoney(Number(rows[0].total_amount) - Number(rows[0].paid_amount));
    if (allocation.amount > available) {
      throw unprocessable("Allocated amount exceeds the outstanding balance.");
    }
    return;
  }

  if (allocation.targetType === "purchase") {
    const rows = (await sql`
      select supplier_id, total_amount::numeric as total_amount, paid_amount::numeric as paid_amount
      from purchases
      where id = ${allocation.targetId}::uuid
    `) as { supplier_id: string; total_amount: string; paid_amount: string }[];
    if (!rows[0]) throw badRequest("One or more allocation targets do not exist.");
    if (rows[0].supplier_id !== partyId) {
      throw unprocessable("Allocation target belongs to another party.");
    }
    const available = roundMoney(Number(rows[0].total_amount) - Number(rows[0].paid_amount));
    if (allocation.amount > available) {
      throw unprocessable("Allocated amount exceeds the outstanding balance.");
    }
    return;
  }

  if (allocation.targetType === "sale_return") {
    const rows = await sql`
      select id from sale_returns
      where id = ${allocation.targetId}::uuid and customer_id = ${partyId}::uuid
    `;
    if (!rows[0]) throw badRequest("One or more allocation targets do not exist.");
    return;
  }

  if (allocation.targetType === "purchase_return") {
    const rows = await sql`
      select id from purchase_returns
      where id = ${allocation.targetId}::uuid and supplier_id = ${partyId}::uuid
    `;
    if (!rows[0]) throw badRequest("One or more allocation targets do not exist.");
    return;
  }

  const rows = await sql`
    select id from expenses where id = ${allocation.targetId}::uuid
  `;
  if (!rows[0]) throw badRequest("One or more allocation targets do not exist.");
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "payments");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const { query, direction, sort } = parsePaymentFilters(params);
    const pagination = parsePagination(params);
    const range = parseDateRange(params);

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
      where p.paid_at::text between ${range.start} and ${range.end}
    `) as PaymentRow[];

    let items = rows.map(mapPayment);
    if (query.partyType) {
      items = items.filter((item) => item.partyType === query.partyType);
    }
    if (query.partyId) {
      items = items.filter((item) => item.partyId === query.partyId);
    }
    if (query.method) {
      items = items.filter((item) => item.method === query.method);
    }
    if (query.sourceType) {
      items = items.filter((item) => item.sourceType === query.sourceType);
    }
    if (direction) {
      items = items.filter((item) => item.direction === direction);
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
    const session = await requirePermission(request, "payments");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    const defaultDirection = input.partyType === "customer" ? "incoming" : "outgoing";
    if (input.direction && input.direction !== defaultDirection) {
      throw unprocessable("Payment direction does not match the selected party.");
    }
    const direction = input.direction ?? defaultDirection;

    const partyRows =
      input.partyType === "customer"
        ? await sql`
            select name from customers
            where id = ${input.partyId}::uuid and deleted_at is null
          `
        : await sql`
            select name from suppliers
            where id = ${input.partyId}::uuid and deleted_at is null
          `;
    const partyRow = partyRows[0] as { name: string } | undefined;
    if (!partyRow) {
      throw badRequest(
        input.partyType === "customer"
          ? "The selected customer does not exist."
          : "The selected supplier does not exist.",
      );
    }

    const amount = roundMoney(input.amount);
    const grouped = new Map<string, GroupedAllocation>();
    for (const allocation of input.allocations ?? []) {
      const value = roundMoney(allocation.amount);
      const key = `${allocation.targetType}:${allocation.targetId}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.amount = roundMoney(existing.amount + value);
      } else {
        grouped.set(key, {
          targetType: allocation.targetType,
          targetId: allocation.targetId,
          amount: value,
        });
      }
    }
    const allocations = [...grouped.values()];
    const allocatedTotal = roundMoney(
      allocations.reduce((sum, allocation) => sum + allocation.amount, 0),
    );
    if (allocatedTotal > amount) {
      throw unprocessable("Allocation amounts cannot exceed the payment amount.");
    }
    const sourceType: SourceType =
      input.sourceType ??
      allocations[0]?.targetType ??
      (input.partyType === "customer" ? "sale" : "purchase");
    const sourceId = input.sourceId ?? allocations[0]?.targetId ?? null;
    for (const allocation of allocations) {
      await validateAllocationTarget(
        sql,
        allocation,
        input.partyType,
        input.partyId,
      );
    }

    const id = crypto.randomUUID();
    const reference = await nextDocumentReference(sql, "payment");
    const paidAt = input.paidAt ?? new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const afterData = {
      ...mapPayment({
        id,
        reference,
        direction,
        source_type: sourceType,
        source_id: sourceId,
        party_type: input.partyType,
        party_id: input.partyId,
        method: input.method,
        amount,
        paid_at: paidAt,
        note: input.note ?? null,
        created_by: session.appUser.id,
        created_at: now,
        party_name: partyRow.name,
      }),
      allocations: allocations.map((allocation) =>
        mapPaymentAllocation({
          payment_id: id,
          target_type: allocation.targetType,
          target_id: allocation.targetId,
          amount: allocation.amount,
        }),
      ),
    };

    let results: any[][] = [];
    try {
      results = await runTransaction(sql, (tx) => {
        const queries: any[] = [];

        queries.push(tx`
          with inserted as (
            insert into payments (
              id, reference, direction, source_type, source_id,
              party_type, party_id, method, amount, paid_at, note, created_by
            )
            values (
              ${id}::uuid, ${reference}, ${direction}, ${sourceType},
              ${sourceId}::uuid, ${input.partyType}, ${input.partyId}::uuid,
              ${input.method}, ${amount}, ${paidAt}::date, ${input.note ?? null},
              ${session.appUser.id}::uuid
            )
            returning *
          )
          select
            i.*,
            coalesce(c.name, s.name) as party_name
          from inserted i
          left join customers c
            on i.party_type = 'customer'
            and c.id = i.party_id
            and c.deleted_at is null
          left join suppliers s
            on i.party_type = 'supplier'
            and s.id = i.party_id
            and s.deleted_at is null
        `);

        queries.push(tx`
          insert into payment_allocations (
            payment_id, target_type, target_id, amount
          )
          select
            ${id}::uuid,
            item.value ->> 'targetType',
            (item.value ->> 'targetId')::uuid,
            (item.value ->> 'amount')::numeric
          from jsonb_array_elements(${JSON.stringify(allocations)}::jsonb)
            with ordinality as item(value, ord)
          order by item.ord
          returning *
        `);

        for (const allocation of allocations) {
          if (allocation.targetType === "sale") {
            queries.push(tx`
              update sales
              set paid_amount = paid_amount + ${allocation.amount}, updated_at = now()
              where id = ${allocation.targetId}::uuid
            `);
          } else if (allocation.targetType === "purchase") {
            queries.push(tx`
              update purchases
              set paid_amount = paid_amount + ${allocation.amount}, updated_at = now()
              where id = ${allocation.targetId}::uuid
            `);
          }
        }

        queries.push(
          auditQuery(tx, {
            actorId: session.appUser.id,
            action: "payment.create",
            entityType: "payment",
            entityId: id,
            afterData,
            ...requestMeta(request),
          }),
        );

        return queries;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict("A payment with that reference already exists. Please retry.");
      }
      throw error;
    }

    const paymentRow = results[0][0] as PaymentRow;
    const insertedAllocations = results[1] as PaymentAllocationRow[];
    return ok(
      {
        ...mapPayment(paymentRow),
        allocations: insertedAllocations.map(mapPaymentAllocation),
      },
      201,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
