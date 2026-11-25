import type { Metadata } from "next";
import { EditPurchaseReturn } from "@/components/purchase-return/edit-purchase-return";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Edit Purchase Return | VirtueVibe",
  description: "Update a purchase return, supplier refund, or replacement.",
};

export default async function EditPurchaseReturnPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return <EditPurchaseReturn reference={decodeRouteParam(reference)} />;
}
