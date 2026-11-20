"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCustomers } from "@/components/customers/customers-store";
import { useExpenses } from "@/components/expenses/expenses-store";
import { useLanguage } from "@/components/language/language-provider";
import { useProducts } from "@/components/products/products-store";
import { usePurchaseReturns } from "@/components/purchase-return/purchase-returns-store";
import { usePurchases } from "@/components/purchases/purchases-store";
import { useSalesReturns } from "@/components/sales-return/sales-returns-store";
import { useSales } from "@/components/sales/sales-store";
import { useStockAdjustments } from "@/components/stock/stock-store";
import { useSuppliers } from "@/components/suppliers/suppliers-store";
import { useWarehouses } from "@/components/warehouses/warehouses-store";
import { Icon, type IconName } from "@/components/ui/icon";
import { localeFor, type LanguageCode } from "@/lib/i18n";
import { isoDate, todayIso } from "@/lib/reporting";
import { formatMoney } from "@/lib/sales-data";

type Tone = "purple" | "green" | "orange" | "blue" | "pink" | "gray";

type Activity = {
  id: string;
  icon: IconName;
  tone: Tone;
  title: string;
  detail: string;
  amount?: number;
  time: string;
  href: string;
};

type Metric = {
  label: string;
  value: string;
  hint?: string;
  tone: Tone;
};

type HistoryPanelProps = {
  open: boolean;
  onClose: () => void;
};

function isToday(value: string | number | undefined, today: string): boolean {
  if (value === undefined || value === null || value === "") return false;
  const day =
    typeof value === "number"
      ? isoDate(new Date(value))
      : String(value).slice(0, 10);
  return day === today;
}

function timeOf(value: string | undefined, language: LanguageCode): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString(localeFor(language), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function HistoryPanel({ open, onClose }: HistoryPanelProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { t, language } = useLanguage();
  const { sales } = useSales();
  const { purchases } = usePurchases();
  const { salesReturns } = useSalesReturns();
  const { purchaseReturns } = usePurchaseReturns();
  const { expenses } = useExpenses();
  const { adjustments } = useStockAdjustments();
  const { customers } = useCustomers();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const { warehouses } = useWarehouses();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const { metrics, activities, todayLabel } = useMemo(() => {
    const today = todayIso();
    const todaySales = sales.filter((item) => item.date === today);
    const todayPurchases = purchases.filter((item) => item.date === today);
    const todaySalesReturns = salesReturns.filter((item) =>
      isToday(item.createdAt || item.date, today),
    );
    const todayPurchaseReturns = purchaseReturns.filter((item) =>
      isToday(item.createdAt || item.date, today),
    );
    const todayExpenses = expenses.filter((item) =>
      isToday(item.createdAt || item.date, today),
    );
    const todayAdjustments = adjustments.filter((item) => item.date === today);
    const todayCustomers = customers.filter((item) =>
      isToday(item.createdAt, today),
    );
    const todaySuppliers = suppliers.filter((item) =>
      isToday(item.createdAt, today),
    );
    const todayProducts = products.filter((item) =>
      isToday(item.createdAt, today),
    );
    const todayWarehouses = warehouses.filter((item) =>
      isToday(item.createdAt, today),
    );

    const rows: Activity[] = [
      ...todaySales.map((item) => ({
        id: `sale-${item.id}`,
        icon: "sales" as IconName,
        tone: "green" as Tone,
        title: `${t("Sale")} ${item.reference}`,
        detail: `${item.customer} · ${t(item.status)}`,
        amount: item.total,
        time: "",
        href: `/sales/${encodeURIComponent(item.reference)}`,
      })),
      ...todayPurchases.map((item) => ({
        id: `purchase-${item.id}`,
        icon: "purchases" as IconName,
        tone: "blue" as Tone,
        title: `${t("Purchase")} ${item.reference}`,
        detail: `${item.supplier} · ${t(item.status)}`,
        amount: item.total,
        time: "",
        href: `/purchases/${encodeURIComponent(item.reference)}`,
      })),
      ...todaySalesReturns.map((item) => ({
        id: `sale-return-${item.id}`,
        icon: "salesReturn" as IconName,
        tone: "orange" as Tone,
        title: `${t("Sales return")} ${item.reference}`,
        detail: `${item.customer} · ${t(item.status)}`,
        amount: item.amount,
        time: timeOf(item.createdAt, language),
        href: `/sales-return/${encodeURIComponent(item.reference)}`,
      })),
      ...todayPurchaseReturns.map((item) => ({
        id: `purchase-return-${item.id}`,
        icon: "purchaseReturn" as IconName,
        tone: "pink" as Tone,
        title: `${t("Purchase return")} ${item.reference}`,
        detail: `${item.supplier} · ${t(item.status)}`,
        amount: item.amount,
        time: timeOf(item.createdAt, language),
        href: `/purchase-return/${encodeURIComponent(item.reference)}`,
      })),
      ...todayExpenses.map((item) => ({
        id: `expense-${item.id}`,
        icon: "expenses" as IconName,
        tone: "orange" as Tone,
        title: `${t("Expense")} ${item.reference}`,
        detail: `${item.category} · ${item.vendor} · ${t(item.status)}`,
        amount: item.amount,
        time: timeOf(item.createdAt, language),
        href: `/expenses/${encodeURIComponent(item.id)}/edit`,
      })),
      ...todayAdjustments.map((item) => ({
        id: `adjustment-${item.id}`,
        icon: "stock" as IconName,
        tone: "purple" as Tone,
        title: `${t("Stock adjustment")} ${item.id}`,
        detail: `${item.productName} · ${item.quantity > 0 ? "+" : ""}${item.quantity}`,
        time: "",
        href: `/stock/${encodeURIComponent(item.productCode)}`,
      })),
      ...todayCustomers.map((item) => ({
        id: `customer-${item.id}`,
        icon: "people" as IconName,
        tone: "purple" as Tone,
        title: t("New customer"),
        detail: item.name,
        time: timeOf(item.createdAt, language),
        href: `/people/${encodeURIComponent(item.id)}`,
      })),
      ...todaySuppliers.map((item) => ({
        id: `supplier-${item.id}`,
        icon: "truck" as IconName,
        tone: "blue" as Tone,
        title: t("New supplier"),
        detail: item.name,
        time: timeOf(item.createdAt, language),
        href: `/suppliers/${encodeURIComponent(item.id)}`,
      })),
      ...todayProducts.map((item) => ({
        id: `product-${item.id}`,
        icon: "products" as IconName,
        tone: "green" as Tone,
        title: t("New product"),
        detail: `${item.name} · ${item.code}`,
        time: item.createdAt ? timeOf(new Date(item.createdAt).toISOString(), language) : "",
        href: `/products/${encodeURIComponent(item.code)}`,
      })),
      ...todayWarehouses.map((item) => ({
        id: `warehouse-${item.id}`,
        icon: "warehouse" as IconName,
        tone: "gray" as Tone,
        title: t("New warehouse"),
        detail: item.name,
        time: timeOf(item.createdAt, language),
        href: "/warehouses",
      })),
    ];

    rows.sort((a, b) => b.time.localeCompare(a.time));

    const result: Metric[] = [
      {
        label: t("Sales today"),
        value: String(todaySales.length),
        hint: formatMoney(sum(todaySales.map((item) => item.total))),
        tone: "green",
      },
      {
        label: t("Purchases today"),
        value: String(todayPurchases.length),
        hint: formatMoney(sum(todayPurchases.map((item) => item.total))),
        tone: "blue",
      },
      {
        label: t("Returns today"),
        value: String(todaySalesReturns.length + todayPurchaseReturns.length),
        hint: formatMoney(
          sum([
            ...todaySalesReturns.map((item) => item.amount),
            ...todayPurchaseReturns.map((item) => item.amount),
          ]),
        ),
        tone: "orange",
      },
      {
        label: t("Expenses today"),
        value: String(todayExpenses.length),
        hint: formatMoney(sum(todayExpenses.map((item) => item.amount))),
        tone: "pink",
      },
      {
        label: t("Adjustments"),
        value: String(todayAdjustments.length),
        tone: "purple",
      },
      {
        label: t("New records"),
        value: String(
          todayCustomers.length +
            todaySuppliers.length +
            todayProducts.length +
            todayWarehouses.length,
        ),
        tone: "gray",
      },
    ];

    const dateLabel = new Date().toLocaleDateString(localeFor(language), {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

    return { metrics: result, activities: rows, todayLabel: dateLabel };
  }, [
    sales,
    purchases,
    salesReturns,
    purchaseReturns,
    expenses,
    adjustments,
    customers,
    suppliers,
    products,
    warehouses,
    language,
    t,
  ]);

  if (!mounted) return null;

  return createPortal(
    <>
      {open && (
        <div className="history-scrim" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`history-panel${open ? " history-panel-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label={t("Today's activity")}
      >
        <div className="history-head">
          <div className="history-head-copy">
            <b>{t("Today's activity")}</b>
            <span>{todayLabel}</span>
          </div>
          <button
            type="button"
            className="icon-button"
            title={t("Close")}
            aria-label={t("Close")}
            onClick={onClose}
          >
            <Icon name="close" className="w-4 h-4" />
          </button>
        </div>

        <div className="history-metrics">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`history-metric tone-${metric.tone}`}
            >
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.hint && <small>{metric.hint}</small>}
            </div>
          ))}
        </div>

        <div className="history-scroll">
          <div className="history-section-label">
            {t("Timeline")} · {activities.length}
          </div>
          {activities.length === 0 ? (
            <div className="history-empty">
              <Icon name="history" className="w-5 h-5" />
              <b>{t("No activity recorded today")}</b>
            </div>
          ) : (
            activities.map((item) => (
              <button
                type="button"
                key={item.id}
                className="history-item"
                onClick={() => {
                  onClose();
                  router.push(item.href);
                }}
              >
                <span className={`history-item-icon tone-${item.tone}`}>
                  <Icon name={item.icon} className="w-[15px] h-[15px]" />
                </span>
                <span className="history-item-copy">
                  <b>{item.title}</b>
                  <small>{item.detail}</small>
                </span>
                <span className="history-item-side">
                  {item.amount !== undefined && <strong>{formatMoney(item.amount)}</strong>}
                  {item.time && <em>{item.time}</em>}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
