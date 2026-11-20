"use client";

import {
  paymentMethods,
  type PaymentMethod,
  type PaymentSource,
} from "@/lib/payments-data";

export type PaymentFilterKey =
  | "reference"
  | "party"
  | "method"
  | "source";

type PaymentsFiltersProps = {
  reference: string;
  party: string;
  method: PaymentMethod | "";
  source: PaymentSource | "";
  onFilter: (key: PaymentFilterKey, value: string) => void;
};

export function PaymentsFilters({
  reference,
  party,
  method,
  source,
  onFilter,
}: PaymentsFiltersProps) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid">
        <div className="filter-field">
          <label htmlFor="filter-payment-reference">Payment Reference</label>
          <input
            id="filter-payment-reference"
            className="filter-input"
            placeholder="Search by reference"
            type="text"
            value={reference}
            onChange={(event) => onFilter("reference", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-payment-party">Party</label>
          <input
            id="filter-payment-party"
            className="filter-input"
            placeholder="Search by customer or supplier"
            type="text"
            value={party}
            onChange={(event) => onFilter("party", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-payment-method">Payment Method</label>
          <select
            id="filter-payment-method"
            className="filter-select"
            value={method}
            onChange={(event) => onFilter("method", event.target.value)}
          >
            <option value="">All Methods</option>
            {paymentMethods.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-payment-source">Type</label>
          <select
            id="filter-payment-source"
            className="filter-select"
            value={source}
            onChange={(event) => onFilter("source", event.target.value)}
          >
            <option value="">All Types</option>
            <option value="Sale">Sales</option>
            <option value="Purchase">Purchases</option>
            <option value="Expense">Expenses</option>
          </select>
        </div>
      </div>
    </section>
  );
}
