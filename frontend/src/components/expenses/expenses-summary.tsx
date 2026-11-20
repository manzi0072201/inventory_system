"use client";

import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/sales-data";

type ExpensesSummaryProps = {
  total: number;
  count: number;
  paidThisMonth: number;
  monthCount: number;
  pending: number;
  pendingCount: number;
  topCategory: string;
  topCategoryAmount: number;
};

export function ExpensesSummary({
  total,
  count,
  paidThisMonth,
  monthCount,
  pending,
  pendingCount,
  topCategory,
  topCategoryAmount,
}: ExpensesSummaryProps) {
  return (
    <section className="stock-summary-grid" aria-label="Expense summary">
      <div className="sales-summary-card">
        <span className="sales-summary-icon purple">
          <Icon name="expenses" className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div className="sales-summary-copy">
          <span>Total Expenses · {count} records</span>
          <strong>{formatMoney(total)}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <span className="sales-summary-icon blue">
          <Icon name="calendar" className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div className="sales-summary-copy">
          <span>Paid This Month · {monthCount} records</span>
          <strong>{formatMoney(paidThisMonth)}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <span className="sales-summary-icon amber">
          <Icon name="alert" className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div className="sales-summary-copy">
          <span>Pending Payments · {pendingCount} records</span>
          <strong>{formatMoney(pending)}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <span className="sales-summary-icon green">
          <Icon name="tag" className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div className="sales-summary-copy">
          <span>Top Category · {formatMoney(topCategoryAmount)}</span>
          <strong>{topCategory}</strong>
        </div>
      </div>
    </section>
  );
}
