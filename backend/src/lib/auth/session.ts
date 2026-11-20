import { getBearerToken, verifyBearerToken, type AuthUser } from "@/lib/auth";
import { auth } from "@/lib/auth/server";
import { getSql } from "@/lib/db";
import { ApiError, forbidden, notFound, unauthorized } from "@/lib/errors";
import type { AppRole, PermissionMap } from "@/lib/permissions";
import { resolveStoredFile } from "@/lib/storage";

export type AppUserProfile = {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  phone: string | null;
  shopZone: string | null;
  avatarUrl: string | null;
  role: AppRole;
  status: "Active" | "Suspended";
  lastLoginAt: string | null;
  permissions: PermissionMap;
};

export type RequestSession = {
  source: "bearer" | "cookie";
  authUser: AuthUser;
  appUser: AppUserProfile;
};

type AppUserRow = {
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
  overrides: Record<string, boolean>;
};

async function loadAppUser(authUser: AuthUser): Promise<AppUserProfile> {
  const sql = getSql();
  const rows = await sql`
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
      coalesce(
        jsonb_object_agg(perm.permission_key, perm.allowed)
          filter (where perm.permission_key is not null),
        '{}'::jsonb
      ) as overrides
    from app_users u
    left join user_permissions perm on perm.user_id = u.id
    where u.auth_user_id = ${authUser.authUserId}
      or (
        ${authUser.email ?? ""}::text <> ''
        and lower(u.email) = lower(${authUser.email ?? ""}::text)
      )
    group by u.id
  `;

  const row = rows[0] as AppUserRow | undefined;
  if (!row) {
    throw notFound("No application profile is linked to this account.");
  }

  if (
    row.auth_user_id.startsWith("seed-") &&
    authUser.email &&
    row.email.toLowerCase() === authUser.email.toLowerCase()
  ) {
    await sql`
      update app_users
      set auth_user_id = ${authUser.authUserId}, updated_at = now()
      where id = ${row.id}::uuid
    `;
    row.auth_user_id = authUser.authUserId;
  }

  if (row.status !== "Active") {
    throw forbidden("This account is suspended.");
  }

  const role: AppRole = row.role === "super_admin" ? "super_admin" : "admin";

  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    shopZone: row.shop_zone,
    avatarUrl: await resolveStoredFile(row.avatar_url),
    role,
    status: "Active",
    lastLoginAt: row.last_login_at,
    permissions: row.overrides ?? {},
  };
}

export async function resolveRequestSession(
  request: Request,
): Promise<RequestSession | null> {
  let authUser: AuthUser;
  let source: RequestSession["source"];

  if (getBearerToken(request)) {
    source = "bearer";
    try {
      authUser = await verifyBearerToken(request);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw unauthorized("Invalid or expired token.");
    }
  } else {
    const { data: session } = await auth.getSession();
    if (!session?.user) return null;
    source = "cookie";
    authUser = {
      authUserId: session.user.id,
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
    };
  }

  const appUser = await loadAppUser(authUser);
  return { source, authUser, appUser };
}

export async function requireRequestSession(
  request: Request,
): Promise<RequestSession> {
  const session = await resolveRequestSession(request);
  if (!session) throw unauthorized();
  return session;
}

export async function touchLastLogin(userId: string): Promise<void> {
  const sql = getSql();
  await sql`
    update app_users
    set last_login_at = now()
    where id = ${userId}::uuid
  `;
}
