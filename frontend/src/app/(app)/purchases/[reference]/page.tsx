import type { Metadata } from "next";
import { PurchaseDetails } from "@/components/purchases/purchase-details";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Purchase Details - Stocky",
};

export default async function PurchaseDetailsPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const raw = (await params).reference;
  const reference = decodeRouteParam(raw);
  return <PurchaseDetails reference={reference} />;
}
