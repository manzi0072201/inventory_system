import type { Metadata } from "next";
import { EditSupplier } from "@/components/suppliers/edit-supplier";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Edit Supplier - Stocky",
};

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const raw = (await params).id;
  const id = decodeRouteParam(raw);
  return <EditSupplier id={id} />;
}