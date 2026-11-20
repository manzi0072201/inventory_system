"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";

type DatePickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const POPOVER_WIDTH = 248;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toISO(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseISO(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDisplay(value: string) {
  const date = parseISO(value);
  if (!date) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date",
  allowClear = true,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8),
    );
    const top =
      window.innerHeight - rect.bottom < 330
        ? Math.max(8, rect.top - 330)
        : rect.bottom + 6;
    setPosition({ top, left });
  }, []);

  const openPicker = () => {
    const selected = parseISO(value);
    setViewDate(startOfMonth(selected ?? new Date()));
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const today = toISO(new Date());

  const selectDate = (date: Date) => {
    onChange(toISO(date));
    setOpen(false);
  };

  const popover = (
    <div
      ref={popoverRef}
      className="date-picker-popover"
      role="dialog"
      aria-label="Choose date"
      style={{ top: position.top, left: position.left }}
    >
      <div className="date-picker-head">
        <button
          type="button"
          className="date-picker-nav"
          aria-label="Previous month"
          onClick={() =>
            setViewDate(
              new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1),
            )
          }
        >
          <Icon name="arrowLeft" className="w-3 h-3" />
        </button>
        <strong>{monthLabel}</strong>
        <button
          type="button"
          className="date-picker-nav"
          aria-label="Next month"
          onClick={() =>
            setViewDate(
              new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1),
            )
          }
        >
          <Icon name="arrowRight" className="w-3 h-3" />
        </button>
      </div>
      <div className="date-picker-week" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="date-picker-grid">
        {days.map((date) => {
          const iso = toISO(date);
          const isSelected = iso === value;
          const isToday = iso === today;
          const isMuted = date.getMonth() !== viewDate.getMonth();
          return (
            <button
              key={iso}
              type="button"
              className={`date-picker-day${isMuted ? " muted" : ""}${
                isToday ? " today" : ""
              }${isSelected ? " selected" : ""}`}
              aria-label={date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              aria-pressed={isSelected}
              onClick={() => selectDate(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="date-picker-foot">
        <button type="button" onClick={() => selectDate(new Date())}>
          Today
        </button>
        {allowClear ? (
          <button
            type="button"
            className="clear"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Clear
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );

  return (
    <div className="date-picker">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="filter-input date-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <span className={value ? "" : "placeholder"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Icon name="calendar" className="w-3.5 h-3.5" strokeWidth={1.8} />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(popover, document.body)
        : null}
    </div>
  );
}
