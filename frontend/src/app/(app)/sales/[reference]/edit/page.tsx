import type { Metadata } from "next";
import { EditSale } from "@/components/sales/edit-sale";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Edit Sale - VirtueVibe",
};

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const raw = (await params).reference;
  const reference = decodeRouteParam(raw);
  return <EditSale reference={reference} />;
}
