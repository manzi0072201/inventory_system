import type { Metadata } from "next";
import { CreatePurchaseReturn } from "@/components/purchase-return/create-purchase-return";

export const metadata: Metadata = {
  title: "Record Purchase Return | Stocky",
  description: "Record a returned purchase, supplier refund, or replacement.",
};

export default function CreatePurchaseReturnPage() {
  return <CreatePurchaseReturn />;
}
