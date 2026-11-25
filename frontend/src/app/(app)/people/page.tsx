import type { Metadata } from "next";
import { AllCustomers } from "@/components/customers/all-customers";

export const metadata: Metadata = {
  title: "Customers - VirtueVibe",
};

export default function CustomersPage() {
  return <AllCustomers />;
}
