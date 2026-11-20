"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Sale } from "@/lib/sales-data";
import { formatMoney } from "@/lib/sales-data";
import { SaleMenu, type SaleMenuState } from "./sale-menu";

export type SalesSortKey =
  | "date"
  | "reference"
  | "seller"
  | "customer"
  | "warehouse"
  | "status"
  | "currency"
  | "total"
  | "paid";

export type SalesSortDir = "asc" | "desc";

const sortColumns: {
  key: SalesSortKey;
  label: string;
  minWidth: number;
  align?: "right";
}[] = [
  { key: "date", label: "Date", minWidth: 140 },
  { key: "reference", label: "Reference", minWidth: 100 },
  { key: "seller", label: "Seller", minWidth: 110 },
  { key: "customer", label: "Customer", minWidth: 120 },
  { key: "warehouse", label: "Warehouse", minWidth: 120 },
  { key: "status", label: "Status", minWidth: 100 },
  { key: "currency", label: "Currency", minWidth: 80 },
  { key: "total", label: "Total", minWidth: 100, align: "right" },
  { key: "paid", label: "Paid", minWidth: 100, align: "right" },
];

type SalesTableProps = {
  rows: Sale[];
  tableSearch: string;
  onTableSearch: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  sortKey: SalesSortKey;
  sortDir: SalesSortDir;
  onSort: (key: SalesSortKey) => void;
  selected: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: (pageIds: string[], allSelected: boolean) => void;
  createdReference: string | null;
  menu: SaleMenuState | null;
  onMenuOpen: (id: string, button: HTMLElement) => void;
  onMenuClose: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  footer: ReactNode;
};

export function SalesTable({
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
}: SalesTableProps) {
  const selectedOnPage = rows.filter((row) => selected.includes(row.id));
  const allPageSelected =
    rows.length > 0 && selectedOnPage.length === rows.length;
  const sortArrow = (key: SalesSortKey) =>
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
                  aria-label="Select all sales on this page"
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
            {rows.map((sale) => (
              <tr
                key={sale.id}
                id={`sale-row-${sale.reference}`}
                className={
                  createdReference === sale.reference ? "row-highlight" : ""
                }
              >
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selected.includes(sale.id)}
                    onChange={() => onSelectToggle(sale.id)}
                    aria-label={`Select ${sale.reference}`}
                  />
                </td>
                <td className="action-cell">
                  <SaleMenu
                    saleId={sale.id}
                    menu={menu}
                    onOpen={onMenuOpen}
                    onClose={onMenuClose}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </td>
                <td className="sale-date">{sale.date} 00:00</td>
                <td>
                  <Link
                    href={`/sales/${encodeURIComponent(sale.reference)}`}
                    className="sale-link"
                  >
                    {sale.reference}
                  </Link>
                </td>
                <td>{sale.seller}</td>
                <td>{sale.customer}</td>
                <td>{sale.warehouse}</td>
                <td>
                  <span className={`status-pill ${sale.status.toLowerCase()}`}>
                    {sale.status}
                  </span>
                </td>
                <td className="sale-muted">{sale.currency}</td>
                <td className="right-align sale-amount">
                  {formatMoney(sale.total)}
                </td>
                <td className="right-align sale-amount">
                  {formatMoney(sale.paid)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={11}>No sales match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
