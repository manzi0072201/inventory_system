"use client";

import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/sales-data";

type CustomersSummaryProps = {
  total: number;
  business: number;
  totalSales: number;
  outstanding: number;
};

export function CustomersSummary({
  total,
  business,
  totalSales,
  outstanding,
}: CustomersSummaryProps) {
  return (
    <section className="stock-summary-grid" aria-label="Customers summary">
      <div className="sales-summary-card">
        <div className="sales-summary-icon purple">
          <Icon name="people" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Total Customers</span>
          <strong>{total.toLocaleString()}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon blue">
          <Icon name="tag" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Business Accounts</span>
          <strong>{business.toLocaleString()}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon green">
          <Icon name="sales" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Total Sales</span>
          <strong>{formatMoney(totalSales)}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon amber">
          <Icon name="wallet" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Outstanding</span>
          <strong>{formatMoney(outstanding)}</strong>
        </div>
      </div>
    </section>
  );
}
