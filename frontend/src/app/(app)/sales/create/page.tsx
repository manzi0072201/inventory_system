import type { Metadata } from "next";
import { CreateSale } from "@/components/sales/create-sale";

export const metadata: Metadata = {
  title: "Create Sale - VirtueVibe",
};

export default function CreateSalePage() {
  return <CreateSale />;
}
