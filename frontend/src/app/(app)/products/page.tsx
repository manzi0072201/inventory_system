import type { Metadata } from "next";
import { AllProducts } from "@/components/products/all-products";

export const metadata: Metadata = {
  title: "All Products - Stocky",
};

export default function ProductsPage() {
  return <AllProducts />;
}
