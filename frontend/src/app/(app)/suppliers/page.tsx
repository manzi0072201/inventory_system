import type { Metadata } from "next";
import { AllSuppliers } from "@/components/suppliers/all-suppliers";

export const metadata: Metadata = {
  title: "Suppliers - VirtueVibe",
};

export default function SuppliersPage() {
  return <AllSuppliers />;
}
