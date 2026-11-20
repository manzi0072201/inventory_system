"use client";

import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/sales-data";

type SalesReturnsSummaryProps = {
  total: number;
  count: number;
  monthAmount: number;
  monthCount: number;
  pendingAmount: number;
  pendingCount: number;
  itemsReturned: number;
};

export function SalesReturnsSummary({
  total,
  count,
  monthAmount,
  monthCount,
  pendingAmount,
  pendingCount,
  itemsReturned,
}: SalesReturnsSummaryProps) {
  return (
    <section className="stock-summary-grid" aria-label="Sales return summary">
      <div className="sales-summary-card">
        <span className="sales-summary-icon purple">
          <Icon name="salesReturn" className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div className="sales-summary-copy">
          <span>Total Returned - {count} records</span>
          <strong>{formatMoney(total)}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <span className="sales-summary-icon blue">
          <Icon name="calendar" className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div className="sales-summary-copy">
          <span>This Month - {monthCount} records</span>
          <strong>{formatMoney(monthAmount)}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <span className="sales-summary-icon amber">
          <Icon name="alert" className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div className="sales-summary-copy">
          <span>Pending Review - {pendingCount} records</span>
          <strong>{formatMoney(pendingAmount)}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <span className="sales-summary-icon green">
          <Icon name="stock" className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div className="sales-summary-copy">
          <span>Returned Items</span>
          <strong>{itemsReturned} units</strong>
        </div>
      </div>
    </section>
  );
}
