"use client";

import { useLanguage } from "@/components/language/language-provider";
import { formatReportRange } from "@/lib/reporting";
import { useEffect, useState } from "react";
import { Icon } from "../ui/icon";

type Greeting = "Good morning" | "Good afternoon" | "Good evening";

function greetingForHour(hour: number): Greeting {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function useGreeting(): Greeting | null {
  const [greeting, setGreeting] = useState<Greeting | null>(null);

  useEffect(() => {
    const update = () => setGreeting(greetingForHour(new Date().getHours()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return greeting;
}

export type DashboardPreset = "today" | "7d" | "30d" | "mtd" | "ytd" | "custom";

const ranges: { value: DashboardPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "mtd", label: "MTD" },
  { value: "ytd", label: "YTD" },
  { value: "custom", label: "Custom" },
];

type GreetingBarProps = {
  name: string;
  range: DashboardPreset;
  onRangeChange: (range: DashboardPreset) => void;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  warehouse: string;
  warehouseOptions: string[];
  onWarehouseChange: (warehouse: string) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  refreshed: boolean;
  onRefresh: () => void;
};

export function GreetingBar({
  name,
  range,
  onRangeChange,
  start,
  end,
  onStartChange,
  onEndChange,
  warehouse,
  warehouseOptions,
  onWarehouseChange,
  currency,
  onCurrencyChange,
  refreshed,
  onRefresh,
}: GreetingBarProps) {
  const greeting = useGreeting();
  const { t } = useLanguage();

  return (
    <div className="page-heading" data-purpose="dashboard-greeting-bar">
      <div>
        <h1>{greeting ? `${t(greeting)}, ${name}` : name}</h1>
        <p>{formatReportRange(start, end)} · {warehouse} · Figures in RWF</p>
      </div>
      <div className="filters">
        <div className="range-tabs">
          {ranges.map((item) => (
            <button
              key={item.value}
              type="button"
              className={range === item.value ? "selected" : ""}
              onClick={() => onRangeChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="report-filter-field">
          <span>From</span>
          <input
            type="date"
            className="filter-input"
            value={start}
            max={end}
            onChange={(event) => onStartChange(event.target.value)}
          />
        </label>
        <label className="report-filter-field">
          <span>To</span>
          <input
            type="date"
            className="filter-input"
            value={end}
            min={start}
            onChange={(event) => onEndChange(event.target.value)}
          />
        </label>
        <select
          value={warehouse}
          onChange={(event) => onWarehouseChange(event.target.value)}
        >
          {warehouseOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={currency}
          onChange={(event) => onCurrencyChange(event.target.value)}
        >
          <option value="RWF">RWF</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
        <button type="button" className="refresh-button" onClick={onRefresh}>
          <Icon name="refresh" className={`w-[15px] h-[15px] ${refreshed ? "spin" : ""}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
