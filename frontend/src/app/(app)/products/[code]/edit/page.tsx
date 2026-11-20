import type { Metadata } from "next";
import { EditProduct } from "@/components/products/edit-product";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Edit Product - Stocky",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const raw = (await params).code;
  const code = decodeRouteParam(raw);
  return <EditProduct code={code} />;
}
