"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  formatPurchaseReturnDate,
  purchaseReturnItemCount,
  purchaseReturnStatusClass,
  type PurchaseReturn,
} from "@/lib/purchase-returns-data";
import { formatMoney } from "@/lib/purchases-data";
import { PurchaseReturnMenu } from "./purchase-return-menu";

export type PurchaseReturnSortKey =
  | "date"
  | "reference"
  | "supplier"
  | "resolution"
  | "refundMethod"
  | "amount"
  | "status";

export type PurchaseReturnSortDir = "asc" | "desc";

const sortColumns: {
  key: PurchaseReturnSortKey;
  label: string;
  minWidth: number;
  align?: "right";
}[] = [
  { key: "date", label: "Date", minWidth: 125 },
  { key: "reference", label: "Return", minWidth: 125 },
  { key: "supplier", label: "Supplier", minWidth: 135 },
  { key: "resolution", label: "Resolution", minWidth: 120 },
  { key: "refundMethod", label: "Refund Method", minWidth: 125 },
  { key: "amount", label: "Amount", minWidth: 105, align: "right" },
  { key: "status", label: "Status", minWidth: 105 },
];

type PurchaseReturnsTableProps = {
  rows: PurchaseReturn[];
  sortKey: PurchaseReturnSortKey;
  sortDir: PurchaseReturnSortDir;
  onSort: (key: PurchaseReturnSortKey) => void;
  createdReference: string | null;
  onView: (record: PurchaseReturn) => void;
  onEdit: (record: PurchaseReturn) => void;
  onDelete: (record: PurchaseReturn) => void;
  footer?: ReactNode;
};

export function PurchaseReturnsTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  createdReference,
  onView,
  onEdit,
  onDelete,
  footer,
}: PurchaseReturnsTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const sortArrow = (key: PurchaseReturnSortKey) =>
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
                id={`purchase-return-row-${record.reference}`}
                className={
                  createdReference === record.reference ? "row-highlight" : ""
                }
              >
                <td className="action-cell">
                  <PurchaseReturnMenu
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
                <td className="sale-date">
                  {formatPurchaseReturnDate(record.date)}
                </td>
                <td>
                  <Link
                    href={`/purchase-return/${encodeURIComponent(record.reference)}`}
                    className="sale-link"
                  >
                    {record.reference}
                  </Link>
                  <span className="sale-return-source">
                    Purchase {record.purchaseReference}
                  </span>
                </td>
                <td>{record.supplier}</td>
                <td>{record.resolution}</td>
                <td className="sale-muted">{record.refundMethod}</td>
                <td className="right-align sale-amount">
                  {formatMoney(record.amount)}
                </td>
                <td>
                  <span
                    className={`status-pill ${purchaseReturnStatusClass(record.status)}`}
                  >
                    {record.status}
                  </span>
                </td>
                <td>{purchaseReturnItemCount(record.items)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={9}>No purchase returns match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
