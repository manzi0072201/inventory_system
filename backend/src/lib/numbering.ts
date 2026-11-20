import { badRequest } from "@/lib/errors";
import type { SqlExecutor } from "@/lib/db";

export type DocumentKey =
  | "sale"
  | "purchase"
  | "sale_return"
  | "purchase_return"
  | "payment"
  | "expense"
  | "stock_adjustment"
  | "stock_transfer";

export async function nextDocumentReference(
  sql: SqlExecutor,
  key: DocumentKey,
): Promise<string> {
  const rows = await sql`
    update document_sequences
    set next_number = next_number + 1, updated_at = now()
    where key = ${key}
    returning prefix, next_number
  `;
  const row = rows[0] as { prefix: string; next_number: number | string } | undefined;
  if (!row) {
    throw badRequest(`Document sequence '${key}' is not configured.`);
  }
  return `${row.prefix}${String(row.next_number).padStart(5, "0")}`;
}
