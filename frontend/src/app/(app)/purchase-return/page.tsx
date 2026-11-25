import type { Metadata } from "next";
import { AllPurchaseReturns } from "@/components/purchase-return/all-purchase-returns";

export const metadata: Metadata = {
  title: "Purchase Returns | VirtueVibe",
  description: "Track returned products, supplier refunds, and replacements.",
};

export default function PurchaseReturnsPage() {
  return <AllPurchaseReturns />;
}
