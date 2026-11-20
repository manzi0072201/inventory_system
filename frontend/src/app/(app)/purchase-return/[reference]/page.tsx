import type { Metadata } from "next";
import { PurchaseReturnDetails } from "@/components/purchase-return/purchase-return-details";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Purchase Return Details | Stocky",
  description: "View returned products and supplier refund details.",
};

export default async function PurchaseReturnDetailsPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return <PurchaseReturnDetails reference={decodeRouteParam(reference)} />;
}
