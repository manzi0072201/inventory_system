import type { Metadata } from "next";
import { ProductDetails } from "@/components/products/product-details";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Product Details - Stocky",
};

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const raw = (await params).code;
  const code = decodeRouteParam(raw);
  return <ProductDetails code={code} />;
}
