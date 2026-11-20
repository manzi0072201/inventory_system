"use client";

import {
  salesReturnReasons,
  salesReturnResolutions,
  salesReturnStatuses,
  type SalesReturnReason,
  type SalesReturnResolution,
  type SalesReturnStatus,
} from "@/lib/sales-returns-data";

export type SalesReturnPeriod = "" | "this-month" | "last-month" | "this-year";

export type SalesReturnFilterKey =
  | "search"
  | "customer"
  | "status"
  | "reason"
  | "resolution"
  | "period";

type SalesReturnsFiltersProps = {
  search: string;
  customer: string;
  status: SalesReturnStatus | "";
  reason: SalesReturnReason | "";
  resolution: SalesReturnResolution | "";
  period: SalesReturnPeriod;
  customers: string[];
  onFilter: (key: SalesReturnFilterKey, value: string) => void;
};

export function SalesReturnsFilters({
  search,
  customer,
  status,
  reason,
  resolution,
  period,
  customers,
  onFilter,
}: SalesReturnsFiltersProps) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid sales-filter-grid">
        <div className="filter-field">
          <label htmlFor="filter-return-search">Search</label>
          <input
            id="filter-return-search"
            className="filter-input"
            placeholder="Reference, sale, or customer"
            type="text"
            value={search}
            onChange={(event) => onFilter("search", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-return-customer">Customer</label>
          <select
            id="filter-return-customer"
            className="filter-select"
            value={customer}
            onChange={(event) => onFilter("customer", event.target.value)}
          >
            <option value="">All Customers</option>
            {customers.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-return-status">Status</label>
          <select
            id="filter-return-status"
            className="filter-select"
            value={status}
            onChange={(event) => onFilter("status", event.target.value)}
          >
            <option value="">All Statuses</option>
            {salesReturnStatuses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-return-reason">Reason</label>
          <select
            id="filter-return-reason"
            className="filter-select"
            value={reason}
            onChange={(event) => onFilter("reason", event.target.value)}
          >
            <option value="">All Reasons</option>
            {salesReturnReasons.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-return-resolution">Resolution</label>
          <select
            id="filter-return-resolution"
            className="filter-select"
            value={resolution}
            onChange={(event) => onFilter("resolution", event.target.value)}
          >
            <option value="">All Resolutions</option>
            {salesReturnResolutions.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-return-period">Period</label>
          <select
            id="filter-return-period"
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
