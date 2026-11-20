export type RangePreset =
  | "today"
  | "7d"
  | "30d"
  | "mtd"
  | "ytd"
  | "all"
  | "custom";

export type DateRange = {
  start: string;
  end: string;
  preset: RangePreset;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isValidDate(value: string | null): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && isoDate(parsed) === value;
}

export function toIsoString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function toDateOnlyString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }
  const text = String(value);
  if (DATE_PATTERN.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      return `${parsed.getFullYear()}-${month}-${day}`;
    }
  }
  return text.slice(0, 10);
}

export function parseDateRange(
  params: URLSearchParams,
  now = new Date(),
): DateRange {
  const requestedPreset = params.get("preset") ?? "30d";
  const preset: RangePreset = [
    "today",
    "7d",
    "30d",
    "mtd",
    "ytd",
    "all",
    "custom",
  ].includes(requestedPreset)
    ? (requestedPreset as RangePreset)
    : "30d";

  if (preset === "custom") {
    const start = params.get("start");
    const end = params.get("end");
    if (!isValidDate(start) || !isValidDate(end)) {
      return parseDateRange(new URLSearchParams({ preset: "30d" }), now);
    }
    return { start, end, preset };
  }

  const today = startOfUtcDay(now);
  switch (preset) {
    case "today":
      return { start: isoDate(today), end: isoDate(today), preset };
    case "7d":
      return { start: isoDate(shiftDays(today, -6)), end: isoDate(today), preset };
    case "mtd":
      return {
        start: isoDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))),
        end: isoDate(today),
        preset,
      };
    case "ytd":
      return {
        start: isoDate(new Date(Date.UTC(today.getUTCFullYear(), 0, 1))),
        end: isoDate(today),
        preset,
      };
    case "all":
      return { start: "1970-01-01", end: isoDate(today), preset };
    default:
      return { start: isoDate(shiftDays(today, -29)), end: isoDate(today), preset: "30d" };
  }
}
