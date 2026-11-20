import type { PaymentMethod } from "@/lib/payments-data";

export type PurchaseStatus = "Received" | "Pending" | "Ordered" | "Cancelled";
export type PaymentStatus = "Paid" | "Partial" | "Unpaid";

export type PurchaseLineItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxAmount?: number;
};

export type PurchaseDetailItem = {
  id: string;
  productId: string;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
};

export type Supplier = {
  name: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  category: string;
};

export type Purchase = {
  id: string;
  date: string;
  reference: string;
  supplier: string;
  buyer: string;
  warehouse: string;
  status: PurchaseStatus;
  currency: string;
  total: number;
  paid: number;
  paymentMethod: PaymentMethod;
  shippingStatus: string;
  note?: string;
  lineItems?: PurchaseLineItem[];
  items?: PurchaseDetailItem[];
};

export const suppliers: Supplier[] = [
  {
    name: "Kigali Wholesale Ltd",
    contact: "Aline Uwase",
    email: "aline@kigaliwholesale.rw",
    phone: "+250 788 123 456",
    country: "Rwanda",
    city: "Kigali",
    address: "KG 11 Ave, Nyarugenge",
    category: "General Goods",
  },
  {
    name: "TechSource Rwanda",
    contact: "Eric Niyonsaba",
    email: "eric@techsource.rw",
    phone: "+250 788 234 567",
    country: "Rwanda",
    city: "Kigali",
    address: "KN 5 Rd, Remera",
    category: "Electronics",
  },
  {
    name: "East Africa Traders",
    contact: "Fatima Hassan",
    email: "fatima@eatraders.co",
    phone: "+254 722 345 678",
    country: "Kenya",
    city: "Nairobi",
    address: "Mombasa Rd, Industrial Area",
    category: "Wholesale",
  },
  {
    name: "Global Audio Supply",
    contact: "Daniel Kim",
    email: "daniel@globalsupply.com",
    phone: "+1 415 555 0198",
    country: "United States",
    city: "San Francisco",
    address: "450 Market Street",
    category: "Audio",
  },
  {
    name: "Samsung Distribution Hub",
    contact: "Grace Mutoni",
    email: "grace@samsunghub.rw",
    phone: "+250 788 456 789",
    country: "Rwanda",
    city: "Kigali",
    address: "KG 7 Ave, Kacyiru",
    category: "Electronics",
  },
];

export const purchaseSuppliers = suppliers.map((supplier) => supplier.name);

export const purchaseWarehouses = ["Main Warehouse", "Secondary Warehouse"];

export const purchaseStatuses: PurchaseStatus[] = [
  "Received",
  "Pending",
  "Ordered",
];

export const purchasePaymentStatuses: PaymentStatus[] = [
  "Paid",
  "Partial",
  "Unpaid",
];

export const purchaseShippingStatuses = ["Received", "In Transit", "Pending"];

export function paymentStatusOf(purchase: Purchase): PaymentStatus {
  if (purchase.paid <= 0) return "Unpaid";
  if (purchase.paid >= purchase.total) return "Paid";
  return "Partial";
}

export function dueOf(purchase: Purchase): number {
  return Math.max(0, purchase.total - purchase.paid);
}

export function formatMoney(value: number): string {
  return `RWF ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function statusClass(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-");
}
