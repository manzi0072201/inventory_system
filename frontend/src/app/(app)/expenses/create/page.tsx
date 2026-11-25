import type { Metadata } from "next";
import { CreateExpense } from "@/components/expenses/create-expense";

export const metadata: Metadata = {
  title: "Record Expense - VirtueVibe",
};

export default function CreateExpensePage() {
  return <CreateExpense />;
}
