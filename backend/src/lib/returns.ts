import { toDateOnlyString, toIsoString } from "@/lib/date-range";

export type SaleReturnRow = {
  id: string;
  reference: string;
  date: unknown;
  sale_id: string;
  customer_id: string;
  warehouse_id: string;
  reason: string;
  resolution: string;
  status: string;
  refund_method: string;
  amount: number | string;
  restock: boolean;
  note: string | null;
  created_by: string | null;
  created_at: unknown;
  updated_at: unknown;
  sale_reference?: string | null;
  customer_name?: string | null;
  warehouse_name?: string | null;
};

export type PurchaseReturnRow = {
  id: string;
  reference: string;
  date: unknown;
  purchase_id: string;
  supplier_id: string;
  warehouse_id: string;
  reason: string;
  resolution: string;
  status: string;
  refund_method: string;
  amount: number | string;
  deduct_stock: boolean;
  note: string | null;
  created_by: string | null;
  created_at: unknown;
  updated_at: unknown;
  purchase_reference?: string | null;
  supplier_name?: string | null;
  warehouse_name?: string | null;
};

export type ReturnItemRow = {
  id: string;
  product_id: string;
  name_snapshot: string;
  code_snapshot: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
  sale_return_id?: string;
  purchase_return_id?: string;
  sale_item_id?: string | null;
  unit_cost?: number | string | null;
};

export function mapSaleReturn(row: SaleReturnRow) {
  return {
    id: row.id,
    reference: row.reference,
    date: toDateOnlyString(row.date),
    saleId: row.sale_id,
    saleReference: row.sale_reference ?? null,
    customerId: row.customer_id,
    warehouseId: row.warehouse_id,
    reason: row.reason,
    resolution: row.resolution,
    status: row.status,
    refundMethod: row.refund_method,
    amount: Number(row.amount),
    restock: row.restock,
    note: row.note,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    customerName: row.customer_name ?? null,
    warehouseName: row.warehouse_name ?? null,
  };
}

export function mapPurchaseReturn(row: PurchaseReturnRow) {
  return {
    id: row.id,
    reference: row.reference,
    date: toDateOnlyString(row.date),
    purchaseId: row.purchase_id,
    purchaseReference: row.purchase_reference ?? null,
    supplierId: row.supplier_id,
    warehouseId: row.warehouse_id,
    reason: row.reason,
    resolution: row.resolution,
    status: row.status,
    refundMethod: row.refund_method,
    amount: Number(row.amount),
    deductStock: row.deduct_stock,
    note: row.note,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    supplierName: row.supplier_name ?? null,
    warehouseName: row.warehouse_name ?? null,
  };
}

export function mapReturnItem(row: ReturnItemRow) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name_snapshot,
    code: row.code_snapshot,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
    saleItemId: row.sale_item_id ?? null,
    unitCost: Number(row.unit_cost ?? 0),
  };
}
