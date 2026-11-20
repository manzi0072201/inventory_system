import type { Metadata } from "next";
import { CreatePurchase } from "@/components/purchases/create-purchase";

export const metadata: Metadata = {
  title: "Create Purchase - Stocky",
};

export default function CreatePurchasePage() {
  return <CreatePurchase />;
}
