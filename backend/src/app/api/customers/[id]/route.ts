import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { conflict, isUniqueViolation, notFound } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { fetchCustomer, mapCustomer } from "@/lib/parties";
import { parseJson, parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const money = z.number().min(-999999999999.99).max(999999999999.99);

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    type: z.enum(["Individual", "Business"]),
    email: z.string().trim().email().max(255).nullish(),
    phone: z.string().trim().max(50).nullish(),
    country: z.string().trim().max(100).nullish(),
    city: z.string().trim().max(100).nullish(),
    address: z.string().trim().max(255).nullish(),
    taxNumber: z.string().trim().max(100).nullish(),
    openingBalance: money,
    creditLimit: z.number().nonnegative().max(999999999999.99),
  })
  .partial()
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermission(request, "customers");
    const id = parseUuid((await context.params).id);
    const row = await fetchCustomer(getSql(), id);
    if (!row) throw notFound("Customer not found.");
    return ok(mapCustomer(row));
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "customers");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const existing = await fetchCustomer(sql, id);
    if (!existing) throw notFound("Customer not found.");
    const before = mapCustomer(existing);

    const input = await parseJson(request, updateSchema);
    try {
      await sql`
        update customers
        set
          name = coalesce(${input.name ?? null}, name),
          type = coalesce(${input.type ?? null}, type),
          email = case when ${input.email !== undefined} then ${input.email ?? null} else email end,
          phone = case when ${input.phone !== undefined} then ${input.phone ?? null} else phone end,
          country = case when ${input.country !== undefined} then ${input.country ?? null} else country end,
          city = case when ${input.city !== undefined} then ${input.city ?? null} else city end,
          address = case when ${input.address !== undefined} then ${input.address ?? null} else address end,
          tax_number = case when ${input.taxNumber !== undefined} then ${input.taxNumber ?? null} else tax_number end,
          opening_balance = coalesce(${input.openingBalance ?? null}, opening_balance),
          credit_limit = coalesce(${input.creditLimit ?? null}, credit_limit),
          updated_at = now()
        where id = ${id}::uuid and deleted_at is null
      `;

      const after = await fetchCustomer(sql, id);
      const customer = mapCustomer(after ?? existing);
      await writeAuditLog(sql, {
        actorId: session.appUser.id,
        action: "customer.update",
        entityType: "customer",
        entityId: id,
        beforeData: before,
        afterData: customer,
        ...requestMeta(request),
      });
      return ok(customer);
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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "customers");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const existing = await fetchCustomer(sql, id);
    if (!existing) throw notFound("Customer not found.");

    await sql`
      update customers set deleted_at = now(), updated_at = now()
      where id = ${id}::uuid and deleted_at is null
    `;
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "customer.delete",
      entityType: "customer",
      entityId: id,
      beforeData: mapCustomer(existing),
      ...requestMeta(request),
    });
    return ok({ id, deleted: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
