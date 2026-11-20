import type { Metadata } from "next";
import { AllExpenses } from "@/components/expenses/all-expenses";

export const metadata: Metadata = {
  title: "Expenses - Stocky",
};

export default function ExpensesPage() {
  return <AllExpenses />;
}
