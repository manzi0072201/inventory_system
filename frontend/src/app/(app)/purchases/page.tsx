import type { Metadata } from "next";
import { AllPurchases } from "@/components/purchases/all-purchases";

export const metadata: Metadata = {
  title: "All Purchases - Stocky",
};

export default function PurchasesPage() {
  return <AllPurchases />;
}
