"use client";

import { DatePicker } from "@/components/ui/date-picker";
import {
  purchasePaymentStatuses,
  purchaseShippingStatuses,
  purchaseStatuses,
  purchaseSuppliers,
  purchaseWarehouses,
} from "@/lib/purchases-data";

export type PurchasesFilterKey =
  | "date"
  | "supplier"
  | "warehouse"
  | "status"
  | "paymentStatus"
  | "shippingStatus";

type PurchasesFiltersProps = {
  date: string;
  supplier: string;
  warehouse: string;
  status: string;
  paymentStatus: string;
  shippingStatus: string;
  onFilter: (key: PurchasesFilterKey, value: string) => void;
};

export function PurchasesFilters({
  date,
  supplier,
  warehouse,
  status,
  paymentStatus,
  shippingStatus,
  onFilter,
}: PurchasesFiltersProps) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid sales-filter-grid">
        <div className="filter-field">
          <label htmlFor="filter-purchase-date">Date</label>
          <DatePicker
            id="filter-purchase-date"
            value={date}
            onChange={(value) => onFilter("date", value)}
            placeholder="Select date"
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-purchase-supplier">Supplier</label>
          <select
            id="filter-purchase-supplier"
            className="filter-select"
            value={supplier}
            onChange={(event) => onFilter("supplier", event.target.value)}
          >
            <option value="">Choose Supplier</option>
            {purchaseSuppliers.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-purchase-warehouse">Warehouse</label>
          <select
            id="filter-purchase-warehouse"
            className="filter-select"
            value={warehouse}
            onChange={(event) => onFilter("warehouse", event.target.value)}
          >
            <option value="">Choose Warehouse</option>
            {purchaseWarehouses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-purchase-status">Status</label>
          <select
            id="filter-purchase-status"
            className="filter-select"
            value={status}
            onChange={(event) => onFilter("status", event.target.value)}
          >
            <option value="">Choose Status</option>
            {purchaseStatuses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-purchase-payment">Payment Status</label>
          <select
            id="filter-purchase-payment"
            className="filter-select"
            value={paymentStatus}
            onChange={(event) => onFilter("paymentStatus", event.target.value)}
          >
            <option value="">Choose Payment Status</option>
            {purchasePaymentStatuses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-purchase-shipping">Shipping Status</label>
          <select
            id="filter-purchase-shipping"
            className="filter-select"
            value={shippingStatus}
            onChange={(event) => onFilter("shippingStatus", event.target.value)}
          >
            <option value="">Choose Shipping Status</option>
            {purchaseShippingStatuses.map((entry) => (
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
