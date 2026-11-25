import type { Metadata } from "next";
import { CustomerDetails } from "@/components/customers/customer-details";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Customer Details - VirtueVibe",
};

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const raw = (await params).id;
  const id = decodeRouteParam(raw);
  return <CustomerDetails id={id} />;
}
