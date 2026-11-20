import { ok } from "@/lib/http";
import { isDatabaseConfigured } from "@/lib/db";
import { isNeonAuthConfigured } from "@/lib/env";

export function GET() {
  return ok({
    status: "ok",
    service: "inventory-system-backend",
    databaseConfigured: isDatabaseConfigured(),
    authConfigured: isNeonAuthConfigured(),
  });
}
