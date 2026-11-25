import { getSql } from "@/lib/db";

export const DEFAULT_SESSION_TIMEOUT_MINUTES = 120;
const MIN_SESSION_TIMEOUT_MINUTES = 1;
const MAX_SESSION_TIMEOUT_MINUTES = 1440;

type SettingsRow = {
  security: Record<string, unknown> | null;
};

export async function getSessionTimeoutMinutes(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`select security from app_settings where id`) as SettingsRow[];
  const raw = rows[0]?.security?.sessionTimeoutMinutes;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_SESSION_TIMEOUT_MINUTES;
  return Math.min(
    MAX_SESSION_TIMEOUT_MINUTES,
    Math.max(MIN_SESSION_TIMEOUT_MINUTES, Math.round(parsed)),
  );
}
