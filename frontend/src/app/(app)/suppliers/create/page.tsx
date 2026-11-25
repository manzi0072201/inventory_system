import type { Metadata } from "next";
import { CreateSupplier } from "@/components/suppliers/create-supplier";

export const metadata: Metadata = {
  title: "Create Supplier - VirtueVibe",
};

export default function CreateSupplierPage() {
  return <CreateSupplier />;
}
