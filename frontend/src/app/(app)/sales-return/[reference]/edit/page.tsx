import type { Metadata } from "next";
import { EditSalesReturn } from "@/components/sales-return/edit-sales-return";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Edit Sales Return | VirtueVibe",
  description: "Update a sales return, refund, or replacement.",
};

export default async function EditSalesReturnPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return <EditSalesReturn reference={decodeRouteParam(reference)} />;
}
