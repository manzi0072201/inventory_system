import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  normalizePermissions,
  permissionKeys,
  type AdminPermissions,
  type AppUser,
} from "@/lib/access-data";
import type {
  ApiEnvelope,
  BackendProfile,
  BackendSession,
  BackendPermissionMap,
} from "@/lib/api-types";

const backendUrl = (
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://localhost:4000"
).replace(/\/$/, "");

function permissionsFor(profile: BackendProfile): AdminPermissions {
  if (profile.role === "super_admin") {
    return Object.fromEntries(
      permissionKeys.map((key) => [key, true]),
    ) as AdminPermissions;
  }
  return normalizePermissions(profile.permissions as BackendPermissionMap);
}

function toAppUser(profile: BackendProfile): AppUser {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    status: profile.status,
    shopZone: profile.shopZone ?? "",
    phone: profile.phone ?? "",
    avatarUrl: profile.avatarUrl ?? undefined,
    permissions: permissionsFor(profile),
    createdAt: "",
    lastLogin: profile.lastLoginAt,
  };
}

async function fetchSession(cookieHeader: string): Promise<AppUser | null> {
  try {
    const response = await fetch(`${backendUrl}/api/auth/session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiEnvelope<BackendSession>;
    if (!payload.data?.authenticated || !payload.data.profile) return null;
    return toAppUser(payload.data.profile);
  } catch {
    return null;
  }
}

export async function getSessionUserFromRequest(
  request: Request,
): Promise<AppUser | null> {
  return fetchSession(request.headers.get("cookie") ?? "");
}

export async function getSessionUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  return fetchSession(cookieHeader);
}

export function unauthorized(message = "You need to sign in.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Super admin access is required.") {
  return NextResponse.json({ error: message }, { status: 403 });
}
