import { z } from "zod";
import { getSql } from "@/lib/db";
import { badRequest, conflict, isUniqueViolation, notFound } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requireRole } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";
import { PERMISSION_KEYS, type PermissionKey } from "@/lib/permissions";
import { fetchUser, mapUser, replaceUserPermissions } from "@/lib/users";
import { parseJson, parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const permissionFields = Object.fromEntries(
  PERMISSION_KEYS.map((key) => [key, z.boolean()]),
) as Record<PermissionKey, z.ZodBoolean>;
const permissionsSchema = z.object(permissionFields).partial();

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().max(50).nullish(),
    shopZone: z.string().trim().max(120).nullish(),
    role: z.enum(["super_admin", "admin"]),
    status: z.enum(["Active", "Suspended"]),
    permissions: permissionsSchema.nullable().optional(),
  })
  .partial()
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireRole(request, ["super_admin"]);
    const id = parseUuid((await context.params).id);
    const row = await fetchUser(getSql(), id);
    if (!row) throw notFound("User not found.");
    return ok(await mapUser(row));
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireRole(request, ["super_admin"]);
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const existing = await fetchUser(sql, id);
    if (!existing) throw notFound("User not found.");

    const input = await parseJson(request, updateSchema);
    if (id === session.appUser.id && (input.status || input.role)) {
      throw badRequest("You cannot change your own role or status.");
    }

    if (input.email) {
      const duplicate = await sql`
        select 1 from app_users
        where lower(email) = lower(${input.email})
          and id <> ${id}::uuid
        union all
        select 1 from neon_auth."user"
        where lower(email) = lower(${input.email})
          and id::text <> ${existing.auth_user_id}
        limit 1
      `;
      if (duplicate.length > 0) {
        throw conflict("A user with that email already exists.");
      }
    }

    try {
      await sql`
        update app_users
        set
          name = coalesce(${input.name ?? null}, name),
          email = coalesce(${input.email ?? null}, email),
          phone = case when ${input.phone !== undefined} then ${input.phone ?? null} else phone end,
          shop_zone = case when ${input.shopZone !== undefined} then ${input.shopZone ?? null} else shop_zone end,
          role = coalesce(${input.role ?? null}, role),
          status = coalesce(${input.status ?? null}, status),
          updated_at = now()
        where id = ${id}::uuid
      `;

      if (input.email) {
        await sql`
          update neon_auth."user"
          set
            email = ${input.email},
            "emailVerified" = false,
            "updatedAt" = now()
          where id::text = ${existing.auth_user_id}
        `;
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict("A user with that email already exists.");
      }
      throw error;
    }

    if (input.permissions !== undefined) {
      await replaceUserPermissions(sql, id, input.permissions ?? {});
    }

    const after = await fetchUser(sql, id);
    const user = await mapUser(after ?? existing);
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "user.update",
      entityType: "app_user",
      entityId: id,
      beforeData: await mapUser(existing),
      afterData: user,
      ...requestMeta(request),
    });
    return ok(user);
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requireRole(request, ["super_admin"]);
    const id = parseUuid((await context.params).id);
    if (id === session.appUser.id) {
      throw badRequest("You cannot suspend your own account.");
    }

    const sql = getSql();
    const existing = await fetchUser(sql, id);
    if (!existing) throw notFound("User not found.");

    await sql`
      update app_users
      set status = 'Suspended', updated_at = now()
      where id = ${id}::uuid
    `;
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "user.suspend",
      entityType: "app_user",
      entityId: id,
      beforeData: await mapUser(existing),
      ...requestMeta(request),
    });
    return ok({ id, suspended: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
