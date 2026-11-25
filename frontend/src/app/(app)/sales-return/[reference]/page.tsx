import type { Metadata } from "next";
import { SalesReturnDetails } from "@/components/sales-return/sales-return-details";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Sales Return Details | VirtueVibe",
  description: "View returned products and refund details.",
};

export default async function SalesReturnDetailsPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return <SalesReturnDetails reference={decodeRouteParam(reference)} />;
}
