import type { Metadata } from "next";
import { CreateStockAdjustment } from "@/components/stock/create-stock-adjustment";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Adjust Stock - Stocky",
};

export default async function AdjustProductStockPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const raw = (await params).code;
  const code = decodeRouteParam(raw);
  return <CreateStockAdjustment code={code} />;
}
