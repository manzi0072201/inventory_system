import { z } from "zod";
import { NextResponse } from "next/server";
import {
  parseDateRange,
  toIsoString,
  type DateRange,
  type RangePreset,
} from "@/lib/date-range";
import { badRequest, unprocessable } from "@/lib/errors";
import { ok } from "@/lib/http";
import { uuid } from "@/lib/validation";

export type ReportFormat = "json" | "csv";
export type Granularity = "day" | "week" | "month";

const RANGE_PRESETS: RangePreset[] = [
  "today",
  "7d",
  "30d",
  "mtd",
  "ytd",
  "all",
  "custom",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | null): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseReportRange(params: URLSearchParams): DateRange {
  const requested = params.get("preset") ?? "30d";
  if (!RANGE_PRESETS.includes(requested as RangePreset)) {
    throw badRequest("Invalid date preset.");
  }
  if (requested === "custom") {
    const start = params.get("start");
    const end = params.get("end");
    if (!isIsoDate(start) || !isIsoDate(end) || start > end) {
      throw badRequest("Custom ranges require valid start and end dates.");
    }
    return { start, end, preset: "custom" };
  }
  return parseDateRange(params);
}

export function parseWarehouseId(params: URLSearchParams): string | undefined {
  const value = params.get("warehouseId");
  if (!value) return undefined;
  if (!uuid.safeParse(value).success) {
    throw badRequest("Invalid warehouse.");
  }
  return value;
}

export function parseReportFormat(params: URLSearchParams): ReportFormat {
  const value = params.get("format") ?? "json";
  if (value !== "json" && value !== "csv") {
    throw badRequest("Invalid export format.");
  }
  return value;
}

export function parseLimit(params: URLSearchParams, fallback: number, max: number): number {
  const raw = params.get("limit");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw badRequest(`Limit must be between 1 and ${max}.`);
  }
  return value;
}

export function parseGranularity(params: URLSearchParams): Granularity {
  const value = params.get("granularity") ?? "day";
  if (value !== "day" && value !== "week" && value !== "month") {
    throw badRequest("Invalid trend granularity.");
  }
  return value;
}

export function parseGroupBy<T extends string>(
  params: URLSearchParams,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = params.get("groupBy");
  if (!value) return fallback;
  if (!allowed.includes(value as T)) {
    throw badRequest("Invalid groupBy value.");
  }
  return value as T;
}

export function parseAsOfDate(params: URLSearchParams, fallback: string): string {
  const value = params.get("asOf");
  if (!value) return fallback;
  if (!isIsoDate(value)) throw badRequest("Invalid as-of date.");
  return value;
}

export function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function dateText(value: unknown): string {
  return toIsoString(value)?.slice(0, 10) ?? "";
}

export function bucketDate(date: string, granularity: Granularity): string {
  if (granularity === "day") return date;
  if (granularity === "month") return `${date.slice(0, 7)}-01`;
  const parsed = new Date(`${date}T00:00:00Z`);
  const mondayOffset = (parsed.getUTCDay() + 6) % 7;
  parsed.setUTCDate(parsed.getUTCDate() - mondayOffset);
  return parsed.toISOString().slice(0, 10);
}

export function buildBuckets(range: DateRange, granularity: Granularity): string[] {
  const buckets: string[] = [];
  const end = new Date(`${range.end}T00:00:00Z`);
  const cursor = new Date(`${range.start}T00:00:00Z`);

  while (cursor <= end) {
    buckets.push(bucketDate(cursor.toISOString().slice(0, 10), granularity));
    if (buckets.length > 2000) {
      throw unprocessable("Date range is too large for this report.");
    }
    if (granularity === "day") {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    } else if (granularity === "week") {
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    } else {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  return [...new Set(buckets)];
}

export function addAmount(map: Map<string, number>, key: string, amount: number): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  }
  return lines.join("\r\n");
}

export function reportResponse<T>(
  payload: T,
  csvRows: Record<string, unknown>[],
  filename: string,
  format: ReportFormat,
) {
  if (format === "csv") {
    return new NextResponse(toCsv(csvRows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }
  return ok(payload);
}
