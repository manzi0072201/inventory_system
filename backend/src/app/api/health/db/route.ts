import { fail, ok } from "@/lib/http";
import { getSql, isDatabaseConfigured } from "@/lib/db";
import { serviceUnavailable } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return fail(serviceUnavailable("DATABASE_URL is not configured."));
  }

  try {
    const sql = getSql();
    await sql`select 1`;
    return ok({ status: "ok", database: "connected" });
  } catch {
    return fail(serviceUnavailable("Database is unavailable."));
  }
}
