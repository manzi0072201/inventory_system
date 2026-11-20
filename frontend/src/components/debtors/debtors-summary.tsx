"use client";

import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/sales-data";

type DebtorsSummaryProps = {
  totalDebtors: number;
  totalOutstanding: number;
  averageBalance: number;
  overLimit: number;
};

export function DebtorsSummary({
  totalDebtors,
  totalOutstanding,
  averageBalance,
  overLimit,
}: DebtorsSummaryProps) {
  return (
    <section className="stock-summary-grid" aria-label="Debtors summary">
      <div className="sales-summary-card">
        <div className="sales-summary-icon purple">
          <Icon name="people" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Total Debtors</span>
          <strong>{totalDebtors.toLocaleString()}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon amber">
          <Icon name="wallet" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Total Outstanding</span>
          <strong>{formatMoney(totalOutstanding)}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon blue">
          <Icon name="trend" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Average Balance</span>
          <strong>{formatMoney(averageBalance)}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon red">
          <Icon name="alert" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Over Credit Limit</span>
          <strong>{overLimit.toLocaleString()}</strong>
        </div>
      </div>
    </section>
  );
}
