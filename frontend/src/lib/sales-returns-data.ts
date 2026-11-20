import type { PaymentMethod } from "@/lib/payments-data";

export type SalesReturnStatus = "Pending" | "Approved" | "Completed" | "Rejected";

export type SalesReturnReason =
  | "Damaged item"
  | "Defective item"
  | "Wrong item delivered"
  | "Customer changed mind"
  | "Late delivery"
  | "Other";

export type SalesReturnResolution = "Refund" | "Store Credit" | "Replacement";

export type SalesReturnItem = {
  saleItemId?: string;
  productId: string;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
};

export type SalesReturn = {
  id: string;
  reference: string;
  date: string;
  saleReference: string;
  customer: string;
  warehouse: string;
  items: SalesReturnItem[];
  reason: SalesReturnReason;
  resolution: SalesReturnResolution;
  status: SalesReturnStatus;
  refundMethod: PaymentMethod;
  amount: number;
  restock: boolean;
  note?: string;
  createdAt: string;
};

export const salesReturnStatuses: SalesReturnStatus[] = [
  "Pending",
  "Approved",
  "Completed",
  "Rejected",
];

export const salesReturnReasons: SalesReturnReason[] = [
  "Damaged item",
  "Defective item",
  "Wrong item delivered",
  "Customer changed mind",
  "Late delivery",
  "Other",
];

export const salesReturnResolutions: SalesReturnResolution[] = [
  "Refund",
  "Store Credit",
  "Replacement",
];

export function isSalesReturnStatus(value: unknown): value is SalesReturnStatus {
  return (
    typeof value === "string" &&
    salesReturnStatuses.includes(value as SalesReturnStatus)
  );
}

export function isSalesReturnReason(value: unknown): value is SalesReturnReason {
  return (
    typeof value === "string" &&
    salesReturnReasons.includes(value as SalesReturnReason)
  );
}

export function isSalesReturnResolution(
  value: unknown,
): value is SalesReturnResolution {
  return (
    typeof value === "string" &&
    salesReturnResolutions.includes(value as SalesReturnResolution)
  );
}

export function salesReturnStatusClass(status: SalesReturnStatus): string {
  if (status === "Approved") return "paid";
  if (status === "Rejected") return "unpaid";
  return status.toLowerCase();
}

export function returnItemSubtotal(item: SalesReturnItem): number {
  return item.quantity * item.unitPrice;
}

export function returnItemsTotal(items: SalesReturnItem[]): number {
  return Math.round(
    items.reduce((sum, item) => sum + returnItemSubtotal(item), 0) * 100,
  ) / 100;
}

export function returnItemCount(items: SalesReturnItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function formatReturnDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
