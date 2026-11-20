"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  formatReturnDate,
  returnItemCount,
  salesReturnStatusClass,
  type SalesReturn,
} from "@/lib/sales-returns-data";
import { formatMoney } from "@/lib/sales-data";
import { SalesReturnMenu } from "./sales-return-menu";

export type SalesReturnSortKey =
  | "date"
  | "reference"
  | "customer"
  | "resolution"
  | "refundMethod"
  | "amount"
  | "status";

export type SalesReturnSortDir = "asc" | "desc";

const sortColumns: {
  key: SalesReturnSortKey;
  label: string;
  minWidth: number;
  align?: "right";
}[] = [
  { key: "date", label: "Date", minWidth: 125 },
  { key: "reference", label: "Return", minWidth: 125 },
  { key: "customer", label: "Customer", minWidth: 135 },
  { key: "resolution", label: "Resolution", minWidth: 120 },
  { key: "refundMethod", label: "Refund Method", minWidth: 125 },
  { key: "amount", label: "Amount", minWidth: 105, align: "right" },
  { key: "status", label: "Status", minWidth: 105 },
];

type SalesReturnsTableProps = {
  rows: SalesReturn[];
  sortKey: SalesReturnSortKey;
  sortDir: SalesReturnSortDir;
  onSort: (key: SalesReturnSortKey) => void;
  createdReference: string | null;
  onView: (record: SalesReturn) => void;
  onEdit: (record: SalesReturn) => void;
  onDelete: (record: SalesReturn) => void;
  footer?: ReactNode;
};

export function SalesReturnsTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  createdReference,
  onView,
  onEdit,
  onDelete,
  footer,
}: SalesReturnsTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const sortArrow = (key: SalesReturnSortKey) =>
    sortKey === key ? (sortDir === "asc" ? "\u2191" : "\u2193") : "\u2195";

  return (
    <section className="panel">
      <div className="table-scroll">
        <table className="sales-table">
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
              <th scope="col" style={{ minWidth: 90 }}>
                Items
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr
                key={record.id}
                id={`sales-return-row-${record.reference}`}
                className={
                  createdReference === record.reference ? "row-highlight" : ""
                }
              >
                <td className="action-cell">
                  <SalesReturnMenu
                    open={openMenuId === record.id}
                    onOpenChange={(open) =>
                      setOpenMenuId(open ? record.id : null)
                    }
                    onView={() => {
                      setOpenMenuId(null);
                      onView(record);
                    }}
                    onEdit={() => {
                      setOpenMenuId(null);
                      onEdit(record);
                    }}
                    onDelete={() => {
                      setOpenMenuId(null);
                      onDelete(record);
                    }}
                  />
                </td>
                <td className="sale-date">{formatReturnDate(record.date)}</td>
                <td>
                  <Link
                    href={`/sales-return/${encodeURIComponent(record.reference)}`}
                    className="sale-link"
                  >
                    {record.reference}
                  </Link>
                  <span className="sale-return-source">
                    Sale {record.saleReference}
                  </span>
                </td>
                <td>{record.customer}</td>
                <td>{record.resolution}</td>
                <td className="sale-muted">{record.refundMethod}</td>
                <td className="right-align sale-amount">
                  {formatMoney(record.amount)}
                </td>
                <td>
                  <span
                    className={`status-pill ${salesReturnStatusClass(record.status)}`}
                  >
                    {record.status}
                  </span>
                </td>
                <td>{returnItemCount(record.items)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={9}>No sales returns match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
