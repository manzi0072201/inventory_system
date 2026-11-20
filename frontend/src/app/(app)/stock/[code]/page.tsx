import type { Metadata } from "next";
import { StockDetails } from "@/components/stock/stock-details";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Stock Details - Stocky",
};

export default async function StockDetailsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const raw = (await params).code;
  const code = decodeRouteParam(raw);
  return <StockDetails code={code} />;
}
