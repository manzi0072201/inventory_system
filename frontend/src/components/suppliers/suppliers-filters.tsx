"use client";

import {
  supplierCategories,
  supplierCountries,
} from "@/lib/suppliers-data";

export type SupplierFilterKey = "name" | "email" | "category" | "country" | "balance";
export type SupplierBalanceFilter = "" | "with-balance" | "clear";

type SuppliersFiltersProps = {
  name: string;
  email: string;
  category: string;
  country: string;
  balance: SupplierBalanceFilter;
  onFilter: (key: SupplierFilterKey, value: string) => void;
};

export function SuppliersFilters({
  name,
  email,
  category,
  country,
  balance,
  onFilter,
}: SuppliersFiltersProps) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid">
        <div className="filter-field">
          <label htmlFor="filter-supplier-name">Supplier Name</label>
          <input
            id="filter-supplier-name"
            className="filter-input"
            placeholder="Search by name"
            type="text"
            value={name}
            onChange={(event) => onFilter("name", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-supplier-email">Email</label>
          <input
            id="filter-supplier-email"
            className="filter-input"
            placeholder="Search by email"
            type="text"
            value={email}
            onChange={(event) => onFilter("email", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-supplier-category">Category</label>
          <select
            id="filter-supplier-category"
            className="filter-select"
            value={category}
            onChange={(event) => onFilter("category", event.target.value)}
          >
            <option value="">Choose Category</option>
            {supplierCategories.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-supplier-country">Country</label>
          <select
            id="filter-supplier-country"
            className="filter-select"
            value={country}
            onChange={(event) => onFilter("country", event.target.value)}
          >
            <option value="">Choose Country</option>
            {supplierCountries.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-supplier-balance">Balance</label>
          <select
            id="filter-supplier-balance"
            className="filter-select"
            value={balance}
            onChange={(event) => onFilter("balance", event.target.value)}
          >
            <option value="">All Balances</option>
            <option value="with-balance">With Outstanding</option>
            <option value="clear">No Outstanding</option>
          </select>
        </div>
      </div>
    </section>
  );
}
