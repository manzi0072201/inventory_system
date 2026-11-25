import type { Metadata } from "next";
import { AllPurchases } from "@/components/purchases/all-purchases";

export const metadata: Metadata = {
  title: "All Purchases - VirtueVibe",
};

export default function PurchasesPage() {
  return <AllPurchases />;
}
