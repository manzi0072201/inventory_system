import type { Metadata } from "next";
import { EditWarehouse } from "@/components/warehouses/edit-warehouse";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Edit Warehouse - VirtueVibe",
};

export default async function EditWarehousePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const raw = (await params).code;
  const code = decodeRouteParam(raw);
  return <EditWarehouse code={code} />;
}
