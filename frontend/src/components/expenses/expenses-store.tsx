"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiClientError } from "@/lib/api";
import type { BackendExpense } from "@/lib/api-types";
import {
  isExpenseCategory,
  isExpenseStatus,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatus,
} from "@/lib/expenses-data";
import { isPaymentMethod } from "@/lib/payments-data";

export const EXPENSE_CREATED_FLAG = "stocky:created-expense";

export const EXPENSE_UPDATED_FLAG = "stocky:updated-expense";

type ExpensesContextValue = {
  expenses: Expense[];
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, changes: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  nextReference: string;
  hydrated: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return fallback;
}

function dateOnly(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function mapExpense(row: BackendExpense): Expense {
  return {
    id: row.id,
    reference: row.reference,
    date: dateOnly(row.date),
    category: isExpenseCategory(row.categoryName)
      ? row.categoryName
      : "Other",
    vendor: row.vendor ?? "Unknown payee",
    description: row.description ?? "Expense",
    amount: row.amount,
    paymentMethod: isPaymentMethod(row.paymentMethod)
      ? row.paymentMethod
      : "Cash",
    status: isExpenseStatus(row.status) ? row.status : "Pending",
    note: row.note ?? undefined,
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

function categoryName(value: unknown): ExpenseCategory {
  return isExpenseCategory(value) ? value : "Other";
}

function statusValue(value: unknown): ExpenseStatus {
  return isExpenseStatus(value) ? value : "Pending";
}

function suggestNextReference(items: Expense[]): string {
  let max = 1024;
  for (const item of items) {
    const match = /^EXP_(\d+)$/.exec(item.reference);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `EXP_${max + 1}`;
}

async function resolveCategoryId(name: string): Promise<string> {
  const { items } = await api.expenseCategories();
  const match = items.find(
    (item) => item.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (match) return match.id;
  const created = await api.createExpenseCategory({ name: name.trim() });
  return created.id;
}

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Expense[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { items: rows } = await api.expenses();
      setItems(rows.map(mapExpense));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load expenses."));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addExpense = useCallback(
    (expense: Expense) => {
      void (async () => {
        try {
          const categoryId = await resolveCategoryId(
            categoryName(expense.category),
          );
          await api.createExpense({
            categoryId,
            date: expense.date,
            vendor: expense.vendor,
            description: expense.description,
            amount: expense.amount,
            paymentMethod: expense.paymentMethod,
            status: statusValue(expense.status),
            note: expense.note || null,
          });
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to save the expense."));
        }
      })();
    },
    [load],
  );

  const updateExpense = useCallback(
    (id: string, changes: Partial<Expense>) => {
      void (async () => {
        try {
          const input: Record<string, unknown> = {};
          if (changes.date) input.date = dateOnly(changes.date);
          if (changes.vendor !== undefined) input.vendor = changes.vendor;
          if (changes.description !== undefined) {
            input.description = changes.description;
          }
          if (changes.amount !== undefined) input.amount = changes.amount;
          if (changes.paymentMethod) input.paymentMethod = changes.paymentMethod;
          if (changes.status) input.status = statusValue(changes.status);
          if (changes.note !== undefined) input.note = changes.note || null;
          if (changes.category) {
            input.categoryId = await resolveCategoryId(
              categoryName(changes.category),
            );
          }
          if (Object.keys(input).length > 0) {
            await api.updateExpense(id, input);
          }
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to update the expense."));
        }
      })();
    },
    [load],
  );

  const deleteExpense = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await api.deleteExpense(id);
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to delete the expense."));
        }
      })();
    },
    [load],
  );

  const value = useMemo<ExpensesContextValue>(
    () => ({
      expenses: items,
      addExpense,
      updateExpense,
      deleteExpense,
      nextReference: suggestNextReference(items),
      hydrated,
      error,
      reload: load,
    }),
    [items, addExpense, updateExpense, deleteExpense, hydrated, error, load],
  );

  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses(): ExpensesContextValue {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error("useExpenses must be used within an ExpensesProvider");
  }
  return context;
}
