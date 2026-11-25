import type { Metadata } from "next";
import { AllProducts } from "@/components/products/all-products";

export const metadata: Metadata = {
  title: "All Products - VirtueVibe",
};

export default function ProductsPage() {
  return <AllProducts />;
}
