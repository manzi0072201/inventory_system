import type { PaymentMethod } from "@/lib/payments-data";

export type SaleStatus = "Completed" | "Pending" | "Ordered" | "Cancelled";
export type PaymentStatus = "Paid" | "Partial" | "Unpaid";

export type SaleLineItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxAmount?: number;
};

export type SaleDetailItem = {
  id: string;
  productId: string;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
};

export type Sale = {
  id: string;
  date: string;
  reference: string;
  seller: string;
  customer: string;
  warehouse: string;
  status: SaleStatus;
  currency: string;
  discountAmount?: number;
  taxAmount?: number;
  shippingAmount?: number;
  total: number;
  paid: number;
  paymentMethod: PaymentMethod;
  shippingStatus: string;
  note?: string;
  lineItems?: SaleLineItem[];
  items?: SaleDetailItem[];
};

export const saleCustomers = [
  "Lucas Meyer",
  "Sarah Miller",
  "Youssef Amrani",
  "Nadia Tazi",
  "Omar Khalil",
];

export const saleWarehouses = ["Electronics Shop", "Main Warehouse"];

export const saleStatuses: SaleStatus[] = ["Completed", "Pending", "Ordered"];

export const salePaymentStatuses: PaymentStatus[] = [
  "Paid",
  "Partial",
  "Unpaid",
];

export const saleShippingStatuses = ["Delivered", "Shipped", "Packed"];

export function paymentStatusOf(sale: Sale): PaymentStatus {
  if (sale.paid <= 0) return "Unpaid";
  if (sale.paid >= sale.total) return "Paid";
  return "Partial";
}

export function dueOf(sale: Sale): number {
  return Math.max(0, sale.total - sale.paid);
}

export function formatMoney(value: number): string {
  return `RWF ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
