"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import {
  expenseStatusClass,
  type Expense,
} from "@/lib/expenses-data";
import { formatMoney } from "@/lib/sales-data";
import type { ExpenseMenuState } from "./expense-menu";
import { ExpenseMenu } from "./expense-menu";

export type ExpensesSortKey =
  | "reference"
  | "date"
  | "category"
  | "vendor"
  | "amount"
  | "paymentMethod"
  | "status";

export type ExpensesSortDir = "asc" | "desc";

type ExpensesTableProps = {
  rows: Expense[];
  tableSearch: string;
  onTableSearch: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  sortKey: ExpensesSortKey;
  sortDir: ExpensesSortDir;
  onSort: (key: ExpensesSortKey) => void;
  menu: ExpenseMenuState | null;
  onMenuOpen: (id: string, button: HTMLElement) => void;
  onMenuClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  footer: ReactNode;
};

export function ExpensesTable({
  rows,
  tableSearch,
  onTableSearch,
  refreshing,
  onRefresh,
  sortKey,
  sortDir,
  onSort,
  menu,
  onMenuOpen,
  onMenuClose,
  onEdit,
  onDelete,
  footer,
}: ExpensesTableProps) {
  const sortIndicator = (key: ExpensesSortKey) =>
    sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "↕";

  return (
    <section className="panel">
      <div className="table-controls">
        <div className="table-search">
          <input
            type="text"
            placeholder="Search expenses"
            value={tableSearch}
            onChange={(event) => onTableSearch(event.target.value)}
            aria-label="Search expenses"
          />
          <Icon name="search" className="w-3.5 h-3.5" />
        </div>
        <div className="table-tools">
          <button
            type="button"
            className="tool-button"
            title="Refresh"
            aria-label="Refresh"
            onClick={onRefresh}
          >
            <Icon
              name="refresh"
              className={`w-3.5 h-3.5${refreshing ? " spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table className="sales-table">
          <thead>
            <tr>
              <th className="action-th">
                Actions
              </th>
              <th className="sortable-th">
                <button type="button" onClick={() => onSort("reference")}>
                  Expense
                  <span className={`sort-arrow${sortKey === "reference" ? " active" : ""}`}>
                    {sortIndicator("reference")}
                  </span>
                </button>
              </th>
              <th className="sortable-th">
                <button type="button" onClick={() => onSort("category")}>
                  Category
                  <span className={`sort-arrow${sortKey === "category" ? " active" : ""}`}>
                    {sortIndicator("category")}
                  </span>
                </button>
              </th>
              <th className="sortable-th">
                <button type="button" onClick={() => onSort("vendor")}>
                  Payee
                  <span className={`sort-arrow${sortKey === "vendor" ? " active" : ""}`}>
                    {sortIndicator("vendor")}
                  </span>
                </button>
              </th>
              <th className="sortable-th">
                <button type="button" onClick={() => onSort("date")}>
                  Date
                  <span className={`sort-arrow${sortKey === "date" ? " active" : ""}`}>
                    {sortIndicator("date")}
                  </span>
                </button>
              </th>
              <th className="sortable-th">
                <button type="button" onClick={() => onSort("paymentMethod")}>
                  Method
                  <span className={`sort-arrow${sortKey === "paymentMethod" ? " active" : ""}`}>
                    {sortIndicator("paymentMethod")}
                  </span>
                </button>
              </th>
              <th className="sortable-th right-align">
                <button type="button" onClick={() => onSort("amount")}>
                  Amount
                  <span className={`sort-arrow${sortKey === "amount" ? " active" : ""}`}>
                    {sortIndicator("amount")}
                  </span>
                </button>
              </th>
              <th className="sortable-th">
                <button type="button" onClick={() => onSort("status")}>
                  Status
                  <span className={`sort-arrow${sortKey === "status" ? " active" : ""}`}>
                    {sortIndicator("status")}
                  </span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={8}>No expenses match the current filters.</td>
              </tr>
            ) : (
              rows.map((expense) => (
                <tr key={expense.id} id={`expense-row-${expense.id}`}>
                  <td className="action-cell">
                    <ExpenseMenu
                      expenseId={expense.id}
                      menu={menu}
                      onOpen={onMenuOpen}
                      onClose={onMenuClose}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </td>
                  <td>
                    <div className="customer-location">
                      <strong>{expense.reference}</strong>
                      <span>{expense.description}</span>
                    </div>
                  </td>
                  <td>
                    <span className="unit-badge">{expense.category}</span>
                  </td>
                  <td>{expense.vendor}</td>
                  <td className="sale-date">{expense.date}</td>
                  <td>
                    <span className="status-pill">{expense.paymentMethod}</span>
                  </td>
                  <td className="right-align sale-amount">
                    {formatMoney(expense.amount)}
                  </td>
                  <td>
                    <span
                      className={`status-pill ${expenseStatusClass(expense.status)}`}
                    >
                      {expense.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
