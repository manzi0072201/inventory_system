import type { Metadata } from "next";
import { SaleDetails } from "@/components/sales/sale-details";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Sale Details - Stocky",
};

export default async function SaleDetailsPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const raw = (await params).reference;
  const reference = decodeRouteParam(raw);
  return <SaleDetails reference={reference} />;
}
