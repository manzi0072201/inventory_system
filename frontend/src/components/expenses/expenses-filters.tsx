"use client";

import {
  expenseCategories,
  expenseStatuses,
  type ExpenseCategory,
  type ExpenseStatus,
} from "@/lib/expenses-data";
import {
  paymentMethods,
  type PaymentMethod,
} from "@/lib/payments-data";

export type ExpensePeriod = "" | "this-month" | "last-month" | "this-year";

export type ExpenseFilterKey =
  | "search"
  | "category"
  | "method"
  | "status"
  | "period";

type ExpensesFiltersProps = {
  search: string;
  category: ExpenseCategory | "";
  method: PaymentMethod | "";
  status: ExpenseStatus | "";
  period: ExpensePeriod;
  onFilter: (key: ExpenseFilterKey, value: string) => void;
};

export function ExpensesFilters({
  search,
  category,
  method,
  status,
  period,
  onFilter,
}: ExpensesFiltersProps) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid">
        <div className="filter-field">
          <label htmlFor="filter-expense-search">Search</label>
          <input
            id="filter-expense-search"
            className="filter-input"
            placeholder="Reference, payee, or description"
            type="text"
            value={search}
            onChange={(event) => onFilter("search", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-expense-category">Category</label>
          <select
            id="filter-expense-category"
            className="filter-select"
            value={category}
            onChange={(event) => onFilter("category", event.target.value)}
          >
            <option value="">All Categories</option>
            {expenseCategories.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-expense-method">Payment Method</label>
          <select
            id="filter-expense-method"
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
          <label htmlFor="filter-expense-status">Status</label>
          <select
            id="filter-expense-status"
            className="filter-select"
            value={status}
            onChange={(event) => onFilter("status", event.target.value)}
          >
            <option value="">All Statuses</option>
            {expenseStatuses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-expense-period">Period</label>
          <select
            id="filter-expense-period"
            className="filter-select"
            value={period}
            onChange={(event) => onFilter("period", event.target.value)}
          >
            <option value="">All Time</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
          </select>
        </div>
      </div>
    </section>
  );
}
