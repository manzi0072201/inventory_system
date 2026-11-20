"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Purchase } from "@/lib/purchases-data";
import { formatMoney, statusClass } from "@/lib/purchases-data";
import { PurchaseMenu, type PurchaseMenuState } from "./purchase-menu";

export type PurchasesSortKey =
  | "date"
  | "reference"
  | "buyer"
  | "supplier"
  | "warehouse"
  | "status"
  | "currency"
  | "total"
  | "paid";

export type PurchasesSortDir = "asc" | "desc";

const sortColumns: {
  key: PurchasesSortKey;
  label: string;
  minWidth: number;
  align?: "right";
}[] = [
  { key: "date", label: "Date", minWidth: 140 },
  { key: "reference", label: "Reference", minWidth: 100 },
  { key: "buyer", label: "Buyer", minWidth: 110 },
  { key: "supplier", label: "Supplier", minWidth: 140 },
  { key: "warehouse", label: "Warehouse", minWidth: 120 },
  { key: "status", label: "Status", minWidth: 100 },
  { key: "currency", label: "Currency", minWidth: 80 },
  { key: "total", label: "Total", minWidth: 100, align: "right" },
  { key: "paid", label: "Paid", minWidth: 100, align: "right" },
];

type PurchasesTableProps = {
  rows: Purchase[];
  tableSearch: string;
  onTableSearch: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  sortKey: PurchasesSortKey;
  sortDir: PurchasesSortDir;
  onSort: (key: PurchasesSortKey) => void;
  selected: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: (pageIds: string[], allSelected: boolean) => void;
  createdReference: string | null;
  menu: PurchaseMenuState | null;
  onMenuOpen: (id: string, button: HTMLElement) => void;
  onMenuClose: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  footer: ReactNode;
};

export function PurchasesTable({
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
  createdReference,
  menu,
  onMenuOpen,
  onMenuClose,
  onView,
  onEdit,
  onDelete,
  footer,
}: PurchasesTableProps) {
  const selectedOnPage = rows.filter((row) => selected.includes(row.id));
  const allPageSelected =
    rows.length > 0 && selectedOnPage.length === rows.length;
  const sortArrow = (key: PurchasesSortKey) =>
    sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "⇅";

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
        <table className="sales-table">
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
                  aria-label="Select all purchases on this page"
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
            {rows.map((purchase) => (
              <tr
                key={purchase.id}
                id={`purchase-row-${purchase.reference}`}
                className={
                  createdReference === purchase.reference ? "row-highlight" : ""
                }
              >
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selected.includes(purchase.id)}
                    onChange={() => onSelectToggle(purchase.id)}
                    aria-label={`Select ${purchase.reference}`}
                  />
                </td>
                <td className="action-cell">
                  <PurchaseMenu
                    purchaseId={purchase.id}
                    menu={menu}
                    onOpen={onMenuOpen}
                    onClose={onMenuClose}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </td>
                <td className="sale-date">{purchase.date} 00:00</td>
                <td>
                  <Link
                    href={`/purchases/${encodeURIComponent(purchase.reference)}`}
                    className="sale-link"
                  >
                    {purchase.reference}
                  </Link>
                </td>
                <td>{purchase.buyer}</td>
                <td>{purchase.supplier}</td>
                <td>{purchase.warehouse}</td>
                <td>
                  <span
                    className={`status-pill ${statusClass(purchase.status)}`}
                  >
                    {purchase.status}
                  </span>
                </td>
                <td className="sale-muted">{purchase.currency}</td>
                <td className="right-align sale-amount">
                  {formatMoney(purchase.total)}
                </td>
                <td className="right-align sale-amount">
                  {formatMoney(purchase.paid)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={11}>No purchases match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
