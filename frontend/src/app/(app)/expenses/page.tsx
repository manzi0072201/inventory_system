import type { Metadata } from "next";
import { AllExpenses } from "@/components/expenses/all-expenses";

export const metadata: Metadata = {
  title: "Expenses - VirtueVibe",
};

export default function ExpensesPage() {
  return <AllExpenses />;
}
