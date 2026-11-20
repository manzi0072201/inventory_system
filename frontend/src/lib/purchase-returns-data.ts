import type { PaymentMethod } from "@/lib/payments-data";

export type PurchaseReturnStatus =
  | "Pending"
  | "Approved"
  | "Completed"
  | "Rejected";

export type PurchaseReturnReason =
  | "Damaged goods"
  | "Defective goods"
  | "Wrong item received"
  | "Overstock"
  | "Supplier error"
  | "Other";

export type PurchaseReturnResolution =
  | "Refund"
  | "Replacement"
  | "Credit Note";

export type PurchaseReturnItem = {
  purchaseItemId?: string;
  productId: string;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
};

export type PurchaseReturn = {
  id: string;
  reference: string;
  date: string;
  purchaseReference: string;
  supplier: string;
  warehouse: string;
  items: PurchaseReturnItem[];
  reason: PurchaseReturnReason;
  resolution: PurchaseReturnResolution;
  status: PurchaseReturnStatus;
  refundMethod: PaymentMethod;
  amount: number;
  deductStock: boolean;
  note?: string;
  createdAt: string;
};

export const purchaseReturnStatuses: PurchaseReturnStatus[] = [
  "Pending",
  "Approved",
  "Completed",
  "Rejected",
];

export const purchaseReturnReasons: PurchaseReturnReason[] = [
  "Damaged goods",
  "Defective goods",
  "Wrong item received",
  "Overstock",
  "Supplier error",
  "Other",
];

export const purchaseReturnResolutions: PurchaseReturnResolution[] = [
  "Refund",
  "Replacement",
  "Credit Note",
];

export function isPurchaseReturnStatus(
  value: unknown,
): value is PurchaseReturnStatus {
  return (
    typeof value === "string" &&
    purchaseReturnStatuses.includes(value as PurchaseReturnStatus)
  );
}

export function isPurchaseReturnReason(
  value: unknown,
): value is PurchaseReturnReason {
  return (
    typeof value === "string" &&
    purchaseReturnReasons.includes(value as PurchaseReturnReason)
  );
}

export function isPurchaseReturnResolution(
  value: unknown,
): value is PurchaseReturnResolution {
  return (
    typeof value === "string" &&
    purchaseReturnResolutions.includes(value as PurchaseReturnResolution)
  );
}

export function purchaseReturnStatusClass(
  status: PurchaseReturnStatus,
): string {
  if (status === "Approved") return "paid";
  if (status === "Rejected") return "unpaid";
  return status.toLowerCase();
}

export function purchaseReturnItemSubtotal(
  item: PurchaseReturnItem,
): number {
  return item.quantity * item.unitPrice;
}

export function purchaseReturnItemsTotal(
  items: PurchaseReturnItem[],
): number {
  return (
    Math.round(
      items.reduce(
        (sum, item) => sum + purchaseReturnItemSubtotal(item),
        0,
      ) * 100,
    ) / 100
  );
}

export function purchaseReturnItemCount(
  items: PurchaseReturnItem[],
): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function formatPurchaseReturnDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
