"use client";

import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/sales-data";

type StockSummaryProps = {
  totalUnits: number;
  stockValue: number;
  lowStock: number;
  outOfStock: number;
};

export function StockSummary({
  totalUnits,
  stockValue,
  lowStock,
  outOfStock,
}: StockSummaryProps) {
  return (
    <section className="stock-summary-grid">
      <div className="sales-summary-card">
        <div className="sales-summary-icon purple">
          <Icon name="stock" className="w-4 h-4" />
        </div>
        <div className="sales-summary-copy">
          <span>Total Stock Units</span>
          <strong>{totalUnits.toLocaleString()}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon blue">
          <Icon name="money" className="w-4 h-4" />
        </div>
        <div className="sales-summary-copy">
          <span>Stock Value</span>
          <strong>{formatMoney(stockValue)}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon amber">
          <Icon name="alert" className="w-4 h-4" />
        </div>
        <div className="sales-summary-copy">
          <span>Low Stock Items</span>
          <strong>{lowStock.toLocaleString()}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon red">
          <Icon name="alertCircle" className="w-4 h-4" />
        </div>
        <div className="sales-summary-copy">
          <span>Out of Stock</span>
          <strong>{outOfStock.toLocaleString()}</strong>
        </div>
      </div>
    </section>
  );
}
