"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/sales-data";
import type { PaymentMethod, PaymentSource } from "@/lib/payments-data";

export type PaymentRow = {
  id: string;
  date: string;
  reference: string;
  party: string;
  source: PaymentSource;
  amount: number;
  method: PaymentMethod;
  href: string;
};

export type PaymentsSortKey =
  | "reference"
  | "party"
  | "source"
  | "date"
  | "amount"
  | "method";

export type PaymentsSortDir = "asc" | "desc";

const sortColumns: {
  key: PaymentsSortKey;
  label: string;
  minWidth: number;
  align?: "right";
}[] = [
  { key: "reference", label: "Payment", minWidth: 170 },
  { key: "source", label: "Type", minWidth: 100 },
  { key: "party", label: "Party", minWidth: 170 },
  { key: "date", label: "Date", minWidth: 110 },
  { key: "amount", label: "Amount Paid", minWidth: 130, align: "right" },
  { key: "method", label: "Method", minWidth: 170 },
];

type PaymentsTableProps = {
  rows: PaymentRow[];
  tableSearch: string;
  onTableSearch: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  sortKey: PaymentsSortKey;
  sortDir: PaymentsSortDir;
  onSort: (key: PaymentsSortKey) => void;
  footer: ReactNode;
};

export function PaymentsTable({
  rows,
  tableSearch,
  onTableSearch,
  refreshing,
  onRefresh,
  sortKey,
  sortDir,
  onSort,
  footer,
}: PaymentsTableProps) {
  const sortArrow = (key: PaymentsSortKey) =>
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
        <table className="sales-table">
          <thead>
            <tr>
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
            {rows.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <div className="customer-location">
                    <Link href={payment.href} className="sale-link">
                      {payment.reference}
                    </Link>
                    <span>{payment.source} payment</span>
                  </div>
                </td>
                <td>
                  <span className="status-pill">{payment.source}</span>
                </td>
                <td>{payment.party}</td>
                <td>{payment.date}</td>
                <td className="right-align sale-amount">
                  {formatMoney(payment.amount)}
                </td>
                <td>
                  <span className="status-pill">{payment.method}</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={6}>No payments match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
