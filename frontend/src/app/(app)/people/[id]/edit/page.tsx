import type { Metadata } from "next";
import { EditCustomer } from "@/components/customers/edit-customer";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Edit Customer - VirtueVibe",
};

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const raw = (await params).id;
  const id = decodeRouteParam(raw);
  return <EditCustomer id={id} />;
}
