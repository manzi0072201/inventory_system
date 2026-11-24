import { toDateOnlyString, toIsoString } from "@/lib/date-range";

export type PurchaseRow = {
  id: string;
  reference: string;
  date: unknown;
  supplier_id: string;
  buyer_id: string;
  warehouse_id: string;
  status: string;
  currency: string;
  subtotal: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  shipping_amount: number | string;
  total_amount: number | string;
  paid_amount: number | string;
  payment_method: string;
  shipping_status: string | null;
  note: string | null;
  created_by: string | null;
  created_at: unknown;
  updated_at: unknown;
  supplier_name?: string | null;
  warehouse_name?: string | null;
  buyer_name?: string | null;
};

export type PurchaseItemRow = {
  id: string;
  purchase_id: string;
  product_id: string;
  name_snapshot: string;
  code_snapshot: string;
  quantity: number | string;
  unit_price: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  line_total: number | string;
  sort_order: number | string;
};

export function mapPurchase(row: PurchaseRow) {
  const total = Number(row.total_amount);
  const paid = Number(row.paid_amount);
  return {
    id: row.id,
    reference: row.reference,
    date: toDateOnlyString(row.date),
    supplierId: row.supplier_id,
    buyerId: row.buyer_id,
    warehouseId: row.warehouse_id,
    status: row.status,
    currency: row.currency.trim(),
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    taxAmount: Number(row.tax_amount),
    shippingAmount: Number(row.shipping_amount),
    totalAmount: total,
    paidAmount: paid,
    dueAmount: Math.max(0, round(total - paid)),
    paymentMethod: row.payment_method,
    shippingStatus: row.shipping_status,
    note: row.note,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    supplierName: row.supplier_name ?? null,
    warehouseName: row.warehouse_name ?? null,
    buyerName: row.buyer_name ?? null,
  };
}

export function mapPurchaseItem(row: PurchaseItemRow) {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    productId: row.product_id,
    name: row.name_snapshot,
    code: row.code_snapshot,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    discountAmount: Number(row.discount_amount),
    taxAmount: Number(row.tax_amount),
    lineTotal: Number(row.line_total),
    sortOrder: Number(row.sort_order),
  };
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
