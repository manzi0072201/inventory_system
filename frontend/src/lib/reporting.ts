export type ReportTab =
  | "overview"
  | "sales"
  | "purchases"
  | "inventory"
  | "customers"
  | "suppliers"
  | "finance";

export type RangePreset = "7d" | "30d" | "90d" | "ytd" | "all" | "custom";

export type AgingBuckets = {
  current: number;
  days1: number;
  days31: number;
  days61: number;
  days90: number;
};

export type TrendBucket = {
  key: string;
  label: string;
  fullLabel: string;
};

export type ReportKpi = {
  label: string;
  value: string;
  note: string;
  tone: "purple" | "blue" | "green" | "orange" | "pink" | "gray";
};

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromIso(value: string): Date {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : parsed;
}

export function todayIso(): string {
  return isoDate(startOfDay(new Date()));
}

export function shiftIsoDays(value: string, days: number): string {
  const date = dateFromIso(value);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function daysBetween(from: string, to: string): number {
  const start = dateFromIso(from).getTime();
  const end = dateFromIso(to).getTime();
  return Math.round((end - start) / 86400000);
}

export function formatReportDate(value: string): string {
  const date = dateFromIso(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatReportRange(start: string, end: string): string {
  return `${formatReportDate(start)} to ${formatReportDate(end)}`;
}

export function formatCompactMoney(value: number): string {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1_000_000_000) {
    return `${sign}RWF ${(absolute / 1_000_000_000).toFixed(1)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${sign}RWF ${(absolute / 1_000_000).toFixed(1)}M`;
  }
  if (absolute >= 1_000) {
    return `${sign}RWF ${(absolute / 1_000).toFixed(1)}K`;
  }
  return `${sign}RWF ${absolute.toFixed(0)}`;
}

export function formatAxisMoney(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(Math.round(value));
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function safeRatio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function sumBy<T>(items: T[], select: (item: T) => number): number {
  return items.reduce((sum, item) => sum + select(item), 0);
}

export function groupSum<T, K extends string>(
  items: T[],
  key: (item: T) => K,
  value: (item: T) => number,
): Record<K, number> {
  const result = {} as Record<K, number>;
  for (const item of items) {
    const group = key(item);
    result[group] = (result[group] ?? 0) + value(item);
  }
  return result;
}

export function createAging(): AgingBuckets {
  return { current: 0, days1: 0, days31: 0, days61: 0, days90: 0 };
}

export function addToAging(
  aging: AgingBuckets,
  invoiceDate: string,
  asOf: string,
  amount: number,
) {
  const age = daysBetween(invoiceDate, asOf);
  if (age <= 0) {
    aging.current += amount;
  } else if (age <= 30) {
    aging.days1 += amount;
  } else if (age <= 60) {
    aging.days31 += amount;
  } else if (age <= 90) {
    aging.days61 += amount;
  } else {
    aging.days90 += amount;
  }
}

export function agingTotal(aging: AgingBuckets): number {
  return (
    aging.current + aging.days1 + aging.days31 + aging.days61 + aging.days90
  );
}

function trendMode(start: string, end: string): "day" | "week" | "month" {
  const span = Math.max(1, daysBetween(start, end));
  if (span <= 45) return "day";
  if (span <= 180) return "week";
  return "month";
}

export function makeDateBuckets(
  start: string,
  end: string,
): TrendBucket[] {
  const mode = trendMode(start, end);
  const buckets: TrendBucket[] = [];

  if (mode === "month") {
    const cursor = dateFromIso(start);
    cursor.setDate(1);
    const last = dateFromIso(end);
    while (cursor <= last) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        key,
        label: cursor.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        fullLabel: cursor.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  const step = mode === "week" ? 7 : 1;
  let cursor = start;
  while (cursor <= end) {
    const date = dateFromIso(cursor);
    buckets.push({
      key: cursor,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullLabel: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    });
    cursor = shiftIsoDays(cursor, step);
  }
  return buckets;
}

export function trendKeyFor(
  date: string,
  start: string,
  end: string,
): string {
  const mode = trendMode(start, end);
  if (mode === "day") return date;
  if (mode === "month") return date.slice(0, 7);
  const offset = Math.max(0, daysBetween(start, date));
  return shiftIsoDays(start, Math.floor(offset / 7) * 7);
}

export function trendLabelFor(key: string, start: string, end: string): string {
  const mode = trendMode(start, end);
  if (mode === "month") {
    const date = dateFromIso(`${key}-01`);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  }
  const date = dateFromIso(key);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function trendFullLabelFor(
  key: string,
  start: string,
  end: string,
): string {
  const mode = trendMode(start, end);
  if (mode === "month") {
    const date = dateFromIso(`${key}-01`);
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }
  const date = dateFromIso(key);
  const suffix = mode === "week" ? " (week of)" : "";
  return `${date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })}${suffix}`;
}

export function catalogCostRatio(costs: number[], prices: number[]): number {
  const totalCost = sumBy(costs, (value) => value);
  const totalPrice = sumBy(prices, (value) => value);
  return safeRatio(totalCost, totalPrice);
}

export function downloadCsv(
  filename: string,
  rows: Array<Array<string | number>>,
) {
  const content = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",\n]/.test(value)
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(","),
    )
    .join("\r\n");
  const blob = new Blob([`\ufeff${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
