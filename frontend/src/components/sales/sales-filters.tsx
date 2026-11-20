"use client";

import { DatePicker } from "@/components/ui/date-picker";
import {
  saleCustomers,
  salePaymentStatuses,
  saleShippingStatuses,
  saleStatuses,
  saleWarehouses,
} from "@/lib/sales-data";

export type SalesFilterKey =
  | "date"
  | "customer"
  | "warehouse"
  | "status"
  | "paymentStatus"
  | "shippingStatus";

type SalesFiltersProps = {
  date: string;
  customer: string;
  warehouse: string;
  status: string;
  paymentStatus: string;
  shippingStatus: string;
  onFilter: (key: SalesFilterKey, value: string) => void;
};

export function SalesFilters({
  date,
  customer,
  warehouse,
  status,
  paymentStatus,
  shippingStatus,
  onFilter,
}: SalesFiltersProps) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid sales-filter-grid">
        <div className="filter-field">
          <label htmlFor="filter-sale-date">Date</label>
          <DatePicker
            id="filter-sale-date"
            value={date}
            onChange={(value) => onFilter("date", value)}
            placeholder="Select date"
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-sale-customer">Customer</label>
          <select
            id="filter-sale-customer"
            className="filter-select"
            value={customer}
            onChange={(event) => onFilter("customer", event.target.value)}
          >
            <option value="">Choose Customer</option>
            {saleCustomers.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-sale-warehouse">Warehouse</label>
          <select
            id="filter-sale-warehouse"
            className="filter-select"
            value={warehouse}
            onChange={(event) => onFilter("warehouse", event.target.value)}
          >
            <option value="">Choose Warehouse</option>
            {saleWarehouses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-sale-status">Status</label>
          <select
            id="filter-sale-status"
            className="filter-select"
            value={status}
            onChange={(event) => onFilter("status", event.target.value)}
          >
            <option value="">Choose Status</option>
            {saleStatuses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-sale-payment">Payment Status</label>
          <select
            id="filter-sale-payment"
            className="filter-select"
            value={paymentStatus}
            onChange={(event) => onFilter("paymentStatus", event.target.value)}
          >
            <option value="">Choose Payment Status</option>
            {salePaymentStatuses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-sale-shipping">Shipping Status</label>
          <select
            id="filter-sale-shipping"
            className="filter-select"
            value={shippingStatus}
            onChange={(event) => onFilter("shippingStatus", event.target.value)}
          >
            <option value="">Choose Shipping Status</option>
            {saleShippingStatuses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
