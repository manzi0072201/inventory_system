import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { QueryTag } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { readEnv } from "@/lib/env";
import { tooManyRequests, unauthorized } from "@/lib/errors";

export type OwnerEventType =
  | "access_granted"
  | "access_denied"
  | "role_changed";

export type OwnerEventInput = {
  eventType: OwnerEventType;
  actorUserId?: string | null;
  actorEmail?: string | null;
  detail?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

export function hashOwnerSecret(secret: string): string {
  const salt = randomBytes(16);
  const digest = scryptSync(secret, salt, 32);
  return `scrypt:${salt.toString("hex")}:${digest.toString("hex")}`;
}

export function verifyOwnerSecret(secret: string, storedHash: string): boolean {
  const [algorithm, saltHex, digestHex] = storedHash.split(/[$:]/);
  if (algorithm !== "scrypt" || !saltHex || !digestHex) return false;

  const expected = Buffer.from(digestHex, "hex");
  if (expected.length === 0) return false;

  const actual = scryptSync(secret, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function getOwnerEmail(): string | null {
  return readEnv("OWNER_EMAIL")?.toLowerCase() ?? null;
}

export function isOwnerEmail(email: string): boolean {
  const ownerEmail = getOwnerEmail();
  return Boolean(ownerEmail && email.toLowerCase() === ownerEmail);
}

export function ownerRateLimitKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

export async function recordOwnerEvent(input: OwnerEventInput): Promise<void> {
  const sql = getSql();
  await sql`
    insert into owner_access_events (
      event_type,
      actor_user_id,
      actor_email,
      detail,
      ip_address,
      user_agent
    )
    values (
      ${input.eventType},
      ${input.actorUserId ?? null},
      ${input.actorEmail ?? null},
      ${JSON.stringify(input.detail ?? null)}::jsonb,
      ${input.ipAddress ?? null},
      ${input.userAgent ?? null}
    )
  `;
}

export async function assertOwnerRateLimit(key: string): Promise<void> {
  const sql = getSql();
  const rows = (await sql`
    select
      failed_count,
      first_failed_at::text as first_failed_at,
      blocked_until::text as blocked_until
    from owner_access_attempts
    where key = ${key}
  `) as Array<{
    failed_count: number;
    first_failed_at: string | null;
    blocked_until: string | null;
  }>;

  const row = rows[0];
  if (!row) return;

  const now = Date.now();
  const blockedUntil = row.blocked_until
    ? new Date(row.blocked_until).getTime()
    : 0;
  const firstFailedAt = row.first_failed_at
    ? new Date(row.first_failed_at).getTime()
    : 0;

  if (blockedUntil > now) {
    throw tooManyRequests("Too many owner access attempts. Try again later.");
  }

  const expired =
    !firstFailedAt || now - firstFailedAt >= RATE_LIMIT_WINDOW_MS;
  if (expired || Number(row.failed_count) < MAX_FAILED_ATTEMPTS) return;

  await sql`
    update owner_access_attempts
    set blocked_until = now() + ${RATE_LIMIT_WINDOW_MS / 1000} * interval '1 second'
    where key = ${key}
  `;
  throw tooManyRequests("Too many owner access attempts. Try again later.");
}

export async function recordOwnerFailure(
  key: string,
  request: Request,
  input: Omit<OwnerEventInput, "eventType">,
): Promise<void> {
  const sql: QueryTag = getSql();
  await sql`
    insert into owner_access_attempts (
      key,
      failed_count,
      first_failed_at,
      last_failed_at
    )
    values (${key}, 1, now(), now())
    on conflict (key) do update
    set
      failed_count = case
        when owner_access_attempts.first_failed_at < now() - ${RATE_LIMIT_WINDOW_MS / 1000} * interval '1 second'
          then 1
        else owner_access_attempts.failed_count + 1
      end,
      first_failed_at = case
        when owner_access_attempts.first_failed_at < now() - ${RATE_LIMIT_WINDOW_MS / 1000} * interval '1 second'
          then now()
        else owner_access_attempts.first_failed_at
      end,
      last_failed_at = now(),
      blocked_until = case
        when owner_access_attempts.first_failed_at < now() - ${RATE_LIMIT_WINDOW_MS / 1000} * interval '1 second'
          then null
        else owner_access_attempts.blocked_until
      end
  `;

  await recordOwnerEvent({
    ...input,
    eventType: "access_denied",
    ipAddress:
      input.ipAddress ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null,
    userAgent: input.userAgent ?? request.headers.get("user-agent") ?? null,
  });
}

export async function clearOwnerFailures(key: string): Promise<void> {
  const sql = getSql();
  await sql`delete from owner_access_attempts where key = ${key}`;
}

export function ownerSecretConfigured(): boolean {
  return Boolean(readEnv("OWNER_ACCESS_SECRET_HASH"));
}

export function requireOwnerSecretHash(): string {
  const hash = readEnv("OWNER_ACCESS_SECRET_HASH");
  if (!hash) {
    throw unauthorized("Owner access is not configured.");
  }
  return hash;
}
