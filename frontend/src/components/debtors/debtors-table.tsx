"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Customer } from "@/lib/customers-data";
import { formatMoney } from "@/lib/sales-data";
import { DebtorMenu, type DebtorMenuState } from "./debtor-menu";

export type DebtorRow = Customer & {
  orderCount: number;
  totalSpent: number;
  outstanding: number;
  lastOrder: string;
};

export type DebtorsSortKey =
  | "name"
  | "phone"
  | "city"
  | "orderCount"
  | "lastOrder"
  | "totalSpent"
  | "outstanding"
  | "creditLimit";

export type DebtorsSortDir = "asc" | "desc";

const sortColumns: {
  key: DebtorsSortKey;
  label: string;
  minWidth: number;
  align?: "right";
}[] = [
  { key: "name", label: "Debtor", minWidth: 190 },
  { key: "phone", label: "Contact", minWidth: 150 },
  { key: "city", label: "Location", minWidth: 130 },
  { key: "orderCount", label: "Orders", minWidth: 80, align: "right" },
  { key: "lastOrder", label: "Last Order", minWidth: 110 },
  { key: "totalSpent", label: "Total Spent", minWidth: 110, align: "right" },
  { key: "outstanding", label: "Outstanding", minWidth: 120, align: "right" },
  { key: "creditLimit", label: "Credit Limit", minWidth: 110, align: "right" },
];

type DebtorsTableProps = {
  rows: DebtorRow[];
  tableSearch: string;
  onTableSearch: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  sortKey: DebtorsSortKey;
  sortDir: DebtorsSortDir;
  onSort: (key: DebtorsSortKey) => void;
  selected: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: (pageIds: string[], allSelected: boolean) => void;
  menu: DebtorMenuState | null;
  onMenuOpen: (id: string, button: HTMLElement) => void;
  onMenuClose: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
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

function isOverLimit(debtor: DebtorRow): boolean {
  return debtor.creditLimit > 0 && debtor.outstanding > debtor.creditLimit;
}

export function DebtorsTable({
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
  menu,
  onMenuOpen,
  onMenuClose,
  onView,
  onEdit,
  footer,
}: DebtorsTableProps) {
  const selectedOnPage = rows.filter((row) => selected.includes(row.id));
  const allPageSelected = rows.length > 0 && selectedOnPage.length === rows.length;
  const sortArrow = (key: DebtorsSortKey) =>
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
            <Icon name="refresh" strokeWidth={1.8} className={refreshing ? "spin" : ""} />
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
                  onChange={() => onSelectAll(rows.map((row) => row.id), allPageSelected)}
                  aria-label="Select all debtors on this page"
                />
              </th>
              <th className="action-th" scope="col">Action</th>
              {sortColumns.map((column) => (
                <th
                  key={column.key}
                  className={`sortable-th${column.align ? " right-align" : ""}`}
                  scope="col"
                  style={{ minWidth: column.minWidth }}
                >
                  <button type="button" onClick={() => onSort(column.key)}>
                    {column.label}
                    <span className={`sort-arrow${sortKey === column.key ? " active" : ""}`}>
                      {sortArrow(column.key)}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((debtor) => (
              <tr key={debtor.id} id={`debtor-row-${debtor.id}`}>
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selected.includes(debtor.id)}
                    onChange={() => onSelectToggle(debtor.id)}
                    aria-label={`Select ${debtor.name}`}
                  />
                </td>
                <td className="action-cell">
                  <DebtorMenu
                    customerId={debtor.id}
                    menu={menu}
                    onOpen={onMenuOpen}
                    onClose={onMenuClose}
                    onView={onView}
                    onEdit={onEdit}
                  />
                </td>
                <td>
                  <div className="customer-cell">
                    <span className="customer-avatar">{initialsOf(debtor.name)}</span>
                    <div className="customer-cell-copy">
                      <Link href={`/people/${encodeURIComponent(debtor.id)}`} className="sale-link">
                        {debtor.name}
                      </Link>
                      <span>{debtor.id}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="customer-location">
                    <strong>{debtor.phone || "-"}</strong>
                    <span>{debtor.email || "-"}</span>
                  </div>
                </td>
                <td>
                  <div className="customer-location">
                    <strong>{debtor.city || "-"}</strong>
                    <span>{debtor.country || "-"}</span>
                  </div>
                </td>
                <td className="right-align sale-amount">{debtor.orderCount.toLocaleString()}</td>
                <td>{debtor.lastOrder || "-"}</td>
                <td className="right-align sale-amount">{formatMoney(debtor.totalSpent)}</td>
                <td className="right-align sale-amount customer-due">
                  {formatMoney(debtor.outstanding)}
                  {isOverLimit(debtor) ? (
                    <span className="customer-type-pill business" style={{ marginLeft: 6 }}>
                      Over limit
                    </span>
                  ) : null}
                </td>
                <td className="right-align sale-amount">{formatMoney(debtor.creditLimit)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={10}>No debtors match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
