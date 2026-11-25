import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { requireRequestSession } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { API_VERSION, requireEnv } from "@/lib/env";
import { serviceUnavailable, unauthorized } from "@/lib/errors";
import { failUnexpected, ok } from "@/lib/http";
import {
  assertOwnerRateLimit,
  clearOwnerFailures,
  getOwnerEmail,
  ownerRateLimitKey,
  recordOwnerEvent,
  recordOwnerFailure,
  requireOwnerSecretHash,
  verifyOwnerSecret,
} from "@/lib/owner-access";
import { parseJson } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const accessSchema = z
  .object({
    secret: z.string().trim().min(1).max(200),
  })
  .strict();

const roleSchema = z
  .object({
    role: z.enum(["super_admin", "admin"]),
  })
  .strict();

function responseWithCookies(
  payload: unknown,
  cookies: string[],
): NextResponse {
  const response = new NextResponse(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  for (const cookie of cookies) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, accessSchema);
    const rateLimitKey = ownerRateLimitKey(request);
    await assertOwnerRateLimit(rateLimitKey);

    const email = getOwnerEmail();
    if (!email) {
      throw serviceUnavailable("Owner access is not configured.");
    }

    const sql = getSql();
    const ownerRows = (await sql`
      select id::text as id, role
      from app_users
      where lower(email) = lower(${email})
      limit 1
    `) as Array<{ id: string; role: string }>;
    const owner = ownerRows[0];

    if (!owner || owner.role !== "super_admin") {
      await recordOwnerFailure(rateLimitKey, request, {
        actorUserId: owner?.id ?? null,
        actorEmail: email,
        detail: { reason: "owner_profile_missing_or_not_super_admin" },
      });
      throw unauthorized("Owner access was denied.");
    }

    if (!verifyOwnerSecret(input.secret, requireOwnerSecretHash())) {
      await recordOwnerFailure(rateLimitKey, request, {
        actorUserId: owner.id,
        actorEmail: email,
        detail: { reason: "invalid_secret" },
      });
      throw unauthorized("Owner access was denied.");
    }

    const signInUrl = new URL("/api/auth/sign-in/email", request.url);
    const signInResponse = await auth.handler().POST(
      new Request(signInUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password: requireEnv("OWNER_LOGIN_PASSWORD"),
        }),
      }),
      { params: Promise.resolve({ path: ["sign-in", "email"] }) },
    );

    if (!signInResponse.ok) {
      const failure = (await signInResponse.json().catch(() => null)) as {
        error?: { message?: string } | string;
        message?: string;
      } | null;
      const message =
        typeof failure?.error === "string"
          ? failure.error
          : failure?.error?.message ??
            failure?.message ??
            "Owner sign-in failed.";
      await recordOwnerFailure(rateLimitKey, request, {
        actorUserId: owner.id,
        actorEmail: email,
        detail: { reason: "auth_sign_in_failed", message },
      });
      throw unauthorized("Owner access was denied.");
    }

    await clearOwnerFailures(rateLimitKey);
    const cookieHeaders = signInResponse.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const cookies = cookieHeaders.getSetCookie?.() ?? [];
    if (cookies.length === 0) {
      const cookie = signInResponse.headers.get("set-cookie");
      if (cookie) cookies.push(cookie);
    }

    await recordOwnerEvent({
      eventType: "access_granted",
      actorUserId: owner.id,
      actorEmail: email,
      detail: { method: "owner_access_secret" },
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return responseWithCookies(
      {
        data: { authenticated: true, role: "super_admin", ownerAccess: true },
        meta: { version: API_VERSION },
      },
      cookies,
    );
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireRequestSession(request);
    if (!session.appUser.ownerAccess) {
      throw unauthorized("Only the owner can switch this role.");
    }

    const input = await parseJson(request, roleSchema);
    const sql = getSql();
    await sql`
      insert into owner_role_overrides (user_id, role, updated_at)
      values (${session.appUser.id}::uuid, ${input.role}, now())
      on conflict (user_id) do update
      set role = excluded.role, updated_at = now()
    `;

    await recordOwnerEvent({
      eventType: "role_changed",
      actorUserId: session.appUser.id,
      actorEmail: session.appUser.email,
      detail: {
        fromRole: session.appUser.role,
        toRole: input.role,
      },
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return ok({ role: input.role, ownerAccess: true });
  } catch (error) {
    return failUnexpected(error);
  }
}

export function GET() {
  return NextResponse.json(
    {
      error: {
        code: "BAD_REQUEST",
        message: "Use POST for owner access.",
        details: null,
      },
      meta: { version: API_VERSION },
    },
    { status: 400 },
  );
}
