"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ProductsPagination as Pagination, getPageList } from "@/components/products/products-pagination";
import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
} from "@/lib/expenses-data";
import type { PaymentMethod } from "@/lib/payments-data";
import {
  EXPENSE_CREATED_FLAG,
  EXPENSE_UPDATED_FLAG,
  useExpenses,
} from "./expenses-store";
import {
  ExpensesFilters,
  type ExpenseFilterKey,
  type ExpensePeriod,
} from "./expenses-filters";
import {
  ExpensesTable,
  type ExpensesSortDir,
  type ExpensesSortKey,
} from "./expenses-table";
import type { ExpenseMenuState } from "./expense-menu";
import { ExpensesSummary } from "./expenses-summary";

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function downloadExpensesCsv(rows: Expense[]) {
  const header = [
    "Reference",
    "Date",
    "Category",
    "Payee",
    "Description",
    "Amount",
    "Payment Method",
    "Status",
    "Note",
  ];
  const lines = rows.map((expense) =>
    [
      expense.reference,
      expense.date,
      expense.category,
      expense.vendor,
      expense.description,
      expense.amount,
      expense.paymentMethod,
      expense.status,
      expense.note ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob([`\ufeff${[header.join(","), ...lines].join("\r\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function matchesPeriod(dateValue: string, period: ExpensePeriod) {
  if (!period) return true;
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  if (period === "this-year") {
    return date.getFullYear() === now.getFullYear();
  }
  if (period === "this-month") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return (
    date.getFullYear() === previous.getFullYear() &&
    date.getMonth() === previous.getMonth()
  );
}

export function AllExpenses() {
  const router = useRouter();
  const { expenses, deleteExpense } = useExpenses();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [status, setStatus] = useState<ExpenseStatus | "">("");
  const [period, setPeriod] = useState<ExpensePeriod>("");
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<ExpensesSortKey>("date");
  const [sortDir, setSortDir] = useState<ExpensesSortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState<ExpenseMenuState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const summary = useMemo(() => {
    const active = expenses.filter((expense) => expense.status !== "Cancelled");
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthEntries = active.filter(
      (expense) =>
        expense.status === "Paid" && expense.date.startsWith(monthPrefix),
    );
    const pendingEntries = active.filter(
      (expense) => expense.status === "Pending",
    );
    const categoryTotals = new Map<ExpenseCategory, number>();
    for (const expense of active) {
      categoryTotals.set(
        expense.category,
        (categoryTotals.get(expense.category) ?? 0) + expense.amount,
      );
    }
    let topCategory: ExpenseCategory | "None" = "None";
    let topCategoryAmount = 0;
    for (const [entry, amount] of categoryTotals) {
      if (amount > topCategoryAmount) {
        topCategory = entry;
        topCategoryAmount = amount;
      }
    }
    return {
      total: active.reduce((sum, expense) => sum + expense.amount, 0),
      count: active.length,
      paidThisMonth: monthEntries.reduce(
        (sum, expense) => sum + expense.amount,
        0,
      ),
      monthCount: monthEntries.length,
      pending: pendingEntries.reduce(
        (sum, expense) => sum + expense.amount,
        0,
      ),
      pendingCount: pendingEntries.length,
      topCategory,
      topCategoryAmount,
    };
  }, [expenses]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let created: string | null = null;
    let updated: string | null = null;
    try {
      created = window.sessionStorage.getItem(EXPENSE_CREATED_FLAG);
      if (created) window.sessionStorage.removeItem(EXPENSE_CREATED_FLAG);
      updated = window.sessionStorage.getItem(EXPENSE_UPDATED_FLAG);
      if (updated) window.sessionStorage.removeItem(EXPENSE_UPDATED_FLAG);
    } catch {}
    const id = created ?? updated;
    if (id) {
      setNotice(
        `Expense ${id} was ${created ? "recorded" : "updated"} successfully.`,
      );
    }
  }, []);

  const closeMenu = () => setMenu(null);
  const openMenu = (id: string, button: HTMLElement) => {
    const rect = button.getBoundingClientRect();
    const flip = window.innerHeight - rect.bottom < 140;
    setMenu({
      id,
      top: flip ? rect.top - 6 : rect.bottom + 6,
      right: window.innerWidth - rect.right,
      flip,
    });
  };

  useEffect(() => {
    if (!menu) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.("[data-menu-root]")) closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menu]);

  useEffect(() => {
    closeMenu();
  }, [
    searchQuery,
    category,
    method,
    status,
    period,
    tableSearch,
    sortKey,
    sortDir,
    page,
    pageSize,
  ]);

  const filtered = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    const quickSearch = tableSearch.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (category && expense.category !== category) return false;
      if (method && expense.paymentMethod !== method) return false;
      if (status && expense.status !== status) return false;
      if (!matchesPeriod(expense.date, period)) return false;

      const haystack =
        `${expense.reference} ${expense.date} ${expense.category} ${expense.vendor} ${expense.description} ${expense.paymentMethod} ${expense.status} ${expense.note ?? ""}`.toLowerCase();
      if (search && !haystack.includes(search)) return false;
      if (quickSearch && !haystack.includes(quickSearch)) return false;
      return true;
    });
  }, [expenses, searchQuery, category, method, status, period, tableSearch]);

  const sorted = useMemo(() => {
    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }
      return String(left).localeCompare(String(right)) * direction;
    });
  }, [filtered, sortKey, sortDir]);

  const totalCount = sorted.length;
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, lastPage);
  const pageRows = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pageList = getPageList(currentPage, lastPage);

  const handleFilter = (key: ExpenseFilterKey, value: string) => {
    setPage(1);
    if (key === "search") setSearchQuery(value);
    else if (key === "category") setCategory(value as ExpenseCategory | "");
    else if (key === "method") setMethod(value as PaymentMethod | "");
    else if (key === "status") setStatus(value as ExpenseStatus | "");
    else if (key === "period") setPeriod(value as ExpensePeriod);
  };

  const toggleSort = (key: ExpensesSortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleTableSearch = (value: string) => {
    setTableSearch(value);
    setPage(1);
  };

  const handlePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 1300);
  };

  const handleEdit = (id: string) => {
    closeMenu();
    router.push(`/expenses/${encodeURIComponent(id)}/edit`);
  };

  const handleDelete = (id: string) => {
    const expense = expenses.find((entry) => entry.id === id);
    const label = expense ? expense.reference : id;
    if (
      window.confirm(
        `Delete expense "${label}"? This cannot be undone.`,
      )
    ) {
      deleteExpense(id);
      setNotice(`Expense ${label} was deleted.`);
    }
    closeMenu();
  };

  return (
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Finance</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Expenses</span>
          </nav>
          <h1>Expenses</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => downloadExpensesCsv(sorted)}
          >
            <Icon name="table" className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push("/expenses/create")}
          >
            <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Record Expense
          </button>
        </div>
      </div>

      {notice ? (
        <div className="created-banner" role="status">
          {notice}
        </div>
      ) : null}

      <ExpensesSummary {...summary} />

      <ExpensesFilters
        search={searchQuery}
        category={category}
        method={method}
        status={status}
        period={period}
        onFilter={handleFilter}
      />

      <ExpensesTable
        rows={pageRows}
        tableSearch={tableSearch}
        onTableSearch={handleTableSearch}
        refreshing={refreshing}
        onRefresh={refresh}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        menu={menu}
        onMenuOpen={openMenu}
        onMenuClose={closeMenu}
        onEdit={handleEdit}
        onDelete={handleDelete}
        footer={
          <Pagination
            totalCount={totalCount}
            currentPage={currentPage}
            lastPage={lastPage}
            pageList={pageList}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={handlePageSize}
          />
        }
      />
    </div>
  );
}
