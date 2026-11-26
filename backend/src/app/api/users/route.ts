import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { badRequest, conflict, isUniqueViolation } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requireRole } from "@/lib/http";
import { isOwnerEmail } from "@/lib/owner-access";
import { paginate, parsePagination } from "@/lib/pagination";
import { PERMISSION_KEYS, type PermissionKey } from "@/lib/permissions";
import { parseSort, sortRows } from "@/lib/sorting";
import { fetchUser, fetchUsers, mapUser, replaceUserPermissions } from "@/lib/users";
import { parseJson, parseQuery, parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

type AuthAdmin = {
  createUser(input: {
    email: string;
    name: string;
    password: string;
  }): Promise<{
    data?: { user?: { id?: string } } | null;
    error?: { message?: string } | null;
  }>;
  removeUser(input: { userId: string }): Promise<unknown>;
};

const authAdmin = (auth as unknown as { admin?: AuthAdmin }).admin;

const permissionFields = Object.fromEntries(
  PERMISSION_KEYS.map((key) => [key, z.boolean()]),
) as Record<PermissionKey, z.ZodBoolean>;
const permissionsSchema = z.object(permissionFields).partial();

const fields = {
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(50).nullish(),
  shopZone: z.string().trim().max(120).nullish(),
  role: z.enum(["super_admin", "admin"]),
  status: z.enum(["Active", "Suspended"]).optional(),
  permissions: permissionsSchema.nullable().optional(),
};

const createSchema = z.object(fields).strict();
const updateSchema = z.object(fields).partial().strict();

const listSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    role: z.enum(["super_admin", "admin"]).optional(),
    status: z.enum(["Active", "Suspended"]).optional(),
  })
  .strict();

export async function GET(request: Request) {
  try {
    await requireRole(request, ["super_admin"]);
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const sort = parseSort(
      params,
      ["name", "email", "role", "status", "createdAt"],
      "name",
      "asc",
    );

    let items = (await Promise.all((await fetchUsers(sql)).map(mapUser))).filter(
      (item) => !isOwnerEmail(item.email),
    );
    const term = query.q?.toLowerCase();
    if (term) {
      items = items.filter((item) =>
        [item.name, item.email, item.phone, item.shopZone].some((value) =>
          value?.toLowerCase().includes(term),
        ),
      );
    }
    if (query.role) items = items.filter((item) => item.role === query.role);
    if (query.status) items = items.filter((item) => item.status === query.status);

    const result = paginate(sortRows(items, sort), pagination);
    return ok(result.rows, 200, { pagination: result.meta });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, ["super_admin"]);
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    if (!authAdmin) {
      throw badRequest("Administrative auth actions are not available.");
    }
    const { data, error } = await authAdmin.createUser({
      email: input.email,
      name: input.name,
      password: input.password,
    });
    if (error) {
      throw badRequest(error.message ?? "Failed to create the auth account.");
    }
    const authUserId = data?.user?.id;
    if (!authUserId) {
      throw badRequest("The auth account was created without an id.");
    }

    const id = crypto.randomUUID();
    try {
      await sql`
        insert into app_users (
          id, auth_user_id, email, name, phone, shop_zone, role, status
        )
        values (
          ${id}::uuid,
          ${authUserId},
          ${input.email},
          ${input.name},
          ${input.phone ?? null},
          ${input.shopZone ?? null},
          ${input.role},
          ${input.status ?? "Active"}
        )
      `;
      if (input.permissions) {
        await replaceUserPermissions(sql, id, input.permissions);
      }
    } catch (dbError) {
      await authAdmin.removeUser({ userId: authUserId });
      if (isUniqueViolation(dbError)) {
        throw conflict("A user with that email already exists.");
      }
      throw dbError;
    }

    const created = await fetchUser(sql, id);
    const user = await mapUser(created!);
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "user.create",
      entityType: "app_user",
      entityId: id,
      afterData: user,
      ...requestMeta(request),
    });
    return ok(user, 201);
  } catch (error) {
    return failUnexpected(error);
  }
}
