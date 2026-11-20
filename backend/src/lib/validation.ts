import { z, ZodError, type ZodType } from "zod";
import { ApiError, badRequest } from "@/lib/errors";

export function formatIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(
      422,
      "VALIDATION_FAILED",
      "Request validation failed.",
      formatIssues(result.error),
    );
  }
  return result.data;
}

export const uuid = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Invalid id.",
  );

export const storedFileValue = z.string().max(2048).refine(
  (value) =>
    /^https?:\/\//i.test(value) ||
    /^[A-Za-z0-9/_-]+(?:\.[A-Za-z0-9]+)?$/.test(value),
  "Must be a URL or a storage object key.",
);

export function parseUuid(value: string, label = "id"): string {
  if (!uuid.safeParse(value).success) {
    throw badRequest(`Invalid ${label}.`);
  }
  return value;
}

const QUERY_CONTROL_KEYS = new Set([
  "page",
  "pageSize",
  "sort",
  "direction",
  "preset",
  "start",
  "end",
  "format",
  "granularity",
  "limit",
  "groupBy",
  "asOf",
]);

export function parseQuery<T>(params: URLSearchParams, schema: ZodType<T>): T {
  const entries = [...params.entries()].filter(
    ([key]) => !QUERY_CONTROL_KEYS.has(key),
  );
  const result = schema.safeParse(Object.fromEntries(entries));
  if (!result.success) {
    throw new ApiError(
      422,
      "VALIDATION_FAILED",
      "Query validation failed.",
      formatIssues(result.error),
    );
  }
  return result.data;
}
