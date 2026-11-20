import type { Metadata } from "next";
import { EditExpense } from "@/components/expenses/edit-expense";
import { decodeRouteParam } from "@/lib/route-params";

export const metadata: Metadata = {
  title: "Edit Expense - Stocky",
};

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const raw = (await params).id;
  const id = decodeRouteParam(raw);
  return <EditExpense id={id} />;
}
