import type { Metadata } from "next";
import { EditPurchase } from "@/components/purchases/edit-purchase";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Edit Purchase - Stocky",
};

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const raw = (await params).reference;
  const reference = decodeRouteParam(raw);
  return <EditPurchase reference={reference} />;
}
