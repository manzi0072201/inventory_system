import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { conflict, isUniqueViolation, notFound } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { fetchSupplier, mapSupplier } from "@/lib/parties";
import { parseJson, parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const money = z.number().min(-999999999999.99).max(999999999999.99);

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    contact: z.string().trim().max(150).nullish(),
    email: z.string().trim().email().max(255).nullish(),
    phone: z.string().trim().max(50).nullish(),
    country: z.string().trim().max(100).nullish(),
    city: z.string().trim().max(100).nullish(),
    address: z.string().trim().max(255).nullish(),
    category: z.string().trim().max(100).nullish(),
    taxNumber: z.string().trim().max(100).nullish(),
    openingBalance: money,
    creditLimit: z.number().nonnegative().max(999999999999.99),
  })
  .partial()
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermission(request, "suppliers");
    const id = parseUuid((await context.params).id);
    const row = await fetchSupplier(getSql(), id);
    if (!row) throw notFound("Supplier not found.");
    return ok(mapSupplier(row));
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "suppliers");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const existing = await fetchSupplier(sql, id);
    if (!existing) throw notFound("Supplier not found.");
    const before = mapSupplier(existing);

    const input = await parseJson(request, updateSchema);
    try {
      await sql`
        update suppliers
        set
          name = coalesce(${input.name ?? null}, name),
          contact = case when ${input.contact !== undefined} then ${input.contact ?? null} else contact end,
          email = case when ${input.email !== undefined} then ${input.email ?? null} else email end,
          phone = case when ${input.phone !== undefined} then ${input.phone ?? null} else phone end,
          country = case when ${input.country !== undefined} then ${input.country ?? null} else country end,
          city = case when ${input.city !== undefined} then ${input.city ?? null} else city end,
          address = case when ${input.address !== undefined} then ${input.address ?? null} else address end,
          category = case when ${input.category !== undefined} then ${input.category ?? null} else category end,
          tax_number = case when ${input.taxNumber !== undefined} then ${input.taxNumber ?? null} else tax_number end,
          opening_balance = coalesce(${input.openingBalance ?? null}, opening_balance),
          credit_limit = coalesce(${input.creditLimit ?? null}, credit_limit),
          updated_at = now()
        where id = ${id}::uuid and deleted_at is null
      `;

      const after = await fetchSupplier(sql, id);
      const supplier = mapSupplier(after ?? existing);
      await writeAuditLog(sql, {
        actorId: session.appUser.id,
        action: "supplier.update",
        entityType: "supplier",
        entityId: id,
        beforeData: before,
        afterData: supplier,
        ...requestMeta(request),
      });
      return ok(supplier);
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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "suppliers");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const existing = await fetchSupplier(sql, id);
    if (!existing) throw notFound("Supplier not found.");

    await sql`
      update suppliers set deleted_at = now(), updated_at = now()
      where id = ${id}::uuid and deleted_at is null
    `;
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "supplier.delete",
      entityType: "supplier",
      entityId: id,
      beforeData: mapSupplier(existing),
      ...requestMeta(request),
    });
    return ok({ id, deleted: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
