import type { Metadata } from "next";
import { CreateCustomer } from "@/components/customers/create-customer";

export const metadata: Metadata = {
  title: "Create Customer - Stocky",
};

export default function CreateCustomerPage() {
  return <CreateCustomer />;
}
