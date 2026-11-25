import type { Metadata } from "next";
import { SupplierDetails } from "@/components/suppliers/supplier-details";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Supplier Details - VirtueVibe",
};

export default async function SupplierDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const raw = (await params).id;
  const id = decodeRouteParam(raw);
  return <SupplierDetails id={id} />;
}