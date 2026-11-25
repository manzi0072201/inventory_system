import type { Metadata } from "next";
import { AllSalesReturns } from "@/components/sales-return/all-sales-returns";

export const metadata: Metadata = {
  title: "Sales Returns | VirtueVibe",
  description: "Track returned products, refunds, and replacements.",
};

export default function SalesReturnsPage() {
  return <AllSalesReturns />;
}
