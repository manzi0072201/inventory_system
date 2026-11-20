"use client";

import {
  purchaseReturnReasons,
  purchaseReturnResolutions,
  purchaseReturnStatuses,
  type PurchaseReturnReason,
  type PurchaseReturnResolution,
  type PurchaseReturnStatus,
} from "@/lib/purchase-returns-data";

export type PurchaseReturnPeriod =
  | ""
  | "this-month"
  | "last-month"
  | "this-year";

export type PurchaseReturnFilterKey =
  | "search"
  | "supplier"
  | "status"
  | "reason"
  | "resolution"
  | "period";

type PurchaseReturnsFiltersProps = {
  search: string;
  supplier: string;
  status: PurchaseReturnStatus | "";
  reason: PurchaseReturnReason | "";
  resolution: PurchaseReturnResolution | "";
  period: PurchaseReturnPeriod;
  suppliers: string[];
  onFilter: (key: PurchaseReturnFilterKey, value: string) => void;
};

export function PurchaseReturnsFilters({
  search,
  supplier,
  status,
  reason,
  resolution,
  period,
  suppliers,
  onFilter,
}: PurchaseReturnsFiltersProps) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid sales-filter-grid">
        <div className="filter-field">
          <label htmlFor="filter-purchase-return-search">Search</label>
          <input
            id="filter-purchase-return-search"
            className="filter-input"
            placeholder="Reference, purchase, or supplier"
            type="text"
            value={search}
            onChange={(event) => onFilter("search", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-purchase-return-supplier">Supplier</label>
          <select
            id="filter-purchase-return-supplier"
            className="filter-select"
            value={supplier}
            onChange={(event) => onFilter("supplier", event.target.value)}
          >
            <option value="">All Suppliers</option>
            {suppliers.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-purchase-return-status">Status</label>
          <select
            id="filter-purchase-return-status"
            className="filter-select"
            value={status}
            onChange={(event) => onFilter("status", event.target.value)}
          >
            <option value="">All Statuses</option>
            {purchaseReturnStatuses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-purchase-return-reason">Reason</label>
          <select
            id="filter-purchase-return-reason"
            className="filter-select"
            value={reason}
            onChange={(event) => onFilter("reason", event.target.value)}
          >
            <option value="">All Reasons</option>
            {purchaseReturnReasons.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-purchase-return-resolution">Resolution</label>
          <select
            id="filter-purchase-return-resolution"
            className="filter-select"
            value={resolution}
            onChange={(event) => onFilter("resolution", event.target.value)}
          >
            <option value="">All Resolutions</option>
            {purchaseReturnResolutions.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-purchase-return-period">Period</label>
          <select
            id="filter-purchase-return-period"
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
