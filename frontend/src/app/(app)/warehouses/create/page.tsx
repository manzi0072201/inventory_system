import type { Metadata } from "next";
import { CreateWarehouse } from "@/components/warehouses/create-warehouse";

export const metadata: Metadata = {
  title: "Create Warehouse - VirtueVibe",
};

export default function CreateWarehousePage() {
  return <CreateWarehouse />;
}
