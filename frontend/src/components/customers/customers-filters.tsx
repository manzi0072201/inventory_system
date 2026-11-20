"use client";

import {
  customerCountries,
  customerTypes,
  type CustomerType,
} from "@/lib/customers-data";

export type CustomerFilterKey =
  | "name"
  | "email"
  | "type"
  | "country"
  | "balance";

export type CustomerBalanceFilter = "" | "with-balance" | "clear";

type CustomersFiltersProps = {
  name: string;
  email: string;
  type: CustomerType | "";
  country: string;
  balance: CustomerBalanceFilter;
  onFilter: (key: CustomerFilterKey, value: string) => void;
};

export function CustomersFilters({
  name,
  email,
  type,
  country,
  balance,
  onFilter,
}: CustomersFiltersProps) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid">
        <div className="filter-field">
          <label htmlFor="filter-customer-name">Customer Name</label>
          <input
            id="filter-customer-name"
            className="filter-input"
            placeholder="Search by name"
            type="text"
            value={name}
            onChange={(event) => onFilter("name", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-customer-email">Email</label>
          <input
            id="filter-customer-email"
            className="filter-input"
            placeholder="Search by email"
            type="text"
            value={email}
            onChange={(event) => onFilter("email", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-customer-type">Customer Type</label>
          <select
            id="filter-customer-type"
            className="filter-select"
            value={type}
            onChange={(event) => onFilter("type", event.target.value)}
          >
            <option value="">Choose Type</option>
            {customerTypes.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-customer-country">Country</label>
          <select
            id="filter-customer-country"
            className="filter-select"
            value={country}
            onChange={(event) => onFilter("country", event.target.value)}
          >
            <option value="">Choose Country</option>
            {customerCountries.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-customer-balance">Balance</label>
          <select
            id="filter-customer-balance"
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
