import { toDateOnlyString, toIsoString } from "@/lib/date-range";

export type ExpenseCategoryRow = {
  id: string;
  name: string;
  active: boolean;
  created_at: unknown;
};

export type ExpenseRow = {
  id: string;
  reference: string;
  date: unknown;
  category_id: string;
  vendor: string | null;
  description: string | null;
  amount: number | string;
  payment_method: string;
  status: string;
  note: string | null;
  created_by: string | null;
  created_at: unknown;
  updated_at: unknown;
  category_name?: string | null;
};

export function mapExpenseCategory(row: ExpenseCategoryRow) {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    createdAt: toIsoString(row.created_at),
  };
}

export function mapExpense(row: ExpenseRow) {
  return {
    id: row.id,
    reference: row.reference,
    date: toDateOnlyString(row.date),
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    vendor: row.vendor,
    description: row.description,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    status: row.status,
    note: row.note,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}
