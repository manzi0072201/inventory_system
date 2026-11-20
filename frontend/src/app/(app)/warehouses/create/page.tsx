import type { Metadata } from "next";
import { CreateWarehouse } from "@/components/warehouses/create-warehouse";

export const metadata: Metadata = {
  title: "Create Warehouse - Stocky",
};

export default function CreateWarehousePage() {
  return <CreateWarehouse />;
}
