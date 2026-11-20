"use client";

import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/purchases-data";

type SuppliersSummaryProps = {
  total: number;
  categories: number;
  totalPurchases: number;
  outstanding: number;
};

export function SuppliersSummary({
  total,
  categories,
  totalPurchases,
  outstanding,
}: SuppliersSummaryProps) {
  return (
    <section className="stock-summary-grid" aria-label="Suppliers summary">
      <div className="sales-summary-card">
        <div className="sales-summary-icon purple">
          <Icon name="truck" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Total Suppliers</span>
          <strong>{total.toLocaleString()}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon blue">
          <Icon name="tag" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Categories</span>
          <strong>{categories.toLocaleString()}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon green">
          <Icon name="purchases" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Total Purchases</span>
          <strong>{formatMoney(totalPurchases)}</strong>
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
