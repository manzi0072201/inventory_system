import { NextResponse } from "next/server";
import { requireRequestSession, type RequestSession } from "@/lib/auth/session";
import { API_VERSION } from "@/lib/env";
import { ApiError, forbidden, isCheckViolation, unprocessable } from "@/lib/errors";
import {
  assertPermission,
  type AppRole,
  type PermissionKey,
} from "@/lib/permissions";

export type ApiMeta = Record<string, unknown>;

export function ok<T>(data: T, status = 200, meta: ApiMeta = {}) {
  return NextResponse.json(
    { data, meta: { version: API_VERSION, ...meta } },
    { status },
  );
}

export function fail(error: ApiError) {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
      meta: { version: API_VERSION },
    },
    { status: error.status },
  );
}

export function failUnexpected(error: unknown) {
  const apiError =
    error instanceof ApiError
      ? error
      : isCheckViolation(error)
        ? unprocessable("The request violates a database constraint.")
        : new ApiError(500, "INTERNAL_ERROR", "Unexpected server error.");
  return fail(apiError);
}

export async function requirePermission(
  request: Request,
  permission: PermissionKey,
): Promise<RequestSession> {
  const session = await requireRequestSession(request);
  assertPermission(session.appUser.role, session.appUser.permissions, permission);
  return session;
}

export async function requireRole(
  request: Request,
  roles: readonly AppRole[],
): Promise<RequestSession> {
  const session = await requireRequestSession(request);
  if (!roles.includes(session.appUser.role)) {
    throw forbidden("Only super administrators can perform this action.");
  }
  return session;
}

export function requestMeta(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent") ?? null,
  };
}
