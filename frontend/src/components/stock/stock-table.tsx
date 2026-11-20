"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/sales-data";
import {
  movementTypeClass,
  stockStatusClass,
  type StockRow,
} from "@/lib/stock-data";

export type StockSortKey =
  | "product"
  | "warehouse"
  | "category"
  | "onHand"
  | "reorderPoint"
  | "status"
  | "unitCost"
  | "stockValue"
  | "lastMovement";

export type StockSortDir = "asc" | "desc";

const sortColumns: {
  key: StockSortKey;
  label: string;
  minWidth: number;
  align?: "right";
}[] = [
  { key: "product", label: "Product", minWidth: 240 },
  { key: "warehouse", label: "Warehouse", minWidth: 130 },
  { key: "category", label: "Category", minWidth: 90 },
  { key: "onHand", label: "On Hand", minWidth: 110, align: "right" },
  { key: "reorderPoint", label: "Reorder At", minWidth: 100, align: "right" },
  { key: "status", label: "Status", minWidth: 100 },
  { key: "unitCost", label: "Unit Cost", minWidth: 100, align: "right" },
  { key: "stockValue", label: "Stock Value", minWidth: 110, align: "right" },
  { key: "lastMovement", label: "Last Movement", minWidth: 150 },
];

type StockTableProps = {
  rows: StockRow[];
  tableSearch: string;
  onTableSearch: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  sortKey: StockSortKey;
  sortDir: StockSortDir;
  onSort: (key: StockSortKey) => void;
  onView: (productId: string) => void;
  onAdjust: (productId: string) => void;
  footer: ReactNode;
};

function levelPercent(row: StockRow): number {
  const target = Math.max(row.reorderPoint * 1.5, 1);
  return Math.min(100, Math.max(0, Math.round((row.onHand / target) * 100)));
}

export function StockTable({
  rows,
  tableSearch,
  onTableSearch,
  refreshing,
  onRefresh,
  sortKey,
  sortDir,
  onSort,
  onView,
  onAdjust,
  footer,
}: StockTableProps) {
  const sortArrow = (key: StockSortKey) =>
    sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "⇅";

  return (
    <section className="panel">
      <div className="table-controls">
        <div className="table-search">
          <input
            placeholder="Search stock"
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
        <table className="sales-table stock-table">
          <thead>
            <tr>
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
            {rows.map((row) => (
              <tr key={row.product.id}>
                <td className="action-cell">
                  <div className="stock-row-actions">
                    <button
                      type="button"
                      className="tool-button"
                      title="View stock details"
                      onClick={() => onView(row.product.id)}
                    >
                      <Icon name="eye" strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      className="tool-button"
                      title="Adjust stock"
                      onClick={() => onAdjust(row.product.id)}
                    >
                      <Icon name="plus" strokeWidth={2.2} />
                    </button>
                  </div>
                </td>
                <td>
                  <div className="stock-product-cell">
                    <button
                      type="button"
                      className="sale-link"
                      onClick={() => onView(row.product.id)}
                    >
                      {row.product.name}
                    </button>
                    <span>
                      {row.product.code} · {row.product.brand}
                    </span>
                  </div>
                </td>
                <td>{row.product.warehouse}</td>
                <td>{row.product.category}</td>
                <td className="right-align">
                  <div className="stock-level-cell">
                    <strong>{row.onHand.toLocaleString()}</strong>
                    <span className="stock-level-track">
                      <span
                        className={`stock-level-fill ${stockStatusClass(row.status)}`}
                        style={{ width: `${levelPercent(row)}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className="right-align sale-amount">
                  {row.reorderPoint.toLocaleString()}
                </td>
                <td>
                  <span
                    className={`status-pill ${stockStatusClass(row.status)}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="right-align sale-amount">
                  {formatMoney(row.product.cost)}
                </td>
                <td className="right-align sale-amount">
                  {formatMoney(row.stockValue)}
                </td>
                <td>
                  {row.lastMovement ? (
                    <div className="stock-last-movement">
                      <span
                        className={`movement-badge ${movementTypeClass(row.lastMovement.type)}`}
                      >
                        {row.lastMovement.type}
                      </span>
                      <span>{row.lastMovement.date}</span>
                    </div>
                  ) : (
                    <span className="sale-muted">No movement</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={10}>No stock records match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
