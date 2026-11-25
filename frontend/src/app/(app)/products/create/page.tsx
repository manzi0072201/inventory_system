import type { Metadata } from "next";
import { CreateProduct } from "@/components/products/create-product";

export const metadata: Metadata = {
  title: "Create Product - VirtueVibe",
};

export default function CreateProductPage() {
  return <CreateProduct />;
}
