import type { Metadata } from "next";
import { AllSales } from "@/components/sales/all-sales";

export const metadata: Metadata = {
  title: "All Sales - Stocky",
};

export default function SalesPage() {
  return <AllSales />;
}
