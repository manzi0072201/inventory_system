import type { Metadata } from "next";
import { AllDebtors } from "@/components/debtors/all-debtors";

export const metadata: Metadata = {
  title: "Debtors - Stocky",
};

export default function DebtorsPage() {
  return <AllDebtors />;
}
