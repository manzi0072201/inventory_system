import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { conflict, isUniqueViolation } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { paginate, parsePagination } from "@/lib/pagination";
import {
  fetchCustomer,
  fetchCustomers,
  mapCustomer,
  type CustomerRow,
} from "@/lib/parties";
import { parseSort, sortRows } from "@/lib/sorting";
import { parseJson, parseQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

const money = z.number().min(-999999999999.99).max(999999999999.99);

const fields = {
  name: z.string().trim().min(2).max(200),
  type: z.enum(["Individual", "Business"]),
  email: z.string().trim().email().max(255).nullish(),
  phone: z.string().trim().max(50).nullish(),
  country: z.string().trim().max(100).nullish(),
  city: z.string().trim().max(100).nullish(),
  address: z.string().trim().max(255).nullish(),
  taxNumber: z.string().trim().max(100).nullish(),
  openingBalance: money.optional(),
  creditLimit: z.number().nonnegative().max(999999999999.99).optional(),
};

const createSchema = z.object(fields).strict();
const updateSchema = z.object(fields).partial().strict();

const listSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    type: z.enum(["Individual", "Business"]).optional(),
    city: z.string().trim().max(100).optional(),
  })
  .strict();

export async function GET(request: Request) {
  try {
    await requirePermission(request, "customers");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const sort = parseSort(
      params,
      ["name", "type", "balance", "city", "createdAt", "updatedAt"],
      "name",
      "asc",
    );

    let items = (await fetchCustomers(sql)).map(mapCustomer);
    const term = query.q?.toLowerCase();
    if (term) {
      items = items.filter((item) =>
        [item.name, item.email, item.phone, item.city, item.taxNumber].some(
          (value) => value?.toLowerCase().includes(term),
        ),
      );
    }
    if (query.type) items = items.filter((item) => item.type === query.type);
    if (query.city) items = items.filter((item) => item.city === query.city);

    const result = paginate(sortRows(items, sort), pagination);
    return ok(result.rows, 200, { pagination: result.meta });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, "customers");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    try {
      const rows = (await sql`
        insert into customers (
          name, type, email, phone, country, city, address, tax_number,
          opening_balance, credit_limit
        )
        values (
          ${input.name}, ${input.type}, ${input.email ?? null},
          ${input.phone ?? null}, ${input.country ?? null}, ${input.city ?? null},
          ${input.address ?? null}, ${input.taxNumber ?? null},
          ${input.openingBalance ?? 0}, ${input.creditLimit ?? 0}
        )
        returning *
      `) as CustomerRow[];

      const created = await fetchCustomer(sql, rows[0].id);
      const customer = mapCustomer(created ?? rows[0]);
      await writeAuditLog(sql, {
        actorId: session.appUser.id,
        action: "customer.create",
        entityType: "customer",
        entityId: customer.id,
        afterData: customer,
        ...requestMeta(request),
      });
      return ok(customer, 201);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict("A customer with that email already exists.");
      }
      throw error;
    }
  } catch (error) {
    return failUnexpected(error);
  }
}
