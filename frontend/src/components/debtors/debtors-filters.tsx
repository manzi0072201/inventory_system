"use client";

import { customerCountries } from "@/lib/customers-data";

export type DebtorFilterKey =
  | "name"
  | "email"
  | "country"
  | "status"
  | "minBalance";

export type DebtorStatusFilter = "" | "over-limit" | "within-limit";

type DebtorsFiltersProps = {
  name: string;
  email: string;
  country: string;
  status: DebtorStatusFilter;
  minBalance: string;
  onFilter: (key: DebtorFilterKey, value: string) => void;
};

export function DebtorsFilters({
  name,
  email,
  country,
  status,
  minBalance,
  onFilter,
}: DebtorsFiltersProps) {
  return (
    <section className="panel filter-panel">
      <div className="filter-grid">
        <div className="filter-field">
          <label htmlFor="filter-debtor-name">Debtor Name</label>
          <input
            id="filter-debtor-name"
            className="filter-input"
            placeholder="Search by name"
            type="text"
            value={name}
            onChange={(event) => onFilter("name", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-debtor-email">Email</label>
          <input
            id="filter-debtor-email"
            className="filter-input"
            placeholder="Search by email"
            type="text"
            value={email}
            onChange={(event) => onFilter("email", event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-debtor-country">Country</label>
          <select
            id="filter-debtor-country"
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
          <label htmlFor="filter-debtor-status">Credit Status</label>
          <select
            id="filter-debtor-status"
            className="filter-select"
            value={status}
            onChange={(event) => onFilter("status", event.target.value)}
          >
            <option value="">All Debtors</option>
            <option value="over-limit">Over Credit Limit</option>
            <option value="within-limit">Within Credit Limit</option>
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-debtor-min-balance">Minimum Balance</label>
          <input
            id="filter-debtor-min-balance"
            className="filter-input"
            placeholder="e.g. 1000"
            type="number"
            min={0}
            value={minBalance}
            onChange={(event) => onFilter("minBalance", event.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
