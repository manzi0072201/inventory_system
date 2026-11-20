"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Customer } from "@/lib/customers-data";
import { formatMoney } from "@/lib/sales-data";
import { CustomerMenu, type CustomerMenuState } from "./customer-menu";

export type CustomerRow = Customer & {
  orderCount: number;
  totalSpent: number;
  outstanding: number;
  lastOrder: string;
};

export type CustomersSortKey =
  | "name"
  | "type"
  | "phone"
  | "city"
  | "orderCount"
  | "totalSpent"
  | "outstanding"
  | "creditLimit";

export type CustomersSortDir = "asc" | "desc";

const sortColumns: {
  key: CustomersSortKey;
  label: string;
  minWidth: number;
  align?: "right";
}[] = [
  { key: "name", label: "Customer", minWidth: 190 },
  { key: "type", label: "Type", minWidth: 100 },
  { key: "phone", label: "Contact", minWidth: 150 },
  { key: "city", label: "Location", minWidth: 130 },
  { key: "orderCount", label: "Orders", minWidth: 80, align: "right" },
  { key: "totalSpent", label: "Total Spent", minWidth: 110, align: "right" },
  { key: "outstanding", label: "Outstanding", minWidth: 110, align: "right" },
  { key: "creditLimit", label: "Credit Limit", minWidth: 110, align: "right" },
];

type CustomersTableProps = {
  rows: CustomerRow[];
  tableSearch: string;
  onTableSearch: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  sortKey: CustomersSortKey;
  sortDir: CustomersSortDir;
  onSort: (key: CustomersSortKey) => void;
  selected: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: (pageIds: string[], allSelected: boolean) => void;
  createdId: string | null;
  menu: CustomerMenuState | null;
  onMenuOpen: (id: string, button: HTMLElement) => void;
  onMenuClose: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  footer: ReactNode;
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CustomersTable({
  rows,
  tableSearch,
  onTableSearch,
  refreshing,
  onRefresh,
  sortKey,
  sortDir,
  onSort,
  selected,
  onSelectToggle,
  onSelectAll,
  createdId,
  menu,
  onMenuOpen,
  onMenuClose,
  onView,
  onEdit,
  onDelete,
  footer,
}: CustomersTableProps) {
  const selectedOnPage = rows.filter((row) => selected.includes(row.id));
  const allPageSelected =
    rows.length > 0 && selectedOnPage.length === rows.length;
  const sortArrow = (key: CustomersSortKey) =>
    sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "↕";

  return (
    <section className="panel">
      <div className="table-controls">
        <div className="table-search">
          <input
            placeholder="Search this table"
            type="text"
            value={tableSearch}
            onChange={(event) => onTableSearch(event.target.value)}
          />
          <Icon name="search" className="w-3.5 h-3.5" />
        </div>
        <div className="table-tools">
          <button type="button" className="tool-button" title="Table Columns">
            <Icon name="settings" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="tool-button"
            title="Refresh Table"
            onClick={onRefresh}
          >
            <Icon
              name="refresh"
              strokeWidth={1.8}
              className={refreshing ? "spin" : ""}
            />
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="sales-table customers-table">
          <thead>
            <tr>
              <th className="checkbox-th" scope="col">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={() =>
                    onSelectAll(
                      rows.map((row) => row.id),
                      allPageSelected,
                    )
                  }
                  aria-label="Select all customers on this page"
                />
              </th>
              <th className="action-th" scope="col">
                Action
              </th>
              {sortColumns.map((column) => (
                <th
                  key={column.key}
                  className={`sortable-th${column.align ? " right-align" : ""}`}
                  scope="col"
                  style={{ minWidth: column.minWidth }}
                >
                  <button type="button" onClick={() => onSort(column.key)}>
                    {column.label}
                    <span
                      className={`sort-arrow${sortKey === column.key ? " active" : ""}`}
                    >
                      {sortArrow(column.key)}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((customer) => (
              <tr
                key={customer.id}
                id={`customer-row-${customer.id}`}
                className={createdId === customer.id ? "row-highlight" : ""}
              >
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selected.includes(customer.id)}
                    onChange={() => onSelectToggle(customer.id)}
                    aria-label={`Select ${customer.name}`}
                  />
                </td>
                <td className="action-cell">
                  <CustomerMenu
                    customerId={customer.id}
                    menu={menu}
                    onOpen={onMenuOpen}
                    onClose={onMenuClose}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </td>
                <td>
                  <div className="customer-cell">
                    <span className="customer-avatar">
                      {initialsOf(customer.name)}
                    </span>
                    <div className="customer-cell-copy">
                      <Link
                        href={`/people/${encodeURIComponent(customer.id)}`}
                        className="sale-link"
                      >
                        {customer.name}
                      </Link>
                      <span>{customer.id}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className={`customer-type-pill ${customer.type.toLowerCase()}`}
                  >
                    {customer.type}
                  </span>
                </td>
                <td>
                  <div className="customer-location">
                    <strong>{customer.phone || "-"}</strong>
                    <span>{customer.email || "-"}</span>
                  </div>
                </td>
                <td>
                  <div className="customer-location">
                    <strong>{customer.city || "-"}</strong>
                    <span>{customer.country || "-"}</span>
                  </div>
                </td>
                <td className="right-align sale-amount">
                  {customer.orderCount.toLocaleString()}
                </td>
                <td className="right-align sale-amount">
                  {formatMoney(customer.totalSpent)}
                </td>
                <td
                  className={`right-align sale-amount${customer.outstanding > 0 ? " customer-due" : ""}`}
                >
                  {formatMoney(customer.outstanding)}
                </td>
                <td className="right-align sale-amount">
                  {formatMoney(customer.creditLimit)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={10}>No customers match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
