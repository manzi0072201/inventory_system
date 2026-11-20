import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { conflict, isUniqueViolation } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { paginate, parsePagination } from "@/lib/pagination";
import {
  fetchSupplier,
  fetchSuppliers,
  mapSupplier,
  type SupplierRow,
} from "@/lib/parties";
import { parseSort, sortRows } from "@/lib/sorting";
import { parseJson, parseQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

const money = z.number().min(-999999999999.99).max(999999999999.99);

const fields = {
  name: z.string().trim().min(2).max(200),
  contact: z.string().trim().max(150).nullish(),
  email: z.string().trim().email().max(255).nullish(),
  phone: z.string().trim().max(50).nullish(),
  country: z.string().trim().max(100).nullish(),
  city: z.string().trim().max(100).nullish(),
  address: z.string().trim().max(255).nullish(),
  category: z.string().trim().max(100).nullish(),
  taxNumber: z.string().trim().max(100).nullish(),
  openingBalance: money.optional(),
  creditLimit: z.number().nonnegative().max(999999999999.99).optional(),
};

const createSchema = z.object(fields).strict();
const updateSchema = z.object(fields).partial().strict();

const listSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    category: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),
  })
  .strict();

export async function GET(request: Request) {
  try {
    await requirePermission(request, "suppliers");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const sort = parseSort(
      params,
      ["name", "balance", "category", "city", "createdAt", "updatedAt"],
      "name",
      "asc",
    );

    let items = (await fetchSuppliers(sql)).map(mapSupplier);
    const term = query.q?.toLowerCase();
    if (term) {
      items = items.filter((item) =>
        [item.name, item.contact, item.email, item.phone, item.city].some(
          (value) => value?.toLowerCase().includes(term),
        ),
      );
    }
    if (query.category) items = items.filter((item) => item.category === query.category);
    if (query.city) items = items.filter((item) => item.city === query.city);

    const result = paginate(sortRows(items, sort), pagination);
    return ok(result.rows, 200, { pagination: result.meta });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, "suppliers");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    try {
      const rows = (await sql`
        insert into suppliers (
          name, contact, email, phone, country, city, address, category,
          tax_number, opening_balance, credit_limit
        )
        values (
          ${input.name}, ${input.contact ?? null}, ${input.email ?? null},
          ${input.phone ?? null}, ${input.country ?? null}, ${input.city ?? null},
          ${input.address ?? null}, ${input.category ?? null},
          ${input.taxNumber ?? null}, ${input.openingBalance ?? 0},
          ${input.creditLimit ?? 0}
        )
        returning *
      `) as SupplierRow[];

      const created = await fetchSupplier(sql, rows[0].id);
      const supplier = mapSupplier(created ?? rows[0]);
      await writeAuditLog(sql, {
        actorId: session.appUser.id,
        action: "supplier.create",
        entityType: "supplier",
        entityId: supplier.id,
        afterData: supplier,
        ...requestMeta(request),
      });
      return ok(supplier, 201);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict("A supplier with that email already exists.");
      }
      throw error;
    }
  } catch (error) {
    return failUnexpected(error);
  }
}
