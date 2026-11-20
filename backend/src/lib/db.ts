import { neon } from "@neondatabase/serverless";
import { readEnv, requireEnv } from "@/lib/env";

export type SqlExecutor = (
  strings: TemplateStringsArray,
  ...values: any[]
) => Promise<any[]>;

export function getSql() {
  return neon(requireEnv("DATABASE_URL"));
}

export function getAdminSql() {
  const directUrl = readEnv("DIRECT_URL") ?? readEnv("DATABASE_URL_UNPOOLED");
  if (!directUrl) {
    throw new Error("DIRECT_URL is not configured.");
  }
  return neon(directUrl);
}

export function isDatabaseConfigured(): boolean {
  return Boolean(readEnv("DATABASE_URL"));
}
