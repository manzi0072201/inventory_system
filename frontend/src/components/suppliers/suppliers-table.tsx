"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Supplier } from "@/lib/suppliers-data";
import { formatMoney } from "@/lib/purchases-data";
import { SupplierMenu, type SupplierMenuState } from "./supplier-menu";

export type SupplierRow = Supplier & {
  purchaseCount: number;
  totalPurchased: number;
  outstanding: number;
  lastPurchase: string;
};

export type SuppliersSortKey =
  | "name"
  | "category"
  | "phone"
  | "city"
  | "purchaseCount"
  | "totalPurchased"
  | "outstanding"
  | "creditLimit";

export type SuppliersSortDir = "asc" | "desc";

const sortColumns: {
  key: SuppliersSortKey;
  label: string;
  minWidth: number;
  align?: "right";
}[] = [
  { key: "name", label: "Supplier", minWidth: 190 },
  { key: "category", label: "Category", minWidth: 120 },
  { key: "phone", label: "Contact", minWidth: 150 },
  { key: "city", label: "Location", minWidth: 130 },
  { key: "purchaseCount", label: "Orders", minWidth: 80, align: "right" },
  { key: "totalPurchased", label: "Total Purchased", minWidth: 120, align: "right" },
  { key: "outstanding", label: "Outstanding", minWidth: 110, align: "right" },
  { key: "creditLimit", label: "Credit Limit", minWidth: 110, align: "right" },
];

type SuppliersTableProps = {
  rows: SupplierRow[];
  tableSearch: string;
  onTableSearch: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  sortKey: SuppliersSortKey;
  sortDir: SuppliersSortDir;
  onSort: (key: SuppliersSortKey) => void;
  selected: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: (pageIds: string[], allSelected: boolean) => void;
  createdId: string | null;
  menu: SupplierMenuState | null;
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

export function SuppliersTable({
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
}: SuppliersTableProps) {
  const selectedOnPage = rows.filter((row) => selected.includes(row.id));
  const allPageSelected = rows.length > 0 && selectedOnPage.length === rows.length;
  const sortArrow = (key: SuppliersSortKey) =>
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
                  aria-label="Select all suppliers on this page"
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
            {rows.map((supplier) => (
              <tr
                key={supplier.id}
                id={`supplier-row-${supplier.id}`}
                className={createdId === supplier.id ? "row-highlight" : ""}
              >
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selected.includes(supplier.id)}
                    onChange={() => onSelectToggle(supplier.id)}
                    aria-label={`Select ${supplier.name}`}
                  />
                </td>
                <td className="action-cell">
                  <SupplierMenu
                    supplierId={supplier.id}
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
                    <span className="customer-avatar">{initialsOf(supplier.name)}</span>
                    <div className="customer-cell-copy">
                      <Link href={`/suppliers/${encodeURIComponent(supplier.id)}`} className="sale-link">
                        {supplier.name}
                      </Link>
                      <span>{supplier.id}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="customer-type-pill">{supplier.category || "-"}</span>
                </td>
                <td>
                  <div className="customer-location">
                    <strong>{supplier.phone || "-"}</strong>
                    <span>{supplier.email || "-"}</span>
                  </div>
                </td>
                <td>
                  <div className="customer-location">
                    <strong>{supplier.city || "-"}</strong>
                    <span>{supplier.country || "-"}</span>
                  </div>
                </td>
                <td className="right-align sale-amount">{supplier.purchaseCount.toLocaleString()}</td>
                <td className="right-align sale-amount">{formatMoney(supplier.totalPurchased)}</td>
                <td className={`right-align sale-amount${supplier.outstanding > 0 ? " customer-due" : ""}`}>
                  {formatMoney(supplier.outstanding)}
                </td>
                <td className="right-align sale-amount">{formatMoney(supplier.creditLimit)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={10}>No suppliers match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
