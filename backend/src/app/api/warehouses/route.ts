import { z } from "zod";
import { toIsoString } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import { conflict, isUniqueViolation, notFound } from "@/lib/errors";
import { ok, requestMeta, requirePermission, failUnexpected } from "@/lib/http";
import { parsePagination, paginate } from "@/lib/pagination";
import { parseSort, sortRows } from "@/lib/sorting";
import { parseJson, parseQuery, parseUuid } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const fields = {
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(255).nullish(),
  city: z.string().trim().max(120).nullish(),
  manager: z.string().trim().max(120).nullish(),
  phone: z.string().trim().max(50).nullish(),
  email: z.string().trim().email().max(255).nullish(),
  capacity: z.number().int().nonnegative().nullish(),
};

const createSchema = z
  .object({ ...fields, active: z.boolean().optional().default(true) })
  .strict();

const updateSchema = z
  .object({ ...fields, active: z.boolean().optional() })
  .partial()
  .strict();

const listSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    active: z.enum(["true", "false"]).optional(),
  })
  .strict();

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  manager: string | null;
  phone: string | null;
  email: string | null;
  capacity: number | string | null;
  active: boolean;
  created_at: unknown;
  updated_at: unknown;
};

function mapWarehouse(row: WarehouseRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address,
    city: row.city,
    manager: row.manager,
    phone: row.phone,
    email: row.email,
    capacity: row.capacity === null ? null : Number(row.capacity),
    active: row.active,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "warehouses");
    const sql = getSql();
    const query = parseQuery(
      new URL(request.url).searchParams,
      listSchema,
    );
    const pagination = parsePagination(new URL(request.url).searchParams);
    const sort = parseSort(
      new URL(request.url).searchParams,
      ["code", "name", "city", "createdAt", "updatedAt"],
      "name",
      "asc",
    );

    const rows = (await sql`
      select * from warehouses where deleted_at is null
    `) as WarehouseRow[];

    const term = query.q?.toLowerCase();
    let items = rows.map(mapWarehouse);
    if (term) {
      items = items.filter((item) =>
        [item.code, item.name, item.city, item.manager, item.email].some(
          (value) => value?.toLowerCase().includes(term),
        ),
      );
    }
    if (query.active) {
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
    const session = await requirePermission(request, "warehouses");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    try {
      const rows = (await sql`
        insert into warehouses (
          code, name, address, city, manager, phone, email, capacity, active
        )
        values (
          ${input.code}, ${input.name}, ${input.address ?? null},
          ${input.city ?? null}, ${input.manager ?? null},
          ${input.phone ?? null}, ${input.email ?? null},
          ${input.capacity ?? null}, ${input.active}
        )
        returning *
      `) as WarehouseRow[];

      const warehouse = mapWarehouse(rows[0]);
      await writeAuditLog(sql, {
        actorId: session.appUser.id,
        action: "warehouse.create",
        entityType: "warehouse",
        entityId: warehouse.id,
        afterData: warehouse,
        ...requestMeta(request),
      });
      return ok(warehouse, 201);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict("A warehouse with that code or name already exists.");
      }
      throw error;
    }
  } catch (error) {
    return failUnexpected(error);
  }
}
