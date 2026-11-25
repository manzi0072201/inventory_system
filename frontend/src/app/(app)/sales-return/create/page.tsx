import type { Metadata } from "next";
import { CreateSalesReturn } from "@/components/sales-return/create-sales-return";

export const metadata: Metadata = {
  title: "Record Sales Return | VirtueVibe",
  description: "Record a returned sale, refund, or replacement.",
};

export default function CreateSalesReturnPage() {
  return <CreateSalesReturn />;
}
