"use client";

import {
  productBrands,
  productCategories,
  productWarehouses,
} from "@/lib/products-data";
import { stockStatuses } from "@/lib/stock-data";

export type StockFilterKey = "warehouse" | "category" | "brand" | "status";

type StockFiltersProps = {
  warehouse: string;
  category: string;
  brand: string;
  status: string;
  onFilter: (key: StockFilterKey, value: string) => void;
};

export function StockFilters({
  warehouse,
  category,
  brand,
  status,
  onFilter,
}: StockFiltersProps) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid stock-filter-grid">
        <div className="filter-field">
          <label htmlFor="filter-stock-warehouse">Warehouse</label>
          <select
            id="filter-stock-warehouse"
            className="filter-select"
            value={warehouse}
            onChange={(event) => onFilter("warehouse", event.target.value)}
          >
            <option value="">Choose Warehouse</option>
            {productWarehouses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-stock-category">Category</label>
          <select
            id="filter-stock-category"
            className="filter-select"
            value={category}
            onChange={(event) => onFilter("category", event.target.value)}
          >
            <option value="">Choose Category</option>
            {productCategories.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-stock-brand">Brand</label>
          <select
            id="filter-stock-brand"
            className="filter-select"
            value={brand}
            onChange={(event) => onFilter("brand", event.target.value)}
          >
            <option value="">Choose Brand</option>
            {productBrands.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-stock-status">Stock Status</label>
          <select
            id="filter-stock-status"
            className="filter-select"
            value={status}
            onChange={(event) => onFilter("status", event.target.value)}
          >
            <option value="">Choose Status</option>
            {stockStatuses.map((entry) => (
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
