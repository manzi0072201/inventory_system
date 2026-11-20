import { toIsoString } from "@/lib/date-range";
import type { SqlExecutor } from "@/lib/db";
import type { AppRole, PermissionMap } from "@/lib/permissions";
import { resolveStoredFile } from "@/lib/storage";

export type UserRow = {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  phone: string | null;
  shop_zone: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: unknown;
  updated_at: unknown;
  overrides: Record<string, boolean>;
};

export async function mapUser(row: UserRow) {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    shopZone: row.shop_zone,
    avatarUrl: await resolveStoredFile(row.avatar_url),
    role: row.role as AppRole,
    status: row.status as "Active" | "Suspended",
    lastLoginAt: row.last_login_at,
    permissions: (row.overrides ?? {}) as PermissionMap,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

const selectUsers = (sql: SqlExecutor) => sql`
  select
    u.id::text as id,
    u.auth_user_id,
    u.email,
    u.name,
    u.phone,
    u.shop_zone,
    u.avatar_url,
    u.role,
    u.status,
    u.last_login_at::text as last_login_at,
    u.created_at,
    u.updated_at,
    coalesce(
      jsonb_object_agg(perm.permission_key, perm.allowed)
        filter (where perm.permission_key is not null),
      '{}'::jsonb
    ) as overrides
  from app_users u
  left join user_permissions perm on perm.user_id = u.id
  group by u.id
`;

export async function fetchUsers(sql: SqlExecutor) {
  return (await selectUsers(sql)) as UserRow[];
}

export async function fetchUser(sql: SqlExecutor, id: string) {
  const rows = (await sql`
    select
      u.id::text as id,
      u.auth_user_id,
      u.email,
      u.name,
      u.phone,
      u.shop_zone,
      u.avatar_url,
      u.role,
      u.status,
      u.last_login_at::text as last_login_at,
      u.created_at,
      u.updated_at,
      coalesce(
        jsonb_object_agg(perm.permission_key, perm.allowed)
          filter (where perm.permission_key is not null),
        '{}'::jsonb
      ) as overrides
    from app_users u
    left join user_permissions perm on perm.user_id = u.id
    where u.id = ${id}::uuid
    group by u.id
  `) as UserRow[];
  return rows[0];
}

export async function replaceUserPermissions(
  sql: SqlExecutor,
  userId: string,
  permissions: PermissionMap,
) {
  await sql`
    delete from user_permissions where user_id = ${userId}::uuid
  `;
  const entries = Object.entries(permissions).filter(
    ([, allowed]) => typeof allowed === "boolean",
  );
  for (const [key, allowed] of entries) {
    await sql`
      insert into user_permissions (user_id, permission_key, allowed)
      values (${userId}::uuid, ${key}, ${allowed})
      on conflict (user_id, permission_key) do update
      set allowed = excluded.allowed
    `;
  }
}
