import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { toIsoString } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import { conflict, isUniqueViolation, notFound } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { parseJson, parseUuid } from "@/lib/validation";

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
  active: z.boolean().optional(),
};

const updateSchema = z.object(fields).partial().strict();

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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermission(request, "warehouses");
    const id = parseUuid((await context.params).id);
    const rows = (await getSql()`
      select * from warehouses where id = ${id}::uuid and deleted_at is null
    `) as WarehouseRow[];
    if (!rows[0]) throw notFound("Warehouse not found.");
    return ok(mapWarehouse(rows[0]));
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "warehouses");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const beforeRows = (await sql`
      select * from warehouses where id = ${id}::uuid and deleted_at is null
    `) as WarehouseRow[];
    if (!beforeRows[0]) throw notFound("Warehouse not found.");
    const before = mapWarehouse(beforeRows[0]);

    const input = await parseJson(request, updateSchema);
    try {
      const rows = (await sql`
        update warehouses
        set
          code = coalesce(${input.code ?? null}, code),
          name = coalesce(${input.name ?? null}, name),
          address = coalesce(${input.address ?? null}, address),
          city = coalesce(${input.city ?? null}, city),
          manager = coalesce(${input.manager ?? null}, manager),
          phone = coalesce(${input.phone ?? null}, phone),
          email = coalesce(${input.email ?? null}, email),
          capacity = coalesce(${input.capacity ?? null}, capacity),
          active = coalesce(${input.active ?? null}, active),
          updated_at = now()
        where id = ${id}::uuid and deleted_at is null
        returning *
      `) as WarehouseRow[];

      const warehouse = mapWarehouse(rows[0]);
      await writeAuditLog(sql, {
        actorId: session.appUser.id,
        action: "warehouse.update",
        entityType: "warehouse",
        entityId: id,
        beforeData: before,
        afterData: warehouse,
        ...requestMeta(request),
      });
      return ok(warehouse);
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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "warehouses");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const beforeRows = (await sql`
      select * from warehouses where id = ${id}::uuid and deleted_at is null
    `) as WarehouseRow[];
    if (!beforeRows[0]) throw notFound("Warehouse not found.");

    await sql`
      update warehouses
      set deleted_at = now(), active = false, updated_at = now()
      where id = ${id}::uuid and deleted_at is null
    `;
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "warehouse.delete",
      entityType: "warehouse",
      entityId: id,
      beforeData: mapWarehouse(beforeRows[0]),
      ...requestMeta(request),
    });
    return ok({ id, deleted: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
