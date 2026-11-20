import type { Metadata } from "next";
import { CreateStockAdjustment } from "@/components/stock/create-stock-adjustment";

export const metadata: Metadata = {
  title: "Adjust Stock - Stocky",
};

export default function AdjustStockPage() {
  return <CreateStockAdjustment />;
}
