"use client";

import {
  productBrands,
  productCategories,
  productWarehouses,
} from "@/lib/products-data";

export type FilterKey = "code" | "name" | "category" | "brand" | "warehouse";
export type ProductsView = "cards" | "table";

type ProductsFiltersProps = {
  code: string;
  name: string;
  category: string;
  brand: string;
  warehouse: string;
  view: ProductsView;
  onFilter: (key: FilterKey, value: string) => void;
  onView: (view: ProductsView) => void;
};

export function ProductsFilters({
  code,
  name,
  category,
  brand,
  warehouse,
  view,
  onFilter,
  onView,
}: ProductsFiltersProps) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid">
        <div className="filter-field">
          <label htmlFor="filter-code">Code Product</label>
          <input
            id="filter-code"
            className="filter-input"
            placeholder="Search by Code"
            type="text"
            value={code}
            onChange={(event) => onFilter("code", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-name">Product Name</label>
          <input
            id="filter-name"
            className="filter-input"
            placeholder="Search by Name"
            type="text"
            value={name}
            onChange={(event) => onFilter("name", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-category">Category</label>
          <select
            id="filter-category"
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
          <label htmlFor="filter-brand">Brand</label>
          <select
            id="filter-brand"
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
          <label htmlFor="filter-warehouse">Warehouse</label>
          <select
            id="filter-warehouse"
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
      </div>
      <div className="view-switch-row">
        <div className="view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={view === "cards" ? "active" : ""}
            onClick={() => onView("cards")}
          >
            Cards
          </button>
          <button
            type="button"
            className={view === "table" ? "active" : ""}
            onClick={() => onView("table")}
          >
            Table
          </button>
        </div>
      </div>
    </section>
  );
}
