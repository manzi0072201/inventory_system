export type SortDirection = "asc" | "desc";

export type Sort = {
  field: string;
  direction: SortDirection;
};

export function parseSort(
  params: URLSearchParams,
  allowedFields: readonly string[],
  fallbackField: string,
  fallbackDirection: SortDirection = "desc",
): Sort {
  const requestedField = params.get("sort") ?? fallbackField;
  const field = allowedFields.includes(requestedField)
    ? requestedField
    : fallbackField;
  const requestedDirection = params.get("direction");
  const direction: SortDirection =
    requestedDirection === "asc" || requestedDirection === "desc"
      ? requestedDirection
      : fallbackDirection;
  return { field, direction };
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  sort: Sort,
): T[] {
  const multiplier = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort(
    (a, b) => multiplier * compareValues(a[sort.field], b[sort.field]),
  );
}
