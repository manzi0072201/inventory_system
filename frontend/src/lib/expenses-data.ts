import type { PaymentMethod } from "@/lib/payments-data";

export const expenseCategories = [
  "Rent",
  "Utilities",
  "Salaries",
  "Transport",
  "Office Supplies",
  "Marketing",
  "Maintenance",
  "Other",
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export const expenseStatuses = ["Paid", "Pending", "Cancelled"] as const;

export type ExpenseStatus = (typeof expenseStatuses)[number];

export type Expense = {
  id: string;
  reference: string;
  date: string;
  category: ExpenseCategory;
  vendor: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  note?: string;
  createdAt: string;
};

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return (
    typeof value === "string" &&
    (expenseCategories as readonly string[]).includes(value)
  );
}

export function isExpenseStatus(value: unknown): value is ExpenseStatus {
  return (
    typeof value === "string" &&
    (expenseStatuses as readonly string[]).includes(value)
  );
}

export function expenseStatusClass(status: ExpenseStatus): string {
  return status === "Cancelled" ? "unpaid" : status.toLowerCase();
}
